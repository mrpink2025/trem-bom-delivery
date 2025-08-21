import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Shield, Key, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface CourierForm {
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
}

export function SecureCourierCreation() {
  const [form, setForm] = useState<CourierForm>({
    fullName: '',
    email: '',
    phone: '',
    cpf: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  // Generate a secure random password
  const generateSecurePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;

    // Basic validation
    if (!form.fullName || !form.email || !form.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsCreating(true);
    const securePassword = generateSecurePassword();

    try {
      // Create user account with secure password
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: securePassword,
        options: {
          data: {
            full_name: form.fullName,
            role: 'courier',
            phone: form.phone,
            cpf: form.cpf || null
          }
        }
      });

      if (authError) throw authError;

      // Store the generated password to show to admin
      setGeneratedPassword(securePassword);
      
      // Log the courier creation for audit
      await supabase.from('audit_logs').insert({
        table_name: 'profiles',
        operation: 'COURIER_CREATED',
        record_id: authData.user?.id,
        new_values: {
          full_name: form.fullName,
          email: form.email,
          role: 'courier'
        }
      });

      toast.success('Courier account created successfully');
      
      // Reset form
      setForm({
        fullName: '',
        email: '',
        phone: '',
        cpf: ''
      });

    } catch (error: any) {
      console.error('Error creating courier:', error);
      toast.error(error.message || 'Failed to create courier account');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleInputChange = (field: keyof CourierForm, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Secure Courier Creation</h2>
          <p className="text-muted-foreground">Create new courier accounts with secure credentials</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            New Courier Account
          </CardTitle>
          <CardDescription>
            All courier accounts are created with secure, randomly generated passwords
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={form.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="courier@example.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  type="text"
                  value={form.cpf}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
              <Key className="h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">
                A secure password will be automatically generated for this account
              </p>
            </div>

            <Button type="submit" disabled={isCreating} className="w-full">
              {isCreating ? 'Creating Account...' : 'Create Courier Account'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Generated Credentials Display */}
      {generatedPassword && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Mail className="h-5 w-5" />
              Account Created Successfully
            </CardTitle>
            <CardDescription>
              Please securely share these credentials with the courier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2">
                  <Input value={form.email} readOnly />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(form.email)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <div className="flex items-center gap-2">
                  <Input value={generatedPassword} readOnly type="text" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedPassword)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-warning/10 rounded-lg">
              <p className="text-sm font-medium text-warning">Security Notice:</p>
              <p className="text-sm text-muted-foreground mt-1">
                This password will only be shown once. The courier should change it after first login.
                Store these credentials securely and share them through a secure channel only.
              </p>
            </div>
            
            <Button
              onClick={() => setGeneratedPassword(null)}
              variant="outline"
              className="w-full"
            >
              Clear Credentials
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}