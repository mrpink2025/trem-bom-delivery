import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface SecureFormInputProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  className?: string;
  validateEmail?: boolean;
  sanitizeInput?: boolean;
}

export const SecureFormInput: React.FC<SecureFormInputProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  maxLength = 500,
  className,
  validateEmail = false,
  sanitizeInput = true
}) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);

  const validateInput = useCallback(async (inputValue: string) => {
    if (!inputValue.trim()) {
      setIsValid(null);
      setValidationMessage('');
      return;
    }

    setIsValidating(true);

    try {
      // 🔒 Security: Basic email validation
      if (validateEmail || type === 'email') {
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!emailRegex.test(inputValue) || inputValue.length > 254) {
          setIsValid(false);
          setValidationMessage('Formato de email inválido');
          return;
        }
      }

      // Client-side additional validation
      if (type === 'tel') {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(inputValue.replace(/\s/g, ''))) {
          setIsValid(false);
          setValidationMessage('Formato de telefone inválido');
          return;
        }
      }

      // Check for suspicious patterns
      const suspiciousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /<script/i,
        /on\w+\s*=/i,
        /\beval\s*\(/i,
        /document\./i,
        /window\./i
      ];

      const hasSuspiciousContent = suspiciousPatterns.some(pattern => 
        pattern.test(inputValue)
      );

      if (hasSuspiciousContent) {
        setIsValid(false);
        setValidationMessage('Conteúdo não permitido detectado');
        
        // Log security event to audit_logs
        await supabase.from('audit_logs').insert({
          table_name: 'form_inputs',
          operation: 'SUSPICIOUS_INPUT_BLOCKED',
          new_values: { 
            field_id: id,
            field_label: label,
            input_value: inputValue,
            field_type: type
          }
        });
        
        return;
      }

      setIsValid(true);
      setValidationMessage('');

    } catch (error) {
      console.error('❌ Input validation error:', error);
      setIsValid(false);
      setValidationMessage('Erro na validação');
    } finally {
      setIsValidating(false);
    }
  }, [id, label, type, validateEmail]);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    // 🔒 Security: Basic input sanitization
    if (sanitizeInput) {
      // Remove potentially dangerous characters and limit length
      inputValue = inputValue
        .replace(/[<>"\';()&+]/g, '')
        .substring(0, maxLength || 500);
    }

    // Enforce max length
    if (maxLength && inputValue.length > maxLength) {
      inputValue = inputValue.slice(0, maxLength);
    }

    onChange(inputValue);
    
    // Debounced validation
    setTimeout(() => validateInput(inputValue), 300);
  }, [onChange, sanitizeInput, maxLength, validateInput]);

  const getValidationIcon = () => {
    if (isValidating) {
      return <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent" />;
    }
    
    if (isValid === true) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    if (isValid === false) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    
    return <Shield className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        {label}
        {required && <span className="text-red-500">*</span>}
        <Shield className="h-3 w-3 text-primary opacity-60" />
      </Label>
      
      <div className="relative">
        <Input
          id={id}
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          className={cn(
            'pr-10',
            isValid === false && 'border-red-500 focus:border-red-500',
            isValid === true && 'border-green-500 focus:border-green-500',
            className
          )}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {getValidationIcon()}
        </div>
      </div>
      
      {validationMessage && (
        <p className={cn(
          'text-sm',
          isValid === false ? 'text-red-500' : 'text-muted-foreground'
        )}>
          {validationMessage}
        </p>
      )}
      
      {maxLength && (
        <p className="text-xs text-muted-foreground">
          {value.length}/{maxLength} caracteres
        </p>
      )}
    </div>
  );
};