import { useState, useEffect } from 'react';
import { Calendar, Clock, Loader2, Save, Power } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  useConfiguracaoCobranca, 
  useSaveConfiguracaoCobranca,
  gerarCronExpression,
  formatarDiasSemana,
} from '@/hooks/useAgendamentoCobranca';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DIAS_SEMANA = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

export function AgendamentoCard() {
  const { data: config, isLoading } = useConfiguracaoCobranca();
  const saveConfig = useSaveConfiguracaoCobranca();

  const [ativo, setAtivo] = useState(false);
  const [hora, setHora] = useState('08:00');
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]);
  const [intervaloEnvioSegundos, setIntervaloEnvioSegundos] = useState(1);

  // Carregar configuração existente
  useEffect(() => {
    if (config) {
      setAtivo(config.ativo);
      setHora(config.hora);
      setDiasSemana(config.dias_semana);
      setIntervaloEnvioSegundos(config.intervalo_envio_segundos || 1);
    }
  }, [config]);

  const toggleDia = (dia: number) => {
    if (diasSemana.includes(dia)) {
      setDiasSemana(diasSemana.filter(d => d !== dia));
    } else {
      setDiasSemana([...diasSemana, dia].sort());
    }
  };

  const handleSave = () => {
    saveConfig.mutate({
      ativo,
      hora,
      dias_semana: diasSemana,
      cron_expression: gerarCronExpression(hora, diasSemana),
      intervalo_envio_segundos: intervaloEnvioSegundos,
      // Remover campos antigos - sempre usar regras agora
      dias_atraso_minimo: 0,
      incluir_atrasados: true,
      incluir_pendentes: true,
      filtro_numero_fatura: [],
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Agendamento Automático
            </CardTitle>
            <CardDescription>
              Configure quando o sistema deve gerar lotes automaticamente usando as regras configuradas
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="ativo-switch" className="text-sm">
              {ativo ? 'Ativo' : 'Desativado'}
            </Label>
            <Switch
              id="ativo-switch"
              checked={ativo}
              onCheckedChange={setAtivo}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status */}
        {config?.ultima_execucao && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Última execução: {format(new Date(config.ultima_execucao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        )}

        {/* Horário e Dias */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hora">Horário</Label>
            <Input
              id="hora"
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Dias da Semana</Label>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map((dia) => (
                <Badge
                  key={dia.value}
                  variant={diasSemana.includes(dia.value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleDia(dia.value)}
                >
                  {dia.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Intervalo de envio */}
        <div className="space-y-2">
          <Label htmlFor="intervalo-envio">Intervalo entre mensagens (segundos)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="intervalo-envio"
              type="number"
              min={1}
              max={3600}
              value={intervaloEnvioSegundos}
              onChange={(e) => setIntervaloEnvioSegundos(Math.max(1, Math.min(3600, parseInt(e.target.value) || 1)))}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">segundos</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tempo de espera entre cada mensagem. Ex: 30s = 2 msg/min | 60s = 1 msg/min | 300s = 12 msg/hora
          </p>
        </div>

        {/* Resumo */}
        {ativo && diasSemana.length > 0 && (
          <div className="p-3 bg-muted rounded-lg text-sm">
            <span className="font-medium">Resumo:</span> Lotes serão gerados automaticamente às{' '}
            <span className="font-medium">{hora}</span> em{' '}
            <span className="font-medium">{formatarDiasSemana(diasSemana)}</span>
            {' '}usando as regras configuradas na aba "Regras".
          </div>
        )}

        {/* Botão Salvar */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={saveConfig.isPending}
            className="gap-2"
          >
            {saveConfig.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Configuração
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
