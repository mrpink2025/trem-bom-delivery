// Utilitário para mapear roles entre DB e Frontend
// Resolve o drift entre enum DB ("restaurant") e UI ("seller")

export type DatabaseRole = "client" | "restaurant" | "courier" | "admin";
export type UIRole = "client" | "seller" | "courier" | "admin";

// Mapear de DB para UI
export const mapDbRoleToUI = (dbRole: DatabaseRole): UIRole => {
  switch (dbRole) {
    case "restaurant":
      return "seller";
    default:
      return dbRole as UIRole;
  }
};

// Mapear de UI para DB
export const mapUIRoleToDb = (uiRole: UIRole): DatabaseRole => {
  switch (uiRole) {
    case "seller":
      return "restaurant";
    default:
      return uiRole as DatabaseRole;
  }
};

// Verificar se role tem determinada permissão
export const hasPermission = (role: UIRole, permission: string): boolean => {
  const permissions: Record<UIRole, string[]> = {
    admin: ["*"], // Admin tem todas as permissões
    seller: ["manage_restaurant", "view_orders", "update_orders", "manage_menu"],
    courier: ["accept_orders", "update_delivery_status", "view_assigned_orders"],
    client: ["place_orders", "view_own_orders", "write_reviews"]
  };

  return permissions[role]?.includes("*") || permissions[role]?.includes(permission) || false;
};

// Validar se role é válida
export const isValidRole = (role: string): role is UIRole => {
  return ["client", "seller", "courier", "admin"].includes(role);
};

// Hook para usar role mapeado
export const useRoleMapping = () => {
  return {
    mapDbRoleToUI,
    mapUIRoleToDb,
    hasPermission,
    isValidRole
  };
};