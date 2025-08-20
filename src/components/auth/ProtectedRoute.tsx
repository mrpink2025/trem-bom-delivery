import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('client' | 'restaurant' | 'courier' | 'admin')[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && profile && allowedRoles) {
      if (!allowedRoles.includes(profile.role)) {
        navigate('/');
      }
    }
  }, [user, profile, loading, allowedRoles, navigate]);

  if (loading) {
    return <LoadingScreen message="Carregando seu painel..." />;
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
};