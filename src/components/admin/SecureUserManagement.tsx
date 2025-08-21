import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, AlertTriangle, Users, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  role: 'client' | 'seller' | 'courier' | 'admin' | 'restaurant';
  phone: string | null;
  created_at: string;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  description: string | null;
  user_id: string | null;
  created_at: string;
  metadata: any;
}

export function SecureUserManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchUsers();
      fetchSecurityEvents();
    }
  }, [profile]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    }
  };

  const fetchSecurityEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSecurityEvents(data || []);
    } catch (error) {
      console.error('Error fetching security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'client' | 'seller' | 'courier' | 'admin' | 'restaurant') => {
    if (updatingRole) return;
    
    setUpdatingRole(userId);
    try {
      // Use the secure admin function to update role
      const { error } = await supabase.rpc('update_user_role', {
        target_user_id: userId,
        new_role: newRole
      });

      if (error) throw error;
      
      toast.success('User role updated successfully');
      fetchUsers(); // Refresh the list
      fetchSecurityEvents(); // Refresh security events
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast.error(error.message || 'Failed to update user role');
    } finally {
      setUpdatingRole(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'seller': return 'default';
      case 'courier': return 'secondary';
      default: return 'outline';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-4 w-4" />
            <p>Access denied. Admin privileges required.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Secure User Management</h2>
          <p className="text-muted-foreground">Manage user roles and monitor security events</p>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Accounts
          </CardTitle>
          <CardDescription>
            Manage user roles with secure admin controls
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || 'Unnamed User'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(newRole) => updateUserRole(user.user_id, newRole as any)}
                        disabled={updatingRole === user.user_id}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="seller">Seller</SelectItem>
                          <SelectItem value="courier">Courier</SelectItem>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Recent Security Events
          </CardTitle>
          <CardDescription>
            Monitor unauthorized access attempts and security violations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {securityEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No security events recorded
            </div>
          ) : (
            <div className="space-y-4">
              {securityEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{event.event_type}</h4>
                      <p className="text-sm text-muted-foreground">
                        {event.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge 
                      variant={event.severity === 'high' ? 'destructive' : 'secondary'}
                      className={getSeverityColor(event.severity)}
                    >
                      {event.severity}
                    </Badge>
                  </div>
                  {event.metadata && (
                    <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}