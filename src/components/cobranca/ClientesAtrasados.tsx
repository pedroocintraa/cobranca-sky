import { useState } from 'react';
import { AlertTriangle, Clock, Users, Search, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClientesComFaturasAtrasadas } from '@/hooks/useRegrasCobranca';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function ClientesAtrasados() {
  const { data: clientes, isLoading } = useClientesComFaturasAtrasadas();
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'atrasado' | 'critico'>('todos');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);

  // Filtrar clientes
  const clientesFiltrados = clientes?.filter((cliente) => {
    // Filtro por status
    if (filtroStatus !== 'todos' && cliente.status !== filtroStatus) {
      return false;
    }

    // Filtro por busca
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        cliente.cliente.nome.toLowerCase().includes(searchLower) ||
        cliente.cliente.cpf?.toLowerCase().includes(searchLower) ||
        cliente.cliente.email?.toLowerCase().includes(searchLower) ||
        cliente.cliente.telefone?.includes(search)
      );
    }

    return true;
  });

  // Calcular métricas
  const metrics = {
    total: clientes?.length || 0,
    pendentes: clientes?.filter(c => c.status === 'pendente').length || 0,
    atrasados: clientes?.filter(c => c.status === 'atrasado').length || 0,
    criticos: clientes?.filter(c => c.status === 'critico').length || 0,
    valorTotal: clientes?.reduce((sum, c) => sum + c.valorTotal, 0) || 0,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critico':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Crítico
          </Badge>
        );
      case 'atrasado':
        return (
          <Badge variant="outline" className="gap-1 border-amber-500 text-amber-700">
            <Clock className="h-3 w-3" />
            Atrasado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            Pendente
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{metrics.pendentes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{metrics.atrasados}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{metrics.criticos}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.valorTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Clientes */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              Clientes com Faturas em Aberto
            </CardTitle>
            <div className="flex gap-2">
              <Select value={filtroStatus} onValueChange={(v: any) => setFiltroStatus(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="atrasado">Atrasados</SelectItem>
                  <SelectItem value="critico">Críticos</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 sm:w-72"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !clientesFiltrados || clientesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">
                {search || filtroStatus !== 'todos' 
                  ? 'Nenhum cliente encontrado' 
                  : 'Nenhum cliente com faturas em aberto'}
              </h3>
              <p className="text-muted-foreground">
                {search || filtroStatus !== 'todos'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Todos os clientes estão em dia'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Faturas</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-center">Dias Atraso</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesFiltrados.map((clienteData) => (
                    <TableRow key={clienteData.cliente.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{clienteData.cliente.nome}</div>
                          {clienteData.cliente.email && (
                            <div className="text-sm text-muted-foreground">
                              {clienteData.cliente.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{clienteData.totalFaturas}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(clienteData.valorTotal)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className={clienteData.maiorAtraso > 15 ? 'text-red-600 font-bold' : clienteData.maiorAtraso > 0 ? 'text-amber-600 font-medium' : ''}>
                            {clienteData.maiorAtraso > 0 ? `${clienteData.maiorAtraso} dias` : 'Em dia'}
                          </span>
                          {clienteData.mesesAtrasados.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {clienteData.mesesAtrasados.slice(0, 2).join(', ')}
                              {clienteData.mesesAtrasados.length > 2 && '...'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(clienteData.status)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {clienteData.cliente.telefone || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => setSelectedClienteId(clienteData.cliente.id)}
                          className="text-primary hover:underline text-sm"
                        >
                          Ver Faturas
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Faturas */}
      {selectedClienteId && (
        <Dialog open={!!selectedClienteId} onOpenChange={(open) => !open && setSelectedClienteId(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Faturas em Aberto</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {(() => {
                const clienteData = clientes?.find(c => c.cliente.id === selectedClienteId);
                if (!clienteData) return null;

                return (
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium">{clienteData.cliente.nome}</p>
                      <p className="text-sm text-muted-foreground">{clienteData.cliente.email}</p>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mês</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Dias Atraso</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clienteData.faturas.map((fatura) => {
                          const vencimento = new Date(fatura.data_vencimento);
                          const hoje = new Date();
                          const diasAtraso = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
                          
                          return (
                            <TableRow key={fatura.id}>
                              <TableCell>{fatura.mes_referencia}</TableCell>
                              <TableCell>{format(new Date(fatura.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(fatura.valor)}
                              </TableCell>
                              <TableCell>
                                {fatura.status && (
                                  <Badge style={{ backgroundColor: fatura.status.cor }} className="text-white">
                                    {fatura.status.nome}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {diasAtraso > 0 ? (
                                  <span className={diasAtraso > 15 ? 'text-red-600 font-bold' : 'text-amber-600'}>
                                    {diasAtraso} dias
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Em dia</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
