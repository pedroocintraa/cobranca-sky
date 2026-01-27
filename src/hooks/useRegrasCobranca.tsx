import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RegraCobranca, FilaCobrancaCritica, ClienteComFaturasAtrasadas } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============= Hooks para Regras de Cobrança =============

export function useRegrasCobranca() {
  return useQuery({
    queryKey: ['regras-cobranca'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regras_cobranca')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as RegraCobranca[];
    },
  });
}

export function useRegrasCobrancaAtivas() {
  return useQuery({
    queryKey: ['regras-cobranca-ativas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regras_cobranca')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as RegraCobranca[];
    },
  });
}

export function useCreateRegraCobranca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<RegraCobranca, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from('regras_cobranca')
        .insert([{ ...data, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return result as RegraCobranca;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-cobranca'] });
      queryClient.invalidateQueries({ queryKey: ['regras-cobranca-ativas'] });
      toast({ title: 'Regra criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar regra',
        description: error.message,
      });
    },
  });
}

export function useUpdateRegraCobranca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<RegraCobranca> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('regras_cobranca')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as RegraCobranca;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-cobranca'] });
      queryClient.invalidateQueries({ queryKey: ['regras-cobranca-ativas'] });
      toast({ title: 'Regra atualizada!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar regra',
        description: error.message,
      });
    },
  });
}

export function useDeleteRegraCobranca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('regras_cobranca')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-cobranca'] });
      queryClient.invalidateQueries({ queryKey: ['regras-cobranca-ativas'] });
      toast({ title: 'Regra excluída!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir regra',
        description: error.message,
      });
    },
  });
}

// ============= Hooks para Fila de Cobrança Crítica =============

export function useFilaCobrancaCritica() {
  return useQuery({
    queryKey: ['fila-cobranca-critica'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fila_cobranca_critica')
        .select(`
          *,
          fatura:faturas(*, status:status_pagamento(*), cobranca:cobrancas(*, cliente:clientes(*))),
          cliente:clientes(*)
        `)
        .eq('processado', false)
        .order('prioridade', { ascending: false })
        .order('dias_atraso', { ascending: false });

      if (error) throw error;
      return data as FilaCobrancaCritica[];
    },
  });
}

// ============= Hooks para Clientes com Faturas Atrasadas =============

export function useClientesComFaturasAtrasadas() {
  return useQuery({
    queryKey: ['clientes-faturas-atrasadas'],
    queryFn: async () => {
      // Buscar status "Pendente" e "Atrasado"
      const { data: statusList } = await supabase
        .from('status_pagamento')
        .select('id, nome')
        .in('nome', ['Pendente', 'Atrasado']);

      if (!statusList || statusList.length === 0) return [];

      const statusIds = statusList.map(s => s.id);

      // Buscar faturas em aberto
      const { data: faturas, error } = await supabase
        .from('faturas')
        .select(`
          *,
          status:status_pagamento(*),
          cobranca:cobrancas(*, cliente:clientes(*))
        `)
        .in('status_id', statusIds)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      if (!faturas) return [];

      // Agrupar por cliente
      const clientesMap = new Map<string, ClienteComFaturasAtrasadas>();
      const hoje = new Date();

      for (const fatura of faturas) {
        const cliente = (fatura as any).cobranca?.cliente;
        if (!cliente) continue;

        if (!clientesMap.has(cliente.id)) {
          clientesMap.set(cliente.id, {
            cliente,
            faturas: [],
            totalFaturas: 0,
            valorTotal: 0,
            diasAtraso: 0,
            maiorAtraso: 0,
            status: 'pendente',
            mesesAtrasados: [],
          });
        }

        const clienteData = clientesMap.get(cliente.id)!;
        clienteData.faturas.push(fatura as any);
        clienteData.totalFaturas += 1;
        clienteData.valorTotal += fatura.valor || 0;

        const dataVencimento = parseISO(fatura.data_vencimento);
        const dias = differenceInDays(hoje, dataVencimento);
        
        if (dias > clienteData.maiorAtraso) {
          clienteData.maiorAtraso = dias;
        }
        
        if (dias > clienteData.diasAtraso) {
          clienteData.diasAtraso = dias;
        }

        // Determinar status
        if (dias > 15) {
          clienteData.status = 'critico';
        } else if (dias > 0) {
          clienteData.status = 'atrasado';
        } else {
          clienteData.status = 'pendente';
        }

        const mesFormatado = format(dataVencimento, 'MMM/yyyy', { locale: ptBR });
        if (!clienteData.mesesAtrasados.includes(mesFormatado)) {
          clienteData.mesesAtrasados.push(mesFormatado);
        }
      }

      return Array.from(clientesMap.values())
        .sort((a, b) => {
          // Ordenar: críticos primeiro, depois por maior atraso
          if (a.status === 'critico' && b.status !== 'critico') return -1;
          if (a.status !== 'critico' && b.status === 'critico') return 1;
          return b.maiorAtraso - a.maiorAtraso;
        });
    },
  });
}

// Helper para formatar descrição da regra
export function formatarRegraCobranca(regra: RegraCobranca): string {
  if (regra.tipo === 'antes_vencimento') {
    const dias = Math.abs(regra.dias);
    if (dias === 0) return 'No dia do vencimento';
    return `${dias} dia${dias > 1 ? 's' : ''} antes do vencimento`;
  } else {
    if (regra.dias === 0) return 'No dia do vencimento';
    return `${regra.dias} dia${regra.dias > 1 ? 's' : ''} após o vencimento`;
  }
}
