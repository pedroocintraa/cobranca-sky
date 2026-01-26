import { useState } from 'react';
import { Zap, Loader2, Settings, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FiltroNumeroFatura } from './FiltroNumeroFatura';
import { useGerarLoteAutomatico } from '@/hooks/useAgendamentoCobranca';

export function GeracaoAutomaticaCard() {
  const [diasAtrasoMinimo, setDiasAtrasoMinimo] = useState<number>(1);
  const [incluirAtrasados, setIncluirAtrasados] = useState(true);
  const [incluirPendentes, setIncluirPendentes] = useState(false);
  const [filtroNumeroFatura, setFiltroNumeroFatura] = useState<number[]>([]);

  const gerarLote = useGerarLoteAutomatico();

  const handleGerarAgora = () => {
    gerarLote.mutate({
      diasAtrasoMinimo,
      incluirPendentes,
      incluirAtrasados,
      filtroNumeroFatura,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Geração Automática de Lotes
        </CardTitle>
        <CardDescription>
          Configure os filtros e gere um lote com todas as faturas em aberto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
                  id="incluir-atrasados"
                  checked={incluirAtrasados}
                  onCheckedChange={(checked) => setIncluirAtrasados(!!checked)}
                />
                <Label htmlFor="incluir-atrasados" className="cursor-pointer">
                  Atrasados
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="incluir-pendentes"
                  checked={incluirPendentes}
                  onCheckedChange={(checked) => setIncluirPendentes(!!checked)}
                />
                <Label htmlFor="incluir-pendentes" className="cursor-pointer">
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

        {/* Botão de Gerar */}
        <div className="flex justify-end">
          <Button 
            onClick={handleGerarAgora}
            disabled={gerarLote.isPending || (!incluirAtrasados && !incluirPendentes)}
            className="gap-2"
          >
            {gerarLote.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Gerar Lote Agora
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
