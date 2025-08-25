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
  
  // Aplica formatação (XX) XXXXX-XXXX
  if (limited.length >= 11) {
    return limited.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (limited.length >= 7) {
    return limited.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  } else if (limited.length >= 3) {
    return limited.replace(/(\d{2})(\d{0,5})/, '($1) $2');
  } else if (limited.length >= 1) {
    return limited.replace(/(\d{0,2})/, '($1');
  }
  
  return limited;
};

export const unformatPhoneNumber = (value: string): string => {
  return value.replace(/\D/g, '');
};

export const validatePhoneNumber = (phone: string): boolean => {
  const unformatted = unformatPhoneNumber(phone);
  // Validação brasileira: DDD (11-99) + 9 dígitos (celular)
  return /^[1-9]{2}9[0-9]{8}$/.test(unformatted);
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

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={props.id} className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <Input
        ref={ref}
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder="(11) 99999-9999"
        maxLength={15}
        {...props}
        className={cn("h-11 bg-background border-input focus:border-primary")}
      />
      {value && !validatePhoneNumber(value) && (
        <p className="text-xs text-muted-foreground">
          Digite um número de celular válido com DDD
        </p>
      )}
    </div>
  );
});