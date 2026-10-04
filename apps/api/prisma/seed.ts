import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client';

const databaseUrl = process.env['DATABASE_URL'];

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run the seed.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const ids = {
  user: '00000000-0000-4000-8000-000000000001',
  userProfile: '00000000-0000-4000-8000-000000000002',
  personalWorkspace: '10000000-0000-4000-8000-000000000001',
  businessWorkspace: '10000000-0000-4000-8000-000000000002',
  personalMember: '20000000-0000-4000-8000-000000000001',
  businessMember: '20000000-0000-4000-8000-000000000002',
  businessProfile: '30000000-0000-4000-8000-000000000001',
  personalCash: '40000000-0000-4000-8000-000000000001',
  personalBank: '40000000-0000-4000-8000-000000000002',
  businessCash: '40000000-0000-4000-8000-000000000003',
  businessBank: '40000000-0000-4000-8000-000000000004',
} as const;

const personalIncomeCategories = [
  'Sueldo',
  'Bonos',
  'Freelance',
  'Ingresos adicionales',
  'Inversiones',
  'Otros ingresos',
] as const;

const personalExpenseCategories = [
  'Alimentación',
  'Vivienda',
  'Transporte',
  'Servicios',
  'Salud',
  'Educación',
  'Entretenimiento',
  'Compras',
  'Suscripciones',
  'Familia',
  'Viajes',
  'Otros gastos',
] as const;

const businessIncomeCategories = ['Ventas', 'Servicios', 'Comisiones', 'Otros ingresos'] as const;

const businessExpenseCategories = [
  'Personal',
  'Proveedores',
  'Alquiler',
  'Servicios',
  'Marketing',
  'Transporte',
  'Tecnología',
  'Equipamiento',
  'Mantenimiento',
  'Impuestos',
  'Gastos administrativos',
  'Otros gastos',
] as const;

function categoryId(group: number, index: number): string {
  return `50000000-0000-4000-8${group.toString().padStart(3, '0')}-${(index + 1)
    .toString()
    .padStart(12, '0')}`;
}

