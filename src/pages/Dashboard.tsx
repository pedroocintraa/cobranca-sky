import { useAuth } from '@/hooks/useAuth';
import { useDashboardMetrics, useCobrancas } from '@/hooks/useCobrancas';
import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { OverviewChart } from '@/components/dashboard/OverviewChart';
import { CustomersChart } from '@/components/dashboard/CustomersChart';
import { RecentCharges } from '@/components/dashboard/RecentCharges';
import { Receipt, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { addDays } from 'date-fns';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: cobrancas, isLoading: cobrancasLoading } = useCobrancas();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = addDays(today, 7);

  // Get recent charges (last 5)
  const recentCharges = cobrancas?.slice(0, 5);

  // Calculate percentage for pie chart
  const total = (metrics?.totalPagos ?? 0) + (metrics?.totalPendentes ?? 0) + (metrics?.totalAtrasados ?? 0);
  const pieData = total > 0
    ? [
        { name: 'Pagos', value: Math.round(((metrics?.totalPagos ?? 0) / total) * 100), color: 'hsl(142 71% 45%)' },
        { name: 'Pendentes', value: Math.round(((metrics?.totalPendentes ?? 0) / total) * 100), color: 'hsl(239 84% 67%)' },
        { name: 'Atrasados', value: Math.round(((metrics?.totalAtrasados ?? 0) / total) * 100), color: 'hsl(0 84% 60%)' },
      ]
    : undefined;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <WelcomeHeader userName={profile?.nome} />

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Cobranças"
          value={metricsLoading ? '...' : formatCurrency(metrics?.valorTotal ?? 0)}
          icon={<Receipt className="h-5 w-5" />}
          variant="violet"
          change={{ value: 12, type: 'increase' }}
        />
        <MetricCard
          title="Valor Recebido"
          value={metricsLoading ? '...' : formatCurrency(metrics?.valorPagos ?? 0)}
          icon={<CheckCircle className="h-5 w-5" />}
          variant="coral"
          change={{ value: 8, type: 'increase' }}
        />
        <MetricCard
          title="Valor Pendente"
          value={metricsLoading ? '...' : formatCurrency(metrics?.valorPendentes ?? 0)}
          icon={<Clock className="h-5 w-5" />}
          variant="pink"
          change={{ value: 5, type: 'decrease' }}
        />
        <MetricCard
          title="Valor Atrasado"
          value={metricsLoading ? '...' : formatCurrency(metrics?.valorAtrasados ?? 0)}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant="violet"
          change={{ value: 3, type: 'decrease' }}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <OverviewChart />
        <CustomersChart data={pieData} />
      </div>

      {/* Recent Charges */}
      <RecentCharges charges={recentCharges} isLoading={cobrancasLoading} />
    </div>
  );
}
