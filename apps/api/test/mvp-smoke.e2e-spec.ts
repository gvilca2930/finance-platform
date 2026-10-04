import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request, { type Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const body = <T>(response: Response): T => response.body as T;

interface Tokens {
  accessToken: string;
  refreshToken: string;
}
interface Entity {
  id: string;
}

describe('MVP backend smoke (e2e, PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let collaboratorToken: string;
  let ownerId: string;
  let collaboratorId: string;
  let collaboratorMemberId: string;
  let personalId: string;
  let businessId: string;
  let accountA: string;
  let accountB: string;
  let incomeCategory: string;
  let expenseCategory: string;
  let expenseTransaction: string;
  let transferId: string;
  let budgetId: string;
  const suffix = Date.now();
  const ownerEmail = `mvp-owner-${suffix}@example.com`;
  const collaboratorEmail = `mvp-staff-${suffix}@example.com`;
  const password = 'Secure123';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      const workspaceIds = [personalId, businessId].filter(Boolean);
      if (workspaceIds.length) {
        await prisma.$transaction(async (tx) => {
          await tx.recurringTransaction.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.budget.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
          await tx.transfer.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
          await tx.transaction.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
          await tx.financialAccountAccess.deleteMany({
            where: { workspaceId: { in: workspaceIds } },
          });
          await tx.financialAccount.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
          await tx.category.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
          await tx.workspaceInvitation.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
          await tx.businessProfile.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
          await tx.workspaceMember.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
          await tx.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
        });
      }
      await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, collaboratorEmail] } } });
    }
    if (app) await app.close();
  });

  it('registers users and creates PERSONAL/BUSINESS workspaces with defaults', async () => {
    for (const [email, firstName] of [
      [ownerEmail, 'Owner'],
      [collaboratorEmail, 'Staff'],
    ] as const) {
      const registered = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email, password, firstName, paternalLastName: 'MVP' })
        .expect(201);
      if (email === ownerEmail) ownerId = body<Entity>(registered).id;
      else collaboratorId = body<Entity>(registered).id;
    }
    ownerToken = body<Tokens>(
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: ownerEmail, password })
        .expect(200),
    ).accessToken;
    collaboratorToken = body<Tokens>(
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: collaboratorEmail, password })
        .expect(200),
    ).accessToken;

    personalId = body<Entity>(
      await request(app.getHttpServer())
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Personal smoke', type: 'PERSONAL' })
        .expect(201),
    ).id;
    businessId = body<Entity>(
      await request(app.getHttpServer())
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Business smoke', type: 'BUSINESS' })
        .expect(201),
    ).id;

    expect(await prisma.category.count({ where: { workspaceId: personalId } })).toBe(18);
    expect(await prisma.category.count({ where: { workspaceId: businessId } })).toBe(16);
    expect(
      await prisma.workspaceMember.count({
        where: { workspaceId: businessId, userId: ownerId, role: 'OWNER' },
      }),
    ).toBe(1);
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${businessId}`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${personalId}/business-profile`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${personalId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: collaboratorEmail, role: 'STAFF' })
      .expect(400);
  });

  it('configures business, invitation, membership, roles, and OWNER protection', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/workspaces/${businessId}/business-profile`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ legalName: 'Smoke SAC', taxId: '20123456789' })
      .expect(200);
    const invitation = body<{ token: string }>(
      await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${businessId}/invitations`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: collaboratorEmail, role: 'STAFF' })
        .expect(201),
    );
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${businessId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ email: collaboratorEmail, role: 'STAFF' })
      .expect(409);
    await request(app.getHttpServer())
      .post('/api/v1/workspace-invitations/accept')
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .send({ token: invitation.token })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/workspace-invitations/accept')
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .send({ token: invitation.token })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/workspace-invitations/accept')
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .send({ token: 'invalid-invitation-token' })
      .expect(400);

    const members = body<Array<{ id: string; userId: string; role: string }>>(
      await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${businessId}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200),
    );
    const ownerMember = members.find((item) => item.userId === ownerId)!;
    const staffMember = members.find((item) => item.userId === collaboratorId)!;
    collaboratorMemberId = staffMember.id;
    expect(staffMember.role).toBe('STAFF');
    await request(app.getHttpServer())
      .delete(`/api/v1/workspaces/${businessId}/members/${ownerMember.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${businessId}/members/${staffMember.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'ADMIN' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${businessId}/members/${ownerMember.id}`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .send({ status: 'SUSPENDED' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${businessId}/members/${staffMember.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'STAFF' })
      .expect(200);
  });

  it('shares business accounts and financial data while preserving role permissions', async () => {
    accountA = body<Entity>(
      await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${businessId}/accounts`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'A', type: 'BANK', initialBalance: '1000.00' })
        .expect(201),
    ).id;
    accountB = body<Entity>(
      await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${businessId}/accounts`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'B', type: 'CASH', initialBalance: '0.00' })
        .expect(201),
    ).id;
    const staffAccounts = body<Array<{ id: string }>>(
      await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${businessId}/accounts`)
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .expect(200),
    );
    expect(staffAccounts.map((account) => account.id)).toEqual(
      expect.arrayContaining([accountA, accountB]),
    );
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${businessId}/accounts/${accountA}`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${businessId}/accounts/${accountB}`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${businessId}/members/${collaboratorMemberId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'VIEWER' })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${businessId}/accounts`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200)
      .expect(({ body: responseBody }: Response) => expect(responseBody).toHaveLength(2));
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${businessId}/accounts`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .send({ name: 'Forbidden', type: 'CASH' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${businessId}/members/${collaboratorMemberId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'STAFF' })
      .expect(200);

    const categories = body<Array<{ id: string; name: string; type: string }>>(
      await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${businessId}/categories`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200),
    );
    incomeCategory = categories.find(
      (item) => item.name === 'Ventas' && item.type === 'INCOME',
    )!.id;
    expenseCategory = categories.find(
      (item) => item.name === 'Marketing' && item.type === 'EXPENSE',
    )!.id;
    const parent = body<Entity>(
      await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${businessId}/categories`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Parent', type: 'EXPENSE' })
        .expect(201),
    );
    const child = body<Entity>(
      await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${businessId}/categories`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Child', type: 'EXPENSE', parentId: parent.id })
        .expect(201),
    );
    await request(app.getHttpServer())
      .patch(`/api/v1/workspaces/${businessId}/categories/${parent.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ parentId: child.id })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${businessId}/transactions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        accountId: accountA,
        categoryId: incomeCategory,
        type: 'INCOME',
        amount: '500.00',
        transactionDate: '2026-09-10',
        description: 'Income',
      })
      .expect(201);
    expenseTransaction = body<Entity>(
      await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${businessId}/transactions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          accountId: accountA,
          categoryId: expenseCategory,
          type: 'EXPENSE',
          amount: '200.00',
          transactionDate: '2026-09-11',
          description: 'Expense',
        })
        .expect(201),
    ).id;
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${businessId}/transactions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        accountId: accountA,
        categoryId: expenseCategory,
        type: 'INCOME',
        amount: '1.00',
        transactionDate: '2026-09-11',
        description: 'Mismatch',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${businessId}/transactions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        accountId: accountA,
        categoryId: expenseCategory,
        type: 'EXPENSE',
        amount: '0.00',
        transactionDate: '2026-09-11',
        description: 'Zero',
      })
      .expect(400);
    const transactionPage = body<{ data: unknown[]; pagination: { total: number } }>(
      await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${businessId}/transactions?type=EXPENSE&page=1&limit=1`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200),
    );
    expect(transactionPage.data).toHaveLength(1);
    expect(transactionPage.pagination.total).toBe(1);
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${businessId}/transactions`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200)
      .expect(({ body: responseBody }: Response) => {
        expect(responseBody.pagination.total).toBe(2);
      });

    transferId = body<Entity>(
      await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${businessId}/transfers`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sourceAccountId: accountA,
          destinationAccountId: accountB,
          amount: '100.00',
          transactionDate: '2026-09-12',
        })
        .expect(201),
    ).id;
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${businessId}/transfers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        sourceAccountId: accountA,
        destinationAccountId: accountA,
        amount: '1.00',
        transactionDate: '2026-09-12',
      })
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${businessId}/transfers`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200)
      .expect(({ body: responseBody }: Response) => {
        expect(responseBody.pagination.total).toBe(1);
      });

    const balances = body<{
      totalBalance: string;
      accounts: Array<{ accountId: string; balance: string }>;
    }>(
      await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${businessId}/balances`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200),
    );
    expect(balances.accounts.find((item) => item.accountId === accountA)?.balance).toBe('1200.00');
    expect(balances.accounts.find((item) => item.accountId === accountB)?.balance).toBe('100.00');
    expect(balances.totalBalance).toBe('1300.00');
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${businessId}/balances`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200)
      .expect(({ body: responseBody }: Response) => {
        expect(responseBody.accounts).toHaveLength(2);
        expect(responseBody.totalBalance).toBe('1300.00');
      });
  });

  it('calculates budgets, recurring definitions, dashboard, reports, soft delete, refresh and logout', async () => {
    budgetId = body<Entity>(
      await request(app.getHttpServer())
        .post(`/api/v1/workspaces/${businessId}/budgets`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          categoryId: expenseCategory,
          amount: '600.00',
          month: 9,
          year: 2026,
          alertPercentage: '80.00',
        })
        .expect(201),
    ).id;
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${businessId}/budgets`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ categoryId: incomeCategory, amount: '10.00', month: 9, year: 2026 })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${businessId}/budgets`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ categoryId: expenseCategory, amount: '10.00', month: 9, year: 2026 })
      .expect(409);
    const progress = body<{ spent: string; percentageUsed: string }>(
      await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${businessId}/budgets/${budgetId}/progress`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200),
    );
    expect(progress.spent).toBe('200.00');
    expect(progress.percentageUsed).toBe('33.33');
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${businessId}/recurring-transactions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        accountId: accountA,
        categoryId: expenseCategory,
        type: 'EXPENSE',
        amount: '50.00',
        frequency: 'MONTHLY',
        startDate: '2026-09-01',
        nextExecutionDate: '2026-10-01',
        description: 'Recurring',
      })
      .expect(201);
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${businessId}/recurring-transactions`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200)
      .expect(({ body: responseBody }: Response) => {
        expect(responseBody.pagination.total).toBe(1);
      });

    const dashboard = body<{
      totalIncome: string;
      totalExpenses: string;
      netCashFlow: string;
      totalBalance: string;
    }>(
      await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${businessId}/dashboard?from=2026-09-01&to=2026-09-30`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200),
    );
    expect(dashboard).toMatchObject({
      totalIncome: '500.00',
      totalExpenses: '200.00',
      netCashFlow: '300.00',
      totalBalance: '1300.00',
    });
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${businessId}/dashboard?from=2026-09-01&to=2026-09-30`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200)
      .expect(({ body: responseBody }: Response) => {
        expect(responseBody).toMatchObject({
          totalIncome: '500.00',
          totalExpenses: '200.00',
          totalBalance: '1300.00',
        });
      });
    const report = body<{
      totalIncome: string;
      totalExpenses: string;
      netCashFlow: string;
      transactionCount: number;
    }>(
      await request(app.getHttpServer())
        .get(
          `/api/v1/workspaces/${businessId}/reports/monthly-summary?from=2026-09-01&to=2026-09-30`,
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200),
    );
    expect(report).toMatchObject({
      totalIncome: '500.00',
      totalExpenses: '200.00',
      netCashFlow: '300.00',
      transactionCount: 2,
    });
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${businessId}/reports/monthly-summary?from=2026-09-01&to=2026-09-30`)
      .set('Authorization', `Bearer ${collaboratorToken}`)
      .expect(200)
      .expect(({ body: responseBody }: Response) => {
        expect(responseBody.transactionCount).toBe(2);
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/workspaces/${businessId}/transfers/${transferId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
    const balancesAfterTransferDelete = body<{
      accounts: Array<{ accountId: string; balance: string }>;
    }>(
      await request(app.getHttpServer())
        .get(`/api/v1/workspaces/${businessId}/balances`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200),
    );
    expect(
      balancesAfterTransferDelete.accounts.find((item) => item.accountId === accountA)?.balance,
    ).toBe('1300.00');
    expect(
      balancesAfterTransferDelete.accounts.find((item) => item.accountId === accountB)?.balance,
    ).toBe('0.00');

    await request(app.getHttpServer())
      .delete(`/api/v1/workspaces/${businessId}/transactions/${expenseTransaction}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
    expect(
      body<{ spent: string }>(
        await request(app.getHttpServer())
          .get(`/api/v1/workspaces/${businessId}/budgets/${budgetId}/progress`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .expect(200),
      ).spent,
    ).toBe('0.00');

    const freshLogin = body<Tokens>(
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: ownerEmail, password })
        .expect(200),
    );
    const rotated = body<Tokens>(
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: freshLogin.refreshToken })
        .expect(200),
    );
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: freshLogin.refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${rotated.accessToken}`)
      .expect(204);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotated.refreshToken })
      .expect(401);
  });
});
