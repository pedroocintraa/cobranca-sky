
# Plano: Corrigir Edge Functions e Configuracao

## Problema Identificado

A function `disparar-fila-cobranca` falha ao ser chamada sem body JSON porque tenta fazer `req.json()` incondicionalmente. Alem disso, as novas functions nao estao no `config.toml`.

## Arquivos a Modificar

### 1. supabase/functions/disparar-fila-cobranca/index.ts

**Problema**: Linha 24 faz `await req.json()` sem verificar se ha body

**Correcao**: Adicionar tratamento para body vazio ou inexistente

```typescript
// ANTES (linha 24):
const { regraId } = await req.json();

// DEPOIS:
let regraId = null;
try {
  const body = await req.text();
  if (body) {
    const parsed = JSON.parse(body);
    regraId = parsed.regraId ?? null;
  }
} catch {
  // Body vazio ou invalido - usar regraId = null (fila critica)
}
```

### 2. supabase/config.toml

Adicionar configuracao para as novas edge functions:

```toml
[functions.popular-filas-cobranca]
verify_jwt = false

[functions.disparar-fila-cobranca]
verify_jwt = false
```

---

## Resultado Esperado

- A function `disparar-fila-cobranca` aceitara chamadas com ou sem body
- Chamada sem body = disparo da fila critica (regra_id = null)
- Chamada com `{ "regraId": "uuid" }` = disparo da fila especifica
- Todas as functions estarao configuradas corretamente

---

## Detalhes Tecnicos

### Fluxo de Disparo

1. `popular-filas-cobranca` - Adiciona faturas as filas baseado nas regras ativas
2. `disparar-fila-cobranca` - Envia mensagens WhatsApp para itens pendentes na fila
3. `historico_cobranca` - Registra cada envio para evitar duplicatas

### Teste Pos-Correcao

Apos as correcoes, testar:
1. Chamar `POST /disparar-fila-cobranca` sem body (fila critica)
2. Chamar `POST /disparar-fila-cobranca` com `{ "regraId": null }` (fila critica)
3. Chamar `POST /disparar-fila-cobranca` com `{ "regraId": "uuid-da-regra" }` (fila especifica)
