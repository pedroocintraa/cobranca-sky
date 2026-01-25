import { useDashboardMetrics } from '@/hooks/useCobrancas';
import { useCobrancas } from '@/hooks/useCobrancas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Receipt,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
} from 'lucide-react';
import { format, isToday, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function MetricCard({
  title,
  value,
  subValue,
  icon: Icon,
  variant = 'default',
  isLoading,
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  isLoading?: boolean;
}) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`rounded-md p-2 ${variantStyles[variant]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            {subValue && (
              <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: cobrancas, isLoading: cobrancasLoading } = useCobrancas();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in7Days = addDays(today, 7);

  // Filter upcoming and overdue
  const upcoming = cobrancas
    ?.filter((c) => {
      const vencimento = new Date(c.data_vencimento);
      const statusNome = c.status?.nome?.toLowerCase();
      return (
        vencimento >= today &&
        vencimento <= in7Days &&
        statusNome !== 'pago' &&
        statusNome !== 'cancelado'
      );
    })
    .slice(0, 5);

  const getStatusColor = (status?: { nome: string; cor: string } | null, dataVencimento?: string) => {
    if (status) return status.cor;
    if (dataVencimento) {
      const vencimento = new Date(dataVencimento);
      if (isBefore(vencimento, today)) return '#ef4444';
      if (isToday(vencimento)) return '#f59e0b';
    }
    return '#6b7280';
  };

  const getUrgencyBadge = (dataVencimento: string, statusNome?: string) => {
    const vencimento = new Date(dataVencimento);
    
    if (statusNome?.toLowerCase() === 'pago') {
      return <Badge className="bg-success text-success-foreground">Pago</Badge>;
    }
    if (statusNome?.toLowerCase() === 'cancelado') {
      return <Badge variant="secondary">Cancelado</Badge>;
    }
    if (isBefore(vencimento, today)) {
      return <Badge variant="destructive">Atrasado</Badge>;
    }
    if (isToday(vencimento)) {
      return <Badge className="bg-warning text-warning-foreground">Vence Hoje</Badge>;
    }
    return <Badge variant="outline">Em dia</Badge>;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral das cobranças</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Cobranças"
          value={metrics?.totalCobrancas ?? 0}
          subValue={formatCurrency(metrics?.valorTotal ?? 0)}
          icon={Receipt}
          isLoading={metricsLoading}
        />
        <MetricCard
          title="Pagos"
          value={metrics?.totalPagos ?? 0}
          subValue={formatCurrency(metrics?.valorPagos ?? 0)}
          icon={CheckCircle}
          variant="success"
          isLoading={metricsLoading}
        />
        <MetricCard
          title="Pendentes"
          value={metrics?.totalPendentes ?? 0}
          subValue={formatCurrency(metrics?.valorPendentes ?? 0)}
          icon={Clock}
          variant="warning"
          isLoading={metricsLoading}
        />
        <MetricCard
          title="Atrasados"
          value={metrics?.totalAtrasados ?? 0}
          subValue={formatCurrency(metrics?.valorAtrasados ?? 0)}
          icon={AlertTriangle}
          variant="destructive"
          isLoading={metricsLoading}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 border-b-0">
            <Calendar className="h-5 w-5 text-warning" />
            <CardTitle className="text-base font-medium">Vencendo Hoje</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-warning">
              {metrics?.vencendoHoje ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 border-b-0">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-medium">Próximos 7 dias</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-primary">
              {metrics?.vencendo7Dias ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-base font-medium">
            <span>Próximos Vencimentos</span>
            <Link
              to="/cobrancas"
              className="text-sm font-normal text-primary hover:underline"
            >
              Ver todas
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cobrancasLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : upcoming && upcoming.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Proposta</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map((cobranca) => (
                  <TableRow key={cobranca.id}>
                    <TableCell className="font-medium">
                      {cobranca.cliente?.nome || 'N/A'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {cobranca.numero_proposta || '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(cobranca.data_vencimento), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(cobranca.valor))}
                    </TableCell>
                    <TableCell>
                      {getUrgencyBadge(cobranca.data_vencimento, cobranca.status?.nome)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              Nenhuma cobrança nos próximos 7 dias.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
