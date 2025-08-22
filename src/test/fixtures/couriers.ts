import { TEST_USERS } from './users'

export const TEST_COURIERS = {
  // Approved couriers
  COURIER_1_APPROVED: {
    id: TEST_USERS.COURIER_1.id,
    full_name: TEST_USERS.COURIER_1.full_name,
    phone: '(11) 99999-1001',
    cpf: '123.456.789-01',
    birth_date: '1990-01-01',
    status: 'APPROVED' as const,
    vehicle_brand: 'Honda',
    vehicle_model: 'CG 160',
    vehicle_year: 2020,
    plate: 'ABC-1234',
    cnh_valid_until: '2026-12-31',
    crlv_valid_until: '2025-12-31',
    pix_key: 'courier1@trembao.test',
    pix_key_type: 'EMAIL' as const,
    address_json: {
      street: 'Rua do Entregador, 100',
      city: 'Goiânia',
      state: 'GO',
      zipCode: '74000-100'
    },
    approved_at: '2024-01-15T10:00:00Z',
    submitted_at: '2024-01-10T08:00:00Z',
  },

  COURIER_2_APPROVED: {
    id: TEST_USERS.COURIER_2.id,
    full_name: TEST_USERS.COURIER_2.full_name,
    phone: '(11) 99999-1002',
    cpf: '123.456.789-02',
    birth_date: '1988-05-15',
    status: 'APPROVED' as const,
    vehicle_brand: 'Yamaha',
    vehicle_model: 'Factor 125',
    vehicle_year: 2019,
    plate: 'DEF-5678',
    cnh_valid_until: '2026-08-15',
    crlv_valid_until: '2025-08-15',
    pix_key: '11999991002',
    pix_key_type: 'PHONE' as const,
    address_json: {
      street: 'Rua do Entregador, 200',
      city: 'Goiânia',
      state: 'GO',
      zipCode: '74000-200'
    },
    approved_at: '2024-02-01T14:30:00Z',
    submitted_at: '2024-01-25T16:45:00Z',
  },

  // Pending couriers
  COURIER_3_PENDING: {
    id: TEST_USERS.COURIER_3.id,
    full_name: TEST_USERS.COURIER_3.full_name,
    phone: '(11) 99999-1003',
    cpf: '123.456.789-03',
    birth_date: '1992-03-20',
    status: 'UNDER_REVIEW' as const,
    vehicle_brand: 'Honda',
    vehicle_model: 'Biz 125',
    vehicle_year: 2021,
    plate: 'GHI-9012',
    cnh_valid_until: '2026-03-20',
    crlv_valid_until: '2025-03-20',
    pix_key: '123.456.789-03',
    pix_key_type: 'CPF' as const,
    address_json: {
      street: 'Rua do Entregador, 300',
      city: 'Goiânia',
      state: 'GO',
      zipCode: '74000-300'
    },
    submitted_at: '2024-08-20T09:15:00Z',
  },

  COURIER_4_PENDING: {
    id: TEST_USERS.COURIER_4.id,
    full_name: TEST_USERS.COURIER_4.full_name,
    phone: '(11) 99999-1004',
    cpf: '123.456.789-04',
    birth_date: '1995-07-10',
    status: 'UNDER_REVIEW' as const,
    vehicle_brand: 'Yamaha',
    vehicle_model: 'XTZ 150',
    vehicle_year: 2022,
    plate: 'JKL-3456',
    cnh_valid_until: '2026-07-10',
    crlv_valid_until: '2025-07-10',
    pix_key: 'courier4@trembao.test',
    pix_key_type: 'EMAIL' as const,
    address_json: {
      street: 'Rua do Entregador, 400',
      city: 'Goiânia',
      state: 'GO',
      zipCode: '74000-400'
    },
    submitted_at: '2024-08-21T15:30:00Z',
  },

  // Suspended couriers
  COURIER_5_SUSPENDED: {
    id: TEST_USERS.COURIER_5.id,
    full_name: TEST_USERS.COURIER_5.full_name,
    phone: '(11) 99999-1005',
    cpf: '123.456.789-05',
    birth_date: '1987-11-25',
    status: 'SUSPENDED' as const,
    vehicle_brand: 'Honda',
    vehicle_model: 'CG 150',
    vehicle_year: 2018,
    plate: 'MNO-7890',
    cnh_valid_until: '2025-11-25',
    crlv_valid_until: '2024-11-25', // Expired CRLV
    pix_key: '11999991005',
    pix_key_type: 'PHONE' as const,
    address_json: {
      street: 'Rua do Entregador, 500',
      city: 'Goiânia',
      state: 'GO',
      zipCode: '74000-500'
    },
    approved_at: '2024-01-01T10:00:00Z',
    submitted_at: '2023-12-20T14:00:00Z',
    suspended_reason: 'Documentos vencidos - CRLV expirado',
  },

  COURIER_6_REJECTED: {
    id: TEST_USERS.COURIER_6.id,
    full_name: TEST_USERS.COURIER_6.full_name,
    phone: '(11) 99999-1006',
    cpf: '123.456.789-06',
    birth_date: '1993-09-05',
    status: 'REJECTED' as const,
    vehicle_brand: 'Yamaha',
    vehicle_model: 'Factor 150',
    vehicle_year: 2017,
    plate: 'PQR-1234',
    cnh_valid_until: '2024-09-05', // Expired CNH
    crlv_valid_until: '2025-09-05',
    pix_key: 'courier6@trembao.test',
    pix_key_type: 'EMAIL' as const,
    address_json: {
      street: 'Rua do Entregador, 600',
      city: 'Goiânia',
      state: 'GO',
      zipCode: '74000-600'
    },
    submitted_at: '2024-08-18T11:20:00Z',
    rejection_reason: 'CNH vencida - documentação incompleta',
  }
} as const

export const COURIER_STATUSES = {
  APPROVED: 'APPROVED',
  UNDER_REVIEW: 'UNDER_REVIEW', 
  REJECTED: 'REJECTED',
  SUSPENDED: 'SUSPENDED',
  DRAFT: 'DRAFT'
} as const