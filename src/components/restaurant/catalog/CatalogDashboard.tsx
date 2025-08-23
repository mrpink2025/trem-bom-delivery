import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoriesManager } from './CategoriesManager';
import { ProductsManager } from './ProductsManager';
import { ModifiersManager } from './ModifiersManager';
import { CombosManager } from './CombosManager';
import { StockManager } from './StockManager';
import { DeliveryZonesManager } from './DeliveryZonesManager';
import { PricingManager } from './PricingManager';
import { 
  FolderOpen, 
  Package, 
  Settings, 
  Layers, 
  BarChart3, 
  MapPin, 
  DollarSign 
} from 'lucide-react';

export function CatalogDashboard() {
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gerenciamento de Catálogo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder="Selecione uma opção..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="categories" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Categorias
                </SelectItem>
                <SelectItem value="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produtos
                </SelectItem>
                <SelectItem value="modifiers" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Modificadores
                </SelectItem>
                <SelectItem value="combos" className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Combos
                </SelectItem>
                <SelectItem value="stock" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Estoque
                </SelectItem>
                <SelectItem value="delivery" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Entrega
                </SelectItem>
                <SelectItem value="pricing" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Preços
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="mt-6 space-y-6">
              {activeTab === 'categories' && <CategoriesManager />}
              {activeTab === 'products' && <ProductsManager />}
              {activeTab === 'modifiers' && <ModifiersManager />}
              {activeTab === 'combos' && <CombosManager />}
              {activeTab === 'stock' && <StockManager />}
              {activeTab === 'delivery' && <DeliveryZonesManager />}
              {activeTab === 'pricing' && <PricingManager />}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}