async function main(): Promise<void> {
  const passwordHash = await argon2.hash('Demo1234!', { type: argon2.argon2id });

  await prisma.$transaction(async (tx) => {
    await tx.user.upsert({
      where: { id: ids.user },
      update: {
        email: 'demo@finance.local',
        passwordHash,
        status: 'ACTIVE',
      },
      create: {
        id: ids.user,
        email: 'demo@finance.local',
        passwordHash,
        emailVerified: true,
        status: 'ACTIVE',
      },
    });

    await tx.userProfile.upsert({
      where: { userId: ids.user },
      update: {
        firstName: 'Usuario',
        paternalLastName: 'Demo',
      },
      create: {
        id: ids.userProfile,
        userId: ids.user,
        firstName: 'Usuario',
        paternalLastName: 'Demo',
      },
    });

    await tx.workspace.upsert({
      where: { id: ids.personalWorkspace },
      update: { name: 'Finanzas personales demo', status: 'ACTIVE' },
      create: {
        id: ids.personalWorkspace,
        name: 'Finanzas personales demo',
        type: 'PERSONAL',
        description: 'Espacio personal con datos ficticios.',
      },
    });

    await tx.workspace.upsert({
      where: { id: ids.businessWorkspace },
      update: { name: 'Negocio demo', status: 'ACTIVE' },
      create: {
        id: ids.businessWorkspace,
        name: 'Negocio demo',
        type: 'BUSINESS',
        description: 'Espacio empresarial con datos ficticios.',
      },
    });

    await tx.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId: ids.personalWorkspace, userId: ids.user },
      },
      update: { role: 'OWNER', status: 'ACTIVE' },
      create: {
        id: ids.personalMember,
        workspaceId: ids.personalWorkspace,
        userId: ids.user,
        role: 'OWNER',
      },
    });

    await tx.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId: ids.businessWorkspace, userId: ids.user },
      },
      update: { role: 'OWNER', status: 'ACTIVE' },
      create: {
        id: ids.businessMember,
        workspaceId: ids.businessWorkspace,
        userId: ids.user,
        role: 'OWNER',
      },
    });

    await tx.businessProfile.upsert({
      where: { workspaceId: ids.businessWorkspace },
      update: { legalName: 'Empresa Demo S.A.C.', tradeName: 'Negocio Demo' },
      create: {
        id: ids.businessProfile,
        workspaceId: ids.businessWorkspace,
        legalName: 'Empresa Demo S.A.C.',
        tradeName: 'Negocio Demo',
        email: 'contacto@negocio-demo.local',
      },
    });

    const categoryGroups = [
      {
        group: 1,
        workspaceId: ids.personalWorkspace,
        type: 'INCOME' as const,
        names: personalIncomeCategories,
      },
      {
        group: 2,
        workspaceId: ids.personalWorkspace,
        type: 'EXPENSE' as const,
        names: personalExpenseCategories,
      },
      {
        group: 3,
        workspaceId: ids.businessWorkspace,
        type: 'INCOME' as const,
        names: businessIncomeCategories,
      },
      {
        group: 4,
        workspaceId: ids.businessWorkspace,
        type: 'EXPENSE' as const,
        names: businessExpenseCategories,
      },
    ] as const;

    for (const group of categoryGroups) {
      for (const [index, name] of group.names.entries()) {
        const id = categoryId(group.group, index);
        await tx.category.upsert({
          where: { id },
          update: { name, type: group.type, active: true, deletedAt: null },
          create: {
            id,
            workspaceId: group.workspaceId,
            name,
            type: group.type,
          },
        });
      }
    }

    const accounts = [
      {
        id: ids.personalCash,
        workspaceId: ids.personalWorkspace,
        name: 'Efectivo',
        type: 'CASH' as const,
        initialBalance: '300.00',
      },
      {
        id: ids.personalBank,
        workspaceId: ids.personalWorkspace,
        name: 'Cuenta bancaria',
        type: 'BANK' as const,
        initialBalance: '1500.00',
      },
      {
        id: ids.businessCash,
        workspaceId: ids.businessWorkspace,
        name: 'Caja chica',
        type: 'CASH' as const,
        initialBalance: '500.00',
      },
      {
        id: ids.businessBank,
        workspaceId: ids.businessWorkspace,
        name: 'Cuenta corriente',
        type: 'BANK' as const,
        initialBalance: '5000.00',
      },
    ] as const;

    for (const account of accounts) {
      await tx.financialAccount.upsert({
        where: { id: account.id },
        update: {
          name: account.name,
          type: account.type,
          initialBalance: account.initialBalance,
          active: true,
          deletedAt: null,
        },
        create: account,
      });
    }

    const transactions = [
      {
        id: '60000000-0000-4000-8000-000000000001',
        workspaceId: ids.personalWorkspace,
        accountId: ids.personalBank,
        categoryId: categoryId(1, 0),
        createdByUserId: ids.user,
        type: 'INCOME' as const,
        amount: '4200.00',
        currencyCode: 'PEN',
        transactionDate: new Date('2026-09-01T00:00:00.000Z'),
        description: 'Sueldo mensual demo',
      },
      {
        id: '60000000-0000-4000-8000-000000000002',
        workspaceId: ids.personalWorkspace,
        accountId: ids.personalCash,
        categoryId: categoryId(2, 0),
        createdByUserId: ids.user,
        type: 'EXPENSE' as const,
        amount: '85.50',
        currencyCode: 'PEN',
        transactionDate: new Date('2026-09-03T00:00:00.000Z'),
        description: 'Compras de alimentación demo',
      },
      {
        id: '60000000-0000-4000-8000-000000000003',
        workspaceId: ids.personalWorkspace,
        accountId: ids.personalBank,
        categoryId: categoryId(2, 1),
        createdByUserId: ids.user,
        type: 'EXPENSE' as const,
        amount: '1200.00',
        currencyCode: 'PEN',
        transactionDate: new Date('2026-09-05T00:00:00.000Z'),
        description: 'Alquiler de vivienda demo',
      },
      {
        id: '60000000-0000-4000-8000-000000000004',
        workspaceId: ids.businessWorkspace,
        accountId: ids.businessBank,
        categoryId: categoryId(3, 0),
        createdByUserId: ids.user,
        type: 'INCOME' as const,
        amount: '8500.00',
        currencyCode: 'PEN',
        transactionDate: new Date('2026-09-08T00:00:00.000Z'),
        description: 'Ventas demo',
      },
      {
        id: '60000000-0000-4000-8000-000000000005',
        workspaceId: ids.businessWorkspace,
        accountId: ids.businessBank,
        categoryId: categoryId(4, 1),
        createdByUserId: ids.user,
        type: 'EXPENSE' as const,
        amount: '2300.00',
        currencyCode: 'PEN',
        transactionDate: new Date('2026-09-10T00:00:00.000Z'),
        description: 'Pago a proveedor demo',
      },
      {
        id: '60000000-0000-4000-8000-000000000006',
        workspaceId: ids.businessWorkspace,
        accountId: ids.businessBank,
        categoryId: categoryId(4, 4),
        createdByUserId: ids.user,
        type: 'EXPENSE' as const,
        amount: '450.00',
        currencyCode: 'PEN',
        transactionDate: new Date('2026-09-12T00:00:00.000Z'),
        description: 'Campaña de marketing demo',
      },
    ] as const;

    for (const transaction of transactions) {
      await tx.transaction.upsert({
        where: { id: transaction.id },
        update: { ...transaction, deletedAt: null },
        create: transaction,
      });
    }

    const transfers = [
      {
        id: '70000000-0000-4000-8000-000000000001',
        workspaceId: ids.personalWorkspace,
        sourceAccountId: ids.personalBank,
        destinationAccountId: ids.personalCash,
        amount: '250.00',
        currencyCode: 'PEN',
        transactionDate: new Date('2026-09-02T00:00:00.000Z'),
        description: 'Retiro para gastos en efectivo',
        createdByUserId: ids.user,
      },
      {
        id: '70000000-0000-4000-8000-000000000002',
        workspaceId: ids.businessWorkspace,
        sourceAccountId: ids.businessBank,
        destinationAccountId: ids.businessCash,
        amount: '600.00',
        currencyCode: 'PEN',
        transactionDate: new Date('2026-09-09T00:00:00.000Z'),
        description: 'Abastecimiento de caja chica',
        createdByUserId: ids.user,
      },
    ] as const;

    for (const transfer of transfers) {
      await tx.transfer.upsert({
        where: { id: transfer.id },
        update: { ...transfer, deletedAt: null },
        create: transfer,
      });
    }

    const budgets = [
      {
        id: '80000000-0000-4000-8000-000000000001',
        workspaceId: ids.personalWorkspace,
        categoryId: categoryId(2, 0),
        amount: '700.00',
        month: 9,
        year: 2026,
        alertPercentage: '80.00',
      },
      {
        id: '80000000-0000-4000-8000-000000000002',
        workspaceId: ids.personalWorkspace,
        categoryId: categoryId(2, 1),
        amount: '1400.00',
        month: 9,
        year: 2026,
        alertPercentage: '90.00',
      },
      {
        id: '80000000-0000-4000-8000-000000000003',
        workspaceId: ids.businessWorkspace,
        categoryId: categoryId(4, 4),
        amount: '1000.00',
        month: 9,
        year: 2026,
        alertPercentage: '75.00',
      },
    ] as const;

    for (const budget of budgets) {
      await tx.budget.upsert({
        where: { id: budget.id },
        update: { ...budget, deletedAt: null },
        create: budget,
      });
    }
  });

  console.info('Seed completed successfully.');
}

void main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
