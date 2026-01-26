
# Plano: Dashboard de Relatórios e Geração Automática de Lotes

## Visão Geral

Este plano implementa duas funcionalidades principais:
1. **Dashboard de Relatórios**: Estatísticas detalhadas de cobranças com visualizações gráficas
2. **Geração Automática de Lotes**: Sistema que cria lotes automaticamente para aprovação do usuário

---

## 1. Dashboard de Relatórios de Cobrança

### Layout da Nova Seção

A página de Cobrança Automática ganhará uma nova aba "Relatórios" com as seguintes visualizações:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Cobrança Automática                                                    │
│  [Lotes] [Relatórios]                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  MÉTRICAS DE ENVIO                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ Total Envios │ │ Taxa Sucesso │ │ Taxa Falha   │ │ Msg/Mês      │   │
│  │    245       │ │    92.3%     │ │    7.7%      │ │    82        │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                                         │
│  ┌────────────────────────────────────┐ ┌──────────────────────────┐   │
│  │ EVOLUÇÃO MENSAL DE COBRANÇAS       │ │ TOP 10 INADIMPLENTES     │   │
│  │                                    │ │                          │   │
│  │  [Gráfico de barras com envios,    │ │ 1. João Silva            │   │
│  │   sucessos e falhas por mês]       │ │    5 faturas - R$ 750    │   │
│  │                                    │ │ 2. Maria Santos          │   │
│  │                                    │ │    4 faturas - R$ 600    │   │
│  │                                    │ │ 3. Pedro Costa           │   │
│  │                                    │ │    3 faturas - R$ 450    │   │
│  └────────────────────────────────────┘ └──────────────────────────┘   │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ HISTÓRICO DE MENSAGENS RECENTES                                   │ │
│  ├───────────────────────────────────────────────────────────────────┤ │
│  │ Cliente       │ Data       │ Tipo      │ Status    │ Ações       │ │
│  │ João Silva    │ 25/01/2026 │ Cobrança  │ ✅ Enviado │ [Ver]       │ │
│  │ Maria Santos  │ 25/01/2026 │ Cobrança  │ ❌ Falha   │ [Ver]       │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Métricas a Exibir

| Métrica | Descrição | Fonte |
|---------|-----------|-------|
| Total de Envios | Soma de todas as mensagens enviadas | `itens_lote` (status = enviado) |
| Taxa de Sucesso | % de envios bem-sucedidos | `lotes_cobranca` (total_sucesso / total_enviados) |
| Taxa de Falha | % de envios com falha | `lotes_cobranca` (total_falha / total_enviados) |
| Mensagens/Mês | Média de mensagens por mês | Agregação por mês |
| Top Inadimplentes | Clientes com mais faturas em aberto | `faturas` + `clientes` agrupado |
| Evolução Mensal | Gráfico de envios por mês | `lotes_cobranca` agrupado por mês |

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/components/cobranca/RelatoriosTab.tsx` | Componente principal da aba de relatórios |
| `src/components/cobranca/EnviosChart.tsx` | Gráfico de evolução mensal de envios |
| `src/components/cobranca/TopInadimplentes.tsx` | Lista dos clientes mais inadimplentes |
| `src/components/cobranca/HistoricoMensagens.tsx` | Tabela com histórico de mensagens |
| `src/hooks/useRelatoriosCobranca.tsx` | Hooks para buscar dados dos relatórios |

---

## 2. Geração Automática de Lotes

### Funcionamento

O sistema irá gerar lotes automaticamente baseado em regras pré-definidas:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     GERAÇÃO AUTOMÁTICA DE LOTES                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   CONFIGURAÇÕES                        LOTE GERADO AUTOMATICAMENTE      │
│   ┌─────────────────────────┐          ┌─────────────────────────┐     │
│   │ Frequência: [Diária ▼]  │    =>    │ Nome: Cobrança 26/01    │     │
│   │ Horário: [08:00]        │          │ Status: Aguardando      │     │
│   │ Dias Atraso Min: [7]    │          │ Faturas: 45             │     │
│   │ Incluir:                │          │ [Revisar] [Aprovar]     │     │
│   │   [✓] Atrasados         │          └─────────────────────────┘     │
│   │   [ ] Pendentes         │                                          │
│   └─────────────────────────┘                                          │
│                                                                         │
│   [Salvar Configuração]  [Gerar Lote Agora]                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Duas Opções de Geração

1. **Botão "Gerar Lote Automático"**: Gera um lote imediatamente com todas as faturas em aberto
2. **Agendamento com CRON**: Gera lotes automaticamente em dias/horários configurados

### Edge Function: gerar-lote-automatico

Nova função que:
- Busca todas as faturas com status "Pendente" ou "Atrasado"
- Agrupa por cliente
- Cria um novo lote com nome automático (ex: "Cobrança Automática 26/01/2026")
- Adiciona todos os itens ao lote
- Gera as mensagens com IA automaticamente
- Define status como "aguardando_aprovacao"
- Retorna o ID do lote criado

### Fluxo de Geração Automática

```text
1. Trigger (Botão ou CRON)
        │
        ▼
