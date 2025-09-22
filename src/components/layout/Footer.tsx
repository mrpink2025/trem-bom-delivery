import { Link } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-primary">
              Trem Bão Delivery
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Conectando você aos melhores botecos e restaurantes locais. 
              Delivery rápido, seguro e saboroso!
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Belo Horizonte, MG</span>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Links Legais</h4>
            <nav className="flex flex-col space-y-2">
              <Link 
                to="/terms-of-service" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Termos de Uso
              </Link>
              <Link 
                to="/privacy-policy" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Política de Privacidade
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Contato</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>contato@deliverytrembao.com.br</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>(31) 9 9999-9999</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {currentYear} Trem Bão Delivery. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground">
            LGPD Compliant | Dados protegidos
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;