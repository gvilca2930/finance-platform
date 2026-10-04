import { chromium } from 'playwright-core';

const ownerEmail = process.env.WEB_SMOKE_EMAIL;
const ownerPassword = process.env.WEB_SMOKE_PASSWORD;
if (!ownerEmail || !ownerPassword) {
  throw new Error('WEB_SMOKE_EMAIL and WEB_SMOKE_PASSWORD are required');
}

const inviteeEmail = process.env.WEB_INVITEE_EMAIL ?? 'invitee.smoke@finance.local';
const inviteePassword = process.env.WEB_INVITEE_PASSWORD ?? 'InviteeSmoke123!';
const baseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
const apiUrl = process.env.WEB_API_URL ?? 'http://localhost:3001/api/v1';
const executablePath =
  process.env.WEB_BROWSER_PATH ??
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(path, { token, ...init } = {}) {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers });
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const message = details?.message ?? `Request failed with status ${response.status}`;
    throw new RequestError(response.status, Array.isArray(message) ? message.join('. ') : message);
  }
  return response.status === 204 ? undefined : response.json();
}

const login = (email, password) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

const ownerSession = await login(ownerEmail, ownerPassword);
const ownerToken = ownerSession.accessToken;
const memberships = await request('/workspaces', { token: ownerToken });
const business = memberships.find((item) => item.workspace.type === 'BUSINESS');
if (!business) throw new Error('The smoke owner needs a BUSINESS workspace');

try {
  await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: inviteeEmail,
      password: inviteePassword,
      firstName: 'Invitado',
      paternalLastName: 'Smoke',
    }),
  });
} catch (error) {
  if (!(error instanceof RequestError) || error.status !== 409) throw error;
}

const removeExistingMembership = async () => {
  const members = await request(`/workspaces/${business.workspaceId}/members`, {
    token: ownerToken,
  });
  const member = members.find((item) => item.user.email === inviteeEmail);
  if (member) {
    await request(`/workspaces/${business.workspaceId}/members/${member.id}`, {
      method: 'DELETE',
      token: ownerToken,
    });
  }
};

const updateInviteeRole = async (role) => {
  const members = await request(`/workspaces/${business.workspaceId}/members`, {
    token: ownerToken,
  });
  const member = members.find((item) => item.user.email === inviteeEmail);
  if (!member) throw new Error('Accepted invitee membership was not found');
  await request(`/workspaces/${business.workspaceId}/members/${member.id}`, {
    method: 'PATCH',
    token: ownerToken,
    body: JSON.stringify({ role }),
  });
};

const cancelPendingInvitations = async () => {
  const invitations = await request(`/workspaces/${business.workspaceId}/invitations`, {
    token: ownerToken,
  });
  for (const invitation of invitations.filter(
    (item) => item.email === inviteeEmail && item.status === 'PENDING',
  )) {
    await request(`/workspaces/${business.workspaceId}/invitations/${invitation.id}`, {
      method: 'DELETE',
      token: ownerToken,
    });
  }
};

await removeExistingMembership();
await cancelPendingInvitations();

let invitation = await request(`/workspaces/${business.workspaceId}/invitations`, {
  method: 'POST',
  token: ownerToken,
  body: JSON.stringify({ email: inviteeEmail, role: 'STAFF' }),
});

const browser = await chromium.launch({ executablePath, headless: true });
let accepted = false;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(inviteeEmail);
  await page.locator('input[type="password"]').fill(inviteePassword);
  await page.locator('form button').last().click();
  await page.waitForURL('**/dashboard');
  await page.goto(`${baseUrl}/my-invitations`, { waitUntil: 'networkidle' });
  const internalInvitation = page.locator('.invitation-row', {
    hasText: business.workspace.name,
  });
  await internalInvitation.locator('button').first().click();
  await page.locator('.toast').waitFor();
  await page.locator('.workspace-switcher', { hasText: business.workspace.name }).waitFor();

  await removeExistingMembership();
  invitation = await request(`/workspaces/${business.workspaceId}/invitations`, {
    method: 'POST',
    token: ownerToken,
    body: JSON.stringify({ email: inviteeEmail, role: 'STAFF' }),
  });
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(`${baseUrl}/accept-invitation?token=${encodeURIComponent(invitation.token)}`, {
    waitUntil: 'networkidle',
  });
  await page.getByRole('link', { name: 'Iniciar sesión' }).click();
  await page.getByLabel('Email').fill(inviteeEmail);
  await page.getByLabel('Contraseña').fill(inviteePassword);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL('**/accept-invitation?token=*');
  await page.getByRole('button', { name: 'Aceptar invitación' }).click();
  await page.waitForURL('**/dashboard');
  await page.locator('.sidebar-user small').filter({ hasText: 'Colaborador' }).waitFor();

  await page.goto(`${baseUrl}/members`, { waitUntil: 'networkidle' });
  await page.waitForURL('**/dashboard');
  if ((await page.getByRole('link', { name: 'Miembros', exact: true }).count()) !== 0) {
    throw new Error('STAFF user exposed administrative navigation');
  }

  await updateInviteeRole('ADMIN');
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.sidebar-user small').filter({ hasText: 'Administrador' }).waitFor();
  await page.getByRole('link', { name: 'Miembros', exact: true }).waitFor();
  await page.goto(`${baseUrl}/members`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Miembros', exact: true }).waitFor();
  await page.goto(`${baseUrl}/settings/workspace`, { waitUntil: 'networkidle' });
  await page.waitForURL('**/dashboard');

  await updateInviteeRole('VIEWER');
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.sidebar-user small').filter({ hasText: 'Solo lectura' }).waitFor();
  await page.goto(`${baseUrl}/transactions`, { waitUntil: 'networkidle' });
  if ((await page.getByRole('button', { name: 'Nuevo movimiento' }).count()) !== 0) {
    throw new Error('VIEWER user exposed transaction creation');
  }
  await page.goto(`${baseUrl}/members`, { waitUntil: 'networkidle' });
  await page.waitForURL('**/dashboard');
  accepted = true;
} finally {
  await browser.close();
  if (accepted) await removeExistingMembership();
  else await cancelPendingInvitations();
}

console.log('Invitation acceptance and OWNER/ADMIN/STAFF/VIEWER guard smoke passed.');
