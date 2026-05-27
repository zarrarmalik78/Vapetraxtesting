import { parseBottleSizeMl } from './bottles';

export function getSaleItemCogs(item: any, products: any[]): number {
  if (!item) return 0;
  if (item.totalCost != null) {
    return Number(item.totalCost) || 0;
  }
  if (item.costPrice != null) {
    return (Number(item.costPrice) || 0) * (Number(item.quantity) || 0);
  }

  const product = products.find((p: any) => p.id === item.productId);
  if (!product) return 0;

  if (item.saleType === 'refill') {
    const bottleSizeMl = parseBottleSizeMl(product.bottleSize, 30);
    const costPerMl = (Number(product.costPrice) || 0) / bottleSizeMl;
    return costPerMl * (Number(item.refillAmount) || 0) * (Number(item.quantity) || 0);
  }

  return (Number(product.costPrice) || 0) * (Number(item.quantity) || 0);
}

export function getSalesCogs(sales: any[], products: any[]): number {
  return sales.reduce((acc, sale) => {
    const items = Array.isArray(sale.items) ? sale.items : [];
    const saleCogs = items.reduce((itemAcc: number, item: any) => itemAcc + getSaleItemCogs(item, products), 0);
    return acc + saleCogs;
  }, 0);
}

