import { faker } from '@faker-js/faker';
import { test as setup } from '../src/fixtures/test';
import { LoginPage } from '../src/pages/LoginPage';
import { authFile, roles, type Role } from '../src/roles';
import { ABBR, COMPANY } from '../src/erp';

const year = new Date().getFullYear();

setup('ERPNext is set up', async ({ api }) => {
  // The setup wizard, by API. On an ERPNext that is already set up, it does nothing.
  await api.call('frappe.desk.page.setup_wizard.setup_wizard.setup_complete', {
    args: {
      language: 'English',
      country: 'Philippines',
      timezone: 'Asia/Manila',
      currency: 'PHP',
      company_name: COMPANY,
      company_abbr: ABBR,
      chart_of_accounts: 'Standard',
      fy_start_date: `${year}-01-01`,
      fy_end_date: `${year}-12-31`,
      enable_telemetry: 0,
    },
  });

  // Dates typed in the UI use this format, whatever the country
  await api.update('System Settings', 'System Settings', { date_format: 'yyyy-mm-dd' });

  // A local ERPNext lives on into next year: give it this year's fiscal year
  if (!(await api.exists('Fiscal Year', String(year)))) {
    await api.insert('Fiscal Year', {
      year: String(year),
      year_start_date: `${year}-01-01`,
      year_end_date: `${year}-12-31`,
    });
  }
});

for (const role of Object.keys(roles) as Role[]) {
  setup(`log in as ${role}`, async ({ api, page }) => {
    const user = roles[role];
    // A new password every run, so no password is ever stored
    const password = faker.internet.password({ length: 20 });

    const values = { new_password: password, roles: user.roles.map((name) => ({ role: name })) };

    if (await api.exists('User', user.email)) {
      await api.update('User', user.email, values);
    } else {
      await api.insert('User', { email: user.email, first_name: user.firstName, send_welcome_email: 0, ...values });
    }

    await new LoginPage(page).login(user.email, password);
    await page.context().storageState({ path: authFile(role) });
  });
}