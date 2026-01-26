import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Métricas agregadas de envios
export function useMetricasEnvio() {
  return useQuery({
    queryKey: ['metricas-envio'],
    queryFn: async () => {
      const { data: lotes, error } = await supabase
        .from('lotes_cobranca')
        .select('total_enviados, total_sucesso, total_falha, created_at');

      if (error) throw error;

      const totalEnviados = lotes?.reduce((sum, l) => sum + l.total_enviados, 0) || 0;
      const totalSucesso = lotes?.reduce((sum, l) => sum + l.total_sucesso, 0) || 0;
      const totalFalha = lotes?.reduce((sum, l) => sum + l.total_falha, 0) || 0;

      const taxaSucesso = totalEnviados > 0 ? (totalSucesso / totalEnviados) * 100 : 0;
      const taxaFalha = totalEnviados > 0 ? (totalFalha / totalEnviados) * 100 : 0;

      // Média por mês (últimos 6 meses)
      const hoje = new Date();
      const seisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
      const lotesRecentes = lotes?.filter(l => new Date(l.created_at) >= seisMesesAtras) || [];
      const mediaPorMes = lotesRecentes.length > 0 
        ? Math.round(lotesRecentes.reduce((sum, l) => sum + l.total_enviados, 0) / 6)
        : 0;

      return {
        totalEnviados,
        totalSucesso,
        totalFalha,
        taxaSucesso,
        taxaFalha,
        mediaPorMes,
      };
    },
  });
}

// Evolução mensal de envios
export function useEvolucaoMensal() {
  return useQuery({
    queryKey: ['evolucao-mensal'],
    queryFn: async () => {
      const { data: lotes, error } = await supabase
        .from('lotes_cobranca')
        .select('total_enviados, total_sucesso, total_falha, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Agrupar por mês
      const porMes = new Map<string, { enviados: number; sucesso: number; falha: number }>();

      for (const lote of lotes || []) {
        const data = new Date(lote.created_at);
        const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        
        if (!porMes.has(chave)) {
          porMes.set(chave, { enviados: 0, sucesso: 0, falha: 0 });
        }

        const atual = porMes.get(chave)!;
        atual.enviados += lote.total_enviados;
        atual.sucesso += lote.total_sucesso;
        atual.falha += lote.total_falha;
      }

      // Converter para array ordenado
      return Array.from(porMes.entries())
        .map(([mes, dados]) => ({
          mes,
          mesFormatado: formatarMes(mes),
          ...dados,
        }))
        .slice(-12); // Últimos 12 meses
    },
  });
}

// Top clientes inadimplentes
export function useTopInadimplentes(limit: number = 10) {
  return useQuery({
    queryKey: ['top-inadimplentes', limit],
    queryFn: async () => {
      // Buscar status "Atrasado" e "Pendente"
      const { data: statusList } = await supabase
        .from('status_pagamento')
        .select('id, nome')
        .in('nome', ['Atrasado', 'Pendente']);

      const statusIds = statusList?.map(s => s.id) || [];
      if (statusIds.length === 0) return [];

      // Buscar faturas em aberto
      const { data: faturas, error } = await supabase
        .from('faturas')
        .select(`
          id,
          valor,
          data_vencimento,
          cobranca:cobrancas(cliente:clientes(id, nome, telefone))
        `)
        .in('status_id', statusIds);

      if (error) throw error;

      // Agrupar por cliente
      const clientesMap = new Map<string, {
        id: string;
        nome: string;
        telefone: string | null;
        totalFaturas: number;
        valorTotal: number;
        diasAtraso: number;
      }>();

      const hoje = new Date();

      for (const fatura of faturas || []) {
        const cliente = (fatura as any).cobranca?.cliente;
        if (!cliente) continue;

        if (!clientesMap.has(cliente.id)) {
          clientesMap.set(cliente.id, {
            id: cliente.id,
            nome: cliente.nome,
            telefone: cliente.telefone,
            totalFaturas: 0,
            valorTotal: 0,
            diasAtraso: 0,
          });
        }

        const dados = clientesMap.get(cliente.id)!;
        dados.totalFaturas += 1;
        dados.valorTotal += fatura.valor || 0;

        const vencimento = new Date(fatura.data_vencimento);
        const dias = Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
        if (dias > dados.diasAtraso) {
          dados.diasAtraso = dias;
        }
      }

      // Ordenar por valor total (ou número de faturas)
      return Array.from(clientesMap.values())
        .sort((a, b) => b.totalFaturas - a.totalFaturas || b.valorTotal - a.valorTotal)
        .slice(0, limit);
    },
  });
}

// Histórico de mensagens recentes
export function useHistoricoMensagens(limit: number = 20) {
  return useQuery({
    queryKey: ['historico-mensagens', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historico_mensagens')
        .select(`
          id,
          mensagem,
          tipo,
          status,
          canal,
          created_at,
          cliente:clientes(id, nome, telefone),
          fatura:faturas(id, mes_referencia, valor)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
}

// Helper para formatar mês
function formatarMes(mesStr: string): string {
  const [ano, mes] = mesStr.split('-');
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[parseInt(mes) - 1]}/${ano.slice(-2)}`;
}
