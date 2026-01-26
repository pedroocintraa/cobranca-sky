import { useState, useEffect } from 'react';
import { Calendar, Clock, Loader2, Save, Power, PowerOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FiltroNumeroFatura } from './FiltroNumeroFatura';
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
  const [diasAtrasoMinimo, setDiasAtrasoMinimo] = useState(1);
  const [incluirAtrasados, setIncluirAtrasados] = useState(true);
  const [incluirPendentes, setIncluirPendentes] = useState(false);
  const [filtroNumeroFatura, setFiltroNumeroFatura] = useState<number[]>([]);

  // Carregar configuração existente
  useEffect(() => {
    if (config) {
      setAtivo(config.ativo);
      setHora(config.hora);
      setDiasSemana(config.dias_semana);
      setDiasAtrasoMinimo(config.dias_atraso_minimo);
      setIncluirAtrasados(config.incluir_atrasados);
      setIncluirPendentes(config.incluir_pendentes);
      setFiltroNumeroFatura(config.filtro_numero_fatura || []);
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
      dias_atraso_minimo: diasAtrasoMinimo,
      incluir_atrasados: incluirAtrasados,
      incluir_pendentes: incluirPendentes,
      filtro_numero_fatura: filtroNumeroFatura,
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
              Configure a geração automática de lotes de cobrança
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

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Dias de Atraso Mínimo</Label>
            <Select 
              value={diasAtrasoMinimo.toString()} 
              onValueChange={(v) => setDiasAtrasoMinimo(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todos (incluindo hoje)</SelectItem>
                <SelectItem value="1">A partir de 1 dia</SelectItem>
                <SelectItem value="7">A partir de 7 dias</SelectItem>
                <SelectItem value="15">A partir de 15 dias</SelectItem>
                <SelectItem value="30">A partir de 30 dias</SelectItem>
                <SelectItem value="60">A partir de 60 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label>Status das Faturas</Label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="agend-atrasados"
                  checked={incluirAtrasados}
                  onCheckedChange={(checked) => setIncluirAtrasados(!!checked)}
                />
                <Label htmlFor="agend-atrasados" className="cursor-pointer">
                  Atrasados
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="agend-pendentes"
                  checked={incluirPendentes}
                  onCheckedChange={(checked) => setIncluirPendentes(!!checked)}
                />
                <Label htmlFor="agend-pendentes" className="cursor-pointer">
                  Pendentes
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Filtro por número de fatura */}
        <FiltroNumeroFatura 
          value={filtroNumeroFatura}
          onChange={setFiltroNumeroFatura}
        />

        {/* Resumo */}
        {ativo && diasSemana.length > 0 && (
          <div className="p-3 bg-muted rounded-lg text-sm">
            <span className="font-medium">Resumo:</span> Lotes serão gerados às{' '}
            <span className="font-medium">{hora}</span> em{' '}
            <span className="font-medium">{formatarDiasSemana(diasSemana)}</span>
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
