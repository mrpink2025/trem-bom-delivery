import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, User, Store, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { ScooterIcon } from '@/components/ui/scooter-icon';
import { CPFInput, validateCPF, unformatCPF } from '@/components/auth/CPFInput';
import { PasswordStrengthIndicator, getPasswordStrength } from '@/components/auth/PasswordStrengthIndicator';
import { useToast } from '@/hooks/use-toast';
import heroImage from '@/assets/hero-trem-bao.jpg';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'client' | 'restaurant' | 'courier' | 'admin'>('client');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const defaultTab = mode === 'reset' ? 'forgot' : 'login';
  
  const { signIn, signUp, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta ao Trem Bão Delivery",
      });
      navigate('/');
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validações
    if (!getPasswordStrength(password)) {
      setError('A senha não atende aos requisitos de segurança');
      setLoading(false);
      return;
    }

    if (cpf && !validateCPF(cpf)) {
      setError('CPF inválido');
      setLoading(false);
      return;
    }

    // Preparar dados do usuário com campos adicionais
    const userData = {
      full_name: fullName,
      role: role,
      cpf: unformatCPF(cpf),
      phone: phone
    };

    const { error } = await signUp(email, password, fullName, role, userData);

    if (error) {
      setError(error.message);
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setSuccess('Conta criada com sucesso! Verifique seu email para confirmar.');
      toast({
        title: "Cadastro realizado!",
        description: "Verifique seu email para confirmar sua conta",
      });
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await resetPassword(email);

    if (error) {
      setError(error.message);
      toast({
        title: "Erro ao enviar email",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.');
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha",
      });
    }

    setLoading(false);
  };

  const getRoleIcon = (roleType: string) => {
    switch (roleType) {
      case 'client': return <User className="h-4 w-4" />;
      case 'restaurant': return <Store className="h-4 w-4" />;
      case 'courier': return <ScooterIcon className="h-4 w-4" />;
      case 'admin': return <ShieldCheck className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (roleType: string) => {
    switch (roleType) {
      case 'client': return 'Cliente';
      case 'restaurant': return 'Restaurante';
      case 'courier': return 'Entregador';
      case 'admin': return 'Administrador';
      default: return 'Cliente';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Background" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
      </div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/')}
            className="mb-6 text-primary hover:text-primary/80 hover:bg-primary/10 border-primary/20 backdrop-blur-sm bg-white/80 shadow-lg font-medium"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Voltar ao início
          </Button>

          <Card className="backdrop-blur-sm bg-card shadow-card border-0">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl font-bold text-primary mb-2">
                Trem Bão Delivery
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Entre ou cadastre-se para começar a pedir
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-muted p-1 h-12">
                  <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                    Cadastrar
                  </TabsTrigger>
                  <TabsTrigger value="forgot" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                    Esqueci
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-6 mt-6">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-foreground">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11 bg-background border-input focus:border-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-foreground">
                        Senha
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Sua senha"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-11 bg-background border-input focus:border-primary pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive" className="border-destructive/50 text-destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base mt-6" 
                      disabled={loading}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Entrar
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-6 mt-6">
                  <form onSubmit={handleSignUp} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                          Nome completo *
                        </Label>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="Seu nome completo"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className="h-11 bg-background border-input focus:border-primary"
                        />
                      </div>

                      <CPFInput
                        value={cpf}
                        onChange={setCpf}
                        className="space-y-2"
                      />

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                          Telefone
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(00) 00000-0000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-11 bg-background border-input focus:border-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-foreground">
                          Email *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-11 bg-background border-input focus:border-primary"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium text-foreground">
                          Senha *
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Crie uma senha forte"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="h-11 bg-background border-input focus:border-primary pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {password && (
                        <PasswordStrengthIndicator password={password} className="mt-3" />
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="role" className="text-sm font-medium text-foreground">
                          Tipo de conta *
                        </Label>
                        <Select value={role} onValueChange={(value: any) => setRole(value)}>
                          <SelectTrigger className="h-11 bg-background border-input focus:border-primary">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border z-50">
                            <SelectItem value="client" className="focus:bg-accent focus:text-accent-foreground">
                              <div className="flex items-center space-x-2">
                                {getRoleIcon('client')}
                                <span>{getRoleLabel('client')}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="restaurant" className="focus:bg-accent focus:text-accent-foreground">
                              <div className="flex items-center space-x-2">
                                {getRoleIcon('restaurant')}  
                                <span>{getRoleLabel('restaurant')}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="courier" className="focus:bg-accent focus:text-accent-foreground">
                              <div className="flex items-center space-x-2">
                                {getRoleIcon('courier')}
                                <span>{getRoleLabel('courier')}</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Escolha o tipo de conta de acordo com como você pretende usar a plataforma
                        </p>
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive" className="border-destructive/50 text-destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="border-success/50 text-success bg-success/10">
                        <AlertDescription>{success}</AlertDescription>
                      </Alert>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base mt-6" 
                      disabled={loading || !getPasswordStrength(password)}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Criar conta
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="forgot" className="space-y-6 mt-6">
                  <div className="text-center mb-4">
                    <p className="text-sm text-muted-foreground">
                      Digite seu email para receber um link de recuperação de senha
                    </p>
                  </div>
                  
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-foreground">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11 bg-background border-input focus:border-primary"
                      />
                    </div>

                    {error && (
                      <Alert variant="destructive" className="border-destructive/50 text-destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="border-success/50 text-success bg-success/10">
                        <AlertDescription>{success}</AlertDescription>
                      </Alert>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base mt-6" 
                      disabled={loading}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Enviar link de recuperação
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;