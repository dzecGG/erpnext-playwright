import { faker } from '@faker-js/faker';
import type { Doc, ErpApi } from '../api/ErpApi';
import { COMPANY, WAREHOUSE } from '../erp';

// A short unique tag, so parallel tests never share a record
const tag = () => faker.string.alphanumeric({ length: 6, casing: 'upper' });

export async function createCustomer(api: ErpApi): Promise<Doc> {
  return api.insert('Customer', {
    customer_name: `${faker.company.name()} ${tag()}`,
    customer_type: 'Company',
    customer_group: 'Commercial',
    territory: 'Philippines',
  });
}

export async function createSupplier(api: ErpApi): Promise<Doc> {
  return api.insert('Supplier', {
    supplier_name: `${faker.company.name()} ${tag()}`,
    supplier_type: 'Company',
    supplier_group: 'Local',
  });
}

// A stock item with a selling price. Its default warehouse is Stores.
export async function createStockItem(api: ErpApi, sellingPrice: number): Promise<Doc> {
  return api.insert('Item', {
    item_code: `PW-${tag()}`,
    item_name: faker.commerce.productName(),
    item_group: 'Products',
    stock_uom: 'Nos',
    is_stock_item: 1,
    standard_rate: sellingPrice,
    item_defaults: [{ company: COMPANY, default_warehouse: WAREHOUSE }],
  });
}

// Put stock on the shelf at a known cost (a submitted Material Receipt)
export async function receiveStock(api: ErpApi, itemCode: string, qty: number, unitCost: number): Promise<Doc> {
  return api.insert('Stock Entry', {
    stock_entry_type: 'Material Receipt',
    company: COMPANY,
    items: [{ item_code: itemCode, qty, t_warehouse: WAREHOUSE, basic_rate: unitCost }],
    docstatus: 1,
  });
}