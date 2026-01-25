import { useState } from 'react';
import { useCobrancas, useCreateCobranca, useUpdateCobranca, useDeleteCobranca } from '@/hooks/useCobrancas';
import { useClientes } from '@/hooks/useClientes';
import { useStatusPagamento } from '@/hooks/useStatusPagamento';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Plus, Search, Pencil, Trash2, Receipt, CalendarIcon, Filter } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Cobranca } from '@/types/database';

const cobrancaSchema = z.object({
  cliente_id: z.string().min(1, 'Selecione um cliente'),
  numero_proposta: z.string().max(50, 'Máximo 50 caracteres').optional().or(z.literal('')),
  valor: z.string().min(1, 'Informe o valor'),
  data_instalacao: z.date().optional(),
  data_vencimento: z.date({ required_error: 'Selecione a data de vencimento' }),
  status_id: z.string().optional(),
  observacoes: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
});

type CobrancaFormData = z.infer<typeof cobrancaSchema>;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export default function Cobrancas() {
  const { isAdmin, user } = useAuth();
  const { data: cobrancas, isLoading } = useCobrancas();
  const { data: clientes } = useClientes();
  const { data: statusList } = useStatusPagamento();
  const createCobranca = useCreateCobranca();
  const updateCobranca = useUpdateCobranca();
  const deleteCobranca = useDeleteCobranca();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mesFilter, setMesFilter] = useState<string>('all');

  // Extrair meses únicos das cobranças para o filtro
  const mesesDisponiveis = [...new Set(cobrancas?.map(c => c.mes_referencia).filter(Boolean) as string[])].sort().reverse();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCobranca, setEditingCobranca] = useState<Cobranca | null>(null);
  const [deletingCobranca, setDeletingCobranca] = useState<Cobranca | null>(null);

  const form = useForm<CobrancaFormData>({
    resolver: zodResolver(cobrancaSchema),
    defaultValues: {
      cliente_id: '',
      numero_proposta: '',
      valor: '',
      observacoes: '',
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredCobrancas = cobrancas?.filter((cobranca) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      cobranca.cliente?.nome?.toLowerCase().includes(searchLower) ||
      cobranca.cliente?.cpf?.toLowerCase().includes(searchLower) ||
      cobranca.numero_proposta?.toLowerCase().includes(searchLower);

    const matchesStatus =
      statusFilter === 'all' ||
      cobranca.status_id === statusFilter ||
      (statusFilter === 'atrasado' &&
        !cobranca.status?.nome?.toLowerCase().includes('pago') &&
        !cobranca.status?.nome?.toLowerCase().includes('cancelado') &&
        isBefore(new Date(cobranca.data_vencimento), today));

    const matchesMes =
      mesFilter === 'all' ||
      cobranca.mes_referencia === mesFilter;

    return matchesSearch && matchesStatus && matchesMes;
  });

  const openCreateDialog = () => {
    setEditingCobranca(null);
    form.reset({
      cliente_id: '',
      numero_proposta: '',
      valor: '',
      observacoes: '',
      status_id: statusList?.[0]?.id,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (cobranca: Cobranca) => {
    setEditingCobranca(cobranca);
    form.reset({
      cliente_id: cobranca.cliente_id,
      numero_proposta: cobranca.numero_proposta || '',
      valor: String(cobranca.valor),
      data_instalacao: cobranca.data_instalacao ? new Date(cobranca.data_instalacao) : undefined,
      data_vencimento: new Date(cobranca.data_vencimento),
      status_id: cobranca.status_id || undefined,
      observacoes: cobranca.observacoes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: CobrancaFormData) => {
    const valorNumerico = parseFloat(data.valor.replace(/[^\d,.-]/g, '').replace(',', '.'));

    const dataVencimentoFormatted = format(data.data_vencimento, 'yyyy-MM-dd');
    const mesReferencia = dataVencimentoFormatted.substring(0, 7);
    const diaVencimento = data.data_vencimento.getDate();

    const payload = {
      cliente_id: data.cliente_id,
      numero_proposta: data.numero_proposta || null,
      valor: valorNumerico,
      data_instalacao: data.data_instalacao ? format(data.data_instalacao, 'yyyy-MM-dd') : null,
      data_vencimento: dataVencimentoFormatted,
      dia_vencimento: diaVencimento,
      mes_referencia: mesReferencia,
      status_id: data.status_id || null,
      observacoes: data.observacoes || null,
    };

    if (editingCobranca) {
      await updateCobranca.mutateAsync({ id: editingCobranca.id, ...payload });
    } else {
      await createCobranca.mutateAsync({
        ...payload,
        created_by: user?.id || null,
        updated_by: user?.id || null,
      });
    }
    setIsDialogOpen(false);
    form.reset();
  };

  const handleDelete = async () => {
    if (deletingCobranca) {
      await deleteCobranca.mutateAsync(deletingCobranca.id);
      setDeletingCobranca(null);
    }
  };

  const getUrgencyBadge = (dataVencimento: string, status?: { nome: string; cor: string } | null) => {
    const vencimento = new Date(dataVencimento);
    const statusNome = status?.nome?.toLowerCase();

    if (statusNome === 'pago') {
      return (
        <Badge style={{ backgroundColor: status?.cor }} className="text-white">
          {status?.nome}
        </Badge>
      );
    }
    if (statusNome === 'cancelado') {
      return <Badge variant="secondary">{status?.nome}</Badge>;
    }
    if (isBefore(vencimento, today)) {
      return <Badge variant="destructive">Atrasado</Badge>;
    }
    if (isToday(vencimento)) {
      return <Badge className="bg-warning text-warning-foreground">Vence Hoje</Badge>;
    }
    if (status) {
      return (
        <Badge style={{ backgroundColor: status.cor }} className="text-white">
          {status.nome}
        </Badge>
      );
    }
    return <Badge variant="outline">Pendente</Badge>;
  };

  const formatValorInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const numero = parseInt(digits, 10) / 100;
    if (isNaN(numero)) return '';
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Cobranças</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas cobranças</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Cobrança
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCobranca ? 'Editar Cobrança' : 'Nova Cobrança'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="cliente_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover">
                          {clientes?.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="numero_proposta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nº Proposta</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="valor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              R$
                            </span>
                            <Input
                              placeholder="0,00"
                              className="pl-9"
                              {...field}
                              onChange={(e) => field.onChange(formatValorInput(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="data_instalacao"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data Instalação</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                                ) : (
                                  <span>Selecione</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-popover" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              locale={ptBR}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="data_vencimento"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Vencimento *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                                ) : (
                                  <span>Selecione</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-popover" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              locale={ptBR}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover">
                          {statusList?.map((status) => (
                            <SelectItem key={status.id} value={status.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: status.cor }}
                                />
                                {status.nome}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observações adicionais..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCobranca.isPending || updateCobranca.isPending}
                  >
                    {editingCobranca ? 'Salvar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              Lista de Cobranças
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, CPF, proposta..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 sm:w-64"
                />
              </div>
              <Select value={mesFilter} onValueChange={setMesFilter}>
                <SelectTrigger className="w-full sm:w-36">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {mesesDisponiveis.map((mes) => {
                    const [ano, mesNum] = mes.split('-');
                    const mesLabel = format(new Date(parseInt(ano), parseInt(mesNum) - 1, 1), 'MMM/yyyy', { locale: ptBR });
                    return (
                      <SelectItem key={mes} value={mes}>
                        {mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="atrasado">Atrasados</SelectItem>
                  {statusList?.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          ) : filteredCobrancas && filteredCobrancas.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Proposta</TableHead>
                    <TableHead className="hidden lg:table-cell">Mês Ref.</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCobrancas.map((cobranca) => (
                    <TableRow key={cobranca.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{cobranca.cliente?.nome || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">
                            {cobranca.cliente?.telefone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {cobranca.numero_proposta || '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {cobranca.mes_referencia ? (
                          <Badge variant="outline" className="font-normal">
                            {(() => {
                              const [ano, mesNum] = cobranca.mes_referencia.split('-');
                              const mesLabel = format(new Date(parseInt(ano), parseInt(mesNum) - 1, 1), 'MMM/yy', { locale: ptBR });
                              return mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);
                            })()}
                          </Badge>
                        ) : '-'}
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
                        {getUrgencyBadge(cobranca.data_vencimento, cobranca.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(cobranca)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingCobranca(cobranca)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              {search || statusFilter !== 'all'
                ? 'Nenhuma cobrança encontrada.'
                : 'Nenhuma cobrança cadastrada.'}
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingCobranca} onOpenChange={() => setDeletingCobranca(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cobrança?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A cobrança será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
