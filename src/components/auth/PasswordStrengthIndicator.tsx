import { useMemo } from 'react';
import { Check, X, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: 'Pelo menos 8 caracteres', test: (p) => p.length >= 8 },
  { label: 'Pelo menos uma letra minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Pelo menos uma letra maiúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Pelo menos um número', test: (p) => /\d/.test(p) },
  { label: 'Pelo menos um caractere especial', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export const PasswordStrengthIndicator = ({ password, className }: PasswordStrengthIndicatorProps) => {
  const strength = useMemo(() => {
    if (!password) return { score: 0, level: 'Muito fraca', color: 'destructive' };
    
    const passedTests = requirements.filter(req => req.test(password)).length;
    const score = (passedTests / requirements.length) * 100;
    
    if (score < 40) return { score, level: 'Muito fraca', color: 'destructive' };
    if (score < 60) return { score, level: 'Fraca', color: 'warning' };
    if (score < 80) return { score, level: 'Média', color: 'warning' };
    if (score < 100) return { score, level: 'Forte', color: 'success' };
    return { score, level: 'Muito forte', color: 'success' };
  }, [password]);

  if (!password) return null;

  return (
    <div className={className}>
      <div className="space-y-3">
        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">
              Força da senha:
            </span>
            <span className={`text-sm font-medium ${
              strength.color === 'success' ? 'text-success' : 
              strength.color === 'warning' ? 'text-warning' : 
              'text-destructive'
            }`}>
              {strength.level}
            </span>
          </div>
          <Progress 
            value={strength.score} 
            className={`h-2 ${
              strength.color === 'success' ? '[&>.bg-primary]:bg-success' : 
              strength.color === 'warning' ? '[&>.bg-primary]:bg-warning' : 
              '[&>.bg-primary]:bg-destructive'
            }`}
          />
        </div>

        {/* Requisitos */}
        <div className="space-y-2">
          {requirements.map((requirement, index) => {
            const isPassed = requirement.test(password);
            return (
              <div key={index} className="flex items-center space-x-2 text-sm">
                {isPassed ? (
                  <Check className="h-3 w-3 text-success flex-shrink-0" />
                ) : (
                  <X className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}
                <span className={isPassed ? 'text-success' : 'text-muted-foreground'}>
                  {requirement.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Instruções */}
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Dicas para uma senha forte:</strong>
            <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
              <li>Use uma combinação de letras, números e símbolos</li>
              <li>Evite informações pessoais (nome, data de nascimento)</li>
              <li>Não use senhas óbvias como "123456" ou "password"</li>
              <li>Considere usar uma frase longa e fácil de lembrar</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export const getPasswordStrength = (password: string) => {
  const passedTests = requirements.filter(req => req.test(password)).length;
  return passedTests >= 4; // Considera forte se passar em pelo menos 4 dos 5 testes
};