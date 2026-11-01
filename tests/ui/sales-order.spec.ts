import { test, expect } from '../../src/fixtures/test';
import { createCustomer, createStockItem } from '../../src/data/factories';
import { ErpForm } from '../../src/pages/ErpForm';
import { daysFromNow } from '../../src/dates';

test('a new sales order takes its rate from the price list', async ({ api, salesPage }) => {
  const customer = await createCustomer(api);
  const item = await createStockItem(api, 1500);

  const form = new ErpForm(salesPage);
  await form.openNew('Sales Order');
  await form.fillLink('customer', customer.name);
  await form.fillDate('delivery_date', daysFromNow(7));
  await form.fillLinkCell('items', 1, 'item_code', item.name);
  await form.fillCell('items', 1, 'qty', 3);
  await form.save();

  await expect(form.status).toHaveText('Draft');
  const order = await api.get('Sales Order', form.name);
  expect(order.items[0].rate).toBe(1500);
  expect(order.grand_total).toBe(4500);
});