
# Plano: Reestruturação para Cobrança Única com Histórico de Faturas

## Resumo da Mudança

Atualmente temos **135 registros** na tabela `cobrancas` (45 clientes x 3 meses). A proposta é:

- **Uma cobrança por cliente/proposta** (voltamos aos 45 registros)
- **Nova tabela `faturas`** para armazenar o histórico mensal
- Na lista de cobranças, mostrar a **fatura mais antiga em aberto**
- Modal popup para ver **todas as faturas** do cliente

## Nova Estrutura de Dados

```text
COBRANCAS (tabela principal - 1 por cliente/proposta)
├── id, cliente_id, numero_proposta
├── valor_mensal (valor padrão da fatura)
├── dia_vencimento (dia fixo do mês)
├── mes_referencia (mês da primeira fatura - 2025-11)
├── data_instalacao
└── observacoes

FATURAS (tabela de histórico - N por cobrança)
├── id, cobranca_id (FK)
├── mes_referencia (2025-11, 2025-12, 2026-01...)
├── data_vencimento (calculada: dia + mês)
├── valor
├── status_id (FK status_pagamento)
├── data_pagamento (quando foi pago)
└── observacoes
```

## Fluxo Visual

```text
┌────────────────────────────────────────────────────────────────────┐
│                    LISTA DE COBRANÇAS                              │
├────────────────────────────────────────────────────────────────────┤
│ Cliente          │ Proposta    │ Fatura Pendente │ Valor  │ Ação   │
├────────────────────────────────────────────────────────────────────┤
│ João Silva       │ 5100199972  │ 11/2025 (Atr)   │ R$ 150 │ [Ver]  │
│ Maria Santos     │ 5100203092  │ 12/2025 (Atr)   │ R$ 200 │ [Ver]  │
│ Pedro Costa      │ 5100204187  │ 01/2026 (Pend)  │ R$ 180 │ [Ver]  │
└────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Clica em "Ver"
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│              MODAL: Histórico de Faturas                           │
│              Cliente: João Silva - Proposta: 5100199972            │
├────────────────────────────────────────────────────────────────────┤
│ Mês       │ Vencimento  │ Valor   │ Status    │ Ação               │
├────────────────────────────────────────────────────────────────────┤
│ 11/2025   │ 27/11/2025  │ R$ 150  │ Atrasado  │ [Marcar Pago]      │
│ 12/2025   │ 27/12/2025  │ R$ 150  │ Atrasado  │ [Marcar Pago]      │
│ 01/2026   │ 27/01/2026  │ R$ 150  │ Pendente  │ [Marcar Pago]      │
│ 02/2026   │ 27/02/2026  │ R$ 150  │ Pendente  │ [Marcar Pago]      │
└────────────────────────────────────────────────────────────────────┘
```

## Mudanças Necessárias

### 1. Banco de Dados

**Criar tabela `faturas`:**
```sql
CREATE TABLE faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cobranca_id UUID NOT NULL REFERENCES cobrancas(id) ON DELETE CASCADE,
  mes_referencia VARCHAR(7) NOT NULL,
  data_vencimento DATE NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  status_id UUID REFERENCES status_pagamento(id),
  data_pagamento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cobranca_id, mes_referencia)
);
```

**Migrar dados existentes:**
- Consolidar cobranças duplicadas em uma por cliente/proposta
- Mover dados mensais para a tabela `faturas`

**Atualizar tabela `cobrancas`:**
- Remover `mes_referencia` (agora fica na fatura)
- Manter `dia_vencimento` e `valor` como padrão mensal

### 2. Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migration SQL | Criar | Criar tabela `faturas` com RLS |
| Migration SQL | Criar | Migrar dados existentes |
| `src/types/database.ts` | Editar | Adicionar tipo `Fatura` |
| `src/hooks/useFaturas.tsx` | Criar | Hook para CRUD de faturas |
| `src/hooks/useCobrancas.tsx` | Editar | Ajustar queries para nova estrutura |
| `src/pages/Cobrancas.tsx` | Editar | Mostrar fatura mais antiga, adicionar modal |
| `src/components/FaturasModal.tsx` | Criar | Modal com histórico de faturas |
| `src/pages/Importar.tsx` | Editar | Nova lógica de importação |
| `supabase/functions/atualizar-status-cobrancas` | Editar | Atualizar faturas vencidas |

