import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ConfiguracaoWebhooks, InstanciaWhatsApp } from '@/types/database';
import { toast } from '@/hooks/use-toast';

// ============= Hooks para Configurações de Webhooks =============

export function useConfiguracaoWebhooks() {
  return useQuery({
    queryKey: ['configuracao-webhooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracoes_webhooks')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ConfiguracaoWebhooks | null;
    },
  });
}

export function useSaveConfiguracaoWebhooks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<ConfiguracaoWebhooks>) => {
      const { data: existing } = await supabase
        .from('configuracoes_webhooks')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Atualizar existente
        const { data, error } = await supabase
          .from('configuracoes_webhooks')
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
          .from('configuracoes_webhooks')
          .insert([{ ...config, created_by: user?.id }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracao-webhooks'] });
      toast({ title: 'Configurações de webhooks salvas com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar configurações',
        description: error.message,
      });
    },
  });
}

// ============= Hooks para Instâncias WhatsApp =============

export function useInstanciasWhatsApp() {
  return useQuery({
    queryKey: ['instancias-whatsapp'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instancias_whatsapp')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InstanciaWhatsApp[];
    },
  });
}

export function useInstanciaWhatsAppAtiva() {
  return useQuery({
    queryKey: ['instancia-whatsapp-ativa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instancias_whatsapp')
        .select('*')
        .eq('status', 'conectada')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as InstanciaWhatsApp | null;
    },
  });
}

export function useCriarInstancia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nome, webhookUrl }: { nome: string; webhookUrl: string }) => {
      // Chamar webhook para criar instância
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nome }),
      });

      const resposta = await response.json();

      if (!response.ok) {
        throw new Error(resposta.message || resposta.error || 'Erro ao criar instância');
      }

      // Extrair dados da resposta - pode ser array ou objeto
      const dados = Array.isArray(resposta) ? resposta[0] : resposta;
      
      // Mapear status corretamente - o webhook retorna status como objeto
      // Precisamos converter para o enum do banco: 'criada', 'conectada', 'desconectada', 'erro'
      let statusBanco: 'criada' | 'conectada' | 'desconectada' | 'erro' = 'criada';
      
      if (dados.instance?.status === 'connected' || dados.status?.connected === true) {
        statusBanco = 'conectada';
      } else if (dados.instance?.status === 'disconnected' || dados.status?.connected === false) {
        statusBanco = 'criada'; // Instância criada mas não conectada
      }

      // Salvar instância no banco
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('instancias_whatsapp')
        .insert([{
          nome: dados.name || dados.instance?.name || nome,
          token: dados.token || dados.instance?.token || '',
          id_instance: dados.instance?.id || null,
          telefone: null, // Será preenchido quando conectar
          status: statusBanco,
          qrcode: dados.qrcode || dados.instance?.qrcode || null,
          resposta_criacao: resposta, // Salvar resposta completa
          created_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        instancia: data,
        resposta: {
          success: true,
          ...dados,
        },
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instancias-whatsapp'] });
      queryClient.invalidateQueries({ queryKey: ['instancia-whatsapp-ativa'] });
      toast({ title: 'Instância criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar instância',
        description: error.message,
      });
    },
  });
}

export function useConectarInstancia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ instanciaId, token, webhookUrl }: { instanciaId: string; token: string; webhookUrl: string }) => {
      // Chamar webhook para conectar instância
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const resposta = await response.json();

      if (!response.ok) {
        throw new Error(resposta.message || resposta.error || 'Erro ao conectar instância');
      }

      // Extrair dados da resposta - pode ser array ou objeto
      const dados = Array.isArray(resposta) ? resposta[0] : resposta;

      // Mapear status corretamente
      let statusBanco: 'criada' | 'conectada' | 'desconectada' | 'erro' = 'criada';
      
      if (dados.instance?.status === 'connected' || dados.status?.connected === true || dados.status?.loggedIn === true) {
        statusBanco = 'conectada';
      } else if (dados.instance?.status === 'disconnected' || dados.status?.connected === false) {
        statusBanco = 'desconectada';
      }

      // Atualizar instância no banco
      const { data, error } = await supabase
        .from('instancias_whatsapp')
        .update({
          status: statusBanco,
          qrcode: dados.qrcode || dados.instance?.qrcode || null,
          resposta_conexao: resposta,
        })
        .eq('id', instanciaId)
        .select()
        .single();

      if (error) throw error;

      return {
        instancia: data,
        resposta: {
          success: true,
          ...dados,
        },
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instancias-whatsapp'] });
      queryClient.invalidateQueries({ queryKey: ['instancia-whatsapp-ativa'] });
      toast({ title: 'Instância conectada!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao conectar instância',
        description: error.message,
      });
    },
  });
}

export function useDeleteInstancia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('instancias_whatsapp')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instancias-whatsapp'] });
      queryClient.invalidateQueries({ queryKey: ['instancia-whatsapp-ativa'] });
      toast({ title: 'Instância excluída!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir instância',
        description: error.message,
      });
    },
  });
}
