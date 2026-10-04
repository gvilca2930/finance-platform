import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const email = process.env.WEB_SMOKE_EMAIL;
const password = process.env.WEB_SMOKE_PASSWORD;
if (!email || !password) throw new Error('WEB_SMOKE_EMAIL and WEB_SMOKE_PASSWORD are required');

const baseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
const executablePath =
  process.env.WEB_BROWSER_PATH ??
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const output = resolve(process.cwd(), '.visual-artifacts');
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];
const consoleErrors = [];
const failedResponses = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') {
    const location = message.location();
    consoleErrors.push(`${message.text()} ${location.url}:${location.lineNumber}`);
  }
});
page.on('response', (response) => {
  if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
});

await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
await page.getByLabel('Email').fill(email);
await page.getByLabel('Contraseña').fill(password);
await page.getByRole('button', { name: 'Ingresar' }).click();
await page.waitForURL('**/dashboard');

const selectWorkspace = async (name) => {
  const current = page.locator('.workspace-switcher strong');
  if ((await current.textContent())?.trim() === name) return;
  await page.getByRole('button', { name, exact: true }).click();
  await current.filter({ hasText: name }).waitFor();
};

await selectWorkspace('Negocio demo');

const desktopRoutes = [
  ['dashboard', 'Dashboard'],
  ['transactions', 'Movimientos'],
  ['accounts', 'Cuentas'],
  ['categories', 'Categorías'],
  ['transfers', 'Transferencias'],
  ['budgets', 'Presupuestos'],
  ['recurring', 'Movimientos recurrentes'],
  ['reports', 'Reportes'],
  ['members', 'Miembros'],
  ['invitations', 'Invitaciones'],
  ['settings/business', 'Datos del negocio'],
  ['settings/workspace', 'Configuración del espacio'],
  ['profile', 'Mi perfil'],
];

for (const [route, heading] of desktopRoutes) {
  await page.goto(`${baseUrl}/${route}`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: heading, exact: true }).waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  if (overflow) throw new Error(`Horizontal page overflow at /${route}`);
  await page.screenshot({
    path: resolve(output, `${route.replaceAll('/', '-')}-desktop.png`),
    fullPage: true,
  });
}

await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' });
await selectWorkspace('Finanzas personales demo');
await page.screenshot({ path: resolve(output, 'dashboard-personal-desktop.png'), fullPage: true });
await page.goto(`${baseUrl}/members`, { waitUntil: 'networkidle' });
await page.waitForURL('**/dashboard');
if ((await page.getByRole('link', { name: 'Miembros', exact: true }).count()) !== 0) {
  throw new Error('Personal workspace exposed business administration navigation');
}
await selectWorkspace('Negocio demo');

await page.setViewportSize({ width: 390, height: 844 });
for (const route of [
  'dashboard',
  'transactions',
  'accounts',
  'transfers',
  'recurring',
  'invitations',
  'profile',
]) {
  await page.goto(`${baseUrl}/${route}`, { waitUntil: 'networkidle' });
  const layout = await page.evaluate(() => {
    const offenders = [...document.querySelectorAll('body *')]
      .filter((element) => !element.closest('.table-shell'))
      .map((element) => ({
        element: `${element.tagName.toLowerCase()}.${element.className}`,
        right: Math.round(element.getBoundingClientRect().right),
        width: Math.round(element.getBoundingClientRect().width),
      }))
      .filter((item) => item.right > window.innerWidth + 2)
      .slice(0, 5);
    return {
      overflow: offenders.length > 0,
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      shell: (() => {
        const element = document.querySelector('.table-shell');
        if (!element) return null;
        const style = getComputedStyle(element);
        return { width: element.getBoundingClientRect().width, overflowX: style.overflowX };
      })(),
      offenders,
    };
  });
  if (layout.overflow)
    throw new Error(`Horizontal page overflow at /${route} on mobile: ${JSON.stringify(layout)}`);
  await page.screenshot({ path: resolve(output, `${route}-mobile.png`), fullPage: true });
}

