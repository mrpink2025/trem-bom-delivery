import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 h-auto">
              <TabsTrigger value="categories" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] px-2 sm:px-4">
                <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Cat</span>
                <span className="hidden sm:inline">egorias</span>
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] px-2 sm:px-4">
                <Package className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Prod</span>
                <span className="hidden sm:inline">utos</span>
              </TabsTrigger>
              <TabsTrigger value="modifiers" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] px-2 sm:px-4">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Mod</span>
                <span className="hidden sm:inline">ificadores</span>
              </TabsTrigger>
              <TabsTrigger value="combos" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] px-2 sm:px-4">
                <Layers className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Comb</span>
                <span className="hidden sm:inline">os</span>
              </TabsTrigger>
              <TabsTrigger value="stock" className="hidden sm:flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] px-2 sm:px-4">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Estoque</span>
              </TabsTrigger>
              <TabsTrigger value="delivery" className="hidden sm:flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] px-2 sm:px-4">
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Entrega</span>
              </TabsTrigger>
              <TabsTrigger value="pricing" className="hidden sm:flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-h-[44px] px-2 sm:px-4">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Preços</span>
              </TabsTrigger>
            </TabsList>

            {/* Mobile dropdown for hidden tabs */}
            <div className="sm:hidden mt-3">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-full h-12">
                  <SelectValue placeholder="Mais opções..." />
                </SelectTrigger>
                <SelectContent>
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
            </div>

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