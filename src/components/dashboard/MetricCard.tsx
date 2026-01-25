import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: React.ReactNode;
  variant?: 'violet' | 'coral' | 'pink';
}

export function MetricCard({ title, value, change, icon, variant = 'violet' }: MetricCardProps) {
  const gradients = {
    violet: 'gradient-violet',
    coral: 'gradient-coral',
    pink: 'gradient-pink',
  };

  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm border border-border/50 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold text-foreground tracking-tight">{value}</p>
          {change && (
            <div className="flex items-center gap-1.5">
              {change.type === 'increase' ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  change.type === 'increase' ? 'text-success' : 'text-destructive'
                )}
              >
                {change.value}%
              </span>
              <span className="text-sm text-muted-foreground">vs mês anterior</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl text-white',
            gradients[variant]
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
