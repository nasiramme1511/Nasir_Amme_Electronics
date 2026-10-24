/**
 * Nasir Amme Electronics — Centralized RBAC Permissions Matrix
 * Location: Dire Dawa, Ethiopia
 */

export type RoleType = 'admin' | 'manager' | 'cashier' | 'stock_keeper';

export const ROLES: Record<RoleType, { code: RoleType; displayName: string; dashboardRoute: string; description: string }> = {
  admin: {
    code: 'admin',
    displayName: 'Administrator / Owner',
    dashboardRoute: '/admin/dashboard',
    description: 'Full administrative access across all store operations, staff, and financials.',
  },
  manager: {
    code: 'manager',
    displayName: 'Store Manager',
    dashboardRoute: '/manager/dashboard',
    description: 'Supervises store operations, product catalog, purchasing, and staff activity.',
  },
  cashier: {
    code: 'cashier',
    displayName: 'Cashier',
    dashboardRoute: '/cashier/dashboard',
    description: 'Retail point-of-sale checkout, customer receipts, till drawer, and returns.',
  },
  stock_keeper: {
    code: 'stock_keeper',
    displayName: 'Stock Keeper',
    dashboardRoute: '/stock-keeper/dashboard',
    description: 'Warehouse inventory, stock movements, goods intake, and physical cycle counts.',
  },
};

export type PermissionCode =
  | 'dashboard.admin'
  | 'dashboard.manager'
  | 'dashboard.cashier'
  | 'dashboard.stock_keeper'
  | 'sales.checkout'
  | 'sales.view_own'
  | 'sales.view_all'
  | 'sales.void'
  | 'returns.process'
  | 'returns.approve'
  | 'products.view'
  | 'products.manage'
  | 'inventory.view'
  | 'inventory.movements'
  | 'inventory.count'
  | 'inventory.adjust'
  | 'inventory.approve_adjust'
  | 'purchases.view'
  | 'purchases.create'
  | 'purchases.approve'
  | 'purchases.receive'
  | 'suppliers.view'
  | 'suppliers.manage'
  | 'reports.operational'
  | 'reports.financial'
  | 'users.manage'
  | 'roles.manage'
  | 'settings.manage'
  | 'audit.view'
  | 'profile.manage';

/**
 * Authoritative Role-to-Permissions Mapping
 * Strictly enforces Section 6 Role Permissions Matrix
 */
export const ROLE_PERMISSIONS: Record<RoleType, PermissionCode[]> = {
  admin: [
    'dashboard.admin',
    'dashboard.manager',
    'dashboard.cashier',
    'dashboard.stock_keeper',
    'sales.checkout',
    'sales.view_own',
    'sales.view_all',
    'sales.void',
    'returns.process',
    'returns.approve',
    'products.view',
    'products.manage',
    'inventory.view',
    'inventory.movements',
    'inventory.count',
    'inventory.adjust',
    'inventory.approve_adjust',
    'purchases.view',
    'purchases.create',
    'purchases.approve',
    'purchases.receive',
    'suppliers.view',
    'suppliers.manage',
    'reports.operational',
    'reports.financial',
    'users.manage',
    'roles.manage',
    'settings.manage',
    'audit.view',
    'profile.manage',
  ],
  manager: [
    'dashboard.manager',
    'sales.checkout',
    'sales.view_own',
    'sales.view_all',
    'returns.process',
    'returns.approve',
    'products.view',
    'products.manage',
    'inventory.view',
    'inventory.movements',
    'inventory.count',
    'purchases.view',
    'purchases.create',
    'purchases.approve',
    'purchases.receive',
    'suppliers.view',
    'suppliers.manage',
    'reports.operational',
    'profile.manage',
  ],
  cashier: [
    'dashboard.cashier',
    'sales.checkout',
    'sales.view_own',
    'returns.process',
    'products.view',
    'profile.manage',
  ],
  stock_keeper: [
    'dashboard.stock_keeper',
    'products.view',
    'inventory.view',
    'inventory.movements',
    'inventory.count',
    'purchases.receive',
    'purchases.view',
    'suppliers.view',
    'profile.manage',
  ],
};

/**
 * Route protection rule definitions: Allowed roles per route path prefix
 */
export const ROUTE_ACCESS_RULES: Array<{
  prefix: string;
  allowedRoles: RoleType[];
}> = [
  // Admin-only areas
  { prefix: '/admin', allowedRoles: ['admin'] },
  { prefix: '/users', allowedRoles: ['admin'] },
  { prefix: '/settings', allowedRoles: ['admin'] },
  
  // Manager areas (Admin also allowed)
  { prefix: '/manager', allowedRoles: ['admin', 'manager'] },
  { prefix: '/reports', allowedRoles: ['admin', 'manager'] },

  // Cashier areas (Admin & Manager also allowed where specified)
  { prefix: '/cashier', allowedRoles: ['admin', 'cashier'] },
  { prefix: '/sales/checkout', allowedRoles: ['admin', 'manager', 'cashier'] },
  { prefix: '/returns', allowedRoles: ['admin', 'manager', 'cashier'] },

  // Stock Keeper areas (Admin & Manager also allowed)
  { prefix: '/stock-keeper', allowedRoles: ['admin', 'stock_keeper'] },
  { prefix: '/inventory', allowedRoles: ['admin', 'manager', 'stock_keeper'] },
  { prefix: '/purchases', allowedRoles: ['admin', 'manager', 'stock_keeper'] },
  { prefix: '/suppliers', allowedRoles: ['admin', 'manager', 'stock_keeper'] },

  // General authenticated pages
  { prefix: '/products', allowedRoles: ['admin', 'manager', 'cashier', 'stock_keeper'] },
  { prefix: '/categories', allowedRoles: ['admin', 'manager', 'cashier', 'stock_keeper'] },
  { prefix: '/customers', allowedRoles: ['admin', 'manager', 'cashier'] },
  { prefix: '/sales', allowedRoles: ['admin', 'manager', 'cashier'] },
  { prefix: '/profile', allowedRoles: ['admin', 'manager', 'cashier', 'stock_keeper'] },
];

/**
 * Checks if a given role is allowed to access a specific route pathname.
 */
export function isRouteAllowedForRole(pathname: string, roles: RoleType[]): boolean {
  if (roles.includes('admin')) return true; // Admin has unrestricted access to all routes

  for (const rule of ROUTE_ACCESS_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(rule.prefix + '/')) {
      return roles.some((r) => rule.allowedRoles.includes(r));
    }
  }

  return true; // Default allow for unspecified public/shared routes
}

/**
 * Returns the canonical dashboard route for a given role.
 */
export function getDashboardRouteForRole(role?: RoleType | string): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'manager':
      return '/manager/dashboard';
    case 'cashier':
      return '/cashier/dashboard';
    case 'stock_keeper':
      return '/stock-keeper/dashboard';
    default:
      return '/login';
  }
}
