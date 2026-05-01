import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  RefreshCw,
  X,
  Droplet,
  Droplets,
  Package,
  Receipt
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { formatCurrency, cn } from '../lib/utils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { applyRefillToBottles, computeBottleStatusCounts, getAvailableMl, orderBottlesForRefill, parseBottleSizeMl, type BottleDoc } from '../lib/bottles';
import { buildActorMeta } from '../lib/actor';

interface CartItem {
  productId: string;
  productName: string;
  category: string;
  unitPrice: number;
  quantity: number;
  saleType: 'regular' | 'refill' | 'full_bottle';
  refillAmount?: number;
  bottleSize?: number;
}

const NewSale: React.FC = () => {
  const { currentUser, shopId, userRole } = useAuth();
  const { documents: products, loading: productsLoading } = useFirestore<any>(
    shopId ? 'products' : null,
    where('shopId', '==', shopId)
  );
  const { documents: customers, loading: customersLoading } = useFirestore<any>(
    shopId ? 'customers' : null,
    where('shopId', '==', shopId)
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('vapetrax_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'credit' | 'return'>('cash');

  useEffect(() => {
    localStorage.setItem('vapetrax_cart', JSON.stringify(cart));
  }, [cart]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState<{ product: any } | null>(null);
  const [refillAmount, setRefillAmount] = useState<number>(3.0);
  const [refillModalBottles, setRefillModalBottles] = useState<BottleDoc[] | null>(null);
  const REFILL_PRICE_PER_ML = 100;
  const actorMeta = useMemo(() => buildActorMeta({ currentUser, userRole }), [currentUser, userRole]);

  // Show all products initially or filter by search, with out-of-stock sorted to bottom
  const displayProducts = useMemo(() => {
    let filtered = products;
    if (searchTerm) {
      filtered = products.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    // Sort: in-stock first (by name), then out-of-stock (by name)
    return [...filtered].sort((a, b) => {
      const aInStock = (a.stockQuantity || 0) > 0 ? 0 : 1;
      const bInStock = (b.stockQuantity || 0) > 0 ? 0 : 1;
      if (aInStock !== bInStock) return aInStock - bInStock;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [products, searchTerm]);

  /**
   * Calculates the total amount already reserved in the cart for a specific product.
   * For E-Liquids: returns total reserved MLs across ALL sale types (full_bottle + refill).
   * For Standard products: returns total reserved unit count.
   * @param excludeIndex - optionally exclude a cart item index (for updateQuantity checks)
   */
  const getCartReservedAmount = (productId: string, product: any, excludeIndex?: number): number => {
    const isELiquid = product?.category === 'e-liquid';
    const bottleSizeMl = parseBottleSizeMl(product?.bottleSize, 30);

    return cart.reduce((sum, item, idx) => {
      if (item.productId !== productId) return sum;
      if (excludeIndex !== undefined && idx === excludeIndex) return sum;

      if (isELiquid) {
        // E-Liquid: everything is calculated in ML
        if (item.saleType === 'full_bottle') {
          return sum + (item.quantity * (item.bottleSize || bottleSizeMl));
        }
        if (item.saleType === 'refill') {
          return sum + ((item.refillAmount || 0) * item.quantity);
        }
        return sum;
      } else {
        // Standard products: simple unit count
        return sum + item.quantity;
      }
    }, 0);
  };

  const addToCart = (product: any, type: 'regular' | 'refill' | 'full_bottle', amount?: number) => {
    if (product.stockQuantity <= 0) {
      toast.error('Product is out of stock');
      return;
    }

    const isELiquid = product.category === 'e-liquid';
    const availableStock = Number(product.stockQuantity) || 0;
    const bottleSizeMl = parseBottleSizeMl(product.bottleSize, 30);

    // --- Cart-wide stock validation (covers ALL sale types including refills) ---
    const reservedAmount = getCartReservedAmount(product.id, product);

    if (isELiquid) {
      // E-Liquid: validate in ML
      const requestedMl = type === 'full_bottle' ? bottleSizeMl : (type === 'refill' ? (amount || 0) : 1);
      if (reservedAmount + requestedMl > availableStock) {
        const remainingMl = Math.max(0, availableStock - reservedAmount);
        toast.error(`Not enough stock. You already have ${reservedAmount}ml in the cart. Only ${remainingMl}ml remaining.`);
        return;
      }
    } else {
      // Standard: validate in units
      if (reservedAmount + 1 > availableStock) {
        toast.error(`Not enough stock. Only ${availableStock} unit(s) available.`);
        return;
      }
    }

    const existingItemIndex = cart.findIndex(item =>
      item.productId === product.id && item.saleType === type && item.refillAmount === amount
    );

    if (existingItemIndex > -1) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += 1;
      setCart(newCart);
    } else {
      const refillMl = amount ?? 1;
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        category: product.category,
        // Refill pricing: use product.pricePerMl if available, otherwise fallback to REFILL_PRICE_PER_ML
        unitPrice: type === 'refill' ? refillMl * (Number(product.pricePerMl) || REFILL_PRICE_PER_ML) : product.sellingPrice,
        quantity: 1,
        saleType: type,
        refillAmount: type === 'refill' ? refillMl : undefined,
        bottleSize: bottleSizeMl
      }]);
    }
    toast.success(`${product.name} added`);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    const item = newCart[index];
    const newQty = Math.max(1, item.quantity + delta);

    // --- Cart-wide stock validation on increment ---
    if (delta > 0) {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        const isELiquid = product.category === 'e-liquid';
        const availableStock = Number(product.stockQuantity) || 0;
        const bottleSizeMl = parseBottleSizeMl(product.bottleSize, 30);

        // Reserved amount from OTHER cart items for this product
        const otherReserved = getCartReservedAmount(item.productId, product, index);

        // What THIS item would reserve at the new quantity
        let thisItemReserved: number;
        if (isELiquid) {
          if (item.saleType === 'full_bottle') {
            thisItemReserved = newQty * (item.bottleSize || bottleSizeMl);
          } else if (item.saleType === 'refill') {
            thisItemReserved = (item.refillAmount || 0) * newQty;
          } else {
            thisItemReserved = newQty;
          }
        } else {
          thisItemReserved = newQty;
        }

        if (otherReserved + thisItemReserved > availableStock) {
          const remainingMl = Math.max(0, availableStock - otherReserved);
          toast.error(
            isELiquid
              ? `Cannot add more. Only ${remainingMl}ml remaining for ${item.productName}.`
              : `Cannot add more. Stock limit reached for ${item.productName}.`
          );
          return;
        }
      }
    }

    newCart[index].quantity = newQty;
    setCart(newCart);
  };

  const updateUnitPrice = (index: number, nextUnitPrice: number) => {
    const newCart = [...cart];
    newCart[index].unitPrice = Math.max(0, Number.isFinite(nextUnitPrice) ? nextUnitPrice : 0);
    setCart(newCart);
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  const tax = 0; // configurable later
  const totalAmount = subtotal + tax;

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (paymentMethod === 'credit' && !selectedCustomerId) {
      toast.error('Customer must be selected for credit sales');
      return;
    }

    // Guard: shopId must be resolved before any write
    if (!shopId) {
      toast.error('Shop not loaded yet. Please wait a moment and try again.');
      return;
    }

    setIsProcessing(true);
    const batch = writeBatch(db);

    try {
      const saleItems = [];

      for (const item of cart) {
        const productRef = doc(db, 'products', item.productId);

        if (item.saleType === 'refill') {
          const mlNeeded = (item.refillAmount || 0) * item.quantity;
          if (mlNeeded <= 0) {
            throw new Error(`Invalid refill amount for ${item.productName}`);
          }

          const bottlesQuery = query(
            collection(db, `products/${item.productId}/bottles`),
            where('shopId', '==', shopId)
          );
          const bottlesSnapshot = await getDocs(bottlesQuery);
          const bottles: BottleDoc[] = bottlesSnapshot.docs.map(d => {
            const data: any = d.data();
            return {
              id: d.id,
              bottleSize: Number(data.bottleSize) || (item.bottleSize || 30),
              remainingMl: Number(data.remainingMl) || 0,
              status: data.status,
              createdAt: data.createdAt,
              openedDate: data.openedDate,
              updatedAt: data.updatedAt
            };
          });

          const availableMl = getAvailableMl(bottles.filter(b => b.status !== 'sold'));
          if (availableMl < mlNeeded) {
            throw new Error(`Insufficient ml for ${item.productName}. Needed ${mlNeeded}ml, available ${availableMl}ml.`);
          }

          const ordered = orderBottlesForRefill(bottles);
          const { plans, mlApplied } = applyRefillToBottles({
            orderedBottles: ordered,
            mlNeeded,
            openedDateValue: serverTimestamp()
          });
          if (mlApplied !== mlNeeded) {
            throw new Error(`Unable to allocate full refill for ${item.productName}. Allocated ${mlApplied}ml of ${mlNeeded}ml.`);
          }

          const bottleChanges = [];
          for (const p of plans) {
            const bottleRef = doc(db, `products/${item.productId}/bottles`, p.bottleId);
            batch.update(bottleRef, {
              remainingMl: p.after.remainingMl,
              status: p.after.status,
              ...(p.after.openedDate ? { openedDate: p.after.openedDate } : {}),
              updatedAt: serverTimestamp()
            });
            bottleChanges.push({
              bottleId: p.bottleId,
              beforeRemainingMl: p.before.remainingMl,
              afterRemainingMl: p.after.remainingMl,
              beforeStatus: p.before.status,
              afterStatus: p.after.status,
              beforeOpenedDate: p.before.openedDate || null,
              // IMPORTANT: never store FieldValue(serverTimestamp()) inside `sales.items` arrays.
              // `openedDate` after state is reflected in the Bottle document itself.
              afterOpenedDate: null
            });
          }

          batch.update(productRef, {
            stockQuantity: increment(-mlNeeded)
          });

          const productData = products.find(p => p.id === item.productId);
          const bottleSizeMl = parseBottleSizeMl(productData?.bottleSize, item.bottleSize || 30);
          const itemCostPrice = (productData?.costPrice || 0) / bottleSizeMl * (item.refillAmount || 0);

          const profit = (item.unitPrice * item.quantity) - (itemCostPrice * item.quantity);
          saleItems.push({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: itemCostPrice,
            totalPrice: item.unitPrice * item.quantity,
            totalCost: itemCostPrice * item.quantity,
            profit,
            saleType: item.saleType,
            refillAmount: item.refillAmount || null,
            bottleSize: bottleSizeMl,
            bottleChanges
          });

          const logRef = doc(collection(db, 'inventoryLogs'));
          batch.set(logRef, {
            productId: item.productId,
            productName: item.productName,
            shopId,
            action: 'sale',
            type: 'sale',
            mlChange: -mlNeeded,
            change: -mlNeeded,
            quantityChange: 0,
            newStockMl: (products.find(p => p.id === item.productId)?.stockQuantity || 0) - mlNeeded,
            newStock: (products.find(p => p.id === item.productId)?.stockQuantity || 0) - mlNeeded,
            reason: `Sale: ${item.saleType}`,
            notes: `Refill ${item.refillAmount}ml x ${item.quantity}`,
            ...actorMeta,
            createdAt: serverTimestamp(),
            createdAtClient: new Date()
          });

        } else if (item.saleType === 'full_bottle') {
          const productData = products.find(p => p.id === item.productId);
          const bottleSizeMl = parseBottleSizeMl(productData?.bottleSize, item.bottleSize || 30);
          const closedBottlesQuery = query(
            collection(db, `products/${item.productId}/bottles`),
            where('shopId', '==', shopId),
            where('status', '==', 'closed'),
            orderBy('createdAt', 'asc'),
            limit(item.quantity)
          );
          const closedSnapshot = await getDocs(closedBottlesQuery);

          if (closedSnapshot.docs.length < item.quantity) {
            throw new Error(`Not enough full bottles for ${item.productName}`);
          }

          const bottleChanges = [];
          closedSnapshot.docs.forEach(bottleDoc => {
            const data: any = bottleDoc.data();
            batch.update(bottleDoc.ref, {
              status: 'sold',
              remainingMl: 0,
              updatedAt: serverTimestamp()
            });
            bottleChanges.push({
              bottleId: bottleDoc.id,
              beforeRemainingMl: Number(data.remainingMl) || bottleSizeMl,
              afterRemainingMl: 0,
              beforeStatus: data.status || 'closed',
              afterStatus: 'sold',
              beforeOpenedDate: data.openedDate || null,
              afterOpenedDate: data.openedDate || null
            });
          });

          batch.update(productRef, {
            stockQuantity: increment(-(bottleSizeMl * item.quantity))
          });

          const itemCostPrice = Number(productData?.costPrice) || 0;
          const profit = (item.unitPrice * item.quantity) - (itemCostPrice * item.quantity);
          saleItems.push({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: itemCostPrice,
            totalPrice: item.unitPrice * item.quantity,
            totalCost: itemCostPrice * item.quantity,
            profit,
            saleType: item.saleType,
            refillAmount: null,
            bottleSize: bottleSizeMl,
            bottleChanges
          });

          const logRef = doc(collection(db, 'inventoryLogs'));
          batch.set(logRef, {
            productId: item.productId,
            productName: item.productName,
            shopId,
            action: 'sale',
            type: 'sale',
            mlChange: -(bottleSizeMl * item.quantity),
            change: -(bottleSizeMl * item.quantity),
            quantityChange: -item.quantity,
            newStockMl: (products.find(p => p.id === item.productId)?.stockQuantity || 0) - (bottleSizeMl * item.quantity),
            newStock: (products.find(p => p.id === item.productId)?.stockQuantity || 0) - (bottleSizeMl * item.quantity),
            reason: `Sale: ${item.saleType}`,
            notes: `Full bottle x ${item.quantity}`,
            ...actorMeta,
            createdAt: serverTimestamp(),
            createdAtClient: new Date()
          });
        } else {
          batch.update(productRef, {
            stockQuantity: increment(-item.quantity)
          });
          const productData = products.find(p => p.id === item.productId);
          const itemCostPrice = Number(productData?.costPrice) || 0;
          const profit = (item.unitPrice * item.quantity) - (itemCostPrice * item.quantity);
          saleItems.push({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: itemCostPrice,
            totalPrice: item.unitPrice * item.quantity,
            totalCost: itemCostPrice * item.quantity,
            profit,
            saleType: item.saleType,
            refillAmount: null
          });

          const logRef = doc(collection(db, 'inventoryLogs'));
          batch.set(logRef, {
            productId: item.productId,
            productName: item.productName,
            shopId,
            action: 'sale',
            type: 'sale',
            change: -item.quantity,
            quantityChange: -item.quantity,
            newStock: (products.find(p => p.id === item.productId)?.stockQuantity || 0) - item.quantity,
            reason: `Sale: ${item.saleType}`,
            notes: `Sale: ${item.saleType}`,
            ...actorMeta,
            createdAt: serverTimestamp(),
            createdAtClient: new Date()
          });
        }
      }

      const totalCOGS = saleItems.reduce((acc, item) => acc + (item.totalCost || 0), 0);
      const totalProfit = totalAmount - totalCOGS;

      const saleRef = doc(collection(db, 'sales'));
      batch.set(saleRef, {
        customerId: selectedCustomerId,
        shopId,
        totalAmount,
        totalCOGS,
        totalProfit,
        paymentMethod,
        saleDate: serverTimestamp(),
        saleDateClient: new Date(),
        items: saleItems,
        ...actorMeta
      });

      if (paymentMethod === 'credit' && selectedCustomerId) {
        const customerRef = doc(db, 'customers', selectedCustomerId);
        batch.update(customerRef, {
          creditBalance: increment(totalAmount)
        });
      }

      // Optimistic POS: write to local cache immediately and let Firestore sync in the background.
      const pendingCommit = batch.commit();
      setCart([]);
      setSelectedCustomerId(null);
      setPaymentMethod('cash');
      setIsProcessing(false);
      toast.success('Sale saved instantly. Syncing in background...');

      void pendingCommit.catch((error: any) => {
        console.error('Sale background sync error:', error);
        toast.error('Sale saved locally, but sync is delayed. It will retry automatically.');
      });
      return;
    } catch (error: any) {
      console.error('Sale completion error:', error);
      const code = error?.code ? ` (${error.code})` : '';
      toast.error((error?.message || 'Failed to complete sale') + code);
      setIsProcessing(false);
    }
  };

  if (productsLoading || customersLoading) return <LoadingSpinner />;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 w-full h-[calc(100vh-112px)] min-h-[700px] animate-in fade-in duration-500 pb-2">
      {/* Left Panel: Product Selection */}
      <div className="flex flex-col gap-6 min-w-0 h-full overflow-hidden">
        {/* Header */}
        <div className="shrink-0">
          <h1 className="text-[32px] font-extrabold text-slate-900 tracking-tight">Billing</h1>
          <p className="text-slate-400 mt-1 text-base">Select products to generate a new bill.</p>
        </div>

        {/* Search Bar */}
        <div className="relative shrink-0">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
          <input
            type="text"
            placeholder="Search by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 text-lg placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-300 transition-all shadow-sm h-16"
          />
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 overflow-y-auto pb-6 pr-2 -mr-2 style-scrollbar">
          {displayProducts.map((product) => {
            const isOutOfStock = product.stockQuantity <= 0;
            const isELiquid = product.category === 'e-liquid';

            return (
              <div
                key={product.id}
                className={cn(
                  "bg-white border rounded-[24px] p-6 transition-all hover:shadow-lg group relative flex flex-col",
                  isOutOfStock
                    ? "border-slate-200 opacity-60"
                    : "border-slate-200 hover:border-violet-300"
                )}
              >
                {/* Stock Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                    isOutOfStock ? "bg-slate-100 text-slate-400" :
                      product.category === 'device' ? "bg-blue-100 text-blue-600" :
                        product.category === 'coil' ? "bg-emerald-100 text-emerald-600" :
                          "bg-violet-100 text-violet-600"
                  )}>
                    {isELiquid ? <Droplet size={24} /> : <Package size={24} />}
                  </div>
                  <span className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold tracking-wider",
                    isOutOfStock ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600"
                  )}>
                    {isELiquid
                      ? (() => {
                        const bSize = parseBottleSizeMl(product.bottleSize, 30);
                        const bottles = Math.floor((product.stockQuantity || 0) / bSize);
                        const ml = Math.round((product.stockQuantity || 0) % bSize);
                        return `${bottles} bottle ${ml}ml left`;
                      })()
                      : `${product.stockQuantity} Left`}
                  </span>
                </div>

                <div className="flex-1">
                  {/* Product Details */}
                  <h3 className="text-xl font-bold text-slate-900 mb-1 line-clamp-2 leading-tight">{product.name}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{product.category}</p>
                </div>

                {/* Price & Action */}
                <div className="flex items-end justify-between mt-auto">
                  <p className={cn(
                    "text-2xl font-extrabold tracking-tight",
                    isOutOfStock ? "text-slate-400" : "text-violet-600"
                  )}>
                    {formatCurrency(product.sellingPrice)}
                  </p>

                  {isELiquid ? (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setRefillModalBottles(null);
                          setRefillAmount(3);
                          setShowRefillModal({ product });
                          try {
                            if (!shopId) return;
                            const q = query(
                              collection(db, `products/${product.id}/bottles`),
                              where('shopId', '==', shopId)
                            );
                            const snap = await getDocs(q);
                            const bottles: BottleDoc[] = snap.docs.map(d => {
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
                            setRefillModalBottles(bottles);
                          } catch {
                            setRefillModalBottles(null);
                          }
                        }}
                        disabled={isOutOfStock}
                        className="w-12 h-12 flex items-center justify-center bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md active:scale-95"
                        title="Refill"
                      >
                        <Droplets size={22} />
                      </button>
                      <button
                        onClick={() => addToCart(product, 'full_bottle')}
                        disabled={isOutOfStock}
                        className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-violet-600 hover:text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md active:scale-95"
                        title="Full Bottle"
                      >
                        <Plus size={22} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(product, 'regular')}
                      disabled={isOutOfStock}
                      className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-violet-600 hover:text-white hover:shadow-md rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                      title="Add to cart"
                    >
                      <Plus size={22} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {displayProducts.length === 0 && (
            <div className="col-span-full py-24 text-center text-slate-400 flex flex-col items-center">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-sm">
                <Package size={40} className="text-slate-300" />
              </div>
              <p className="text-xl font-bold text-slate-500">No products found</p>
              <p className="text-slate-400 mt-2">Try adjusting your search terms.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Cart & Checkout */}
      <div className="flex flex-col bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm h-full min-h-0">
        {/* Cart Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
              <ShoppingCart size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Current Order</h2>
          </div>
          <span className="bg-violet-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">
            {cart.reduce((acc, i) => acc + i.quantity, 0)} Items
          </span>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 style-scrollbar">
          {cart.length > 0 ? (
            cart.map((item, index) => (
              <div key={index} className="bg-white p-4 rounded-[20px] border border-slate-100 flex flex-col gap-3 shadow-sm group hover:border-violet-200 transition-all">
                {/* Product Name - Top Row */}
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900 leading-tight block">{item.productName}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {item.saleType.replace('_', ' ')} {item.refillAmount ? `• ${item.refillAmount}ml` : ''}
                  </p>
                </div>

                {/* Bottom Row: Actions & Price */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1 border border-slate-100/50">
                    <button
                      onClick={() => updateQuantity(index, -1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg text-slate-600 transition-all hover:shadow-sm"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold text-slate-900 min-w-[20px] text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(index, 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg text-slate-600 transition-all hover:shadow-sm"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={item.unitPrice}
                        onChange={(e) => updateUnitPrice(index, parseFloat(e.target.value) || 0)}
                        className="w-[90px] text-right px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all touch-manipulation"
                      />
                      <p className="text-sm font-bold text-violet-600 mt-1">{formatCurrency(item.unitPrice * item.quantity)}</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(index)}
                      className="text-slate-300 hover:text-rose-500 p-1.5 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-200">
                <ShoppingCart size={40} className="text-slate-300" />
              </div>
              <p className="text-lg font-bold text-slate-600">Your cart is empty.</p>
              <p className="text-base text-slate-400 mt-2 text-center max-w-[200px]">Select products to start building an order.</p>
            </div>
          )}
        </div>

        {/* Checkout Section - Sticky Bottom */}
        <div className="shrink-0 sticky bottom-0 p-4 border-t border-slate-100 space-y-4 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 z-10">
          {/* Customer & Payment (compact) */}
          <div className="grid grid-cols-2 gap-4">
            <select
              value={selectedCustomerId || ''}
              onChange={(e) => setSelectedCustomerId(e.target.value || null)}
              className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-700 font-bold focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-300 transition-all shadow-sm"
            >
              <option value="">Walk-in Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-700 font-bold focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-300 transition-all shadow-sm"
            >
              <option value="cash">💵 Cash   </option>
              <option value="online">📱 Online  </option>
              <option value="credit">💳 Credit  </option>
              <option value="return">↩️ Return</option>
            </select>
          </div>

          {/* Totals */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center text-base">
              <span className="text-slate-500 font-medium">Subtotal</span>
              <span className="text-slate-900 font-bold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-base">
              <span className="text-slate-500 font-medium">Tax (0%)</span>
              <span className="text-slate-900 font-bold">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between items-end pt-4 mt-2 border-t border-slate-100">
              <span className="text-2xl font-black text-slate-900 mb-[2px]">Total</span>
              <span className="text-[32px] leading-none font-black text-violet-600 tracking-tight">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Generate Bill Button */}
          <button
            onClick={handleCompleteSale}
            disabled={isProcessing || cart.length === 0}
            className="w-full h-16 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-[20px] shadow-[0_8px_20px_-6px_rgba(139,92,246,0.5)] hover:shadow-[0_12px_24px_-8px_rgba(139,92,246,0.6)] focus:ring-4 focus:ring-violet-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3 text-lg"
          >
            {isProcessing ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Receipt size={24} />
                Generate Bill
              </>
            )}
          </button>
        </div>
      </div>

      {/* Refill Modal */}
      {showRefillModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in duration-300 overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">E-Liquid Refill</h2>
              <button onClick={() => setShowRefillModal(null)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors focus:ring-2 focus:ring-violet-500/20 outline-none"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{showRefillModal.product.name}</h3>
                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-50 rounded-full text-violet-600 font-bold text-sm uppercase tracking-widest shadow-sm">
                  <Droplets size={18} />
                  {showRefillModal.product.stockQuantity}ml Available
                </div>
                {refillModalBottles && (
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {(() => {
                      const counts = computeBottleStatusCounts(refillModalBottles);
                      return (
                        <>
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Closed</p>
                            <p className="text-xl font-black text-emerald-700">{counts.closed}</p>
                          </div>
                          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Opened</p>
                            <p className="text-xl font-black text-amber-700">{counts.opened}</p>
                          </div>
                          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600">Empty</p>
                            <p className="text-xl font-black text-rose-700">{counts.empty}</p>
                          </div>
                          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">Sold</p>
                            <p className="text-xl font-black text-sky-700">{counts.sold}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Refill Amount (ml)</label>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((val) => (
                    <button
                      key={val}
                      onClick={() => setRefillAmount(val)}
                      className={cn(
                        "py-5 rounded-[20px] border-2 text-xl font-black transition-all focus:outline-none focus:border-violet-400",
                        refillAmount === val
                          ? "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-600/30 scale-105"
                          : "bg-white border-slate-100 text-slate-500 hover:border-violet-200 hover:bg-violet-50 active:scale-95"
                      )}
                    >
                      {val}ml
                    </button>
                  ))}
                </div>
                <div className="pt-2">
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={refillAmount}
                    onChange={(e) => setRefillAmount(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-300 transition-all shadow-sm"
                    placeholder="Enter custom ml (e.g. 3)"
                  />
                </div>
              </div>

              <div className="p-5 bg-violet-50/50 rounded-2xl border border-violet-100 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Price</span>
                <span className="text-3xl font-black text-violet-600">
                  {formatCurrency(refillAmount * (Number(showRefillModal.product.pricePerMl) || REFILL_PRICE_PER_ML))}
                </span>
              </div>

              <button
                onClick={() => {
                  addToCart(showRefillModal.product, 'refill', refillAmount);
                  setShowRefillModal(null);
                }}
                className="w-full h-16 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-[20px] shadow-[0_8px_20px_-6px_rgba(139,92,246,0.5)] transition-all active:scale-[0.98] text-lg focus:ring-4 focus:ring-violet-500/30 outline-none"
              >
                Add Refill to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewSale;
