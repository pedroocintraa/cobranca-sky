import { format, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Cobranca {
  id: string;
  cliente?: { nome: string } | null;
  numero_proposta?: string | null;
  data_vencimento: string;
  valor: number;
  status?: { nome: string; cor: string } | null;
}

interface RecentChargesProps {
  charges?: Cobranca[];
  isLoading?: boolean;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function RecentCharges({ charges, isLoading }: RecentChargesProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getStatusBadge = (dataVencimento: string, statusNome?: string) => {
    const vencimento = new Date(dataVencimento);

    if (statusNome?.toLowerCase() === 'pago') {
      return <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/20">Pago</Badge>;
    }
    if (statusNome?.toLowerCase() === 'cancelado') {
      return <Badge variant="secondary">Cancelado</Badge>;
    }
    if (isBefore(vencimento, today)) {
      return <Badge variant="destructive">Atrasado</Badge>;
    }
    if (isToday(vencimento)) {
      return <Badge className="bg-warning/10 text-warning border-warning/20 hover:bg-warning/20">Vence Hoje</Badge>;
    }
    return <Badge variant="outline">Em dia</Badge>;
  };

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <CardTitle className="text-base font-semibold">Cobranças Recentes</CardTitle>
          <Link
            to="/cobrancas"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors sm:hidden"
          >
            Ver todas
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar cobrança..."
              className="pl-10 h-9 bg-background"
            />
          </div>
          <Link
            to="/cobrancas"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors hidden sm:block"
          >
            Ver todas
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : charges && charges.length > 0 ? (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-medium">Cliente</TableHead>
                  <TableHead className="font-medium hidden sm:table-cell">Proposta</TableHead>
                  <TableHead className="font-medium">Vencimento</TableHead>
                  <TableHead className="font-medium text-right">Valor</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((cobranca) => (
                  <TableRow key={cobranca.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{cobranca.cliente?.nome || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {cobranca.numero_proposta || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(cobranca.data_vencimento), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(Number(cobranca.valor))}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(cobranca.data_vencimento, cobranca.status?.nome)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nenhuma cobrança encontrada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
