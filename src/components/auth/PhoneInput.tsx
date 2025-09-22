import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PhoneInputProps extends Omit<React.ComponentProps<"input">, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
}

export const formatPhoneNumber = (value: string): string => {
  // Remove tudo que não é número
  const cleaned = value.replace(/\D/g, '');
  
  // Limita a 11 dígitos (celular brasileiro)
  const limited = cleaned.slice(0, 11);
  
  // Aplica formatação progressiva
  if (limited.length === 0) {
    return '';
  } else if (limited.length <= 2) {
    return `(${limited}`;
  } else if (limited.length <= 6) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  } else if (limited.length <= 10) {
    // Para números fixos (8 dígitos): (XX) XXXX-XXXX
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  } else {
    // Para celulares (9 dígitos): (XX) XXXXX-XXXX
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  }
};

export const unformatPhoneNumber = (value: string): string => {
  return value.replace(/\D/g, '');
};

export const validatePhoneNumber = (phone: string): boolean => {
  const unformatted = unformatPhoneNumber(phone);
  
  // Validação brasileira mais flexível:
  // DDD (11-99) + celular (9 dígitos começando com 9) OU fixo (8 dígitos)
  const cellPattern = /^[1-9]{2}9[0-9]{8}$/; // (XX) 9XXXX-XXXX
  const landlinePattern = /^[1-9]{2}[2-5][0-9]{7}$/; // (XX) 3XXX-XXXX ou similar
  
  return cellPattern.test(unformatted) || landlinePattern.test(unformatted);
};

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(({
  value,
  onChange,
  label,
  required,
  className,
  ...props
}, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  const isValid = value ? validatePhoneNumber(value) : null;
  const showValidation = value.length >= 10;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={props.id} className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          ref={ref}
          type="tel"
          value={value}
          onChange={handleChange}
          placeholder="(11) 99999-9999"
          maxLength={15}
          {...props}
          className={cn(
            "h-11 bg-background focus:border-primary pr-10",
            showValidation && isValid === false ? 'border-destructive focus:border-destructive' :
            showValidation && isValid === true ? 'border-success focus:border-success' :
            'border-input'
          )}
        />
        {showValidation && isValid !== null && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isValid ? (
              <div className="w-2 h-2 bg-success rounded-full"></div>
            ) : (
              <div className="w-2 h-2 bg-destructive rounded-full"></div>
            )}
          </div>
        )}
      </div>
      {showValidation && !isValid && (
        <p className="text-xs text-destructive">
          Digite um número válido com DDD (celular ou fixo)
        </p>
      )}
      {showValidation && isValid && (
        <p className="text-xs text-success">
          Número válido ✓
        </p>
      )}
    </div>
  );
});