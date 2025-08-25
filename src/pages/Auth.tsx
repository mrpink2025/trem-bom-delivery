import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { CPFInput, validateCPF, unformatCPF } from '@/components/auth/CPFInput';
import { PasswordStrengthIndicator, getPasswordStrength } from '@/components/auth/PasswordStrengthIndicator';
import { PhoneInput, validatePhoneNumber, unformatPhoneNumber } from '@/components/auth/PhoneInput';
import { SMSVerificationDialog } from '@/components/auth/SMSVerificationDialog';
import { useToast } from '@/hooks/use-toast';
import heroImage from '@/assets/hero-comida-gostosa.jpg';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // SMS Verification states
  const [showSMSDialog, setShowSMSDialog] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  
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

    // Validar telefone se fornecido
    if (phone && !validatePhoneNumber(phone)) {
      setError('Número de telefone inválido');
      setLoading(false);
      return;
    }

    // Se telefone fornecido, precisa estar verificado
    if (phone && !phoneVerified) {
      setError('Número de telefone precisa ser verificado');
      setLoading(false);
      return;
    }

    // Preparar dados do usuário com campos adicionais
    const userData = {
      full_name: fullName,
      role: 'client',
      cpf: unformatCPF(cpf),
      phone: phone ? unformatPhoneNumber(phone) : phone,
      phone_verified: phoneVerified
    };

    const { error } = await signUp(email, password, fullName, 'client', userData);

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

  const handlePhoneVerified = (verifiedPhoneNumber: string, code: string) => {
    setPhoneVerified(true);
    setVerifiedPhone(verifiedPhoneNumber);
    setShowSMSDialog(false);
    
    toast({
      title: "Telefone verificado!",
      description: "Agora você pode finalizar seu cadastro",
    });
  };

  const handleRequestVerification = () => {
    if (!phone) {
      setError('Digite um número de telefone primeiro');
      return;
    }
    
    if (!validatePhoneNumber(phone)) {
      setError('Digite um número de telefone válido');
      return;
    }

    setError(null);
    setShowSMSDialog(true);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validação do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Por favor, digite um email válido');
      setLoading(false);
      return;
    }

    const { error } = await resetPassword(email);

    if (error) {
      let errorMessage = 'Erro ao enviar email de recuperação';
      
      // Personalizar mensagens de erro
      if (error.message.includes('User not found')) {
        errorMessage = 'Email não encontrado. Verifique se está correto ou crie uma conta.';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Problema de conexão. Verifique sua internet e tente novamente.';
      }
      
      setError(errorMessage);
      toast({
        title: "Erro ao enviar email",
        description: errorMessage,
        variant: "destructive"
      });
    } else {
      setSuccess('Email de recuperação enviado com sucesso! Verifique sua caixa de entrada e pasta de spam.');
      setEmail(''); // Limpar o campo para segurança
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada e pasta de spam para redefinir sua senha",
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Trem Bão - Conectando botecos e restaurantes locais" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
      </div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/')}
            className="mb-6 text-primary hover:text-primary/80 hover:bg-primary/10 border-primary/20 backdrop-blur-sm bg-white/80 shadow-lg font-medium w-full sm:w-auto min-h-[52px]"
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
                <TabsList className="grid w-full grid-cols-3 bg-muted p-1 h-12 sm:h-14">
                  <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-sm sm:text-base min-h-[44px]">
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-sm sm:text-base min-h-[44px]">
                    Cadastrar
                  </TabsTrigger>
                  <TabsTrigger value="forgot" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-sm sm:text-base min-h-[44px]">
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
                        className="h-12 sm:h-11 bg-background border-input focus:border-primary text-base"
                        autoComplete="email"
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
                          className="h-12 sm:h-11 bg-background border-input focus:border-primary pr-12 text-base"
                          autoComplete="current-password"
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
                      className="w-full h-12 sm:h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base mt-6" 
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
                        <PhoneInput
                          id="phone"
                          label="Telefone"
                          value={phone}
                          onChange={setPhone}
                          className="space-y-2"
                        />
                        {phone && !phoneVerified && validatePhoneNumber(phone) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRequestVerification}
                            className="w-full"
                          >
                            Verificar telefone via SMS
                          </Button>
                        )}
                        {phoneVerified && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Telefone verificado
                          </div>
                        )}
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
                      Digite seu email cadastrado para receber um link seguro de recuperação de senha
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Verifique também sua caixa de spam
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

          {/* SMS Verification Dialog */}
          <SMSVerificationDialog
            open={showSMSDialog}
            phone={phone}
            onVerified={handlePhoneVerified}
            onClose={() => setShowSMSDialog(false)}
          />
        </div>
      </div>
    </div>
  );
};

export default Auth;