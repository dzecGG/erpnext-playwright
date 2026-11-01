import type { ErpApi } from './api/ErpApi';
import { WAREHOUSE } from './erp';

export type LedgerLine = { account: string; debit: number; credit: number };

const byAccount = (a: LedgerLine, b: LedgerLine) => a.account.localeCompare(b.account);

// What a submitted document posted to the general ledger (its "GL Impact")
export async function ledgerFor(api: ErpApi, voucherNo: string): Promise<LedgerLine[]> {
  const rows = await api.list('GL Entry', [['voucher_no', '=', voucherNo], ['is_cancelled', '=', 0]], ['account', 'debit', 'credit']);
  return rows.map(({ account, debit, credit }) => ({ account, debit, credit })).sort(byAccount);
}

// The lines you expect, in the same shape and order: ledger({ account, debit }, { account, credit })
export function ledger(...lines: { account: string; debit?: number; credit?: number }[]): LedgerLine[] {
  return lines.map(({ account, debit = 0, credit = 0 }) => ({ account, debit, credit })).sort(byAccount);
}

// How many of an item are on the shelf in the Stores warehouse
export async function stockQty(api: ErpApi, itemCode: string): Promise<number> {
  const bins = await api.list('Bin', [['item_code', '=', itemCode], ['warehouse', '=', WAREHOUSE]], ['actual_qty']);
  return bins[0]?.actual_qty ?? 0;
}