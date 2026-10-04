export const labels = {
  roles: {
    OWNER: 'Propietario',
    ADMIN: 'Administrador',
    STAFF: 'Colaborador',
    VIEWER: 'Solo lectura',
  },
  accountTypes: {
    CASH: 'Efectivo',
    BANK: 'Banco',
    DIGITAL_WALLET: 'Billetera digital',
    SAVINGS: 'Ahorros',
    OTHER: 'Otra',
  },
  transactionTypes: { INCOME: 'Ingreso', EXPENSE: 'Gasto' },
  frequencies: { DAILY: 'Diaria', WEEKLY: 'Semanal', MONTHLY: 'Mensual', YEARLY: 'Anual' },
} as const;
