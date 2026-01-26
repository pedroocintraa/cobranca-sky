import { useState, useEffect } from 'react';
import { Loader2, Users, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useStatusPagamento } from '@/hooks/useStatusPagamento';
import { useFaturasEmAberto, useCreateLote, useAddItensLote } from '@/hooks/useLotesCobranca';
import { FiltroNumeroFatura } from './FiltroNumeroFatura';
import type { ClienteComFaturas } from '@/types/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface CreateLoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLoteModal({ open, onOpenChange }: CreateLoteModalProps) {
  const [nome, setNome] = useState(() => `Cobrança ${format(new Date(), 'MMMM yyyy', { locale: ptBR })}`);
  const [selectedStatusIds, setSelectedStatusIds] = useState<string[]>([]);
  const [diasAtrasoMin, setDiasAtrasoMin] = useState<string>('0');
  const [filtroNumeroFatura, setFiltroNumeroFatura] = useState<number[]>([]);
  const [selectedClientes, setSelectedClientes] = useState<Set<string>>(new Set());
  
  const { data: statusList } = useStatusPagamento();
  const { data: clientesFaturas, isLoading: loadingFaturas } = useFaturasEmAberto(selectedStatusIds);
  const createLote = useCreateLote();
  const addItens = useAddItensLote();

  // Filtrar por dias de atraso e número de fatura
  const clientesFiltrados = (clientesFaturas || [])
    .filter(cf => cf.diasAtraso >= parseInt(diasAtrasoMin || '0'))
    .map(cf => {
      // Aplicar filtro por número de fatura
      if (filtroNumeroFatura.length === 0) return cf;
      
      const faturasFiltradas = cf.faturas.filter((_, index) => {
        const numeroFatura = index + 1;
        if (filtroNumeroFatura.includes(4) && numeroFatura >= 4) return true;
        return filtroNumeroFatura.includes(numeroFatura);
      });
      
      if (faturasFiltradas.length === 0) return null;
      
      return {
        ...cf,
        faturas: faturasFiltradas,
        totalFaturas: faturasFiltradas.length,
        valorTotal: faturasFiltradas.reduce((sum, f) => sum + f.valor, 0),
      };
    })
    .filter((cf): cf is ClienteComFaturas => cf !== null);

  // Selecionar/deselecionar todos
  useEffect(() => {
    if (clientesFiltrados.length > 0) {
      setSelectedClientes(new Set(clientesFiltrados.map(cf => cf.cliente.id)));
    }
  }, [clientesFiltrados.length]);

  const toggleCliente = (clienteId: string) => {
    setSelectedClientes(prev => {
      const next = new Set(prev);
      if (next.has(clienteId)) {
        next.delete(clienteId);
      } else {
        next.add(clienteId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedClientes.size === clientesFiltrados.length) {
      setSelectedClientes(new Set());
    } else {
      setSelectedClientes(new Set(clientesFiltrados.map(cf => cf.cliente.id)));
    }
  };

  const handleCreate = async () => {
    if (!nome.trim()) {
      toast({ variant: 'destructive', title: 'Nome do lote é obrigatório' });
      return;
    }
    
    if (selectedClientes.size === 0) {
      toast({ variant: 'destructive', title: 'Selecione pelo menos um cliente' });
      return;
    }

    try {
      // Criar lote
      const lote = await createLote.mutateAsync({ nome });
      
      // Adicionar itens
      const clientesSelecionados = clientesFiltrados.filter(cf => selectedClientes.has(cf.cliente.id));
      await addItens.mutateAsync({ loteId: lote.id, clientesFaturas: clientesSelecionados });
      
      onOpenChange(false);
      setNome(`Cobrança ${format(new Date(), 'MMMM yyyy', { locale: ptBR })}`);
      setSelectedStatusIds([]);
      setSelectedClientes(new Set());
    } catch (error) {
      // Erros já tratados nos hooks
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Encontrar status "Atrasado" e "Pendente" para pré-selecionar
  useEffect(() => {
    if (statusList && selectedStatusIds.length === 0) {
      const atrasado = statusList.find(s => s.nome.toLowerCase().includes('atrasad'));
      const pendente = statusList.find(s => s.nome.toLowerCase().includes('pendente'));
      const ids = [atrasado?.id, pendente?.id].filter(Boolean) as string[];
      if (ids.length > 0) {
        setSelectedStatusIds(ids);
      }
    }
  }, [statusList]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Criar Novo Lote de Cobrança</DialogTitle>
          <DialogDescription>
            Selecione as faturas em aberto para incluir neste lote de cobrança.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Nome do Lote */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Lote</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Cobrança Janeiro 2026"
            />
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status das Faturas</Label>
              <Select
                value={selectedStatusIds.join(',')}
                onValueChange={(v) => setSelectedStatusIds(v ? v.split(',') : [])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione os status" />
                </SelectTrigger>
                <SelectContent>
                  {statusList?.filter(s => s.ativo).map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: status.cor }}
                        />
                        {status.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diasAtraso">Dias de Atraso Mínimo</Label>
              <Select value={diasAtrasoMin} onValueChange={setDiasAtrasoMin}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos</SelectItem>
                  <SelectItem value="7">&gt; 7 dias</SelectItem>
                  <SelectItem value="15">&gt; 15 dias</SelectItem>
                  <SelectItem value="30">&gt; 30 dias</SelectItem>
                  <SelectItem value="60">&gt; 60 dias</SelectItem>
                  <SelectItem value="90">&gt; 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtro por número de fatura */}
          <FiltroNumeroFatura 
            value={filtroNumeroFatura}
            onChange={setFiltroNumeroFatura}
          />

          {/* Lista de Clientes */}
          <div className="border rounded-lg overflow-hidden flex-1">
            <div className="bg-muted px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Clientes Selecionados: {selectedClientes.size} de {clientesFiltrados.length}
              </span>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedClientes.size === clientesFiltrados.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>
            
            <ScrollArea className="h-[300px]">
              {loadingFaturas ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : clientesFiltrados.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  Nenhuma fatura encontrada com os filtros selecionados.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-center">Faturas</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-center">Dias Atraso</TableHead>
                      <TableHead>Telefone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientesFiltrados.map((cf) => (
                      <TableRow key={cf.cliente.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedClientes.has(cf.cliente.id)}
                            onCheckedChange={() => toggleCliente(cf.cliente.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{cf.cliente.nome}</TableCell>
                        <TableCell className="text-center">{cf.totalFaturas}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cf.valorTotal)}</TableCell>
                        <TableCell className="text-center">
                          <span className={cf.diasAtraso > 30 ? 'text-red-600 font-medium' : ''}>
                            {cf.diasAtraso} dias
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cf.cliente.telefone || 'Sem telefone'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={createLote.isPending || addItens.isPending || selectedClientes.size === 0}
            className="gap-2"
          >
            {(createLote.isPending || addItens.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
            <Sparkles className="h-4 w-4" />
            Criar Lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
