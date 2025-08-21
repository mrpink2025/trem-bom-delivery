// Role mapping between frontend and database
export type FrontendRole = 'client' | 'seller' | 'courier' | 'admin';
export type DatabaseRole = 'client' | 'restaurant' | 'seller' | 'courier' | 'admin';

export const mapFrontendToDatabase = (frontendRole: FrontendRole): DatabaseRole => {
  switch (frontendRole) {
    case 'seller':
      return 'seller'; // Now supported in DB after migration
    case 'client':
      return 'client';
    case 'courier':
      return 'courier';
    case 'admin':
      return 'admin';
    default:
      return 'client';
  }
};

export const mapDatabaseToFrontend = (databaseRole: DatabaseRole): FrontendRole => {
  switch (databaseRole) {
    case 'restaurant':
    case 'seller':
      return 'seller'; // Map both old 'restaurant' and new 'seller' to 'seller'
    case 'client':
      return 'client';
    case 'courier':
      return 'courier';
    case 'admin':
      return 'admin';
    default:
      return 'client';
  }
};

export const getRoleDisplayName = (role: FrontendRole): string => {
  switch (role) {
    case 'client':
      return 'Cliente';
    case 'seller':
      return 'Restaurante';
    case 'courier':
      return 'Entregador';
    case 'admin':
      return 'Administrador';
    default:
      return 'Cliente';
  }
};