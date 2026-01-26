import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ConfiguracaoCobranca {
  id: string;
  cron_expression: string;
  hora: string;
  dias_semana: number[];
  dias_atraso_minimo: number;
  incluir_atrasados: boolean;
  incluir_pendentes: boolean;
  filtro_numero_fatura: number[];
  intervalo_envio_segundos: number;
  ativo: boolean;
  ultima_execucao: string | null;
  proxima_execucao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Hook para buscar configuração de agendamento
export function useConfiguracaoCobranca() {
  return useQuery({
    queryKey: ['configuracao-cobranca'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_cobranca')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ConfiguracaoCobranca | null;
    },
  });
}

// Hook para salvar/atualizar configuração
export function useSaveConfiguracaoCobranca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<ConfiguracaoCobranca>) => {
      const { data: existing } = await supabase
        .from('configuracoes_cobranca')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Atualizar existente
        const { data, error } = await supabase
          .from('configuracoes_cobranca')
          .update(config)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Criar nova
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from('configuracoes_cobranca')
          .insert([{ ...config, created_by: user?.id }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracao-cobranca'] });
      toast({ title: 'Configuração salva com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar configuração',
        description: error.message,
      });
    },
  });
}

// Hook para gerar lote automaticamente
export function useGerarLoteAutomatico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      diasAtrasoMinimo?: number;
      incluirPendentes?: boolean;
      incluirAtrasados?: boolean;
      filtroNumeroFatura?: number[];
    }) => {
      const { data, error } = await supabase.functions.invoke('gerar-lote-automatico', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lotes-cobranca'] });
      if (data.success) {
        toast({ title: data.message });
      } else {
        toast({ 
          variant: 'destructive', 
          title: 'Nenhum lote criado', 
          description: data.message 
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar lote',
        description: error.message,
      });
    },
  });
}

// Hook para executar CRON manualmente
export function useExecutarCronCobranca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('executar-cron-cobranca', {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lotes-cobranca'] });
      queryClient.invalidateQueries({ queryKey: ['configuracao-cobranca'] });
      toast({ title: data.message });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao executar CRON',
        description: error.message,
      });
    },
  });
}

// Helper para gerar expressão CRON
export function gerarCronExpression(hora: string, diasSemana: number[]): string {
  const [h, m] = hora.split(':').map(Number);
  const dias = diasSemana.sort().join(',');
  return `${m} ${h} * * ${dias}`;
}

// Helper para formatar dias da semana
export function formatarDiasSemana(dias: number[]): string {
  const nomes: Record<number, string> = {
    0: 'Dom',
    1: 'Seg',
    2: 'Ter',
    3: 'Qua',
    4: 'Qui',
    5: 'Sex',
    6: 'Sáb',
  };
  return dias.map(d => nomes[d] || '').filter(Boolean).join(', ');
}
