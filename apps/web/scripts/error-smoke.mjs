import { chromium } from 'playwright-core';

const email = process.env.WEB_SMOKE_EMAIL;
const password = process.env.WEB_SMOKE_PASSWORD;
if (!email || !password) throw new Error('WEB_SMOKE_EMAIL and WEB_SMOKE_PASSWORD are required');

const baseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
const executablePath =
  process.env.WEB_BROWSER_PATH ??
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));

const expectValue = async (locator, expected, context) => {
  const actual = await locator.inputValue();
  if (actual !== expected)
    throw new Error(`${context}: expected "${expected}", received "${actual}"`);
};

const selectWorkspace = async (name) => {
  const current = page.locator('.workspace-switcher strong');
  if ((await current.textContent())?.trim() === name) return;
  await page.getByRole('button', { name, exact: true }).click();
  await current.filter({ hasText: name }).waitFor();
};

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  const emailInput = page.getByLabel('Email');
  const passwordInput = page.getByLabel('Contraseña');
  await emailInput.fill(email);
  await passwordInput.fill('WrongPassword123!');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('alert').filter({ hasText: 'Invalid credentials' }).waitFor();
  await expectValue(emailInput, email, 'Login email was not preserved');
  await expectValue(passwordInput, 'WrongPassword123!', 'Login password was not preserved');

  await passwordInput.fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL('**/dashboard');
  await selectWorkspace('Negocio demo');

  await page.goto(`${baseUrl}/budgets`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Nuevo presupuesto' }).click();
  const budgetCategory = page.getByLabel('Categoría de gasto');
  await budgetCategory.selectOption({ label: 'Marketing' });
  const budgetCategoryValue = await budgetCategory.inputValue();
  await page.getByLabel('Monto').fill('999.99');
  await page.getByLabel('Alerta (%)').fill('77');
  await page.getByLabel('Mes').fill('9');
  await page.getByLabel('Año').fill('2026');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  const budgetDialog = page.getByRole('dialog');
  await budgetDialog
    .getByRole('alert')
    .filter({ hasText: 'An active budget already exists' })
    .waitFor();
  await expectValue(budgetCategory, budgetCategoryValue, 'Budget category was not preserved');
  await expectValue(page.getByLabel('Monto'), '999.99', 'Budget amount was not preserved');
  await expectValue(page.getByLabel('Alerta (%)'), '77', 'Budget alert was not preserved');
  await expectValue(page.getByLabel('Mes'), '9', 'Budget month was not preserved');
  await expectValue(page.getByLabel('Año'), '2026', 'Budget year was not preserved');
  await budgetDialog.getByRole('button', { name: 'Cancelar' }).click();

  await page.goto(`${baseUrl}/transactions`, { waitUntil: 'networkidle' });
  await page.route('**/workspaces/*/transactions', async (route) => {
    if (route.request().method() === 'POST') await route.abort('connectionfailed');
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Nuevo movimiento' }).click();
  await page.getByLabel('Monto').fill('12.34');
  await page.getByLabel('Cuenta').selectOption({ index: 1 });
  await page.getByLabel('Categoría').selectOption({ index: 1 });
  await page.getByLabel('Descripción').fill('Movimiento con error de red');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  const transactionDialog = page.getByRole('dialog');
  await transactionDialog
    .getByRole('alert')
    .filter({ hasText: 'No se pudo conectar con la API.' })
    .waitFor();
  await expectValue(page.getByLabel('Monto'), '12.34', 'Transaction amount was not preserved');
  await expectValue(
    page.getByLabel('Descripción'),
    'Movimiento con error de red',
    'Transaction description was not preserved',
  );
  if (!(await transactionDialog.isVisible()))
    throw new Error('Transaction modal closed after error');
  await page.unroute('**/workspaces/*/transactions');
  await transactionDialog.getByRole('button', { name: 'Cancelar' }).click();
} finally {
  await browser.close();
}

if (pageErrors.length) throw new Error(`Browser errors: ${pageErrors.join('; ')}`);
console.log('Auth and CRUD error-state smoke passed without losing form values.');
