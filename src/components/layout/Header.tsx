import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { Menu, MapPin, ShoppingCart, User, Store, Settings, LogOut, Bell } from "lucide-react";
import { ScooterIcon } from "@/components/ui/scooter-icon";
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  userType: 'client' | 'restaurant' | 'courier' | 'admin';
  onUserTypeChange: (type: 'client' | 'restaurant' | 'courier' | 'admin') => void;
}

export default function Header({ userType, onUserTypeChange }: HeaderProps) {
  const [cartItems] = useState(3); // Mock cart items
  const { signOut, profile } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso"
      });
    }
  };

  const getUserTypeLabel = (type: string) => {
    switch (type) {
      case 'client': return 'Cliente';
      case 'restaurant': return 'Restaurante';
      case 'courier': return 'Entregador';
      case 'admin': return 'Admin';
      default: return 'Cliente';
    }
  };

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'client': return <User className="w-4 h-4" />;
      case 'restaurant': return <Store className="w-4 h-4" />;
      case 'courier': return <ScooterIcon className="w-4 h-4" />;
      case 'admin': return <Settings className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-gradient-warm shadow-warm border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-glow">
              <ScooterIcon className="w-6 h-6 text-primary-foreground" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">Trem Bão</h1>
              <p className="text-xs text-primary-foreground/80">Delivery</p>
            </div>
          </div>

          {/* User Type Selector - Desktop */}
          <div className="hidden md:flex items-center space-x-2">
            {(['client', 'restaurant', 'courier', 'admin'] as const).map((type) => (
              <Button
                key={type}
                variant={userType === type ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onUserTypeChange(type)}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                {getUserTypeIcon(type)}
                <span className="ml-2">{getUserTypeLabel(type)}</span>
              </Button>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <NotificationCenter>
              <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:bg-primary-foreground/20">
                <Bell className="w-5 h-5" />
              </Button>
            </NotificationCenter>

            {userType === 'client' && (
              <>
                <div className="hidden sm:flex items-center space-x-1 text-primary-foreground/90">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">Goiânia, GO</span>
                </div>
                <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:bg-primary-foreground/20">
                  <ShoppingCart className="w-5 h-5" />
                  {cartItems > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-secondary text-secondary-foreground text-xs">
                      {cartItems}
                    </Badge>
                  )}
                </Button>
              </>
            )}

            {/* Theme Toggle */}
            <div className="hidden md:block">
              <ThemeToggle />
            </div>

            {/* Profile & Logout */}
            <div className="hidden md:flex items-center space-x-2">
              <span className="text-sm text-primary-foreground/90">
                {profile?.full_name || 'Usuário'}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSignOut}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-primary-foreground hover:bg-primary-foreground/20">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="py-6">
                  <div className="mb-6 pb-4 border-b">
                    <p className="text-sm text-muted-foreground">Logado como:</p>
                    <p className="font-medium">{profile?.full_name || 'Usuário'}</p>
                    <p className="text-sm text-muted-foreground capitalize">{getUserTypeLabel(profile?.role || 'client')}</p>
                  </div>
                  
                  <h2 className="text-lg font-semibold mb-4">Alternar perfil</h2>
                  <div className="space-y-2 mb-6">
                    {(['client', 'restaurant', 'courier', 'admin'] as const).map((type) => (
                      <Button
                        key={type}
                        variant={userType === type ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => onUserTypeChange(type)}
                        disabled={profile?.role !== 'admin' && type !== profile?.role}
                        title={profile?.role !== 'admin' && type !== profile?.role ? 'Apenas administradores podem alternar entre perfis' : ''}
                      >
                        {getUserTypeIcon(type)}
                        <span className="ml-2">{getUserTypeLabel(type)}</span>
                      </Button>
                    ))}
                  </div>

                  {/* Mobile Theme Toggle */}
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">Tema</p>
                    <ThemeToggle />
                  </div>
                  
                  <Button 
                    onClick={handleSignOut}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}