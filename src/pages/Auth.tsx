import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Loading states granulares
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Validation states
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  
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

  // Validação de email em tempo real
  useEffect(() => {
    const validateEmail = async () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!email) {
        setEmailValid(null);
        setEmailExists(null);
        return;
      }
      
      if (!emailRegex.test(email)) {
        setEmailValid(false);
        setEmailExists(null);
        return;
      }
      
      setEmailValid(true);
      
      // Verificar se email já existe (apenas durante cadastro)
      const currentTab = new URLSearchParams(window.location.search).get('tab') || defaultTab;
      if (currentTab === 'register') {
        setCheckingEmail(true);
        try {
          // Esta checagem é feita pelo cliente, pode dar falso negativo mas evita cadastros duplicados óbvios
          const { data } = await supabase.auth.signInWithPassword({
            email,
            password: 'fake-password-check'
          });
          
          // Se chegou aqui sem erro, email não existe (senha inválida esperada)
          setEmailExists(false);
        } catch (error: any) {
          // Se erro relacionado a senha inválida, email existe
          if (error.message?.includes('Invalid login credentials') || 
              error.message?.includes('Invalid password')) {
            setEmailExists(true);
          } else {
            setEmailExists(false);
          }
        }
        setCheckingEmail(false);
      }
    };
    
    const timeoutId = setTimeout(validateEmail, 500);
    return () => clearTimeout(timeoutId);
  }, [email, defaultTab]);

  // Detectar mudança de telefone para resetar verificação
  useEffect(() => {
    if (phone && phoneVerified && verifiedPhone !== unformatPhoneNumber(phone)) {
      setPhoneVerified(false);
    }
  }, [phone, phoneVerified, verifiedPhone]);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const translateError = (errorMessage: string) => {
    if (errorMessage.includes('Invalid login credentials') || 
        errorMessage.includes('Email not confirmed') ||
        errorMessage.includes('Invalid password')) {
      return 'Email ou senha incorretos. Verifique suas credenciais.';
    }
    if (errorMessage.includes('Too many requests')) {
      return 'Muitas tentativas de login. Aguarde alguns minutos.';
    }
    if (errorMessage.includes('User not found')) {
      return 'Usuário não encontrado. Verifique o email ou cadastre-se.';
    }
    if (errorMessage.includes('Email already registered')) {
      return 'Este email já está cadastrado. Tente fazer login.';
    }
    if (errorMessage.includes('Weak password')) {
      return 'Senha muito fraca. Siga os critérios de segurança.';
    }
    if (errorMessage.includes('Network')) {
      return 'Problema de conexão. Verifique sua internet.';
    }
    return errorMessage;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError(null);

    // Validações básicas
    if (!email || !emailValid) {
      setError('Digite um email válido');
      setLoginLoading(false);
      return;
    }

    if (!password) {
      setError('Digite sua senha');
      setLoginLoading(false);
      return;
    }

    const { error } = await signIn(email, password);

    if (error) {
      const translatedError = translateError(error.message);
      setError(translatedError);
      toast({
        title: "Erro no login",
        description: translatedError,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta ao Trem Bão Delivery",
      });
      navigate('/');
    }

    setLoginLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setError(null);

    // Validações completas
    if (!fullName.trim()) {
      setError('Nome completo é obrigatório');
      setRegisterLoading(false);
      return;
    }

    if (!email || !emailValid) {
      setError('Digite um email válido');
      setRegisterLoading(false);
      return;
    }

    if (emailExists) {
      setError('Este email já está cadastrado. Tente fazer login.');
      setRegisterLoading(false);
      return;
    }

    if (!getPasswordStrength(password)) {
      setError('A senha não atende aos requisitos de segurança');
      setRegisterLoading(false);
      return;
    }

    if (cpf && !validateCPF(cpf)) {
      setError('CPF inválido');
      setRegisterLoading(false);
      return;
    }

    // Validar telefone obrigatório
    if (!phone) {
      setError('Número de telefone é obrigatório');
      setRegisterLoading(false);
      return;
    }

    if (!validatePhoneNumber(phone)) {
      setError('Número de telefone inválido');
      setRegisterLoading(false);
      return;
    }

    // Telefone deve estar verificado via SMS
    if (!phoneVerified || verifiedPhone !== unformatPhoneNumber(phone)) {
      setError('Você precisa verificar seu número de telefone via SMS antes de continuar');
      setRegisterLoading(false);
      return;
    }

    // Validar se os termos foram aceitos
    if (!termsAccepted) {
      setError('Você deve aceitar os Termos de Uso e a Política de Privacidade para continuar');
      setRegisterLoading(false);
      return;
    }

    // Preparar dados do usuário com campos adicionais
    const userData = {
      full_name: fullName.trim(),
      role: 'client',
      cpf: cpf ? unformatCPF(cpf) : null,
      phone: unformatPhoneNumber(phone),
      phone_verified: true
    };

    const { error } = await signUp(email, password, fullName.trim(), 'client', userData);

    if (error) {
      const translatedError = translateError(error.message);
      setError(translatedError);
      toast({
        title: "Erro no cadastro",
        description: translatedError,
        variant: "destructive"
      });
    } else {
      setSuccess('Conta criada com sucesso! Verifique seu email para confirmar sua conta antes de fazer login.');
      toast({
        title: "Cadastro realizado!",
        description: "Verifique seu email para confirmar sua conta antes de fazer login.",
        duration: 8000,
      });
      
      // Reset completo de todos os estados
      resetForm();
    }

    setRegisterLoading(false);
  };

  const resetForm = () => {
    setFullName('');
    setCpf('');
    setPhone('');
    setEmail('');
    setPassword('');
    setPhoneVerified(false);
    setVerifiedPhone('');
    setTermsAccepted(false);
    setEmailValid(null);
    setEmailExists(null);
    setError(null);
    setSuccess(null);
  };

  const handlePhoneVerified = (verifiedPhoneNumber: string, code: string) => {
    const cleanVerifiedPhone = unformatPhoneNumber(verifiedPhoneNumber);
    const cleanCurrentPhone = unformatPhoneNumber(phone);
    
    // Verificar se o telefone verificado é o mesmo que está no campo
    if (cleanVerifiedPhone === cleanCurrentPhone) {
      setPhoneVerified(true);
      setVerifiedPhone(cleanVerifiedPhone);
      setShowSMSDialog(false);
      
      toast({
        title: "Telefone verificado com sucesso!",
        description: "Agora você pode finalizar seu cadastro",
      });
    } else {
      setError('O telefone verificado não corresponde ao telefone informado');
      setShowSMSDialog(false);
    }
  };

  const handleRequestVerification = () => {
    console.log('handleRequestVerification called', { phone, phoneVerified });
    
    if (!phone) {
      setError('Digite um número de telefone primeiro');
      return;
    }
    
    if (!validatePhoneNumber(phone)) {
      setError('Digite um número de telefone válido');
      return;
    }

    setError(null);
    console.log('Setting showSMSDialog to true');
    setShowSMSDialog(true);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setError(null);
    setSuccess(null);

    // Validação do email
    if (!email || !emailValid) {
      setError('Por favor, digite um email válido');
      setResetLoading(false);
      return;
    }

    const { error } = await resetPassword(email);

    if (error) {
      const translatedError = translateError(error.message);
      setError(translatedError);
      toast({
        title: "Erro ao enviar email",
        description: translatedError,
        variant: "destructive"
      });
    } else {
      setSuccess('Email de recuperação enviado com sucesso! Verifique sua caixa de entrada e pasta de spam.');
      setEmail(''); // Limpar o campo para segurança
      setEmailValid(null);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada e pasta de spam para redefinir sua senha",
      });
    }

    setResetLoading(false);
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
                            Email {checkingEmail && <span className="text-xs text-muted-foreground">(verificando...)</span>}
                          </Label>
                          <div className="relative">
                            <Input
                              id="email"
                              type="email"
                              placeholder="seu@email.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              className={`h-12 sm:h-11 bg-background focus:border-primary pr-10 ${
                                emailValid === false ? 'border-destructive focus:border-destructive' :
                                emailValid === true ? 'border-success focus:border-success' :
                                'border-input'
                              }`}
                              autoComplete="email"
                            />
                            {emailValid !== null && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                {emailValid ? (
                                  <div className="w-2 h-2 bg-success rounded-full"></div>
                                ) : (
                                  <div className="w-2 h-2 bg-destructive rounded-full"></div>
                                )}
                              </div>
                            )}
                          </div>
                          {emailValid === false && (
                            <p className="text-xs text-destructive">Email inválido</p>
                          )}
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
                      disabled={loginLoading}
                    >
                      {loginLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                          required
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
                        {phoneVerified && verifiedPhone === unformatPhoneNumber(phone) && (
                          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-md border border-green-200">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Telefone verificado com sucesso ✓
                          </div>
                        )}
                        {phone && phoneVerified && verifiedPhone !== unformatPhoneNumber(phone) && (
                          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-200">
                            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                            Telefone alterado - Verificar novamente
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-foreground">
                          Email * {checkingEmail && <span className="text-xs text-muted-foreground">(verificando...)</span>}
                        </Label>
                        <div className="relative">
                          <Input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={`h-11 bg-background focus:border-primary pr-10 ${
                              emailValid === false ? 'border-destructive focus:border-destructive' :
                              emailValid === true ? 'border-success focus:border-success' :
                              'border-input'
                            }`}
                          />
                          {emailValid !== null && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              {emailValid ? (
                                <div className="w-2 h-2 bg-success rounded-full"></div>
                              ) : (
                                <div className="w-2 h-2 bg-destructive rounded-full"></div>
                              )}
                            </div>
                          )}
                        </div>
                        {emailValid === false && (
                          <p className="text-xs text-destructive">Email inválido</p>
                        )}
                        {emailExists === true && (
                          <p className="text-xs text-amber-600">Este email já está cadastrado. Tente fazer login.</p>
                        )}
                        {emailExists === false && emailValid === true && (
                          <p className="text-xs text-success">Email disponível ✓</p>
                        )}
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

                    {/* Terms and Privacy Policy Acceptance */}
                    <div className="space-y-3 mt-6">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="terms"
                          checked={termsAccepted}
                          onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <label 
                            htmlFor="terms" 
                            className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
                          >
                            Li e aceito os{' '}
                            <a 
                              href="/terms-of-service" 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline font-medium"
                            >
                              Termos de Uso
                            </a>
                            {' '}e a{' '}
                            <a 
                              href="/privacy-policy" 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline font-medium"
                            >
                              Política de Privacidade
                            </a>
                            {' '}do Trem Bão Delivery
                          </label>
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base mt-6" 
                      disabled={registerLoading || !getPasswordStrength(password) || !phoneVerified || verifiedPhone !== unformatPhoneNumber(phone) || !termsAccepted}
                    >
                      {registerLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Criar conta
                    </Button>
                    
                    {(!phoneVerified || verifiedPhone !== unformatPhoneNumber(phone)) && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        * Você deve verificar seu telefone via SMS antes de criar a conta
                      </p>
                    )}
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
                            Email {checkingEmail && <span className="text-xs text-muted-foreground">(verificando...)</span>}
                          </Label>
                          <div className="relative">
                            <Input
                              id="email"
                              type="email"
                              placeholder="seu@email.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              className={`h-11 bg-background focus:border-primary pr-10 ${
                                emailValid === false ? 'border-destructive focus:border-destructive' :
                                emailValid === true ? 'border-success focus:border-success' :
                                'border-input'
                              }`}
                            />
                            {emailValid !== null && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                {emailValid ? (
                                  <div className="w-2 h-2 bg-success rounded-full"></div>
                                ) : (
                                  <div className="w-2 h-2 bg-destructive rounded-full"></div>
                                )}
                              </div>
                            )}
                          </div>
                          {emailValid === false && (
                            <p className="text-xs text-destructive">Email inválido</p>
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
                      disabled={resetLoading}
                    >
                      {resetLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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