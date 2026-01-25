import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Fatura } from '@/types/database';
import { toast } from '@/hooks/use-toast';

export function useFaturasByCobranca(cobrancaId: string | null) {
  return useQuery({
    queryKey: ['faturas', cobrancaId],
    queryFn: async () => {
      if (!cobrancaId) return [];
      
      const { data, error } = await supabase
        .from('faturas')
        .select(`
          *,
          status:status_pagamento(*)
        `)
        .eq('cobranca_id', cobrancaId)
        .order('mes_referencia', { ascending: true });

      if (error) throw error;
      return data as Fatura[];
    },
    enabled: !!cobrancaId,
  });
}

export function useUpdateFatura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Fatura> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('faturas')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['faturas'] });
      queryClient.invalidateQueries({ queryKey: ['cobrancas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast({ title: 'Fatura atualizada!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar fatura',
        description: error.message,
      });
    },
  });
}

export function useMarcarFaturaPaga() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data_pagamento, status_id }: { id: string; data_pagamento: string; status_id: string }) => {
      const { data: result, error } = await supabase
        .from('faturas')
        .update({ 
          status_id, 
          data_pagamento 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faturas'] });
      queryClient.invalidateQueries({ queryKey: ['cobrancas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast({ title: 'Fatura marcada como paga!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao marcar fatura como paga',
        description: error.message,
      });
    },
  });
}

export function useCreateFatura() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Fatura, 'id' | 'created_at' | 'updated_at' | 'status'>) => {
      const { data: result, error } = await supabase
        .from('faturas')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faturas'] });
      queryClient.invalidateQueries({ queryKey: ['cobrancas'] });
      toast({ title: 'Fatura criada!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar fatura',
        description: error.message,
      });
    },
  });
}
