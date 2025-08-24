import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { PasswordStrengthIndicator, getPasswordStrength } from '@/components/auth/PasswordStrengthIndicator';
import { useToast } from '@/hooks/use-toast';
import heroImage from '@/assets/hero-comida-gostosa.jpg';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Extract token and type from URL
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');

  useEffect(() => {
    const validateResetToken = async () => {
      setValidatingToken(true);
      setError(null);

      try {
        // Just validate that we have the necessary tokens/parameters
        if ((accessToken && refreshToken) || (token && type === 'recovery')) {
          setTokenValid(true);
        } else {
          throw new Error('Token de recuperação inválido ou expirado');
        }
      } catch (error: any) {
        console.error('Erro ao validar token:', error);
        setError(error.message || 'Token de recuperação inválido ou expirado');
        setTokenValid(false);
      } finally {
        setValidatingToken(false);
      }
    };

    if (token || (accessToken && refreshToken)) {
      validateResetToken();
    } else {
      setError('Link de recuperação inválido');
      setValidatingToken(false);
      setTokenValid(false);
    }
  }, [token, type, accessToken, refreshToken]);

  const validateForm = () => {
    if (!password) {
      setError('A senha é obrigatória');
      return false;
    }

    if (!getPasswordStrength(password)) {
      setError('A senha não atende aos requisitos de segurança');
      return false;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }

    return true;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Set the session first if we have the tokens
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (sessionError) {
          throw sessionError;
        }
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      
      toast({
        title: "Senha alterada com sucesso!",
        description: "Sua senha foi redefinida. Você será redirecionado para o login.",
      });

      // Sign out to clear the session after password update
      await supabase.auth.signOut();

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/auth?mode=login');
      }, 3000);

    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      setError(error.message || 'Erro ao redefinir senha. Tente novamente.');
      
      toast({
        title: "Erro ao redefinir senha",
        description: error.message || 'Tente novamente ou solicite um novo link de recuperação',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/auth?mode=login');
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Trem Bão - Validando token de recuperação" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
        </div>
        
        <Card className="w-full max-w-md backdrop-blur-sm bg-card shadow-card border-0 relative z-10">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validando link de recuperação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-warm">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Trem Bão - Link inválido" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
        </div>
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md">
            <Button
              variant="outline"
              size="lg"
              onClick={handleBackToLogin}
              className="mb-6 text-primary hover:text-primary/80 hover:bg-primary/10 border-primary/20 backdrop-blur-sm bg-white/80 shadow-lg font-medium w-full sm:w-auto min-h-[52px]"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Voltar ao login
            </Button>

            <Card className="backdrop-blur-sm bg-card shadow-card border-0">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-destructive mb-2">
                  Link Inválido
                </CardTitle>
                <CardDescription>
                  O link de recuperação é inválido ou já expirou
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Solicite um novo link de recuperação de senha
                  </p>
                  
                  <Button 
                    onClick={() => navigate('/auth?mode=forgot')}
                    className="w-full"
                  >
                    Solicitar novo link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-warm">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Trem Bão - Senha alterada" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
        </div>
        
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md">
            <Card className="backdrop-blur-sm bg-card shadow-card border-0">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <CardTitle className="text-2xl font-bold text-success mb-2">
                  Senha Redefinida!
                </CardTitle>
                <CardDescription>
                  Sua senha foi alterada com sucesso
                </CardDescription>
              </CardHeader>
              
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Redirecionando para o login em alguns segundos...
                </p>
                
                <Button 
                  onClick={handleBackToLogin}
                  className="w-full"
                >
                  Ir para o login agora
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Trem Bão - Redefinir senha" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
      </div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <Button
            variant="outline"
            size="lg"
            onClick={handleBackToLogin}
            className="mb-6 text-primary hover:text-primary/80 hover:bg-primary/10 border-primary/20 backdrop-blur-sm bg-white/80 shadow-lg font-medium w-full sm:w-auto min-h-[52px]"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Voltar ao login
          </Button>

          <Card className="backdrop-blur-sm bg-card shadow-card border-0">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-primary mb-2">
                Redefinir Senha
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Digite sua nova senha para concluir a recuperação
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Nova senha *
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua nova senha"
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
                  <PasswordStrengthIndicator password={password} />
                )}

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                    Confirmar nova senha *
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirme sua nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="h-11 bg-background border-input focus:border-primary pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                {password && confirmPassword && password !== confirmPassword && (
                  <Alert variant="destructive">
                    <AlertDescription>As senhas não coincidem</AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base" 
                  disabled={loading || !password || !confirmPassword || password !== confirmPassword || !getPasswordStrength(password)}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Redefinir senha
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;