// The company the setup wizard creates. Every account and warehouse name ends in its abbreviation.
export const COMPANY = 'Playwright Trading';
export const ABBR = 'PT';

// account('Debtors') -> 'Debtors - PT'
export const account = (name: string) => `${name} - ${ABBR}`;
export const WAREHOUSE = account('Stores');