await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(`${baseUrl}/transactions`, { waitUntil: 'networkidle' });
const description = `Smoke web ${Date.now()}`;
await page.getByRole('button', { name: 'Nuevo movimiento' }).click();
await page.getByLabel('Monto').fill('1.25');
await page.getByLabel('Cuenta').selectOption({ index: 1 });
await page.getByLabel('Categoría').selectOption({ index: 1 });
await page.getByLabel('Descripción').fill(description);
await page.getByRole('button', { name: 'Guardar', exact: true }).click();
const createdRow = page.getByRole('row').filter({ hasText: description });
await createdRow.waitFor();
await createdRow.locator('summary').click();
await createdRow.getByRole('button', { name: 'Eliminar' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
await createdRow.waitFor({ state: 'detached' });

await page.goto(`${baseUrl}/transfers`, { waitUntil: 'networkidle' });
const transferDescription = `Smoke transferencia ${Date.now()}`;
await page.getByRole('button', { name: 'Nueva transferencia' }).click();
await page.getByLabel('Cuenta de origen').selectOption({ index: 1 });
await page.getByLabel('Cuenta de destino').selectOption({ index: 1 });
await page.getByLabel('Monto').fill('1.25');
await page.getByLabel('Descripción').fill(transferDescription);
await page.getByRole('button', { name: 'Guardar', exact: true }).click();
const transferRow = page.getByRole('row').filter({ hasText: transferDescription });
await transferRow.waitFor();
await transferRow.locator('summary').click();
await transferRow.getByRole('button', { name: 'Eliminar' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
await transferRow.waitFor({ state: 'detached' });

await page.goto(`${baseUrl}/recurring`, { waitUntil: 'networkidle' });
const recurringDescription = 'Smoke recurrente web';
let recurringRow = page.getByRole('row').filter({ hasText: recurringDescription });
if ((await recurringRow.count()) > 0) {
  await recurringRow.locator('summary').click();
  await recurringRow.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Definición activa').check();
} else {
  await page.getByRole('button', { name: 'Nueva definición' }).click();
  await page.getByLabel('Descripción').fill(recurringDescription);
  await page.getByLabel('Monto').fill('1.25');
  await page.getByLabel('Cuenta').selectOption({ index: 1 });
  await page.getByLabel('Categoría').selectOption({ index: 1 });
}
await page.getByRole('button', { name: 'Guardar', exact: true }).click();
recurringRow = page.getByRole('row').filter({ hasText: recurringDescription });
await recurringRow.getByText('Activa', { exact: true }).waitFor();
const recurringMenu = recurringRow.locator('details');
if (!(await recurringMenu.evaluate((element) => element.open))) {
  await recurringRow.locator('summary').click();
}
await recurringRow.getByRole('button', { name: 'Desactivar' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Desactivar', exact: true }).click();
await recurringRow.getByText('Inactiva', { exact: true }).waitFor();

if (pageErrors.length || consoleErrors.length) {
  const overlayText = await page.locator('nextjs-portal').allInnerTexts();
  throw new Error(
    `Browser errors: ${[...pageErrors, ...consoleErrors, ...failedResponses, ...overlayText].join(
      '; ',
    )}`,
  );
}
await page.getByRole('button', { name: 'Cerrar sesión' }).click();
await page.waitForURL('**/login');
await page.goto(`${baseUrl}/accept-invitation`, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: 'Únete al espacio', exact: true }).waitFor();
await page.screenshot({ path: resolve(output, 'accept-invitation-desktop.png'), fullPage: true });

await browser.close();
if (pageErrors.length) throw new Error(`Browser errors: ${pageErrors.join('; ')}`);
console.log('Visual smoke passed for routes, workspace switching, guards, CRUD, and logout.');
