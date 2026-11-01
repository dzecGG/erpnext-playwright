import { test, expect } from '../../src/fixtures/test';
import { createCustomer, createStockItem, receiveStock } from '../../src/data/factories';
import { ErpForm } from '../../src/pages/ErpForm';
import { ledger, ledgerFor, stockQty } from '../../src/checks';
import { daysFromNow } from '../../src/dates';
import { account } from '../../src/erp';

test('order to cash posts every step to the right accounts', { tag: '@smoke' }, async ({
  api,
  salesPage,
  warehousePage,
  accountsPage,
}) => {
  const qty = 2;
  const price = 1500;
  const unitCost = 900;
  const customer = await createCustomer(api);
  const item = await createStockItem(api, price);
  await receiveStock(api, item.name, 10, unitCost);

  const salesOrder = await test.step('sales enters the order', async () => {
    const form = new ErpForm(salesPage);
    await form.openNew('Sales Order');
    await form.fillLink('customer', customer.name);
    await form.fillDate('delivery_date', daysFromNow(7));
    await form.fillLinkCell('items', 1, 'item_code', item.name);
    await form.fillCell('items', 1, 'qty', qty);
    await form.save();
    await form.submit();
    await expect(form.status).toHaveText('To Deliver and Bill');
    return form.name;
  });

  await test.step('the warehouse ships it', async () => {
    const form = new ErpForm(warehousePage);
    await form.open('Sales Order', salesOrder);
    await form.createNext('Delivery Note');
    await form.save();
    await form.submit();
    await expect(form.status).toHaveText('To Bill');

    expect(await stockQty(api, item.name)).toBe(10 - qty);
    expect(await ledgerFor(api, form.name)).toEqual(
      ledger(
        { account: account('Cost of Goods Sold'), debit: qty * unitCost },
        { account: account('Stock In Hand'), credit: qty * unitCost },
      ),
    );
  });

  const invoice = await test.step('accounts bills the order', async () => {
    const form = new ErpForm(accountsPage);
    await form.open('Sales Order', salesOrder);
    await form.createNext('Sales Invoice');
    await form.save();
    await form.submit();
    await expect(form.status).toHaveText('Unpaid');

    expect(await ledgerFor(api, form.name)).toEqual(
      ledger({ account: account('Debtors'), debit: qty * price }, { account: account('Sales'), credit: qty * price }),
    );
    return form.name;
  });

  await test.step('accounts receives the payment', async () => {
    const form = new ErpForm(accountsPage); // still on the invoice
    await form.createNext('Payment');
    await form.save();
    await form.submit();

    expect(await ledgerFor(api, form.name)).toEqual(
      ledger({ account: account('Cash'), debit: qty * price }, { account: account('Debtors'), credit: qty * price }),
    );
    expect(await api.get('Sales Invoice', invoice)).toMatchObject({ status: 'Paid', outstanding_amount: 0 });
  });

  await test.step('the order is closed out', async () => {
    expect(await api.get('Sales Order', salesOrder)).toMatchObject({ status: 'Completed', per_delivered: 100, per_billed: 100 });
  });
});