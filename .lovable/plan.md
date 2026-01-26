
# Plano: Tempo de Disparo Configuravel pelo Usuario

## Visao Geral

O usuario podera definir livremente o tempo entre o envio de uma mensagem e outra, em segundos. Isso permite configuracoes como 30 segundos, 60 segundos, 300 segundos (5 minutos), etc.

---

## Situacao Atual

O tempo entre mensagens esta fixo em 1 segundo no codigo:

```typescript
// supabase/functions/processar-lote/index.ts - Linha 118
await delay(1000); // 1 segundo fixo
```

---

## Solucao Proposta

### Interface de Configuracao

```text
+----------------------------------------------------------+
|  CONFIGURACOES DE ENVIO                                  |
|                                                          |
|  Intervalo entre mensagens (segundos):                   |
|  +------------------+                                    |
|  |       30         |  segundos                          |
|  +------------------+                                    |
|                                                          |
|  Exemplos: 30s = 2 msg/min | 60s = 1 msg/min            |
|            300s (5min) = 12 msg/hora                     |
+----------------------------------------------------------+
```

O usuario digita o valor desejado em segundos (minimo 1 segundo).

---

## Arquivos a Modificar

### 1. Migracao SQL

Adicionar coluna `intervalo_envio_segundos` na tabela `configuracoes_cobranca`:

```sql
ALTER TABLE public.configuracoes_cobranca 
ADD COLUMN IF NOT EXISTS intervalo_envio_segundos INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.configuracoes_cobranca.intervalo_envio_segundos 
IS 'Intervalo em segundos entre o envio de cada mensagem';
```

### 2. Edge Function: processar-lote/index.ts

Modificar para:
- Buscar a configuracao `intervalo_envio_segundos` do banco
- Converter para milissegundos e usar no delay

```typescript
// Buscar configuracao de intervalo
const { data: config } = await supabase
  .from("configuracoes_cobranca")
  .select("intervalo_envio_segundos")
  .limit(1)
  .maybeSingle();

// Converter segundos para milissegundos (padrao 1 segundo)
const intervaloMs = (config?.intervalo_envio_segundos || 1) * 1000;

// No loop de envio
await delay(intervaloMs);
```

### 3. Hook: useAgendamentoCobranca.tsx

Adicionar `intervalo_envio_segundos` ao tipo e a mutacao:

```typescript
export interface ConfiguracaoCobranca {
  // ... campos existentes
  intervalo_envio_segundos: number;
}
```

### 4. Componente: AgendamentoCard.tsx

Adicionar Input numerico para configurar o intervalo:

```tsx
<div className="space-y-2">
  <Label htmlFor="intervalo">Intervalo entre mensagens (segundos)</Label>
  <Input
    id="intervalo"
    type="number"
    min={1}
    max={3600}
    value={intervaloSegundos}
    onChange={(e) => setIntervaloSegundos(parseInt(e.target.value) || 1)}
  />
  <p className="text-xs text-muted-foreground">
    Tempo de espera entre cada mensagem enviada
  </p>
</div>
```

---

## Exemplos de Configuracao

| Intervalo | Mensagens/Min | Mensagens/Hora | Uso Sugerido |
|-----------|---------------|----------------|--------------|
| 1 segundo | 60 | 3.600 | Alto volume, risco maior |
| 30 segundos | 2 | 120 | Volume moderado |
| 60 segundos | 1 | 60 | Conservador |
| 300 segundos (5 min) | 0.2 | 12 | Muito conservador |

---

## Validacoes

- **Minimo**: 1 segundo (evitar sobrecarga)
- **Maximo**: 3600 segundos (1 hora) - valores maiores nao fazem sentido pratico
- **Padrao**: 1 segundo (comportamento atual)

---

## Sequencia de Implementacao

1. Criar migracao SQL para adicionar coluna `intervalo_envio_segundos`
2. Atualizar tipo `ConfiguracaoCobranca` no hook
3. Modificar `AgendamentoCard` com campo de input numerico
4. Atualizar mutacao para salvar o novo campo
5. Modificar Edge Function `processar-lote` para usar o valor configurado
6. Deploy das funcoes

---

## Resultado Esperado

O usuario podera:
1. Acessar a aba de Agendamento Automatico
2. Configurar o intervalo desejado em segundos (ex: 30, 60, 300)
3. Salvar a configuracao
4. Quando um lote for processado, cada mensagem respeitara o intervalo configurado
