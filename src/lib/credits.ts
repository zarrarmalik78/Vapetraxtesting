export type CreditTransactionType = 'given' | 'taken';

export function getCreditBalanceDelta(transactionType: CreditTransactionType, amount: number): number {
  const normalizedAmount = Math.abs(Number(amount) || 0);
  return transactionType === 'given' ? normalizedAmount : -normalizedAmount;
}

export function getCreditTotals(rows: Array<{ transactionType: CreditTransactionType; amount: number }>) {
  const totalGiven = rows
    .filter((row) => row.transactionType === 'given')
    .reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
  const totalTaken = rows
    .filter((row) => row.transactionType === 'taken')
    .reduce((acc, row) => acc + (Number(row.amount) || 0), 0);

  return {
    totalGiven,
    totalTaken,
    netBalance: totalGiven - totalTaken
  };
}

