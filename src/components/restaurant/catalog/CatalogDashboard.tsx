import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Categorias</span>
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Produtos</span>
              </TabsTrigger>
              <TabsTrigger value="modifiers" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Modificadores</span>
              </TabsTrigger>
              <TabsTrigger value="combos" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Combos</span>
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Estoque</span>
              </TabsTrigger>
              <TabsTrigger value="delivery" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Entrega</span>
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Preços</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="categories" className="space-y-6">
                <CategoriesManager />
              </TabsContent>

              <TabsContent value="products" className="space-y-6">
                <ProductsManager />
              </TabsContent>

              <TabsContent value="modifiers" className="space-y-6">
                <ModifiersManager />
              </TabsContent>

              <TabsContent value="combos" className="space-y-6">
                <CombosManager />
              </TabsContent>

              <TabsContent value="stock" className="space-y-6">
                <StockManager />
              </TabsContent>

              <TabsContent value="delivery" className="space-y-6">
                <DeliveryZonesManager />
              </TabsContent>

              <TabsContent value="pricing" className="space-y-6">
                <PricingManager />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}