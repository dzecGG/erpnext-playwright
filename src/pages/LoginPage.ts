import type { Page } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async login(email: string, password: string): Promise<void> {
    await this.page.goto('/login');
    // The page has three "Email" boxes; two are hidden (forgot password, email link). A role locator skips hidden ones.
    await this.page.getByRole('textbox', { name: 'Email' }).fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Continue' }).click();
    await this.page.waitForURL(/\/desk/);
  }
}