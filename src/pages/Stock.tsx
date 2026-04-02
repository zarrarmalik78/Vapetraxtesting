import React, { useEffect, useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ArrowUpDown,
  X
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { formatCurrency, cn } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { deleteDoc, doc, updateDoc, addDoc, collection, serverTimestamp, orderBy, where, increment, writeBatch, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { computeBottleStatusCounts, getAvailableMl, parseBottleSizeMl, type BottleDoc } from '../lib/bottles';
import { buildActorMeta } from '../lib/actor';
import ConfirmBulkDeleteModal from '../components/ui/ConfirmBulkDeleteModal';
import { reauthenticateForSensitiveAction, requiresPasswordReauth } from '../lib/secureAction';

/** Sheet "Price" column = purchase / cost; selling = purchase × (1 + 65%) */
const IMPORT_SELLING_MULTIPLIER = 1.65;

interface ParsedImportRow {
  rowNumber: number;
  rawRow: Record<string, any>;
  name: string;
  /** Purchase price from file (column usually named Price) */
  purchasePrice: number;
  /** Computed: purchase × 1.65 (e.g. 1000 → 1650) */
  sellingPrice: number;
  category: 'device' | 'coil' | 'e-liquid';
  bottleSizeMl?: number | null;
  stock: number;
  isValid: boolean;
  reason?: string;
}

type ImportMode = 'general' | 'eliquid';

const Stock: React.FC = () => {
  const { shopId, userRole, currentUser } = useAuth();
  const isAdmin = userRole === 'admin';
  const needsPassword = requiresPasswordReauth(currentUser);
  const { documents: products, loading } = useFirestore<any>(
    shopId ? 'products' : null, 
    where('shopId', '==', shopId),
    orderBy('createdAt', 'desc')
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showBottleModal, setShowBottleModal] = useState<any | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState<ParsedImportRow[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importMode, setImportMode] = useState<ImportMode>('general');
  const [uploadingImport, setUploadingImport] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (categoryFilter === 'all' || p.category === categoryFilter)
    );

    if (sortConfig.key) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [products, searchTerm, categoryFilter, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        toast.success('Product deleted successfully');
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredProducts.map((p) => p.id) : []);
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id));
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    setBulkDeleting(true);
    try {
      if (needsPassword && currentUser) {
        await reauthenticateForSensitiveAction(currentUser, deletePassword);
      }
      const batch = writeBatch(db);
      selectedIds.forEach((id) => batch.delete(doc(db, 'products', id)));
      await batch.commit();
      toast.success(`Deleted ${selectedIds.length} product(s)`);
      setSelectedIds([]);
      setShowBulkDeleteModal(false);
      setDeleteTyped('');
      setDeletePassword('');
    } catch (error: any) {
      const code = error?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') toast.error('Incorrect password.');
      else toast.error(error?.message || 'Failed to delete selected products');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleImportFile = async (file: File, mode: ImportMode) => {
    if (!file) return;
    if (!shopId) {
      toast.error('Shop not loaded yet. Please wait and try again.');
      return;
    }
    try {
      const XLSX = await import('xlsx');
      const fileBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });

      const normalizeCategory = (value: string): 'device' | 'coil' | 'e-liquid' => {
        const v = String(value || '').trim().toLowerCase();
        if (v === 'coil' || v === 'coils') return 'coil';
        if (['e-liquid', 'e-liquids', 'eliquid', 'eliquids', 'e liquid', 'e liquids', 'juice', 'liquid', 'liquids', 'ejuice', 'e-juice'].includes(v)) return 'e-liquid';
        return 'device';
      };

      const normalizeHeader = (header: string) =>
        String(header || '')
          .replace(/\uFEFF/g, '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, ' ');

      const toNumberSafe = (value: any) => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        const cleaned = String(value ?? '')
          .replace(/[^\d.-]/g, '')
          .trim();
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
      };

      const readByAliases = (row: Record<string, any>, aliases: string[]) => {
        const normalizedEntries = Object.entries(row).map(([k, v]) => [normalizeHeader(k), v] as const);
        for (const alias of aliases) {
          const key = normalizeHeader(alias);
          const hit = normalizedEntries.find(([k]) => k === key);
          if (hit) return hit[1];
        }
        return '';
      };

      const parsed: ParsedImportRow[] = rows.map((row, index) => {
        const name = String(
          readByAliases(row, ['name', 'product name', 'item', 'item name', 'product'])
        ).trim();
        // "Price" in the sheet is purchase / cost only (not retail).
        const purchasePrice = toNumberSafe(
          readByAliases(row, ['price', 'purchase price', 'cost', 'cost price', 'buying price', 'rate'])
        );
        const sellingPrice =
          Math.round(purchasePrice * IMPORT_SELLING_MULTIPLIER * 100) / 100;
        const inferredCategory = normalizeCategory(String(readByAliases(row, ['category', 'type', 'product type']) || 'device'));
        const category = mode === 'eliquid' ? 'e-liquid' : inferredCategory;
        const stock = Math.max(0, toNumberSafe(readByAliases(row, ['stock', 'qty', 'quantity'])));
        const bottleSizeRaw = readByAliases(row, ['bottle size', 'bottlesize', 'ml', 'size ml', 'size']);
        const bottleSizeMl = category === 'e-liquid' ? parseBottleSizeMl(bottleSizeRaw, 0) : null;
        // Only skip if name is actually empty after trim.
        const invalidGeneralELiquid = mode === 'general' && inferredCategory === 'e-liquid';
        const isValid = name.length > 0 && (!invalidGeneralELiquid) && (category !== 'e-liquid' || (bottleSizeMl || 0) > 0);
        if (!isValid) {
          console.warn('[Bulk Import] Skipping row due to empty Name after trim', {
            rowNumber: index + 2,
            row
          });
        }
        return {
          rowNumber: index + 2,
          rawRow: row,
          name,
          purchasePrice: Number.isFinite(purchasePrice) ? purchasePrice : 0,
          sellingPrice: Number.isFinite(sellingPrice) ? sellingPrice : 0,
          category,
          bottleSizeMl,
          stock: Number.isFinite(stock) ? stock : 0,
          isValid,
          reason: isValid
            ? undefined
            : name.length === 0
              ? 'Missing Name'
              : invalidGeneralELiquid
                ? 'Use E-Liquid Import for this row'
                : 'Missing BottleSize/ML'
        };
      });

      setImportMode(mode);
      setImportRows(parsed);
      setImportFileName(file.name);
      setImportProgress(0);
      setShowImportModal(true);
      toast.success(`Parsed ${parsed.length} rows from ${file.name}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to parse file');
    }
  };

  const handleBulkUpload = async () => {
    if (!shopId) {
      toast.error('Shop not loaded yet. Please wait and try again.');
      return;
    }
    const validRows = importRows.filter(r => r.isValid);
    const failedRows = importRows.filter(r => !r.isValid);
    if (validRows.length === 0) {
      toast.error('No valid rows to upload');
      return;
    }
    setUploadingImport(true);
    setImportProgress(0);
    try {
      let processed = 0;
      let merged = 0;
      let batch = writeBatch(db);
      let pendingOps = 0;
      const MAX_OPS = 450;

      const flush = async () => {
        if (pendingOps === 0) return;
        await batch.commit();
        batch = writeBatch(db);
        pendingOps = 0;
      };

      for (const row of validRows) {
        const isELiquid = row.category === 'e-liquid';
        const bottleSizeMl = parseBottleSizeMl(row.bottleSizeMl, 30);
        const bottleCount = Math.max(0, Math.floor(row.stock));
        const stockQuantity = isELiquid ? bottleSizeMl * bottleCount : bottleCount;

        // Check if product already exists (case-insensitive name + same category)
        const existingProduct = products.find(
          (p) => p.name?.trim().toLowerCase() === row.name.trim().toLowerCase() && p.category === row.category
        );

        if (existingProduct) {
          // --- Weighted Average Cost merge ---
          const currentStock = Number(existingProduct.stockQuantity) || 0;
          const currentCost = Number(existingProduct.costPrice) || 0;
          const addedStock = stockQuantity;
          const addedCost = row.purchasePrice;
          const totalStock = currentStock + addedStock;
          const weightedCost = totalStock > 0
            ? ((currentStock * (isELiquid ? (currentCost / (parseBottleSizeMl(existingProduct.bottleSize, 30) || 1)) : currentCost))
              + (addedStock * (isELiquid ? (addedCost / (bottleSizeMl || 1)) : addedCost))) / totalStock
            : addedCost;

          const rowOps = 1 + (isELiquid ? bottleCount : 0);
          if (pendingOps + rowOps > MAX_OPS) await flush();

          const existingRef = doc(db, 'products', existingProduct.id);
          if (isELiquid) {
            const newUnitCostPerMl = weightedCost;
            const newCostPrice = newUnitCostPerMl * bottleSizeMl;
            batch.update(existingRef, {
              costPrice: Math.round(newCostPrice * 100) / 100,
              unitCostPerMl: Math.round(newUnitCostPerMl * 100) / 100,
              stockQuantity: increment(addedStock),
              updatedAt: serverTimestamp()
            });
          } else {
            batch.update(existingRef, {
              costPrice: Math.round(weightedCost * 100) / 100,
              stockQuantity: increment(addedStock),
              updatedAt: serverTimestamp()
            });
          }
          pendingOps += 1;

          if (isELiquid && bottleCount > 0) {
            for (let i = 0; i < bottleCount; i++) {
              const bottleRef = doc(collection(db, `products/${existingProduct.id}/bottles`));
              batch.set(bottleRef, {
                shopId,
                bottleSize: bottleSizeMl,
                remainingMl: bottleSizeMl,
                status: 'closed',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              pendingOps += 1;
            }
          }
          merged += 1;
        } else {
          // --- Create new product ---
          const rowOps = 1 + (isELiquid ? bottleCount : 0);
          if (pendingOps + rowOps > MAX_OPS) await flush();

          const productRef = doc(collection(db, 'products'));
          batch.set(productRef, {
            name: row.name,
            category: row.category,
            costPrice: row.purchasePrice,
            sellingPrice: row.sellingPrice,
            stockQuantity,
            minStockLevel: isELiquid ? bottleSizeMl * 2 : 2,
            lowStockAlert: isELiquid ? bottleSizeMl * 2 : 2,
            unit: isELiquid ? 'bottle' : 'piece',
            ...(isELiquid ? { bottleSize: String(bottleSizeMl), unitCostPerMl: row.purchasePrice / (bottleSizeMl || 1) } : {}),
            brand: '',
            shopId,
            createdAt: serverTimestamp(),
            createdAtClient: new Date(),
            updatedAt: serverTimestamp()
          });
          pendingOps += 1;

          if (isELiquid && bottleCount > 0) {
            for (let i = 0; i < bottleCount; i++) {
              const bottleRef = doc(collection(db, `products/${productRef.id}/bottles`));
              batch.set(bottleRef, {
                shopId,
                bottleSize: bottleSizeMl,
                remainingMl: bottleSizeMl,
                status: 'closed',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
              pendingOps += 1;
            }
          }
        }
        processed += 1;
        setImportProgress(Math.round((processed / validRows.length) * 100));
      }
      await flush();

      const newCount = validRows.length - merged;
      toast.success(`Imported ${newCount} new product(s), merged ${merged} existing product(s). ${failedRows.length} row(s) skipped.`);
      setShowImportModal(false);
      setImportRows([]);
      setImportFileName('');
      setImportProgress(0);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Bulk import failed');
    } finally {
      setUploadingImport(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
            <Package size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Management</h1>
            <p className="text-slate-500 text-sm">Manage your products and stock levels</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 cursor-pointer">
              Bulk Import (Device/Coil)
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file, 'general');
                  e.currentTarget.value = '';
                }}
              />
            </label>
            <label className="flex items-center gap-2 bg-fuchsia-500 hover:bg-fuchsia-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-fuchsia-500/20 cursor-pointer">
              Bulk Import E-Liquid
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file, 'eliquid');
                  e.currentTarget.value = '';
                }}
              />
            </label>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-rose-500/20"
            >
              <Plus size={18} />
              Add Product
            </button>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card-violet rounded-2xl p-6 shadow-lg shadow-violet-500/20">
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Total Products</p>
          <p className="text-3xl font-bold">{products.length}</p>
        </div>
        <div className="metric-card-orange rounded-2xl p-6 shadow-lg shadow-orange-500/20">
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Low Stock Items</p>
          <p className="text-3xl font-bold">{products.filter(p => p.stockQuantity <= (p.minStockLevel || 2)).length}</p>
        </div>
        <div className="metric-card-red rounded-2xl p-6 shadow-lg shadow-rose-500/20">
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Out of Stock</p>
          <p className="text-3xl font-bold">{products.filter(p => p.stockQuantity === 0).length}</p>
        </div>
        {isAdmin && (
          <div className="metric-card-emerald rounded-2xl p-6 shadow-lg shadow-emerald-500/20">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-1">Total Value</p>
            <p className="text-3xl font-bold">
              {formatCurrency(products.reduce((acc, p) => {
                if (p.category === 'e-liquid') {
                  const unitCost = Number(p.unitCostPerMl) || (Number(p.costPrice) / (Number(parseBottleSizeMl(p.bottleSize, 30)) || 1));
                  return acc + (unitCost * (Number(p.stockQuantity) || 0));
                }
                return acc + ((Number(p.costPrice) || 0) * (Number(p.stockQuantity) || 0));
              }, 0))}
            </p>
          </div>
        )}
      </div>

      {/* Filters & Search */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
        </div>
        <select 
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
        >
          <option value="all">All Categories</option>
          <option value="device">Devices</option>
          <option value="coil">Coils</option>
          <option value="e-liquid">E-Liquids</option>
        </select>
        {isAdmin && selectedIds.length > 0 && (
          <button
            onClick={() => setShowBulkDeleteModal(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold"
          >
            Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Product Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase tracking-widest">
                <th className="px-6 py-4 font-bold cursor-pointer hover:text-violet-600 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">Product <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4 font-bold">Category</th>
                {isAdmin && (
                  <th className="px-6 py-4 font-bold cursor-pointer hover:text-violet-600 transition-colors" onClick={() => handleSort('costPrice')}>
                    <div className="flex items-center gap-2">Cost <ArrowUpDown size={12} /></div>
                  </th>
                )}
                <th className="px-6 py-4 font-bold cursor-pointer hover:text-violet-600 transition-colors" onClick={() => handleSort('sellingPrice')}>
                  <div className="flex items-center gap-2">Price <ArrowUpDown size={12} /></div>
                </th>
                <th className="px-6 py-4 font-bold cursor-pointer hover:text-violet-600 transition-colors" onClick={() => handleSort('stockQuantity')}>
                  <div className="flex items-center gap-2">Stock <ArrowUpDown size={12} /></div>
                </th>
                {isAdmin && (
                  <th className="px-3 py-4 font-bold text-right">
                    <input
                      type="checkbox"
                      checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                )}
                {isAdmin && <th className="px-6 py-4 font-bold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-slate-900 font-semibold group-hover:text-violet-600 transition-colors">{product.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      product.category === 'device' ? "bg-blue-100 text-blue-700" :
                      product.category === 'coil' ? "bg-emerald-100 text-emerald-700" :
                      "bg-fuchsia-100 text-fuchsia-700"
                    )}>
                      {product.category}
                    </span>
                  </td>
                  {isAdmin && <td className="px-6 py-4 text-sm text-slate-500 font-medium">{formatCurrency(product.costPrice)}</td>}
                  <td className="px-6 py-4 text-sm text-slate-900 font-bold">{formatCurrency(product.sellingPrice)}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "font-bold text-sm",
                      product.stockQuantity <= (product.minStockLevel || 2) ? "text-amber-600" : "text-slate-900"
                    )}>
                      {product.category === 'e-liquid'
                        ? (() => {
                            const size = parseBottleSizeMl(product.bottleSize, 30);
                            const bottles = Math.floor(product.stockQuantity / size);
                            const ml = Math.round(product.stockQuantity % size);
                            return `${bottles} Bottles and ${ml} ml`;
                          })()
                        : `${product.stockQuantity} ${product.unit || 'pcs'}`}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-4 text-right">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={(e) => toggleSelectOne(product.id, e.target.checked)}
                      />
                    </td>
                  )}
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {product.category === 'e-liquid' && (
                          <button
                            onClick={() => setShowBottleModal(product)}
                            className="p-2 hover:bg-sky-50 rounded-lg text-slate-400 hover:text-sky-600 transition-all"
                            title="View Bottles"
                          >
                            <Package size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => setEditingProduct(product)}
                          className="p-2 hover:bg-violet-50 rounded-lg text-slate-400 hover:text-violet-600 transition-all" 
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all" 
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="text-slate-400" size={32} />
            </div>
            <p className="text-slate-500 font-medium">No products found.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {(showAddModal || editingProduct) && (
        <ProductModal 
          product={editingProduct} 
          onClose={() => {
            setShowAddModal(false);
            setEditingProduct(null);
          }} 
        />
      )}

      {showBottleModal && (
        <BottleModal product={showBottleModal} onClose={() => setShowBottleModal(null)} />
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Bulk Import Preview</h2>
                <p className="text-xs text-slate-500 mt-1">
                  File: {importFileName || 'N/A'} | {importMode === 'eliquid'
                    ? 'E-Liquid mode: required columns Name, Price, Stock, BottleSize/ML (Category optional).'
                    : 'Device/Coil mode: columns Name, Price, Category, Stock. E-liquid rows are skipped for safety.'} Selling price is auto set (+65%, ×{IMPORT_SELLING_MULTIPLIER}).
                </p>
              </div>
              <button
                onClick={() => {
                  if (!uploadingImport) {
                    setShowImportModal(false);
                    setImportRows([]);
                  }
                }}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
                disabled={uploadingImport}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rows Found</p>
                  <p className="text-2xl font-black text-slate-900">{importRows.length}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Valid Products</p>
                  <p className="text-2xl font-black text-emerald-600">{importRows.filter(r => r.isValid).length}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Skipped Rows</p>
                  <p className="text-2xl font-black text-rose-600">{importRows.filter(r => !r.isValid).length}</p>
                </div>
              </div>

              {uploadingImport && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Uploading products...</span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-violet-600 transition-all duration-200" style={{ width: `${importProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase tracking-widest">
                      <th className="px-4 py-3 font-bold">Row</th>
                      <th className="px-4 py-3 font-bold">Name</th>
                      <th className="px-4 py-3 font-bold">Purchase</th>
                      <th className="px-4 py-3 font-bold">Selling (×1.65)</th>
                      <th className="px-4 py-3 font-bold">Category</th>
                      <th className="px-4 py-3 font-bold">Stock</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importRows.slice(0, 200).map((row, idx) => (
                      <tr key={`${row.rowNumber}-${idx}`} className="text-sm">
                        <td className="px-4 py-3 text-slate-500">{row.rowNumber}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.name || '-'}</td>
                        <td className="px-4 py-3 text-slate-700">{row.purchasePrice}</td>
                        <td className="px-4 py-3 text-slate-700">{row.sellingPrice}</td>
                        <td className="px-4 py-3 text-slate-700">{row.category}</td>
                        <td className="px-4 py-3 text-slate-700">{row.stock}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            row.isValid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          )}>
                            {row.isValid ? 'Valid' : row.reason}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    if (!uploadingImport) {
                      setShowImportModal(false);
                      setImportRows([]);
                    }
                  }}
                  disabled={uploadingImport}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={uploadingImport || importRows.filter(r => r.isValid).length === 0}
                  className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {uploadingImport ? 'Uploading...' : `Import ${importRows.filter(r => r.isValid).length} Product(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmBulkDeleteModal
        open={showBulkDeleteModal}
        count={selectedIds.length}
        title="Delete selected products?"
        busy={bulkDeleting}
        typedConfirm={deleteTyped}
        onTypedConfirmChange={setDeleteTyped}
        requirePassword={needsPassword}
        password={deletePassword}
        onPasswordChange={setDeletePassword}
        onClose={() => {
          if (bulkDeleting) return;
          setShowBulkDeleteModal(false);
          setDeleteTyped('');
          setDeletePassword('');
        }}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
};

const BottleModal: React.FC<{ product: any; onClose: () => void }> = ({ product, onClose }) => {
  const { shopId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bottles, setBottles] = useState<BottleDoc[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!shopId) return;
      setLoading(true);
      try {
        const { getDocs, query, collection, where, orderBy } = await import('firebase/firestore');
        const q = query(
          collection(db, `products/${product.id}/bottles`),
          where('shopId', '==', shopId),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(q);
        const rows: BottleDoc[] = snap.docs.map(d => {
          const data: any = d.data();
          return {
            id: d.id,
            bottleSize: Number(data.bottleSize) || parseBottleSizeMl(product.bottleSize, 30),
            remainingMl: Number(data.remainingMl) || 0,
            status: data.status,
            createdAt: data.createdAt,
            openedDate: data.openedDate,
            updatedAt: data.updatedAt
          };
        });
        if (active) setBottles(rows);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [product?.id, product?.bottleSize, shopId]);

  const counts = computeBottleStatusCounts(bottles);
  const availableMl = getAvailableMl(bottles);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Bottle Details - {product.name}</h2>
            <p className="text-slate-500 text-sm">Bottle Size: {parseBottleSizeMl(product.bottleSize, 30)}ml</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="glass-card p-4 md:col-span-2">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Available ML</p>
              <p className="text-2xl font-black text-slate-900">{availableMl}ml</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
              <p className="text-emerald-700 text-[10px] font-bold uppercase tracking-widest mb-1">Closed</p>
              <p className="text-2xl font-black text-emerald-800">{counts.closed}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-amber-700 text-[10px] font-bold uppercase tracking-widest mb-1">Opened</p>
              <p className="text-2xl font-black text-amber-800">{counts.opened}</p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
              <p className="text-rose-700 text-[10px] font-bold uppercase tracking-widest mb-1">Empty</p>
              <p className="text-2xl font-black text-rose-800">{counts.empty}</p>
            </div>
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4">
              <p className="text-sky-700 text-[10px] font-bold uppercase tracking-widest mb-1">Sold</p>
              <p className="text-2xl font-black text-sky-800">{counts.sold}</p>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="text-slate-900 font-bold">Individual Bottles</p>
              {loading && <p className="text-slate-400 text-sm font-semibold">Loading…</p>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase tracking-widest">
                    <th className="px-6 py-4 font-bold">Bottle ID</th>
                    <th className="px-6 py-4 font-bold">Capacity</th>
                    <th className="px-6 py-4 font-bold">Remaining ML</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold">Opened Date</th>
                    <th className="px-6 py-4 font-bold">Created</th>
                    <th className="px-6 py-4 font-bold">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bottles.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{b.id.slice(-6).toUpperCase()}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">{b.bottleSize}ml</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{b.remainingMl}ml</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          b.status === 'closed' ? "bg-emerald-100 text-emerald-700" :
                          b.status === 'opened' ? "bg-amber-100 text-amber-700" :
                          b.status === 'empty' ? "bg-rose-100 text-rose-700" :
                          "bg-sky-100 text-sky-700"
                        )}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {b.openedDate?.toDate ? b.openedDate.toDate().toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {b.createdAt?.toDate ? b.createdAt.toDate().toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {b.updatedAt?.toDate ? b.updatedAt.toDate().toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                  {bottles.length === 0 && !loading && (
                    <tr>
                      <td className="px-6 py-10 text-center text-slate-400 font-medium" colSpan={7}>
                        No bottles found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Simplified ProductModal — no Brand, no Min Stock Level (hardcoded to 2) */
const ProductModal: React.FC<{ product?: any, onClose: () => void }> = ({ product, onClose }) => {
  const { shopId, currentUser, userRole } = useAuth();
  const isEditing = !!product;
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category: product?.category || 'device',
    costPrice: isEditing ? (product?.costPrice || 0) : '',
    sellingPrice: isEditing ? (product?.sellingPrice || 0) : '',
    stockQuantity: isEditing ? (product?.stockQuantity || 0) : '',
    bottleSize: product?.bottleSize || (product ? '' : '30'),
    pricePerMl: isEditing ? (product?.pricePerMl || 0) : 100
  });
  const [addBottleCount, setAddBottleCount] = useState<number | string>('');
  const [removeStockCount, setRemoveStockCount] = useState<number | string>('');
  const [saving, setSaving] = useState(false);

  /** Helper: auto-select on focus for numeric inputs */
  const handleNumericFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const costPrice = Number(formData.costPrice) || 0;
    const sellingPrice = Number(formData.sellingPrice) || 0;
    const stockQuantity = Number(formData.stockQuantity) || 0;
    const pricePerMl = Number(formData.pricePerMl) || 0;

    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (sellingPrice <= 0) {
      toast.error('Selling price must be greater than 0');
      return;
    }
    // Guard: shopId must be resolved before writing
    if (!shopId) {
      toast.error('Shop ID not loaded yet. Please wait a moment and try again.');
      return;
    }

    setSaving(true);
    try {
      const actorMeta = buildActorMeta({ currentUser, userRole });
      const finalUnit = formData.category === 'e-liquid' ? 'bottle' : 'piece';
      if (isEditing) {
        const productRef = doc(db, 'products', product.id);
        const isELiquid = formData.category === 'e-liquid';
        const bottleSizeMl = parseBottleSizeMl(formData.bottleSize, 30);
        const bottlesToAdd = isELiquid ? Math.max(0, Math.floor(Number(addBottleCount) || 0)) : 0;
        const mlToAdd = bottlesToAdd > 0 ? bottleSizeMl * bottlesToAdd : 0;
        const removeCount = Math.max(0, Math.floor(Number(removeStockCount) || 0));

        // --- Manual Stock Deduction validation ---
        if (removeCount > 0) {
          if (isELiquid) {
            const mlToRemove = removeCount * bottleSizeMl;
            if (mlToRemove > (Number(product.stockQuantity) || 0)) {
              toast.error(`Cannot remove ${removeCount} bottle(s). Only ${Math.floor((Number(product.stockQuantity) || 0) / bottleSizeMl)} available.`);
              setSaving(false);
              return;
            }
          } else {
            if (removeCount > stockQuantity) {
              toast.error(`Cannot remove ${removeCount} units. Only ${stockQuantity} in stock.`);
              setSaving(false);
              return;
            }
          }
        }

        // --- Weighted Average Cost calculation ---
        let finalCostPrice = costPrice;
        let finalUnitCostPerMl = costPrice / (bottleSizeMl || 1);

        if (isELiquid && mlToAdd > 0) {
          // E-Liquid: weighted average in per-ml terms
          const currentMl = Number(product.stockQuantity) || 0;
          const currentCostPerMl = Number(product.unitCostPerMl) || (Number(product.costPrice) / (parseBottleSizeMl(product.bottleSize, 30) || 1));
          const newCostPerMl = Number(costPrice) / (bottleSizeMl || 1);
          const totalMl = currentMl + mlToAdd;
          finalUnitCostPerMl = totalMl > 0
            ? ((currentMl * currentCostPerMl) + (mlToAdd * newCostPerMl)) / totalMl
            : newCostPerMl;
          finalCostPrice = Math.round(finalUnitCostPerMl * bottleSizeMl * 100) / 100;
          finalUnitCostPerMl = Math.round(finalUnitCostPerMl * 100) / 100;
        } else if (!isELiquid) {
          // Regular product: weighted average cost if stock increased
          const currentStock = Number(product.stockQuantity) || 0;
          const currentCost = Number(product.costPrice) || 0;
          const addedStock = stockQuantity - currentStock;
          if (addedStock > 0 && costPrice !== currentCost) {
            const totalStock = currentStock + addedStock;
            finalCostPrice = totalStock > 0
              ? Math.round(((currentStock * currentCost) + (addedStock * costPrice)) / totalStock * 100) / 100
              : costPrice;
          }
        }

        // Build update payload
        const updatePayload: Record<string, any> = {
          name: formData.name,
          category: formData.category,
          costPrice: finalCostPrice,
          sellingPrice,
          unit: finalUnit,
          bottleSize: formData.bottleSize,
          shopId,
          updatedAt: serverTimestamp()
        };

        if (isELiquid) {
          updatePayload.unitCostPerMl = finalUnitCostPerMl;
          updatePayload.pricePerMl = pricePerMl;
          if (mlToAdd > 0) {
            updatePayload.stockQuantity = increment(mlToAdd);
          } else {
            updatePayload.stockQuantity = stockQuantity;
          }
        } else {
          updatePayload.stockQuantity = stockQuantity;
        }

        // Handle stock removal
        if (removeCount > 0) {
          if (isELiquid) {
            const mlToRemove = removeCount * bottleSizeMl;
            updatePayload.stockQuantity = increment(-mlToRemove);
          } else {
            updatePayload.stockQuantity = stockQuantity - removeCount;
          }
        }

        await updateDoc(productRef, updatePayload);

        // --- E-Liquid: handle bottle additions ---
        if (isELiquid && bottlesToAdd > 0) {
          for (let i = 0; i < bottlesToAdd; i++) {
            await addDoc(collection(db, `products/${product.id}/bottles`), {
              shopId,
              bottleSize: bottleSizeMl,
              remainingMl: bottleSizeMl,
              status: 'closed',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
          await addDoc(collection(db, 'inventoryLogs'), {
            productId: product.id,
            productName: formData.name,
            shopId,
            action: 'addition',
            type: 'addition',
            mlChange: mlToAdd,
            change: mlToAdd,
            quantityChange: bottlesToAdd,
            newStockMl: (Number(product?.stockQuantity) || 0) + mlToAdd,
            newStock: (Number(product?.stockQuantity) || 0) + mlToAdd,
            reason: 'Stock addition',
            notes: `Added ${bottlesToAdd} bottle(s)`,
            ...actorMeta,
            createdAt: serverTimestamp(),
            createdAtClient: new Date()
          });
        }

        // --- E-Liquid: handle bottle removals ---
        if (isELiquid && removeCount > 0) {
          const mlToRemove = removeCount * bottleSizeMl;
          // Find closed bottles to delete (LIFO - most recent first)
          const closedQuery = query(
            collection(db, `products/${product.id}/bottles`),
            where('shopId', '==', shopId),
            where('status', '==', 'closed'),
            orderBy('createdAt', 'desc')
          );
          const closedSnap = await getDocs(closedQuery);
          const toDelete = closedSnap.docs.slice(0, removeCount);
          for (const bottleDoc of toDelete) {
            await deleteDoc(bottleDoc.ref);
          }
          await addDoc(collection(db, 'inventoryLogs'), {
            productId: product.id,
            productName: formData.name,
            shopId,
            action: 'deduction',
            type: 'deduction',
            mlChange: -mlToRemove,
            change: -mlToRemove,
            quantityChange: -removeCount,
            newStockMl: Math.max(0, (Number(product?.stockQuantity) || 0) - mlToRemove),
            newStock: Math.max(0, (Number(product?.stockQuantity) || 0) - mlToRemove),
            reason: 'Manual stock deduction',
            notes: `Removed ${removeCount} bottle(s)`,
            ...actorMeta,
            createdAt: serverTimestamp(),
            createdAtClient: new Date()
          });
        }

        // --- Regular product: handle stock difference logging ---
        if (!isELiquid) {
          const finalStock = removeCount > 0 ? stockQuantity - removeCount : stockQuantity;
          const currentStock = Number(product.stockQuantity) || 0;
          const netChange = finalStock - currentStock;
          
          if (netChange !== 0) {
            await addDoc(collection(db, 'inventoryLogs'), {
              productId: product.id,
              productName: formData.name,
              shopId,
              action: netChange > 0 ? 'addition' : 'deduction',
              type: netChange > 0 ? 'addition' : 'deduction',
              change: netChange,
              quantityChange: netChange,
              newStock: Math.max(0, finalStock),
              reason: removeCount > 0 && netChange < 0 ? 'Manual stock deduction' : 'Stock adjustment',
              notes: netChange > 0 ? `Added ${netChange} unit(s)` : `Removed ${Math.abs(netChange)} unit(s)`,
              ...actorMeta,
              createdAt: serverTimestamp(),
              createdAtClient: new Date()
            });
          }
        }

        toast.success('Product updated successfully');
      } else {
        const isELiquid = formData.category === 'e-liquid';
        const bottleSizeMl = parseBottleSizeMl(formData.bottleSize, 30);
        const initialBottleCount = isELiquid ? Math.max(0, Math.floor(stockQuantity || 0)) : 0;
        const initialMl = isELiquid ? bottleSizeMl * initialBottleCount : stockQuantity;
        const unitCostPerMl = costPrice / (bottleSizeMl || 1);
        const productData = {
          name: formData.name,
          category: formData.category,
          costPrice,
          sellingPrice,
          stockQuantity: initialMl,
          minStockLevel: isELiquid ? bottleSizeMl * 2 : 2,
          unit: finalUnit,
          bottleSize: formData.bottleSize,
          ...(isELiquid ? { unitCostPerMl, pricePerMl } : {}),
          brand: '',
          shopId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'products'), productData);

        // Log the initial stock
        await addDoc(collection(db, 'inventoryLogs'), {
          productId: docRef.id,
          productName: formData.name,
          shopId,
          action: 'addition',
          type: 'addition',
          ...(isELiquid
            ? {
                mlChange: initialMl,
                change: initialMl,
                quantityChange: initialBottleCount,
                newStockMl: initialMl,
                newStock: initialMl
              }
            : {
                change: stockQuantity,
                quantityChange: stockQuantity,
                newStock: stockQuantity
              }),
          reason: 'Initial stock',
          notes: 'Initial stock',
          ...actorMeta,
          createdAt: serverTimestamp(),
          createdAtClient: new Date()
        });

        // If e-liquid, create individual bottle sub-documents
        if (formData.category === 'e-liquid' && initialBottleCount > 0) {
          for (let i = 0; i < initialBottleCount; i++) {
            await addDoc(collection(db, `products/${docRef.id}/bottles`), {
              shopId,
              bottleSize: bottleSizeMl,
              remainingMl: bottleSizeMl,
              status: 'closed',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        }

        toast.success('Product added successfully');
      }
      onClose();
    } catch (error: any) {
      console.error('Product save error:', error);
      const code = error?.code ? ` (${error.code})` : '';
      toast.error((error?.message || (isEditing ? 'Failed to update product' : 'Failed to add product')) + code);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Product Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Name *</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. Vaporesso XROS 3"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">Category</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
              disabled={isEditing}
            >
              <option value="device">Device</option>
              <option value="coil">Coil</option>
              <option value="e-liquid">E-Liquid</option>
            </select>
          </div>

          {/* Cost + Selling Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cost Price (Rs)</label>
              <input 
                required
                type="number" 
                value={formData.costPrice}
                onChange={(e) => setFormData({...formData, costPrice: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0)})}
                onFocus={handleNumericFocus}
                placeholder="0"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selling Price (Rs) *</label>
              <input 
                required
                type="number" 
                value={formData.sellingPrice}
                onChange={(e) => setFormData({...formData, sellingPrice: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0)})}
                onFocus={handleNumericFocus}
                placeholder="0"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Stock */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {formData.category === 'e-liquid'
                ? isEditing
                  ? 'Available ML (read-only)'
                  : 'Initial Bottle Count'
                : isEditing
                  ? 'Current Stock'
                  : 'Initial Stock'}
            </label>
            <input 
              required
              type="number" 
              value={formData.stockQuantity}
              onChange={(e) => setFormData({...formData, stockQuantity: e.target.value === '' ? '' : (parseInt(e.target.value) || 0)})}
              onFocus={handleNumericFocus}
              placeholder="0"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
              disabled={isEditing && formData.category === 'e-liquid'}
            />

            {/* E-Liquid: Add / Remove Bottles */}
            {isEditing && formData.category === 'e-liquid' && (
              <div className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Add Bottles</label>
                    <input
                      type="number"
                      min={0}
                      value={addBottleCount}
                      onChange={(e) => setAddBottleCount(e.target.value === '' ? '' : (parseInt(e.target.value) || 0))}
                      onFocus={handleNumericFocus}
                      placeholder="0"
                      className="w-full px-4 py-2.5 bg-white border border-emerald-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ML To Add</label>
                    <input
                      type="text"
                      value={`${parseBottleSizeMl(formData.bottleSize, 30) * Math.max(0, Math.floor(Number(addBottleCount) || 0))} ml`}
                      readOnly
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-semibold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Remove Bottles</label>
                    <input
                      type="number"
                      min={0}
                      value={removeStockCount}
                      onChange={(e) => setRemoveStockCount(e.target.value === '' ? '' : (parseInt(e.target.value) || 0))}
                      onFocus={handleNumericFocus}
                      placeholder="0"
                      className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ML To Remove</label>
                    <input
                      type="text"
                      value={`${parseBottleSizeMl(formData.bottleSize, 30) * Math.max(0, Math.floor(Number(removeStockCount) || 0))} ml`}
                      readOnly
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-rose-500 font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Non-E-Liquid: Remove Stock */}
            {isEditing && formData.category !== 'e-liquid' && (
              <div className="pt-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Remove Stock (units)</label>
                  <input
                    type="number"
                    min={0}
                    value={removeStockCount}
                    onChange={(e) => setRemoveStockCount(e.target.value === '' ? '' : (parseInt(e.target.value) || 0))}
                    onFocus={handleNumericFocus}
                    placeholder="0"
                    className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* E-Liquid specific */}
          {formData.category === 'e-liquid' && (
            <div className="p-4 bg-violet-50 border border-violet-100 rounded-xl space-y-4">
              <h3 className="text-violet-600 font-bold text-sm">Bottle Size & Pricing</h3>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bottle Size (ml)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 30, 60"
                    value={formData.bottleSize}
                    onChange={(e) => setFormData({...formData, bottleSize: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Refill Price Per ML (Rs)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 100"
                    value={formData.pricePerMl}
                    onChange={(e) => setFormData({...formData, pricePerMl: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0)})}
                    onFocus={handleNumericFocus}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                  />
                </div>
                <div className="p-3 bg-white/50 rounded-lg border border-violet-100/50">
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-1">Unit Cost Per ML</p>
                  <p className="text-sm font-bold text-violet-600">
                    {formatCurrency(formData.costPrice / (parseBottleSizeMl(formData.bottleSize, 30) || 1))}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all uppercase tracking-widest text-xs"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={saving || !shopId}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-xl shadow-lg shadow-violet-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
            >
              {saving ? 'Saving...' : isEditing ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Stock;
