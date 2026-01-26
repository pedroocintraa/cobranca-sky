import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LoteCobranca, ItemLote, ClienteComFaturas, Fatura } from '@/types/database';
import { toast } from '@/hooks/use-toast';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Hook para buscar lotes de cobrança
export function useLotesCobranca() {
  return useQuery({
    queryKey: ['lotes-cobranca'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lotes_cobranca')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LoteCobranca[];
    },
  });
}

// Hook para buscar um lote específico com seus itens
export function useLoteCobranca(loteId: string | null) {
  return useQuery({
    queryKey: ['lote-cobranca', loteId],
    queryFn: async () => {
      if (!loteId) return null;

      const { data, error } = await supabase
        .from('lotes_cobranca')
        .select('*')
        .eq('id', loteId)
        .single();

      if (error) throw error;
      return data as LoteCobranca;
    },
    enabled: !!loteId,
  });
}

// Hook para buscar itens de um lote
export function useItensLote(loteId: string | null) {
  return useQuery({
    queryKey: ['itens-lote', loteId],
    queryFn: async () => {
      if (!loteId) return [];

      const { data, error } = await supabase
        .from('itens_lote')
        .select(`
          *,
          cliente:clientes(*),
          fatura:faturas(*, status:status_pagamento(*))
        `)
        .eq('lote_id', loteId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ItemLote[];
    },
    enabled: !!loteId,
  });
}

// Hook para buscar faturas em aberto agrupadas por cliente
export function useFaturasEmAberto(statusIds: string[]) {
  return useQuery({
    queryKey: ['faturas-em-aberto', statusIds],
    queryFn: async () => {
      if (statusIds.length === 0) return [];

      // Buscar faturas em aberto com cliente
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

      // Agrupar por cliente
      const clientesMap = new Map<string, ClienteComFaturas>();
      const hoje = new Date();

      for (const fatura of faturas || []) {
        const cliente = (fatura as any).cobranca?.cliente;
        if (!cliente) continue;

        if (!clientesMap.has(cliente.id)) {
          clientesMap.set(cliente.id, {
            cliente,
            faturas: [],
            totalFaturas: 0,
            valorTotal: 0,
            diasAtraso: 0,
            mesesAtrasados: [],
          });
        }

        const clienteData = clientesMap.get(cliente.id)!;
        clienteData.faturas.push(fatura as Fatura);
        clienteData.totalFaturas += 1;
        clienteData.valorTotal += fatura.valor || 0;

        const dataVencimento = parseISO(fatura.data_vencimento);
        const dias = differenceInDays(hoje, dataVencimento);
        if (dias > clienteData.diasAtraso) {
          clienteData.diasAtraso = dias;
        }

        const mesFormatado = format(dataVencimento, 'MMM/yyyy', { locale: ptBR });
        if (!clienteData.mesesAtrasados.includes(mesFormatado)) {
          clienteData.mesesAtrasados.push(mesFormatado);
        }
      }

      return Array.from(clientesMap.values()).sort((a, b) => b.diasAtraso - a.diasAtraso);
    },
    enabled: statusIds.length > 0,
  });
}

// Criar novo lote
export function useCreateLote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { nome: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from('lotes_cobranca')
        .insert([{ 
          nome: data.nome,
          created_by: user?.id,
          status: 'rascunho'
        }])
        .select()
        .single();

      if (error) throw error;
      return result as LoteCobranca;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotes-cobranca'] });
      toast({ title: 'Lote criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar lote',
        description: error.message,
      });
    },
  });
}

// Adicionar itens ao lote
export function useAddItensLote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ loteId, clientesFaturas }: { loteId: string; clientesFaturas: ClienteComFaturas[] }) => {
      const itens = clientesFaturas.flatMap(cf => 
        cf.faturas.map(fatura => ({
          lote_id: loteId,
          fatura_id: fatura.id,
          cliente_id: cf.cliente.id,
          telefone: cf.cliente.telefone || '',
          status_envio: 'pendente' as const,
        }))
      );

      const { error: insertError } = await supabase
        .from('itens_lote')
        .insert(itens);

      if (insertError) throw insertError;

      // Atualizar total de faturas no lote
      const { error: updateError } = await supabase
        .from('lotes_cobranca')
        .update({ 
          total_faturas: itens.length,
          status: 'rascunho'
        })
        .eq('id', loteId);

      if (updateError) throw updateError;

      return itens.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['lotes-cobranca'] });
      queryClient.invalidateQueries({ queryKey: ['itens-lote'] });
      toast({ title: `${count} itens adicionados ao lote!` });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar itens',
        description: error.message,
      });
    },
  });
}

// Atualizar status do lote
export function useUpdateLoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ loteId, status }: { loteId: string; status: LoteCobranca['status'] }) => {
      const updateData: Partial<LoteCobranca> = { status };
      
      if (status === 'aprovado') {
        const { data: { user } } = await supabase.auth.getUser();
        updateData.approved_by = user?.id || null;
        updateData.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('lotes_cobranca')
        .update(updateData)
        .eq('id', loteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotes-cobranca'] });
      queryClient.invalidateQueries({ queryKey: ['lote-cobranca'] });
      toast({ title: 'Status do lote atualizado!' });
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

// Atualizar mensagem de um item
export function useUpdateItemMensagem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, mensagem }: { itemId: string; mensagem: string }) => {
      const { error } = await supabase
        .from('itens_lote')
        .update({ mensagem_gerada: mensagem })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itens-lote'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar mensagem',
        description: error.message,
      });
    },
  });
}

// Deletar lote
export function useDeleteLote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (loteId: string) => {
      const { error } = await supabase
        .from('lotes_cobranca')
        .delete()
        .eq('id', loteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lotes-cobranca'] });
      toast({ title: 'Lote excluído!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir lote',
        description: error.message,
      });
    },
  });
}
