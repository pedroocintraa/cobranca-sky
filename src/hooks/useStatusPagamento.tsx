import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StatusPagamento } from '@/types/database';
import { toast } from '@/hooks/use-toast';

export function useStatusPagamento() {
  return useQuery({
    queryKey: ['status-pagamento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_pagamento')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as StatusPagamento[];
    },
  });
}

export function useAllStatusPagamento() {
  return useQuery({
    queryKey: ['all-status-pagamento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('status_pagamento')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as StatusPagamento[];
    },
  });
}

export function useCreateStatusPagamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<StatusPagamento, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('status_pagamento')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-pagamento'] });
      queryClient.invalidateQueries({ queryKey: ['all-status-pagamento'] });
      toast({ title: 'Status criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar status',
        description: error.message,
      });
    },
  });
}

export function useUpdateStatusPagamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<StatusPagamento> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('status_pagamento')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-pagamento'] });
      queryClient.invalidateQueries({ queryKey: ['all-status-pagamento'] });
      toast({ title: 'Status atualizado!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar status',
        description: error.message,
      });
    },
  });
}

export function useDeleteStatusPagamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('status_pagamento')
        .update({ ativo: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status-pagamento'] });
      queryClient.invalidateQueries({ queryKey: ['all-status-pagamento'] });
      toast({ title: 'Status desativado!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao desativar status',
        description: error.message,
      });
    },
  });
}
