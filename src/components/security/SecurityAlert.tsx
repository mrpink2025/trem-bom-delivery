import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function SecurityAlert() {
  return (
    <Alert className="mb-6 border-warning bg-warning/5">
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong>Configuração de Segurança Pendente:</strong> Complete a configuração manual no Dashboard do Supabase para ativar 100% da segurança enterprise-grade.
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button asChild size="sm" variant="outline">
            <Link to="/security-implementation">
              Ver Status
            </Link>
          </Button>
          <Button asChild size="sm">
            <a 
              href="https://supabase.com/dashboard/project/ighllleypgbkluhcihvs/auth/providers" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              Configurar
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}