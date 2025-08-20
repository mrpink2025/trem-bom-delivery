import { lazy } from 'react';

// Lazy load heavy components for better performance
export const LazyAdminDashboard = lazy(() => import('@/components/admin/AdminDashboard'));
export const LazyRestaurantDashboard = lazy(() => import('@/components/restaurant/RestaurantDashboard'));
export const LazyCourierDashboard = lazy(() => import('@/components/courier/CourierDashboard'));
export const LazyPerformanceDashboard = lazy(() => import('@/components/admin/PerformanceDashboard'));
export const LazySecurityCenter = lazy(() => import('@/components/admin/SecurityCenter'));
export const LazyAuditLogs = lazy(() => import('@/components/admin/AuditLogs'));
export const LazyBackupManagement = lazy(() => import('@/components/admin/BackupManagement'));
export const LazyLoyaltyProgram = lazy(() => import('@/components/loyalty/LoyaltyProgram'));