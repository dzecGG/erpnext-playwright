import { test, expect } from '../../src/fixtures/test';
import { createStockItem, createSupplier } from '../../src/data/factories';
import { ErpForm } from '../../src/pages/ErpForm';
import { ledger, ledgerFor, stockQty } from '../../src/checks';
import { daysFromNow } from '../../src/dates';
import { account } from '../../src/erp';

test('procure to pay posts every step to the right accounts', { tag: '@smoke' }, async ({
  api,
  purchasingPage,
  warehousePage,
  accountsPage,
}) => {
  const qty = 5;
  const unitCost = 800;
  const total = qty * unitCost;
  const supplier = await createSupplier(api);
  const item = await createStockItem(api, 1500);

  const purchaseOrder = await test.step('purchasing raises the order', async () => {
    const form = new ErpForm(purchasingPage);
    await form.openNew('Purchase Order');
    await form.fillLink('supplier', supplier.name);
    await form.fillDate('schedule_date', daysFromNow(7));
    await form.fillLinkCell('items', 1, 'item_code', item.name);
    await form.fillCell('items', 1, 'qty', qty);
    await form.fillCell('items', 1, 'rate', unitCost);
    await form.save();
    await form.submit();
    await expect(form.status).toHaveText('To Receive and Bill');
    return form.name;
  });

  const receipt = await test.step('the warehouse receives the goods', async () => {
    const form = new ErpForm(warehousePage);
    await form.open('Purchase Order', purchaseOrder);
    await form.createNext('Purchase Receipt');
    await form.save();
    await form.submit();
    await expect(form.status).toHaveText('To Bill');

    expect(await stockQty(api, item.name)).toBe(qty);
    expect(await ledgerFor(api, form.name)).toEqual(
      ledger(
        { account: account('Stock In Hand'), debit: total },
        { account: account('Stock Received But Not Billed'), credit: total },
      ),
    );
    return form.name;
  });

  const bill = await test.step('accounts enters the supplier bill', async () => {
    const form = new ErpForm(accountsPage);
    await form.open('Purchase Receipt', receipt);
    await form.createNext('Purchase Invoice');
    await form.save();
    await form.submit();
    await expect(form.status).toHaveText('Unpaid');

    expect(await ledgerFor(api, form.name)).toEqual(
      ledger(
        { account: account('Stock Received But Not Billed'), debit: total },
        { account: account('Creditors'), credit: total },
      ),
    );
    return form.name;
  });

  await test.step('accounts pays the supplier', async () => {
    const form = new ErpForm(accountsPage); // still on the invoice
    await form.createNext('Payment');
    await form.save();
    await form.submit();

    expect(await ledgerFor(api, form.name)).toEqual(
      ledger({ account: account('Creditors'), debit: total }, { account: account('Cash'), credit: total }),
    );
    expect(await api.get('Purchase Invoice', bill)).toMatchObject({ status: 'Paid', outstanding_amount: 0 });
  });

  await test.step('the order is closed out', async () => {
    expect(await api.get('Purchase Order', purchaseOrder)).toMatchObject({ status: 'Completed', per_received: 100, per_billed: 100 });
  });
});