### 3. Nova Lógica de Importação

```text
Para cada linha da planilha:

1. Extrair CPF, Proposta, Data Vencimento
2. Calcular mes_referencia (ex: "2026-01")

3. Buscar COBRANÇA existente:
   - Mesmo CPF + Mesma Proposta
   
4. Se COBRANÇA não existe:
   → Criar cliente (se necessário)
   → INSERT cobrança principal
   → INSERT primeira fatura

5. Se COBRANÇA existe:
   → Buscar FATURA do mes_referencia
   
   5a. Se FATURA do mês não existe:
       → INSERT nova fatura
       
   5b. Se FATURA do mês existe:
       → UPDATE fatura (reimportação)
```

### 4. Modal de Histórico

O modal exibirá:
- Cabeçalho com nome do cliente e proposta
- Lista de todas as faturas ordenadas por mês
- Cada fatura com:
  - Mês de referência
  - Data de vencimento
  - Valor
  - Status (badge colorido)
  - Botão para marcar como pago (abre seletor de data)
- Totalizador: valor em aberto vs valor pago

### 5. Edge Function Atualizada

A função `atualizar-status-cobrancas` será ajustada para:
- Buscar na tabela `faturas` (não mais em `cobrancas`)
- Atualizar status para "Atrasado" apenas faturas vencidas
- Ignorar faturas já pagas ou canceladas

## Comportamento Final

| Cenário | Ação |
|---------|------|
| Importa planilha, cliente novo | Cria cliente + cobrança + fatura do mês |
| Importa planilha, cliente existe, mês novo | Cria fatura do mês |
| Importa planilha, cliente existe, mesmo mês | Atualiza fatura existente |
| Pagar fatura | Modal permite escolher qual fatura pagar |
| Listar cobranças | Mostra 1 linha por cliente com fatura mais antiga pendente |

## Sequência de Implementação

1. Criar tabela `faturas` com RLS
2. Migrar dados de `cobrancas` para `faturas`
3. Atualizar tipos TypeScript e hooks
4. Criar componente `FaturasModal`
5. Atualizar página de Cobranças
6. Atualizar lógica de Importação
7. Atualizar Edge Function
8. Testar fluxo completo

## Detalhes Técnicos

### Tipos TypeScript

```typescript
// Novo tipo para Fatura
export interface Fatura {
  id: string;
  cobranca_id: string;
  mes_referencia: string;
  data_vencimento: string;
  valor: number;
  status_id: string | null;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  status?: StatusPagamento;
}

// Cobrança atualizada
export interface Cobranca {
  id: string;
  cliente_id: string;
  numero_proposta: string | null;
  valor: number; // valor mensal padrão
  dia_vencimento: number | null;
  data_instalacao: string | null;
  observacoes: string | null;
  // ... outros campos
  cliente?: Cliente;
  faturas?: Fatura[]; // relacionamento
  fatura_pendente?: Fatura; // fatura mais antiga em aberto
}
```

### Query para Lista de Cobranças

A query buscará cada cobrança com a fatura mais antiga não paga:

```sql
SELECT 
  c.*,
  cliente:clientes(*),
  faturas:faturas(
    *,
    status:status_pagamento(*)
  )
FROM cobrancas c
ORDER BY c.cliente.nome
```

No frontend, filtraremos para mostrar apenas a fatura mais antiga pendente.

### RLS para tabela `faturas`

```sql
-- Mesmas políticas da cobrancas
CREATE POLICY "Authenticated users can view faturas"
ON faturas FOR SELECT USING (is_authenticated_user());

CREATE POLICY "Authenticated users can insert faturas"
ON faturas FOR INSERT WITH CHECK (is_authenticated_user());

CREATE POLICY "Authenticated users can update faturas"
ON faturas FOR UPDATE USING (is_authenticated_user());

CREATE POLICY "Admin can delete faturas"
ON faturas FOR DELETE USING (is_admin());
```

