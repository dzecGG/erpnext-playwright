import path from 'node:path';

// One ERPNext user per role, like separate NetSuite roles
export const roles = {
  sales: { email: 'sales@playwright.test', firstName: 'Sam', roles: ['Sales User'] },
  purchasing: { email: 'purchasing@playwright.test', firstName: 'Pat', roles: ['Purchase User'] },
  warehouse: { email: 'warehouse@playwright.test', firstName: 'Wes', roles: ['Stock User', 'Stock Manager'] },
  accounts: { email: 'accounts@playwright.test', firstName: 'Alex', roles: ['Accounts User'] },
} as const;

export type Role = keyof typeof roles;

// Where each role's saved login lives
export const authFile = (role: Role) => path.join('playwright', '.auth', `${role}.json`);

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing. Copy .env.example to .env and fill it in.`);
  return value;
}