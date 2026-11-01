# ERPNext Playwright: Order to Cash and Procure to Pay

![Playwright Tests](https://github.com/dzecGG/erpnext-playwright/actions/workflows/playwright.yml/badge.svg)

**[View the latest test report](https://dzecgg.github.io/erpnext-playwright/)**

Playwright and TypeScript tests for [ERPNext](https://github.com/frappe/erpnext) 16, an open-source ERP. The suite runs Order to Cash and Procure to Pay through the UI as four different users, and checks what every step posted to the general ledger. It starts its own ERPNext in Docker and sets it up by API, so it runs the same on any machine and every night in CI.

## What this project shows

- **End-to-end ERP cycles:** Order to Cash and Procure to Pay, handed from one role to the next (sales, purchasing, warehouse, accounts)
- **General ledger checks:** after each shipment, receipt, invoice and payment, the test compares the posted GL entries with the expected debits and credits
- **A fully automated environment:** one command starts ERPNext; the suite runs the setup wizard, creates its users and creates its own customers, suppliers and items through the REST API
- **One page object for every form:** ERPNext builds every document from the same controls, so one class fills, saves and submits all of them
- **Role-based testing:** each role logs in once and keeps its session; testing with least-privilege roles found a bug
- **CI/CD:** a brand-new ERPNext on every push and every night, with the HTML report published to GitHub Pages

## NetSuite to ERPNext

| NetSuite | ERPNext |
| --- | --- |
| Sales Order, Item Fulfillment, Invoice, Customer Payment | Sales Order, Delivery Note, Sales Invoice, Payment Entry |
| Purchase Order, Item Receipt, Vendor Bill, Bill Payment | Purchase Order, Purchase Receipt, Purchase Invoice, Payment Entry |
| GL Impact | GL Entry records, checked by every cycle test |
| Inventory Received Not Billed | Stock Received But Not Billed |

## Defects found

| Defect | Found by | Expected | Actual |
| --- | --- | --- | --- |
| Accounts User can't bill from a Delivery Note (ERPNext 16.53.0) | [`billing.spec.ts`](tests/roles/billing.spec.ts), marked `test.fail()` | Create > Sales Invoice on a submitted Delivery Note | No Create button: the menu is hidden while still empty, then stays hidden after Sales Invoice is added |

## Problems solved along the way

| Problem | Cause | Fix |
| --- | --- | --- |
| A submitted document stayed covered by its confirm dialog | Clicking Yes while the dialog is still opening submits the document but can't close the dialog | `submit()` waits until ERPNext marks the dialog as open |
| The warehouse user couldn't save a Delivery Note | Stock User has no access to accounts, which the Delivery Note looks up | The warehouse user also has Stock Manager |
| The login locator matched three elements | The login page has two hidden Email boxes | `getByRole`, which skips hidden elements |

## Run the tests

You need Node.js (LTS), Git and Docker Desktop.

```
git clone https://github.com/dzecGG/erpnext-playwright.git
cd erpnext-playwright
npm ci
npx playwright install chromium
docker compose -f docker/compose.yml up -d
docker compose -f docker/compose.yml wait create-site
```

Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell, `cp .env.example .env` on macOS or Linux), then:

```
npx playwright test
npx playwright show-report
```

## Tech stack

Playwright Test with TypeScript, Faker, ERPNext 16 in Docker (frappe_docker), GitHub Actions and GitHub Pages.

## About

ERPNext is developed by [Frappe](https://frappe.io). This project is not affiliated with Frappe.