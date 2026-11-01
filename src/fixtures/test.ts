import { test as base, expect, type Browser, type Page } from '@playwright/test';
import { ErpApi } from '../api/ErpApi';
import { authFile, requireEnv, type Role } from '../roles';

type Fixtures = {
  api: ErpApi;
  salesPage: Page;
  purchasingPage: Page;
  warehousePage: Page;
  accountsPage: Page;
};

// A browser page logged in as one role, from the login the setup project saved
async function pageFor(browser: Browser, baseURL: string | undefined, role: Role, use: (page: Page) => Promise<void>) {
  const context = await browser.newContext({ baseURL, storageState: authFile(role) });
  await use(await context.newPage());
  await context.close();
}

export const test = base.extend<Fixtures>({
  // The API, logged in as the administrator: test data and ledger checks
  api: async ({ playwright, baseURL }, use) => {
    const request = await playwright.request.newContext({ baseURL });
    const api = new ErpApi(request);
    await api.login(requireEnv('ERP_ADMIN_USER'), requireEnv('ERP_ADMIN_PASSWORD'));
    await use(api);
    await request.dispose();
  },
  salesPage: ({ browser, baseURL }, use) => pageFor(browser, baseURL, 'sales', use),
  purchasingPage: ({ browser, baseURL }, use) => pageFor(browser, baseURL, 'purchasing', use),
  warehousePage: ({ browser, baseURL }, use) => pageFor(browser, baseURL, 'warehouse', use),
  accountsPage: ({ browser, baseURL }, use) => pageFor(browser, baseURL, 'accounts', use),
});

export { expect };