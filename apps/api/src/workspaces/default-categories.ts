import type { Prisma } from '../generated/prisma/client';

export const DEFAULT_CATEGORIES = {
  PERSONAL: {
    INCOME: [
      'Sueldo',
      'Bonos',
      'Freelance',
      'Ingresos adicionales',
      'Inversiones',
      'Otros ingresos',
    ],
    EXPENSE: [
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
    ],
  },
  BUSINESS: {
    INCOME: ['Ventas', 'Servicios', 'Comisiones', 'Otros ingresos'],
    EXPENSE: [
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
    ],
  },
} as const;

export async function createDefaultCategories(
  transaction: Prisma.TransactionClient,
  workspaceId: string,
  workspaceType: keyof typeof DEFAULT_CATEGORIES,
): Promise<void> {
  const definitions = DEFAULT_CATEGORIES[workspaceType];
  await transaction.category.createMany({
    data: [
      ...definitions.INCOME.map((name) => ({ workspaceId, name, type: 'INCOME' as const })),
      ...definitions.EXPENSE.map((name) => ({ workspaceId, name, type: 'EXPENSE' as const })),
    ],
  });
}
