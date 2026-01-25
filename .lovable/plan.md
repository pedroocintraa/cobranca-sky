

# Plano: Sistema de Faturas Mensais com Histórico Completo

## Entendimento do Problema

### Modelo Atual (incorreto para seu caso)
- Uma cobrança por cliente/proposta
- Ao importar novo mês, **atualiza** a cobrança existente
- Perde o histórico dos meses anteriores

### Modelo Desejado
- Múltiplas faturas por cliente/proposta (uma por mês)
- Ao importar novo mês, **cria nova fatura**
- Mantém histórico completo de pagamentos/inadimplência

## Mudanças Necessárias

### 1. Adicionar campo `mes_referencia` na tabela `cobrancas`

Este campo armazenará o mês/ano de referência da fatura (formato: YYYY-MM).

```sql
ALTER TABLE cobrancas 
ADD COLUMN mes_referencia VARCHAR(7);

-- Preencher baseado na data_vencimento existente
UPDATE cobrancas 
SET mes_referencia = TO_CHAR(data_vencimento, 'YYYY-MM');
```

### 2. Alterar lógica de importação

**Identificador único passa a ser: CPF + Proposta + Mês/Ano**

```text
Antes (lógica atual):
  Busca: CPF + Proposta
  Se existe → UPDATE
  Se não existe → INSERT

Depois (nova lógica):
  Busca: CPF + Proposta + Mês/Ano
  Se existe no mesmo mês → UPDATE (reimportação)
  Se não existe para esse mês → INSERT (nova fatura)
```

### 3. Criar faturas retroativas na primeira importação

Ao importar a planilha de um novo cliente, podemos criar automaticamente as faturas dos meses anteriores (se desejado). Por exemplo:
- Importa planilha 01/2026
- Sistema cria faturas de 11/2025, 12/2025, 01/2026

**Ou**: Fazer isso manualmente via script único para os dados atuais.

### 4. Atualizar página de Cobranças

Adicionar:
- Filtro por mês de referência
- Visualização do histórico de faturas por cliente
- Indicador visual do mês

### 5. Atualizar Edge Function

Ajustar a lógica para considerar apenas faturas do mês atual ao atualizar status.

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migration SQL | Criar | Adicionar coluna `mes_referencia` |
| `src/pages/Importar.tsx` | Editar | Nova lógica: CPF + Proposta + Mês |
| `src/pages/Cobrancas.tsx` | Editar | Filtro por mês, exibir mês referência |
| `supabase/functions/atualizar-status-cobrancas/index.ts` | Editar | Considerar mês atual |
| Migration SQL | Criar | Script para criar faturas retroativas |

## Nova Lógica de Importação

```text
Para cada linha da planilha:

1. Extrair CPF, Proposta, Data Vencimento
2. Calcular mes_referencia (ex: "2026-01")
3. Buscar cobrança existente com:
   - Mesmo CPF
   - Mesma Proposta
   - Mesmo mes_referencia
   
4. Se encontrou (mesmo mês):
   → UPDATE (reimportação do mesmo mês)
   → Atualiza valor, status, etc.
   
5. Se não encontrou:
   → INSERT (nova fatura do mês)
   → Status = Pendente
```

## Fluxo Visual

```text
┌─────────────────────────────────────────────────────────────┐
│                Importar Planilha 01/2026                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│   Para cada linha:                                          │
│   CPF: 123.456.789-00 | Proposta: 5100199972                │
│   Data Vencimento: 27/01/2026                               │
│   → mes_referencia: 2026-01                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│   Buscar: CPF + Proposta + 2026-01                          │
│                                                             │
│   ┌─────────────┐         ┌──────────────────────────────┐  │
│   │ Existe?     │   NÃO   │ INSERT nova fatura           │  │
│   │ (2026-01)   │────────▶│ mes_referencia = "2026-01"   │  │
│   └─────────────┘         │ status = Pendente            │  │
│         │ SIM             └──────────────────────────────┘  │
│         ▼                                                   │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ UPDATE (reimportação do mesmo mês)                   │  │
│   │ Atualiza valor, mantém histórico                     │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Histórico de Faturas por Cliente

```text
Cliente: João Silva
Proposta: 5100199972

┌───────────────────────────────────────────────────────────────┐
│  Mês      │ Vencimento │  Valor   │  Status                   │
├───────────────────────────────────────────────────────────────┤
│  11/2025  │ 27/11/2025 │ R$ 150   │ ⚫ Atrasado               │
│  12/2025  │ 27/12/2025 │ R$ 150   │ ⚫ Atrasado               │
│  01/2026  │ 27/01/2026 │ R$ 150   │ 🟡 Pendente (vence em 2d) │
│  02/2026  │ 27/02/2026 │ R$ 150   │ 🟡 Pendente               │
└───────────────────────────────────────────────────────────────┘
```

## Script para Dados Existentes

Para os 45 clientes que já estão no banco com data 11/2025, precisamos criar as faturas dos meses 12/2025 e 01/2026.

**Opção A**: Executar script SQL único

```sql
-- Criar faturas de 12/2025 baseadas nas de 11/2025
INSERT INTO cobrancas (
  cliente_id, numero_proposta, valor, 
  data_vencimento, dia_vencimento, 
  mes_referencia, status_id
)
SELECT 
  cliente_id, 
  numero_proposta, 
  valor,
  data_vencimento + INTERVAL '1 month',
  dia_vencimento,
  '2025-12',
  (SELECT id FROM status_pagamento WHERE nome = 'Atrasado')
FROM cobrancas WHERE mes_referencia = '2025-11';

-- Repetir para 01/2026 (Pendente)
```

**Opção B**: Fazer via importação normal
- Importar planilha 12/2025
- Importar planilha 01/2026

## Alterações na UI de Cobranças

1. **Filtro por mês**: Dropdown para selecionar mês/ano
2. **Coluna "Mês Ref"**: Mostrar o mês de referência na tabela
3. **Visão por cliente**: Ao clicar no cliente, ver todas as faturas dele

## Comportamento Final

| Cenário | Ação |
|---------|------|
| Importa planilha 01/2026, cliente novo | Cria cliente + fatura 01/2026 |
| Importa planilha 01/2026, cliente existe, sem fatura 01/2026 | Cria fatura 01/2026 |
| Importa planilha 01/2026, cliente existe, já tem fatura 01/2026 | Atualiza fatura existente |
| Importa planilha 02/2026 | Cria novas faturas 02/2026 para todos |

## Resumo das Mudanças

1. **Banco**: Adicionar `mes_referencia` (VARCHAR 7)
2. **Importação**: Identificar por CPF + Proposta + Mês
3. **UI**: Mostrar mês referência, filtrar por mês
4. **Edge Function**: Atualizar apenas mês atual para Atrasado
5. **Migração**: Script para criar faturas retroativas dos dados existentes

