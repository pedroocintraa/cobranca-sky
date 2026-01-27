import { useState } from 'react';
import { Send, RefreshCw, Loader2, AlertTriangle, Clock, CheckCircle2, XCircle, Users, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFilasCobrancaAgregadas, useDispararFilaCobranca, usePopularFilasCobranca } from '@/hooks/useFilasCobranca';
import { formatarRegraCobranca } from '@/hooks/useRegrasCobranca';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FilaCobranca } from '@/types/database';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function FilasCobranca() {
  const { data: filasAgregadas, isLoading } = useFilasCobrancaAgregadas();
  const dispararFila = useDispararFilaCobranca();
  const popularFilas = usePopularFilasCobranca();
  const [detalhesFila, setDetalhesFila] = useState<{ regraId: string | null; itens: FilaCobranca[] } | null>(null);

  const handleDisparar = async (regraId: string | null) => {
    await dispararFila.mutateAsync(regraId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enviado':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Enviado
          </Badge>
        );
      case 'falha':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Falha
          </Badge>
        );
      case 'processando':
        return (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processando
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        );
    }
  };

  const getNomeFila = (regraId: string | null) => {
    if (regraId === null) {
      return 'Fila Crítica (>15 dias)';
    }
    const fila = filasAgregadas?.find(f => f.regra?.id === regraId);
    if (fila?.regra) {
      return formatarRegraCobranca(fila.regra);
    }
    return 'Fila';
  };

  return (
    <div className="space-y-6">
      {/* Header com botão de atualizar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Filas de Cobrança</h2>
          <p className="text-sm text-muted-foreground">
            Visualize e dispare cobranças organizadas por regra
          </p>
        </div>
        <Button 
          onClick={() => {
            console.log('Atualizando filas...');
            popularFilas.mutate();
          }}
          disabled={popularFilas.isPending}
          variant="outline"
          className="gap-2"
        >
          {popularFilas.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Atualizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Atualizar Filas
            </>
          )}
        </Button>
      </div>

      {/* Cards de Filas Agregadas */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : !filasAgregadas || filasAgregadas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhuma fila encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Clique em "Atualizar Filas" para popular as filas baseadas nas regras configuradas.
            </p>
            <Button onClick={() => popularFilas.mutate()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar Filas
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filasAgregadas.map((fila) => {
            const regraId = fila.regra?.id || null;
            const isCritica = regraId === null;

            return (
              <Card key={regraId || 'critica'} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {isCritica ? (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-primary" />
                        )}
                        {getNomeFila(regraId)}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{fila.total}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pendentes</p>
                      <p className="text-lg font-bold text-amber-600">{fila.pendentes}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Enviados</p>
                      <p className="text-lg font-bold text-green-600">{fila.enviados}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Falhas</p>
                      <p className="text-lg font-bold text-red-600">{fila.falhas}</p>
                    </div>
                  </div>

                  {/* Valor Total */}
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Valor Total
                    </p>
                    <p className="text-lg font-semibold">{formatCurrency(fila.valorTotal)}</p>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => setDetalhesFila({ regraId, itens: fila.itens })}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Ver Detalhes
                    </Button>
                    <Button
                      onClick={() => handleDisparar(regraId)}
                      disabled={fila.pendentes === 0 || dispararFila.isPending}
                      size="sm"
                      className="flex-1 gap-1"
                    >
                      {dispararFila.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Disparar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes */}
      <Dialog open={!!detalhesFila} onOpenChange={(open) => !open && setDetalhesFila(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Detalhes da Fila: {detalhesFila && getNomeFila(detalhesFila.regraId)}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            {detalhesFila && detalhesFila.itens.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fatura</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Telefone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detalhesFila.itens.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.cliente?.nome || '-'}
                      </TableCell>
                      <TableCell>
                        {item.fatura?.mes_referencia || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.fatura ? formatCurrency(item.fatura.valor) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.fatura?.data_vencimento 
                          ? format(new Date(item.fatura.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(item.status)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.cliente?.telefone || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum item nesta fila</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
