import { doc, increment, collection, serverTimestamp, writeBatch, getDoc, WriteBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { parseBottleSizeMl } from './bottles';

export const reverseSaleImpact = async (sale: any, shopId: string, actorMeta: any, batch: WriteBatch, isEdit: boolean = false) => {
  // Reverse inventory changes
  for (const item of sale.items) {
    const productRef = doc(db, 'products', item.productId);
    const productSnap = await getDoc(productRef);

    const isELiquidLine = item.saleType === 'refill' || item.saleType === 'full_bottle';
    if (isELiquidLine) {
      const bottleSizeMl = parseBottleSizeMl(item.bottleSize, 30);
      const mlToRestore =
        item.saleType === 'refill'
          ? (Number(item.refillAmount) || 0) * (Number(item.quantity) || 0)
          : bottleSizeMl * (Number(item.quantity) || 0);

      if (mlToRestore > 0 && productSnap.exists()) {
        batch.update(productRef, { stockQuantity: increment(mlToRestore) });
      }

      const bottleChanges: any[] = Array.isArray(item.bottleChanges) ? item.bottleChanges : [];
      for (const bc of bottleChanges) {
        if (!bc?.bottleId) continue;
        const bottleRef = doc(db, `products/${item.productId}/bottles`, bc.bottleId);
        const bottleSnap = await getDoc(bottleRef);
        if (bottleSnap.exists()) {
          batch.update(bottleRef, {
            remainingMl: Number(bc.beforeRemainingMl) || 0,
            status: bc.beforeStatus || 'closed',
            openedDate: bc.beforeOpenedDate || null,
            updatedAt: serverTimestamp()
          });
        }
      }

      const logRef = doc(collection(db, 'inventoryLogs'));
      batch.set(logRef, {
        productId: item.productId,
        productName: item.productName || 'Unknown Product',
        shopId,
        action: 'return',
        type: 'return',
        mlChange: mlToRestore,
        change: mlToRestore,
        quantityChange: item.saleType === 'full_bottle' ? Number(item.quantity) || 0 : 0,
        reason: isEdit ? `Sale edited (restored old): ${(sale.id ? sale.id.slice(-6).toUpperCase() : '') || sale.id}` : `Sale deleted (restored): ${(sale.id ? sale.id.slice(-6).toUpperCase() : '') || sale.id}`,
        notes: productSnap.exists() ? `Inventory restored` : `Product was missing`,
        ...actorMeta,
        createdAt: serverTimestamp(),
        createdAtClient: new Date()
      });
    } else {
      if (productSnap.exists()) {
        batch.update(productRef, { stockQuantity: increment(item.quantity) });
      }

      const logRef = doc(collection(db, 'inventoryLogs'));
      batch.set(logRef, {
        productId: item.productId,
        productName: item.productName || 'Unknown Product',
        shopId,
        action: 'return',
        type: 'return',
        change: Number(item.quantity) || 0,
        quantityChange: item.quantity,
        reason: isEdit ? `Sale edited (restored old): ${(sale.id ? sale.id.slice(-6).toUpperCase() : '') || sale.id}` : `Sale deleted (restored): ${(sale.id ? sale.id.slice(-6).toUpperCase() : '') || sale.id}`,
        notes: productSnap.exists() ? `Inventory restored` : `Product was missing`,
        ...actorMeta,
        createdAt: serverTimestamp(),
        createdAtClient: new Date()
      });
    }
  }

  // Reverse credit if applicable
  let creditToReverse = 0;
  if (sale.paymentMethod === 'credit') {
    creditToReverse = sale.totalAmount;
  } else if (sale.paymentMethod === 'split') {
    creditToReverse = sale.splitAmounts?.credit || 0;
  }

  if (creditToReverse > 0 && sale.customerId) {
    const customerRef = doc(db, 'customers', sale.customerId);
    const customerSnap = await getDoc(customerRef);
    if (customerSnap.exists()) {
      batch.update(customerRef, { creditBalance: increment(-creditToReverse) });
    }
  }
};

export const deleteSaleWithReversal = async (sale: any, shopId: string, actorMeta: any) => {
  if (!shopId) throw new Error('Shop not loaded');
  const batch = writeBatch(db);
  await reverseSaleImpact(sale, shopId, actorMeta, batch);
  batch.delete(doc(db, 'sales', sale.id));
  await batch.commit();
};
