import { expect, type Locator, type Page, type Response } from '@playwright/test';

// ERPNext explains a refused save in _server_messages: a JSON list of JSON objects
async function errorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  const messages: string[] = JSON.parse(body._server_messages ?? '[]');
  const text = messages.map((m) => JSON.parse(m).message).join(' ');
  return text.replace(/<[^>]+>/g, '') || `${res.status()} ${body.exception ?? ''}`;
}

// 'Sales Order' -> 'sales-order', as in /desk/sales-order/new
const slug = (doctype: string) => doctype.toLowerCase().replaceAll(' ', '-');

// One page object for every ERPNext form. Every form is built from the same
// controls, each marked with its field name, so the same few methods fill any document.
export class ErpForm {
  readonly status: Locator;

  constructor(readonly page: Page) {
    this.status = page.getByTestId('page-status').filter({ visible: true });
  }

  async openNew(doctype: string): Promise<void> {
    await this.page.goto(`/desk/${slug(doctype)}/new`);
    await this.settled();
  }

  async open(doctype: string, name: string): Promise<void> {
    await this.page.goto(`/desk/${slug(doctype)}/${encodeURIComponent(name)}`);
    await this.settled();
    await expect(this.status).toBeVisible();
  }

  // The document's name, from the address bar: .../sales-order/SAL-ORD-2026-00001
  get name(): string {
    return decodeURIComponent(new URL(this.page.url()).pathname.split('/').pop()!);
  }

  // ERPNext marks the page while it is talking to the server
  async settled(): Promise<void> {
    await expect(this.page.locator('body')).toHaveAttribute('data-ajax-state', 'complete');
  }

  // Earlier pages stay in the DOM, hidden, so only look at visible controls
  field(fieldname: string): Locator {
    return this.page
      .locator(`.frappe-control[data-fieldname="${fieldname}"]`)
      .locator('input, select, textarea')
      .filter({ visible: true })
      .first();
  }

  // Dates are typed as yyyy-mm-dd (the setup project sets that format)
  async fillDate(fieldname: string, isoDate: string): Promise<void> {
    await this.field(fieldname).fill(isoDate);
    await this.field(fieldname).press('Escape');
    await this.settled();
  }

  // A Link field: type, then pick the match from the dropdown
  async fillLink(fieldname: string, value: string): Promise<void> {
    await this.field(fieldname).fill(value);
    await this.pickOption(value);
  }

  // A cell in a child table, such as the Items table. Rows count from 1.
  cell(table: string, row: number, fieldname: string): Locator {
    return this.page
      .locator(`.frappe-control[data-fieldname="${table}"] .grid-row[data-idx="${row}"] [data-fieldname="${fieldname}"]`)
      .filter({ visible: true })
      .first();
  }

  async fillCell(table: string, row: number, fieldname: string, value: string | number): Promise<void> {
    await this.cell(table, row, fieldname).click();
    const input = this.cell(table, row, fieldname).locator('input');
    await input.fill(String(value));
    await input.press('Tab');
    await this.settled();
  }

  async fillLinkCell(table: string, row: number, fieldname: string, value: string): Promise<void> {
    await this.cell(table, row, fieldname).click();
    await this.cell(table, row, fieldname).locator('input').fill(value);
    await this.pickOption(value);
  }

  async save(): Promise<void> {
    await this.clickAndWaitForSave(this.page.getByRole('button', { name: 'Save', exact: true }));
  }

  // Submit, confirm, and wait for ERPNext to post the document
  async submit(): Promise<void> {
    await this.page.getByRole('button', { name: 'Submit', exact: true }).click();
    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Permanently Submit' });
    // A dialog clicked while it is still sliding open can't close: wait until ERPNext says it is open
    await this.page.waitForFunction(() => (window as any).cur_dialog?.display === true);
    await this.clickAndWaitForSave(dialog.getByRole('button', { name: 'Yes' }));
    await expect(dialog).toBeHidden();
  }

  // Create > Delivery Note, Create > Sales Invoice, ...: opens the next document, filled in from this one
  async createNext(menuItem: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Create' }).click();
    await this.page.getByRole('menuitem', { name: menuItem, exact: true }).click();
    await this.settled();
  }

  private async pickOption(value: string): Promise<void> {
    await this.page.getByRole('option', { name: value }).first().click();
    await this.settled();
  }

  private async clickAndWaitForSave(button: Locator): Promise<void> {
    const saved = this.page.waitForResponse((res) => res.url().includes('/api/method/frappe.desk.form.save.savedocs'));
    await button.click();
    const res = await saved;
    if (!res.ok()) throw new Error(`ERPNext did not save: ${await errorMessage(res)}`);
    await this.settled();
  }
}