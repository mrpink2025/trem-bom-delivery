// Test data fixtures for user accounts
export const TEST_USERS = {
  // Admin accounts
  ADMIN_SUPER: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'superadmin@trembao.test',
    full_name: 'Super Admin',
    role: 'admin' as const,
  },
  ADMIN_1: {
    id: '00000000-0000-0000-0000-000000000002', 
    email: 'admin1@trembao.test',
    full_name: 'Admin One',
    role: 'admin' as const,
  },
  SUPPORT_1: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'support1@trembao.test', 
    full_name: 'Support One',
    role: 'admin' as const,
  },
  AUDITOR_1: {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'auditor1@trembao.test',
    full_name: 'Auditor One', 
    role: 'admin' as const,
  },

  // Client accounts
  CLIENTE_A: {
    id: '00000000-0000-0000-0000-000000000010',
    email: 'cliente.a@trembao.test',
    full_name: 'Cliente A',
    role: 'client' as const,
  },
  CLIENTE_B: {
    id: '00000000-0000-0000-0000-000000000011', 
    email: 'cliente.b@trembao.test',
    full_name: 'Cliente B',
    role: 'client' as const,
  },

  // Restaurant owners
  SELLER_A_OWNER: {
    id: '00000000-0000-0000-0000-000000000020',
    email: 'seller.a@trembao.test',
    full_name: 'Seller A Owner',
    role: 'restaurant' as const,
  },
  SELLER_B_OWNER: {
    id: '00000000-0000-0000-0000-000000000021',
    email: 'seller.b@trembao.test', 
    full_name: 'Seller B Owner',
    role: 'restaurant' as const,
  },

  // Couriers
  COURIER_1: {
    id: '00000000-0000-0000-0000-000000000030',
    email: 'courier1@trembao.test',
    full_name: 'Courier One',
    role: 'courier' as const,
  },
  COURIER_2: {
    id: '00000000-0000-0000-0000-000000000031',
    email: 'courier2@trembao.test',
    full_name: 'Courier Two', 
    role: 'courier' as const,
  },
  COURIER_3: {
    id: '00000000-0000-0000-0000-000000000032',
    email: 'courier3@trembao.test',
    full_name: 'Courier Three',
    role: 'courier' as const,
  },
  COURIER_4: {
    id: '00000000-0000-0000-0000-000000000033',
    email: 'courier4@trembao.test',
    full_name: 'Courier Four',
    role: 'courier' as const,
  },
  COURIER_5: {
    id: '00000000-0000-0000-0000-000000000034',
    email: 'courier5@trembao.test',
    full_name: 'Courier Five', 
    role: 'courier' as const,
  },
  COURIER_6: {
    id: '00000000-0000-0000-0000-000000000035',
    email: 'courier6@trembao.test',
    full_name: 'Courier Six',
    role: 'courier' as const,
  }
} as const

export const TEST_PASSWORDS = {
  DEFAULT: 'TremBao2024!Test',
} as const