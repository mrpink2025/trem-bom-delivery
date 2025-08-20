import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({
  title,
  value,
  prefix,
  suffix,
  icon: Icon,
  description,
  trend,
  className
}: StatsCardProps) {
  return (
    <Card className={cn("hover:shadow-card transition-shadow duration-300", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <AnimatedCounter 
            value={value} 
            prefix={prefix} 
            suffix={suffix}
            className="text-foreground"
          />
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            <span className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">
              vs mês anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}