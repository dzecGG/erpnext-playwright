import type { APIRequestContext, APIResponse } from '@playwright/test';

export type Doc = { name: string; [field: string]: any };
type Filters = [string, string, unknown][];

// Every ERPNext REST call in one place
export class ErpApi {
  constructor(private readonly request: APIRequestContext) {}

  async login(usr: string, pwd: string): Promise<void> {
    await this.read(await this.request.post('/api/method/login', { data: { usr, pwd } }), 'Login');
  }

  // Run a whitelisted server method, e.g. the setup wizard
  async call(method: string, args: Record<string, unknown> = {}): Promise<any> {
    const body = await this.read(await this.request.post(`/api/method/${method}`, { data: args }), method);
    return body.message;
  }

  // Create a record. Pass docstatus: 1 to create and submit it in one call.
  async insert(doctype: string, values: Record<string, unknown>): Promise<Doc> {
    const res = await this.request.post(`/api/resource/${doctype}`, { data: values });
    return (await this.read(res, `Create ${doctype}`)).data;
  }

  async get(doctype: string, name: string): Promise<Doc> {
    const res = await this.request.get(`/api/resource/${doctype}/${encodeURIComponent(name)}`);
    return (await this.read(res, `Get ${doctype} ${name}`)).data;
  }

  async update(doctype: string, name: string, values: Record<string, unknown>): Promise<Doc> {
    const res = await this.request.put(`/api/resource/${doctype}/${encodeURIComponent(name)}`, { data: values });
    return (await this.read(res, `Update ${doctype} ${name}`)).data;
  }

  async list(doctype: string, filters: Filters, fields: string[] = ['name']): Promise<Doc[]> {
    const res = await this.request.get(`/api/resource/${doctype}`, {
      params: { filters: JSON.stringify(filters), fields: JSON.stringify(fields), limit_page_length: 0 },
    });
    return (await this.read(res, `List ${doctype}`)).data;
  }

  async exists(doctype: string, name: string): Promise<boolean> {
    return (await this.list(doctype, [['name', '=', name]])).length > 0;
  }

  // ERPNext's errors come back as JSON with the reason inside; show it in the test failure
  private async read(res: APIResponse, what: string): Promise<any> {
    if (!res.ok()) {
      throw new Error(`${what} failed with ${res.status()}: ${(await res.text()).slice(0, 1000)}`);
    }
    return res.json();
  }
}