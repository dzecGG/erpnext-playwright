import { test, expect } from '../../src/fixtures/test';
import { createCustomer, createStockItem, receiveStock } from '../../src/data/factories';
import { ErpForm } from '../../src/pages/ErpForm';
import { daysFromNow } from '../../src/dates';
import { COMPANY } from '../../src/erp';

test('accounts can bill a shipment from its delivery note', {
  annotation: {
    type: 'bug',
    description: 'Delivery Note: Create > Sales Invoice stays hidden for a user who can create invoices but nothing else in that menu (Accounts User)',
  },
}, async ({ api, accountsPage }) => {
  test.fail();

  // Order and ship by API: this test is only about what the accounts user sees
  const customer = await createCustomer(api);
  const item = await createStockItem(api, 1500);
  await receiveStock(api, item.name, 1, 900);
  const order = await api.insert('Sales Order', {
    customer: customer.name,
    company: COMPANY,
    delivery_date: daysFromNow(7),
    items: [{ item_code: item.name, qty: 1, rate: 1500 }],
    docstatus: 1,
  });
  // The same mapping the Create > Delivery Note button uses
  const shipment = await api.call('erpnext.selling.doctype.sales_order.sales_order.make_delivery_note', {
    source_name: order.name,
  });
  const deliveryNote = await api.insert('Delivery Note', { ...shipment, docstatus: 1 });

  const form = new ErpForm(accountsPage);
  await form.open('Delivery Note', deliveryNote.name);
  await expect(accountsPage.getByRole('button', { name: 'Create' })).toBeVisible();
});