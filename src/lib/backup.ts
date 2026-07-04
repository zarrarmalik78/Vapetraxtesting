import { collection, getDocs, doc, writeBatch, query, where, collectionGroup, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTIONS = ['products', 'customers', 'sales', 'expenses', 'inventoryLogs', 'credits', 'stockAlerts'];

// Helper to chunk an array into sizes of 500 (Firestore batch limit)
const chunkArray = <T>(arr: T[], size: number): T[][] => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

export const exportBackup = async (shopId: string): Promise<void> => {
  if (!shopId) throw new Error('Shop not loaded');

  const backupData: Record<string, any[]> = {};

  // Fetch standard collections
  for (const col of COLLECTIONS) {
    const q = query(collection(db, col), where('shopId', '==', shopId));
    const snapshot = await getDocs(q);
    backupData[col] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Fetch settings separately
  const settingsDoc = await getDocs(query(collection(db, 'settings'), where('shopId', '==', shopId)));
  backupData['settings'] = settingsDoc.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Fetch bottles subcollection (assuming bottles have shopId stored on them)
  const bottlesQuery = query(collectionGroup(db, 'bottles'), where('shopId', '==', shopId));
  const bottlesSnapshot = await getDocs(bottlesQuery);
  backupData['bottles'] = bottlesSnapshot.docs.map(doc => ({
    id: doc.id,
    // We need the parent product ID to restore to the correct subcollection path
    parentProductId: doc.ref.parent.parent?.id,
    ...doc.data()
  }));

  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `vapetrax_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Update last backup date in settings
  try {
    await updateDoc(doc(db, 'settings', shopId), { lastBackupDate: serverTimestamp() });
  } catch (e) {
    console.warn('Failed to update last backup date', e);
  }
};

export const restoreBackup = async (shopId: string, file: File): Promise<void> => {
  if (!shopId) throw new Error('Shop not loaded');

  const text = await file.text();
  const backupData = JSON.parse(text);

  // Collect all operations to execute
  const operations: { type: 'set' | 'delete', ref: any, data?: any }[] = [];

  // 1. Delete existing documents to prevent ghost data
  for (const col of COLLECTIONS) {
    const q = query(collection(db, col), where('shopId', '==', shopId));
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(d => operations.push({ type: 'delete', ref: d.ref }));
  }

  // Delete existing bottles
  const bottlesQuery = query(collectionGroup(db, 'bottles'), where('shopId', '==', shopId));
  const bottlesSnapshot = await getDocs(bottlesQuery);
  bottlesSnapshot.docs.forEach(d => operations.push({ type: 'delete', ref: d.ref }));

  // 2. Queue setting imported data
  for (const col of COLLECTIONS) {
    if (backupData[col]) {
      for (const item of backupData[col]) {
        const { id, ...data } = item;
        operations.push({ type: 'set', ref: doc(db, col, id), data });
      }
    }
  }

  if (backupData['settings']) {
    for (const item of backupData['settings']) {
      const { id, ...data } = item;
      operations.push({ type: 'set', ref: doc(db, 'settings', id), data });
    }
  }

  if (backupData['bottles']) {
    for (const item of backupData['bottles']) {
      const { id, parentProductId, ...data } = item;
      if (parentProductId) {
        operations.push({ type: 'set', ref: doc(db, `products/${parentProductId}/bottles`, id), data });
      }
    }
  }

  // Execute in chunks of 500
  const chunks = chunkArray(operations, 500);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.type === 'set') batch.set(op.ref, op.data);
      else if (op.type === 'delete') batch.delete(op.ref);
    }
    await batch.commit();
  }
};
