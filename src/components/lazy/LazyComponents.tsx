import { lazy } from 'react';
import { createLazyPage } from '@/components/optimization/LazyPageWrapper';

// Enhanced lazy loading with optimized fallbacks
export const LazyAdminDashboard = createLazyPage(
  () => import('@/components/admin/AdminDashboard'),
  { preload: false }
);

export const LazyRestaurantDashboard = createLazyPage(
  () => import('@/components/restaurant/RestaurantDashboard'),
  { preload: false }
);

export const LazyCourierDashboard = createLazyPage(
  () => import('@/components/courier/CourierDashboard'),
  { preload: false }
);

export const LazyPerformanceMonitorDashboard = createLazyPage(
  () => import('@/components/admin/PerformanceMonitorDashboard'),
  { preload: false }
);

export const LazyPerformanceOptimizer = createLazyPage(
  () => import('@/components/performance/PerformanceOptimizer'),
  { preload: false }
);

export const LazyRealTimeOptimizer = createLazyPage(
  () => import('@/components/optimization/RealTimeOptimizer'),
  { preload: false }
);

export const LazySecurityCenter = createLazyPage(
  () => import('@/components/admin/SecurityCenter'),
  { preload: false }
);

export const LazyAuditLogs = createLazyPage(
  () => import('@/components/admin/AuditLogs'),
  { preload: false }
);

export const LazyBackupManagement = createLazyPage(
  () => import('@/components/admin/BackupManagement'),
  { preload: false }
);

export const LazyLoyaltyProgram = createLazyPage(
  () => import('@/components/loyalty/LoyaltyProgram'),
  { preload: false }
);

// Direct lazy components - remove problematic imports for now
// These will be added back when the components are properly exported