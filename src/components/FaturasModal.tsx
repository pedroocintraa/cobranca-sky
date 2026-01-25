import { useState } from 'react';
import { useFaturasByCobranca, useMarcarFaturaPaga } from '@/hooks/useFaturas';
import { useStatusPagamento } from '@/hooks/useStatusPagamento';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Check, FileText } from 'lucide-react';
import type { Cobranca, Fatura } from '@/types/database';

interface FaturasModalProps {
  cobranca: Cobranca | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatMesReferencia(mes: string) {
  const [year, month] = mes.split('-');
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${monthNames[parseInt(month, 10) - 1]}/${year}`;
}

export function FaturasModal({ cobranca, open, onOpenChange }: FaturasModalProps) {
  const { data: faturas, isLoading } = useFaturasByCobranca(cobranca?.id ?? null);
  const { data: statusList } = useStatusPagamento();
  const marcarPaga = useMarcarFaturaPaga();
  const [pagandoFatura, setPagandoFatura] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const statusPago = statusList?.find((s) => s.nome.toLowerCase() === 'pago');

  const handleMarcarPaga = async (fatura: Fatura, dataPagamento: Date) => {
    if (!statusPago) return;
    
    await marcarPaga.mutateAsync({
      id: fatura.id,
      data_pagamento: format(dataPagamento, 'yyyy-MM-dd'),
      status_id: statusPago.id,
    });
    setPagandoFatura(null);
  };

  const getStatusBadge = (fatura: Fatura) => {
    const statusNome = fatura.status?.nome?.toLowerCase();
    const vencimento = new Date(fatura.data_vencimento);

    if (statusNome === 'pago') {
      return (
        <Badge style={{ backgroundColor: fatura.status?.cor }} className="text-white">
          Pago
        </Badge>
      );
    }
    if (statusNome === 'cancelado') {
      return <Badge variant="secondary">Cancelado</Badge>;
    }
    if (isBefore(vencimento, today)) {
      return <Badge variant="destructive">Atrasado</Badge>;
    }
    if (isToday(vencimento)) {
      return <Badge className="bg-warning text-warning-foreground">Vence Hoje</Badge>;
    }
    if (fatura.status) {
      return (
        <Badge style={{ backgroundColor: fatura.status.cor }} className="text-white">
          {fatura.status.nome}
        </Badge>
      );
    }
    return <Badge variant="outline">Pendente</Badge>;
  };

  // Calcular totais
  const totalGeral = faturas?.reduce((acc, f) => acc + Number(f.valor), 0) || 0;
  const totalPago = faturas?.filter((f) => f.status?.nome?.toLowerCase() === 'pago')
    .reduce((acc, f) => acc + Number(f.valor), 0) || 0;
  const totalEmAberto = totalGeral - totalPago;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Faturas
          </DialogTitle>
          {cobranca && (
            <p className="text-sm text-muted-foreground">
              {cobranca.cliente?.nome} • Proposta: {cobranca.numero_proposta || '-'}
            </p>
          )}
        </DialogHeader>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4 py-4 border-b">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{formatCurrency(totalGeral)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Pago</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(totalPago)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Em Aberto</p>
            <p className="text-lg font-semibold text-destructive">{formatCurrency(totalEmAberto)}</p>
          </div>
        </div>

        {/* Tabela de Faturas */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : faturas && faturas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Pgto</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faturas.map((fatura) => {
                  const isPago = fatura.status?.nome?.toLowerCase() === 'pago';
                  const isCancelado = fatura.status?.nome?.toLowerCase() === 'cancelado';

                  return (
                    <TableRow key={fatura.id}>
                      <TableCell className="font-medium">
                        {formatMesReferencia(fatura.mes_referencia)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(fatura.data_vencimento), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{formatCurrency(fatura.valor)}</TableCell>
                      <TableCell>{getStatusBadge(fatura)}</TableCell>
                      <TableCell>
                        {fatura.data_pagamento
                          ? format(new Date(fatura.data_pagamento), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isPago && !isCancelado && (
                          <Popover
                            open={pagandoFatura === fatura.id}
                            onOpenChange={(open) => setPagandoFatura(open ? fatura.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Check className="mr-1 h-3 w-3" />
                                Pagar
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-popover" align="end">
                              <div className="p-2 text-sm text-muted-foreground">
                                Selecione a data do pagamento:
                              </div>
                              <Calendar
                                mode="single"
                                selected={new Date()}
                                onSelect={(date) => {
                                  if (date) handleMarcarPaga(fatura, date);
                                }}
                                locale={ptBR}
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                        {isPago && (
                          <span className="text-sm text-green-600 flex items-center justify-end gap-1">
                            <Check className="h-4 w-4" /> Pago
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p>Nenhuma fatura encontrada</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
