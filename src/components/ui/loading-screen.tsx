import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = ({ message = "Carregando..." }: LoadingScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-primary/30 rounded-full animate-ping" />
        </div>
        <p className="text-primary font-medium text-lg">{message}</p>
        <div className="flex space-x-1 justify-center">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
};