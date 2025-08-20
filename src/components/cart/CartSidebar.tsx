import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import ImageWithFallback from '@/components/ui/image-with-fallback';

interface CartSidebarProps {
  children: React.ReactNode;
}

export function CartSidebar({ children }: CartSidebarProps) {
  const { 
    items, 
    loading, 
    updateCartItem, 
    removeFromCart, 
    clearCart, 
    getCartTotal, 
    getDeliveryFee, 
    getItemCount 
  } = useCart();

  const subtotal = getCartTotal();
  const deliveryFee = getDeliveryFee();
  const total = subtotal + deliveryFee;
  const itemCount = getItemCount();

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      const item = items.find(item => item.id === itemId);
      updateCartItem(itemId, newQuantity, item?.special_instructions);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <div className="relative">
          {children}
          {itemCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {itemCount}
            </Badge>
          )}
        </div>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Seu Carrinho ({itemCount})
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Carrinho vazio</h3>
            <p className="text-muted-foreground mb-4">
              Adicione itens de um restaurante para começar seu pedido
            </p>
            <Link to="/">
              <Button>Explorar Restaurantes</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Restaurant Info */}
            {items.length > 0 && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <h4 className="font-semibold">{items[0].menu_item.restaurant.name}</h4>
                <p className="text-sm text-muted-foreground">
                  Taxa de entrega: R$ {deliveryFee.toFixed(2)}
                </p>
              </div>
            )}

            {/* Cart Items */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 p-3 border rounded-lg">
                    {item.menu_item.image_url && (
                      <ImageWithFallback
                        src={item.menu_item.image_url}
                        alt={item.menu_item.name}
                        className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">
                        {item.menu_item.name}
                      </h4>
                      <p className="text-primary font-semibold text-sm">
                        R$ {item.menu_item.price.toFixed(2)}
                      </p>
                      {item.special_instructions && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.special_instructions}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={loading}
                            className="h-7 w-7 p-0"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm font-medium w-6 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={loading}
                            className="h-7 w-7 p-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          disabled={loading}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Cart Summary and Actions */}
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Taxa de entrega</span>
                  <span>R$ {deliveryFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>R$ {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Link to="/checkout" className="block">
                  <Button className="w-full" size="lg">
                    Finalizar Pedido
                  </Button>
                </Link>
                
                <Button
                  variant="outline"
                  onClick={clearCart}
                  disabled={loading}
                  className="w-full"
                >
                  Limpar Carrinho
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}