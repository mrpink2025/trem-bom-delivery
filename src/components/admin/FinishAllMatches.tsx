import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const FinishAllMatches = () => {
  const [finishing, setFinishing] = useState(false);

  const handleFinishAllMatches = async () => {
    try {
      setFinishing(true);

      const { data, error } = await supabase.functions.invoke('finish-all-matches');
      
      if (error) throw error;

      toast({
        title: "Partidas Canceladas",
        description: `${data.finished?.total || 0} partidas foram finalizadas com sucesso`,
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao finalizar partidas",
        variant: "destructive"
      });
    } finally {
      setFinishing(false);
    }
  };

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          Cancelar Todas as Partidas
        </CardTitle>
        <CardDescription>
          Finaliza imediatamente todas as partidas de jogos que estão em andamento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Esta ação não pode ser desfeita. Todas as partidas LIVE serão marcadas como FINISHED.
          </div>
          <Button
            variant="destructive"
            onClick={handleFinishAllMatches}
            disabled={finishing}
          >
            {finishing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Finalizando...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Finalizar Todas
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};