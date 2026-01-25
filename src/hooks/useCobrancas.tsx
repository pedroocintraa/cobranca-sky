import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Cobranca, DashboardMetrics } from '@/types/database';
import { toast } from '@/hooks/use-toast';

export function useCobrancas() {
  return useQuery({
    queryKey: ['cobrancas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cobrancas')
        .select(`
          *,
          cliente:clientes(*),
          status:status_pagamento(*)
        `)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      return data as Cobranca[];
    },
  });
}

export function useCobranca(id: string) {
  return useQuery({
    queryKey: ['cobranca', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cobrancas')
        .select(`
          *,
          cliente:clientes(*),
          status:status_pagamento(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Cobranca | null;
    },
    enabled: !!id,
  });
}

export function useMonthlyMetrics() {
  return useQuery({
    queryKey: ['monthly-metrics'],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;

      const { data, error } = await supabase
        .from('cobrancas')
        .select('valor, data_vencimento')
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate);

      if (error) throw error;

      const monthlyData = Array(12).fill(0);
      data?.forEach((c) => {
        const month = new Date(c.data_vencimento).getMonth();
        monthlyData[month] += Number(c.valor) || 0;
      });

      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return months.map((month, i) => ({ month, value: monthlyData[i] }));
    },
  });
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const { data: cobrancas, error } = await supabase
        .from('cobrancas')
        .select(`
          *,
          status:status_pagamento(nome)
        `);

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const in7Days = new Date(today);
      in7Days.setDate(in7Days.getDate() + 7);

      const metrics: DashboardMetrics = {
        totalCobrancas: cobrancas?.length || 0,
        valorTotal: 0,
        totalPagos: 0,
        valorPagos: 0,
        totalAtrasados: 0,
        valorAtrasados: 0,
        totalPendentes: 0,
        valorPendentes: 0,
        vencendoHoje: 0,
        vencendo7Dias: 0,
      };

      cobrancas?.forEach((c) => {
        const valor = Number(c.valor) || 0;
        const vencimento = new Date(c.data_vencimento);
        const statusNome = (c.status as { nome?: string })?.nome?.toLowerCase();

        metrics.valorTotal += valor;

        if (statusNome === 'pago') {
          metrics.totalPagos++;
          metrics.valorPagos += valor;
        } else if (statusNome === 'atrasado' || (vencimento < today && statusNome !== 'pago' && statusNome !== 'cancelado')) {
          metrics.totalAtrasados++;
          metrics.valorAtrasados += valor;
        } else if (statusNome === 'pendente' || (!statusNome && vencimento >= today)) {
          metrics.totalPendentes++;
          metrics.valorPendentes += valor;
        }

        if (vencimento.toDateString() === today.toDateString()) {
          metrics.vencendoHoje++;
        }
        if (vencimento >= today && vencimento <= in7Days) {
          metrics.vencendo7Dias++;
        }
      });

      return metrics;
    },
  });
}

export function useCreateCobranca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Cobranca, 'id' | 'created_at' | 'updated_at' | 'cliente' | 'status'>) => {
      const { data: result, error } = await supabase
        .from('cobrancas')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobrancas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast({ title: 'Cobrança criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar cobrança',
        description: error.message,
      });
    },
  });
}

export function useUpdateCobranca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Cobranca> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('cobrancas')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cobrancas'] });
      queryClient.invalidateQueries({ queryKey: ['cobranca', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast({ title: 'Cobrança atualizada!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar cobrança',
        description: error.message,
      });
    },
  });
}

export function useDeleteCobranca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cobrancas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobrancas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast({ title: 'Cobrança excluída!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir cobrança',
        description: error.message,
      });
    },
  });
}
