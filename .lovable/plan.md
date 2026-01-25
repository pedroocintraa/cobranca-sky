
# Plano: Conectar Todos os Dados ao Banco de Dados

## Situacao Atual

Analisei o codigo e identifiquei os seguintes problemas:

### Dados Estaticos Encontrados

| Componente | Problema | Status |
|------------|----------|--------|
| `OverviewChart` | Usa dados estaticos (Jan-Dez com valores fixos) | Precisa corrigir |
| `CustomersChart` | Tem fallback para dados estaticos, mas recebe `pieData` do Dashboard | Funcionando |
| `MetricCard` | Indicadores de variacao (12%, 8%, etc.) sao hardcoded | Precisa corrigir |
| `RecentCharges` | Ja recebe dados do banco via `useCobrancas` | Funcionando |
| Paginas Clientes/Cobrancas | Ja usam hooks com dados do banco | Funcionando |

### Dados Ja Funcionando

- `useDashboardMetrics()` - Calcula metricas corretamente do banco
- `useCobrancas()` - Busca cobrancas com cliente e status
- `useClientes()` - Busca clientes do banco
- `CustomersChart` - Recebe `pieData` calculado das metricas reais

---

## Mudancas Necessarias

### 1. OverviewChart - Dados Mensais do Banco

**Problema**: O grafico de barras mostra valores estaticos (4000, 3000, 5000...).

**Solucao**: 
- Criar hook `useMonthlyMetrics()` que agrupa cobrancas por mes
- Passar dados reais para o componente
- Manter fallback para quando nao ha dados

**Arquivo**: `src/hooks/useCobrancas.tsx`
```text
Adicionar funcao useMonthlyMetrics():
- Busca cobrancas do ano atual
- Agrupa por mes usando data_vencimento
- Retorna array { month: 'Jan', value: soma_valores }
```

**Arquivo**: `src/components/dashboard/OverviewChart.tsx`
```text
- Remover defaultData estatico
- Receber dados via props obrigatoriamente
- Mostrar estado vazio quando sem dados
```

**Arquivo**: `src/pages/Dashboard.tsx`
```text
- Importar useMonthlyMetrics
- Passar dados para OverviewChart
```

### 2. MetricCard - Remover Indicadores Estaticos

**Problema**: Os percentuais de variacao (12%, 8%, 5%, 3%) sao valores fixos.

**Solucao**: 
- Remover prop `change` dos MetricCards por enquanto
- OU calcular variacao real comparando com mes anterior (mais complexo)

**Opcao Escolhida**: Remover os indicadores estaticos para nao mostrar dados falsos.

**Arquivo**: `src/pages/Dashboard.tsx`
```text
- Remover prop change={{ value: X, type: 'increase/decrease' }}
- Cards mostrarao apenas o valor atual (que e real)
```

### 3. CustomersChart - Melhorar Fallback

**Problema**: Quando nao ha dados, mostra percentuais estaticos.

**Solucao**:
- Mostrar estado vazio quando `pieData` for undefined
- Remover `defaultData` estatico

**Arquivo**: `src/components/dashboard/CustomersChart.tsx`
```text
- Remover defaultData
- Adicionar estado vazio quando data undefined/vazio
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useCobrancas.tsx` | Adicionar `useMonthlyMetrics()` |
| `src/components/dashboard/OverviewChart.tsx` | Remover dados estaticos, adicionar estado vazio |
| `src/components/dashboard/CustomersChart.tsx` | Remover defaultData, adicionar estado vazio |
| `src/pages/Dashboard.tsx` | Usar `useMonthlyMetrics`, remover indicadores estaticos |

---

## Detalhes Tecnicos

### Hook useMonthlyMetrics

```text
export function useMonthlyMetrics() {
  return useQuery({
    queryKey: ['monthly-metrics'],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      
      // Busca cobrancas do ano
      const { data, error } = await supabase
        .from('cobrancas')
        .select('valor, data_vencimento')
        .gte('data_vencimento', startDate)
        .lte('data_vencimento', endDate);

      // Agrupa por mes
      const monthlyData = Array(12).fill(0);
      data?.forEach(c => {
        const month = new Date(c.data_vencimento).getMonth();
        monthlyData[month] += Number(c.valor) || 0;
      });

      // Retorna no formato esperado pelo grafico
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return months.map((month, i) => ({ month, value: monthlyData[i] }));
    },
  });
}
```

### Estado Vazio nos Graficos

```text
// OverviewChart quando sem dados
<div className="flex items-center justify-center h-[280px]">
  <p className="text-muted-foreground">Nenhuma cobranca registrada</p>
</div>

// CustomersChart quando sem dados  
<div className="flex items-center justify-center h-[280px]">
  <p className="text-muted-foreground">Sem dados para exibir</p>
</div>
```

---

## Resultado Esperado

- Dashboard mostra valores reais do banco de dados
- Graficos exibem dados baseados em cobrancas reais
- Estados vazios claros quando nao ha dados
- Sem valores falsos ou estaticos exibidos ao usuario
- Sistema pronto para receber e exibir dados conforme forem cadastrados
