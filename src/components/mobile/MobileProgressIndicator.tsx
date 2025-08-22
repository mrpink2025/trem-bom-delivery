import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle } from 'lucide-react';

interface MobileProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{ id: string; title: string; description: string }>;
  status?: string;
  statusInfo?: {
    icon: React.ReactNode;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    label: string;
  };
}

export const MobileProgressIndicator: React.FC<MobileProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  steps,
  status,
  statusInfo
}) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border p-4 mb-4">
      {/* Status Badge */}
      {statusInfo && (
        <div className="flex justify-center mb-4">
          <Badge variant={statusInfo.variant} className="gap-2">
            {statusInfo.icon}
            {statusInfo.label}
          </Badge>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">{steps[currentStep]?.title}</h2>
          <span className="text-sm text-muted-foreground font-medium">
            {currentStep + 1}/{totalSteps}
          </span>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <p className="text-sm text-muted-foreground">
          {steps[currentStep]?.description}
        </p>
      </div>

      {/* Mini Steps Indicator */}
      <div className="flex justify-center gap-2 mt-4">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentStep
                ? 'bg-primary'
                : index < currentStep
                ? 'bg-green-500'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>
    </div>
  );
};