2. Edge Function: gerar-lote-automatico
   ├── Buscar faturas em aberto (Pendente/Atrasado)
   ├── Filtrar por dias de atraso mínimo (configurável)
   ├── Agrupar por cliente
   ├── Criar lote_cobranca com nome automático
   ├── Inserir itens_lote para cada fatura
   ├── Chamar gerar-mensagem para cada item
   └── Atualizar status para "aguardando_aprovacao"
        │
        ▼
3. Notificação na UI
   └── "Novo lote gerado automaticamente - 45 faturas aguardando aprovação"
        │
        ▼
4. Admin revisa e aprova
   └── Sistema dispara as mensagens
```

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/gerar-lote-automatico/index.ts` | Edge Function para gerar lotes |
| `src/components/cobranca/GeracaoAutomaticaCard.tsx` | Card com botão e configurações |

### Modificações

| Arquivo | Modificação |
|---------|-------------|
| `src/pages/CobrancaAutomatica.tsx` | Adicionar tabs (Lotes/Relatórios) e botão de geração automática |
| `src/hooks/useLotesCobranca.tsx` | Adicionar hook `useGerarLoteAutomatico` |
| `supabase/config.toml` | Adicionar nova função |

---

## Detalhes Técnicos

### Hook: useRelatoriosCobranca

```typescript
// Métricas agregadas de envio
export function useMetricasEnvio() {
  // Buscar de lotes_cobranca e itens_lote
  // Calcular totais e taxas
}

// Top clientes inadimplentes
export function useTopInadimplentes(limit: number = 10) {
  // Buscar faturas em aberto agrupadas por cliente
  // Ordenar por valor total desc
}

// Evolução mensal de envios
export function useEvolucaoMensal() {
  // Buscar lotes_cobranca agrupados por mês
  // Somar total_enviados, total_sucesso, total_falha
}

// Histórico de mensagens recentes
export function useHistoricoMensagens(limit: number = 20) {
  // Buscar de historico_mensagens com joins
}
```

### Edge Function: gerar-lote-automatico

```typescript
// Parâmetros opcionais
interface GerarLoteParams {
  diasAtrasoMinimo?: number;  // Default: 1
  incluirPendentes?: boolean; // Default: false
  incluirAtrasados?: boolean; // Default: true
  gerarMensagens?: boolean;   // Default: true
}

// Resposta
interface GerarLoteResponse {
  success: boolean;
  loteId?: string;
  totalFaturas: number;
  totalClientes: number;
  mensagem: string;
}
```

### Estrutura de Tabs na Página

```typescript
// CobrancaAutomatica.tsx com Tabs
<Tabs defaultValue="lotes">
  <TabsList>
    <TabsTrigger value="lotes">Lotes</TabsTrigger>
    <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
  </TabsList>
  
  <TabsContent value="lotes">
    {/* Conteúdo atual + botão Gerar Automático */}
  </TabsContent>
  
  <TabsContent value="relatorios">
    <RelatoriosTab />
  </TabsContent>
</Tabs>
```

---

## Sequência de Implementação

### Fase 1: Dashboard de Relatórios
1. Criar hook `useRelatoriosCobranca` com queries agregadas
2. Criar componente `TopInadimplentes` com lista de clientes
3. Criar componente `EnviosChart` com gráfico de barras (Recharts)
4. Criar componente `HistoricoMensagens` com tabela paginada
5. Criar componente `RelatoriosTab` que agrupa tudo
6. Modificar `CobrancaAutomatica.tsx` para usar Tabs

### Fase 2: Geração Automática
7. Criar Edge Function `gerar-lote-automatico`
8. Adicionar ao `supabase/config.toml`
9. Criar componente `GeracaoAutomaticaCard`
10. Adicionar hook `useGerarLoteAutomatico`
11. Integrar botão na página principal

---

## Exemplo de Visualização do Gráfico

O gráfico de evolução mensal mostrará:

```text
     Evolução Mensal de Cobranças
     
 100 │                              ██
     │                         ██   ██
  75 │                    ██   ██   ██
     │               ██   ██   ██   ██
  50 │          ██   ██   ██   ██   ██
     │     ██   ██   ██   ██   ██   ██
  25 │██   ██   ██   ██   ██   ██   ██
     │██   ██   ██   ██   ██   ██   ██
   0 └────────────────────────────────
     Jul  Ago  Set  Out  Nov  Dez  Jan
     
     ██ Enviados  ██ Sucesso  ██ Falha
```

---

## Resultado Esperado

Após a implementação, o usuário poderá:

1. **Ver estatísticas em tempo real** sobre a efetividade das cobranças
2. **Identificar clientes problemáticos** através do ranking de inadimplentes
3. **Acompanhar a evolução** dos envios mês a mês
4. **Gerar lotes com um clique** sem precisar selecionar faturas manualmente
5. **Apenas revisar e aprovar** os lotes gerados automaticamente

O fluxo de trabalho se torna muito mais simples:
- **Antes**: Criar lote → Selecionar faturas → Gerar mensagens → Aprovar → Disparar
- **Depois**: Clicar "Gerar Automático" → Revisar → Aprovar → Disparar
