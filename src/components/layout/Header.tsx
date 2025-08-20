import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, MapPin, ShoppingCart, User, Truck, Store, Settings } from "lucide-react";

interface HeaderProps {
  userType: 'client' | 'restaurant' | 'courier' | 'admin';
  onUserTypeChange: (type: 'client' | 'restaurant' | 'courier' | 'admin') => void;
}

export default function Header({ userType, onUserTypeChange }: HeaderProps) {
  const [cartItems] = useState(3); // Mock cart items

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
      case 'courier': return <Truck className="w-4 h-4" />;
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
              <Truck className="w-6 h-6 text-primary-foreground" />
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

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-primary-foreground hover:bg-primary-foreground/20">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="py-6">
                  <h2 className="text-lg font-semibold mb-4">Escolha seu perfil</h2>
                  <div className="space-y-2">
                    {(['client', 'restaurant', 'courier', 'admin'] as const).map((type) => (
                      <Button
                        key={type}
                        variant={userType === type ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => onUserTypeChange(type)}
                      >
                        {getUserTypeIcon(type)}
                        <span className="ml-2">{getUserTypeLabel(type)}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}