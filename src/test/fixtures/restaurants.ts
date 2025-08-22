import { TEST_USERS } from './users'

export const TEST_RESTAURANTS = {
  MERCHANT_A_APPROVED: {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'Restaurant A - Approved',
    description: 'Test restaurant A - approved status',
    cuisine_type: 'Brasileira',
    owner_id: TEST_USERS.SELLER_A_OWNER.id,
    is_active: true,
    is_open: true,
    phone: '(11) 99999-0001',
    email: 'restauranta@trembao.test',
    address: {
      street: 'Rua dos Testes, 100',
      city: 'Goiânia', 
      state: 'GO',
      zipCode: '74000-000',
      coordinates: { lat: -16.6799, lng: -49.2553 }
    },
    delivery_fee: 5.99,
    minimum_order: 20.00,
    delivery_time_min: 30,
    delivery_time_max: 45,
    rating: 4.5,
    latitude: -16.6799,
    longitude: -49.2553,
  },
  
  MERCHANT_B_PENDING: {
    id: '10000000-0000-0000-0000-000000000002', 
    name: 'Restaurant B - Pending',
    description: 'Test restaurant B - pending approval',
    cuisine_type: 'Italiana',
    owner_id: TEST_USERS.SELLER_B_OWNER.id,
    is_active: false, // Pending approval
    is_open: false,
    phone: '(11) 99999-0002',
    email: 'restaurantb@trembao.test',
    address: {
      street: 'Rua dos Testes, 200',
      city: 'Goiânia',
      state: 'GO', 
      zipCode: '74000-001',
      coordinates: { lat: -16.6850, lng: -49.2600 }
    },
    delivery_fee: 6.99,
    minimum_order: 25.00,
    delivery_time_min: 25,
    delivery_time_max: 40,
    rating: 0.0,
    latitude: -16.6850,
    longitude: -49.2600,
  },

  MERCHANT_C_SUSPENDED: {
    id: '10000000-0000-0000-0000-000000000003',
    name: 'Restaurant C - Suspended', 
    description: 'Test restaurant C - suspended',
    cuisine_type: 'Mexicana',
    owner_id: '00000000-0000-0000-0000-000000000022', // Extra owner for suspended restaurant
    is_active: false, // Suspended
    is_open: false,
    phone: '(11) 99999-0003',
    email: 'restaurantc@trembao.test',
    address: {
      street: 'Rua dos Testes, 300',
      city: 'Goiânia',
      state: 'GO',
      zipCode: '74000-002', 
      coordinates: { lat: -16.6900, lng: -49.2650 }
    },
    delivery_fee: 4.99,
    minimum_order: 15.00,
    delivery_time_min: 35,
    delivery_time_max: 50,
    rating: 3.8,
    latitude: -16.6900,
    longitude: -49.2650,
  }
} as const

export const TEST_MENU_ITEMS = [
  // Restaurant A items
  {
    id: '20000000-0000-0000-0000-000000000001',
    restaurant_id: TEST_RESTAURANTS.MERCHANT_A_APPROVED.id,
    name: 'Hambúrguer Clássico',
    description: 'Hambúrguer artesanal com queijo e batata',
    price: 25.90,
    is_available: true,
    category_id: 'ef69577b-c5ad-4fdb-82a3-ba4ad2aff15c', // Lanches
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
    preparation_time: 20,
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    restaurant_id: TEST_RESTAURANTS.MERCHANT_A_APPROVED.id,
    name: 'Pizza Margherita',
    description: 'Pizza clássica com molho de tomate, mussarela e manjericão',
    price: 35.90,
    is_available: true,
    category_id: '5e1a3b59-63fd-42d3-95f2-ebf8156c021a', // Pizzas
    image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
    preparation_time: 25,
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    restaurant_id: TEST_RESTAURANTS.MERCHANT_A_APPROVED.id,
    name: 'Refrigerante 350ml',
    description: 'Refrigerante gelado',
    price: 5.50,
    is_available: true,
    category_id: '126db63c-9b77-494b-86e6-1b2a06bf1b43', // Bebidas
    image_url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423',
    preparation_time: 2,
  }
] as const