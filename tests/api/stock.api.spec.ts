import { test, expect } from '../../src/fixtures/test';
import { createStockItem, receiveStock } from '../../src/data/factories';
import { ledger, ledgerFor, stockQty } from '../../src/checks';
import { account } from '../../src/erp';

test('receiving stock puts it on the shelf and in the books', async ({ api }) => {
  const item = await createStockItem(api, 1500);

  const receipt = await receiveStock(api, item.name, 10, 900);

  expect(receipt.docstatus).toBe(1);
  expect(await stockQty(api, item.name)).toBe(10);
  expect(await ledgerFor(api, receipt.name)).toEqual(
    ledger({ account: account('Stock In Hand'), debit: 9000 }, { account: account('Stock Adjustment'), credit: 9000 }),
  );
});