import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Header from '@/components/layout/Header';
import { OrderStatusDashboard } from '@/components/orders/OrderStatusDashboard';

export default function OrdersDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [userType, setUserType] = useState<'client' | 'seller' | 'courier' | 'admin'>('client');

  // Set user type based on profile
  useEffect(() => {
    if (profile?.role) {
      setUserType(profile.role);
    }
  }, [profile?.role]);

  const handleUserTypeChange = (type: 'client' | 'seller' | 'courier' | 'admin') => {
    setUserType(type);
    // Navigate to home page with the new user type
    navigate('/');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header userType={userType} onUserTypeChange={handleUserTypeChange} />
        <div className="container mx-auto px-4 py-8">
          <OrderStatusDashboard />
        </div>
      </div>
    </ProtectedRoute>
  );
}