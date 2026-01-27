import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FilaCobranca, FilaAgregada, HistoricoCobranca } from '@/types/database';
import { toast } from '@/hooks/use-toast';

// ============= Hooks para Filas de Cobrança =============

export function useFilasCobranca() {
  return useQuery({
    queryKey: ['filas-cobranca'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('filas_cobranca')
        .select(`
          *,
          regra:regras_cobranca(*),
          fatura:faturas(*, status:status_pagamento(*), cobranca:cobrancas(*, cliente:clientes(*))),
          cliente:clientes(*)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as FilaCobranca[];
    },
  });
}

export function useFilasCobrancaAgregadas() {
  return useQuery({
    queryKey: ['filas-cobranca-agregadas'],
    queryFn: async () => {
      // Buscar todas as filas
      const { data: filas, error } = await supabase
        .from('filas_cobranca')
        .select(`
          *,
          regra:regras_cobranca(*),
          fatura:faturas(*, status:status_pagamento(*), cobranca:cobrancas(*, cliente:clientes(*))),
          cliente:clientes(*)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!filas) return [];

      // Agrupar por regra
      const filasMap = new Map<string | null, FilaAgregada>();

      for (const fila of filas as FilaCobranca[]) {
        const regraKey = fila.regra_id || 'critica'; // 'critica' para fila crítica

        if (!filasMap.has(regraKey)) {
          filasMap.set(regraKey, {
            regra: fila.regra || null,
            total: 0,
            pendentes: 0,
            enviados: 0,
            falhas: 0,
            valorTotal: 0,
            itens: [],
          });
        }

        const agregada = filasMap.get(regraKey)!;
        agregada.total += 1;
        agregada.itens.push(fila);

        if (fila.status === 'pendente') agregada.pendentes += 1;
        if (fila.status === 'enviado') agregada.enviados += 1;
        if (fila.status === 'falha') agregada.falhas += 1;

        if (fila.fatura) {
          agregada.valorTotal += fila.fatura.valor || 0;
        }
      }

      return Array.from(filasMap.values());
    },
  });
}

export function useFilaCobrancaPorRegra(regraId: string | null) {
  return useQuery({
    queryKey: ['fila-cobranca', regraId],
    queryFn: async () => {
      if (regraId === null) {
        // Buscar fila crítica (regra_id IS NULL)
        const { data, error } = await supabase
          .from('filas_cobranca')
          .select(`
            *,
            fatura:faturas(*, status:status_pagamento(*), cobranca:cobrancas(*, cliente:clientes(*))),
            cliente:clientes(*)
          `)
          .is('regra_id', null)
          .eq('status', 'pendente')
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data as FilaCobranca[];
      } else {
        const { data, error } = await supabase
          .from('filas_cobranca')
          .select(`
            *,
            regra:regras_cobranca(*),
            fatura:faturas(*, status:status_pagamento(*), cobranca:cobrancas(*, cliente:clientes(*))),
            cliente:clientes(*)
          `)
          .eq('regra_id', regraId)
          .eq('status', 'pendente')
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data as FilaCobranca[];
      }
    },
    enabled: regraId !== undefined,
  });
}

// Hook para disparar cobranças de uma fila
export function useDispararFilaCobranca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (regraId: string | null) => {
      const { data, error } = await supabase.functions.invoke('disparar-fila-cobranca', {
        body: { regraId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['filas-cobranca'] });
      queryClient.invalidateQueries({ queryKey: ['filas-cobranca-agregadas'] });
      queryClient.invalidateQueries({ queryKey: ['historico-cobranca'] });
      
      if (data.success) {
        toast({ 
          title: 'Cobranças disparadas!', 
          description: `${data.totalEnviados} mensagem(ns) enviada(s) com sucesso.` 
        });
      } else {
        toast({ 
          variant: 'destructive',
          title: 'Erro ao disparar cobranças', 
          description: data.message 
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao disparar cobranças',
        description: error.message,
      });
    },
  });
}

// Hook para popular filas (chamar manualmente ou via CRON)
export function usePopularFilasCobranca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('popular-filas-cobranca', {
        body: {},
      });

      if (error) {
        console.error('Erro ao invocar função:', error);
        throw new Error(error.message || 'Erro ao popular filas');
      }

      // Verificar se a resposta indica erro
      if (data && !data.success) {
        throw new Error(data.message || data.error || 'Erro ao popular filas');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['filas-cobranca'] });
      queryClient.invalidateQueries({ queryKey: ['filas-cobranca-agregadas'] });
      
      if (data?.success) {
        toast({ 
          title: 'Filas atualizadas!', 
          description: `${data.totalAdicionadas || 0} fatura(s) adicionada(s) às filas.` 
        });
      } else {
        toast({ 
          variant: 'destructive',
          title: 'Aviso', 
          description: data?.message || 'Nenhuma fatura adicionada às filas.' 
        });
      }
    },
    onError: (error: Error) => {
      console.error('Erro ao popular filas:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao popular filas',
        description: error.message || 'Erro desconhecido ao atualizar filas',
      });
    },
  });
}

// ============= Hooks para Histórico de Cobrança =============

export function useHistoricoCobranca(faturaId?: string) {
  return useQuery({
    queryKey: ['historico-cobranca', faturaId],
    queryFn: async () => {
      let query = supabase
        .from('historico_cobranca')
        .select(`
          *,
          regra:regras_cobranca(*),
          fatura:faturas(*, status:status_pagamento(*)),
          cliente:clientes(*)
        `)
        .order('data_envio', { ascending: false });

      if (faturaId) {
        query = query.eq('fatura_id', faturaId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as HistoricoCobranca[];
    },
  });
}
