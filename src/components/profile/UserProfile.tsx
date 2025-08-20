import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CPFInput, formatCPF } from '@/components/auth/CPFInput';
import { PasswordStrengthIndicator, getPasswordStrength } from '@/components/auth/PasswordStrengthIndicator';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Camera, 
  Save, 
  Loader2,
  Eye,
  EyeOff,
  Key
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserProfileData {
  full_name: string;
  phone: string;
  cpf: string;
  avatar_url: string;
  role: string;
}

export const UserProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Estados do perfil
  const [profile, setProfile] = useState<UserProfileData>({
    full_name: '',
    phone: '',
    cpf: '',
    avatar_url: '',
    role: 'client'
  });
  
  // Estados do form
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados da senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          cpf: data.cpf || '',
          avatar_url: data.avatar_url || '',
          role: data.role || 'client'
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error);
      toast({
        title: "Erro ao carregar perfil",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          full_name: profile.full_name,
          phone: profile.phone,
          cpf: profile.cpf,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      setChangingPassword(false);
      return;
    }

    if (!getPasswordStrength(newPassword)) {
      setError('A nova senha não atende aos requisitos de segurança');
      setChangingPassword(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi alterada com sucesso.",
      });

      // Limpar campos
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      client: { label: 'Cliente', variant: 'default' as const },
      restaurant: { label: 'Restaurante', variant: 'secondary' as const },
      courier: { label: 'Entregador', variant: 'outline' as const },
      admin: { label: 'Administrador', variant: 'destructive' as const }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.client;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* Header do perfil */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                  <AvatarFallback className="text-lg font-semibold">
                    {getInitials(profile.full_name || user?.email || 'U')}
                  </AvatarFallback>
                </Avatar>
                <Button 
                  size="sm" 
                  className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                  variant="secondary"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="text-center sm:text-left space-y-2">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-foreground">
                    {profile.full_name || 'Usuário'}
                  </h1>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {user?.email}
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  {getRoleBadge(profile.role)}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    Conta verificada
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs principais */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="w-4 h-4 mr-2" />
              Dados Pessoais
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Key className="w-4 h-4 mr-2" />
              Segurança
            </TabsTrigger>
          </TabsList>

          {/* Tab Dados Pessoais */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais e de contato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nome completo *</Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={profile.full_name}
                        onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                        required
                        className="h-11"
                        placeholder="Seu nome completo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profile.phone}
                        onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                        className="h-11"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <CPFInput
                    value={profile.cpf}
                    onChange={(value) => setProfile(prev => ({ ...prev, cpf: value }))}
                    className="space-y-2"
                  />

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Separator />

                  <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="w-4 h-4 mr-2" />
                    Salvar alterações
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Segurança */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>
                  Mantenha sua conta segura com uma senha forte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova senha *</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPasswords.new ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="h-11 pr-10"
                        placeholder="Digite sua nova senha"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <PasswordStrengthIndicator password={newPassword} />

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar nova senha *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="h-11 pr-10"
                        placeholder="Confirme sua nova senha"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-sm text-destructive">As senhas não coincidem</p>
                    )}
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Separator />

                  <Button 
                    type="submit" 
                    className="w-full sm:w-auto" 
                    disabled={changingPassword || !newPassword || newPassword !== confirmPassword}
                  >
                    {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Key className="w-4 h-4 mr-2" />
                    Alterar senha
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};