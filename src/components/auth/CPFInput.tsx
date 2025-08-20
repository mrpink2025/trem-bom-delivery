import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CPFInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
}

// Função para formatar CPF
const formatCPF = (value: string) => {
  // Remove todos os caracteres não numéricos
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 11 dígitos
  const limitedNumbers = numbers.slice(0, 11);
  
  // Aplica a máscara XXX.XXX.XXX-XX
  if (limitedNumbers.length <= 3) {
    return limitedNumbers;
  } else if (limitedNumbers.length <= 6) {
    return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3)}`;
  } else if (limitedNumbers.length <= 9) {
    return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6)}`;
  } else {
    return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6, 9)}-${limitedNumbers.slice(9)}`;
  }
};

// Função para remover a formatação
const unformatCPF = (value: string) => {
  return value.replace(/\D/g, '');
};

// Função para validar CPF
const validateCPF = (cpf: string) => {
  const numbers = unformatCPF(cpf);
  
  console.log('Validating CPF:', cpf, 'Numbers:', numbers);
  
  if (numbers.length !== 11) {
    console.log('Invalid length:', numbers.length);
    return false;
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(numbers)) {
    console.log('All digits are the same');
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  let digit1 = remainder < 2 || remainder >= 10 ? 0 : remainder;
  
  console.log('First digit calculation:', { sum, remainder, digit1, actual: parseInt(numbers.charAt(9)) });
  
  if (parseInt(numbers.charAt(9)) !== digit1) {
    console.log('First digit validation failed');
    return false;
  }
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  let digit2 = remainder < 2 || remainder >= 10 ? 0 : remainder;
  
  console.log('Second digit calculation:', { sum, remainder, digit2, actual: parseInt(numbers.charAt(10)) });
  
  const isValid = parseInt(numbers.charAt(10)) === digit2;
  console.log('CPF validation result:', isValid);
  return isValid;
};

export const CPFInput = ({ value, onChange, error, required = false, className }: CPFInputProps) => {
  const [touched, setTouched] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    onChange(unformatCPF(formatted)); // Salva apenas os números
  };
  
  const handleBlur = () => {
    setTouched(true);
  };
  
  const displayValue = formatCPF(value);
  const isValid = !value || validateCPF(value);
  const showError = touched && value && !isValid;
  
  return (
    <div className={className}>
      <Label htmlFor="cpf" className="text-sm font-medium text-foreground">
        CPF {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id="cpf"
        type="text"
        placeholder="000.000.000-00"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        required={required}
        className={`h-11 bg-background border-input focus:border-primary ${
          showError ? 'border-destructive focus:border-destructive' : ''
        }`}
        maxLength={14} // XXX.XXX.XXX-XX
      />
      {showError && (
        <p className="text-sm text-destructive mt-1">
          Por favor, insira um CPF válido
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive mt-1">
          {error}
        </p>
      )}
    </div>
  );
};

export { validateCPF, unformatCPF, formatCPF };