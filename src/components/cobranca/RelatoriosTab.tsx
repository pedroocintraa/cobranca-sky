import { Send, CheckCircle2, XCircle, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  useMetricasEnvio, 
  useEvolucaoMensal, 
  useTopInadimplentes,
  useHistoricoMensagens,
} from '@/hooks/useRelatoriosCobranca';
import { EnviosChart } from './EnviosChart';
import { TopInadimplentes } from './TopInadimplentes';
import { HistoricoMensagens } from './HistoricoMensagens';

export function RelatoriosTab() {
  const { data: metricas, isLoading: loadingMetricas } = useMetricasEnvio();
  const { data: evolucao, isLoading: loadingEvolucao } = useEvolucaoMensal();
  const { data: inadimplentes, isLoading: loadingInadimplentes } = useTopInadimplentes(10);
  const { data: historico, isLoading: loadingHistorico } = useHistoricoMensagens(20);

  return (
    <div className="space-y-6">
      {/* Métricas de Envio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Send className="h-4 w-4" />
              Total de Envios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loadingMetricas ? '...' : metricas?.totalEnviados || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Taxa de Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {loadingMetricas ? '...' : `${metricas?.taxaSucesso.toFixed(1) || 0}%`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Taxa de Falha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {loadingMetricas ? '...' : `${metricas?.taxaFalha.toFixed(1) || 0}%`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Média/Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loadingMetricas ? '...' : metricas?.mediaPorMes || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico e Top Inadimplentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EnviosChart data={evolucao || []} isLoading={loadingEvolucao} />
        </div>
        <div>
          <TopInadimplentes data={inadimplentes || []} isLoading={loadingInadimplentes} />
        </div>
      </div>

      {/* Histórico de Mensagens */}
      <HistoricoMensagens data={historico || []} isLoading={loadingHistorico} />
    </div>
  );
}
