

# Plano: Configurar CRON Job para Cobranca Automatica

## Situacao Atual

- As extensoes `pg_cron` e `pg_net` ja estao habilitadas
- Existe um CRON job ativo para `atualizar-status-cobrancas-diario` (executa as 00:05 UTC)
- A tabela `configuracoes_cobranca` armazena `cron_expression`, `hora`, `dias_semana` e `ativo`
- A Edge Function `executar-cron-cobranca` esta pronta para ser chamada
- Nao existe CRON configurado para disparar `executar-cron-cobranca`

---

## Desafio

O usuario pode alterar o horario e dias da semana a qualquer momento pela interface. Isso significa que precisamos de uma abordagem que:

1. Crie o CRON job inicialmente
2. Atualize o CRON quando o usuario mudar as configuracoes

---

## Abordagens Possiveis

### Opcao A: CRON Fixo a Cada Minuto (Recomendada)

Executar a funcao a cada minuto e deixar a propria funcao verificar se deve executar com base nas configuracoes.

```text
Vantagens:
- Implementacao simples
- Nao precisa atualizar CRON quando usuario muda configuracao
- A logica de verificacao ja existe na Edge Function

Desvantagens:
- Chamadas desnecessarias (1440/dia)
- Custo minimo de funcao executando brevemente
```

### Opcao B: CRON Dinamico com Database Function

Criar uma funcao PostgreSQL que atualiza o CRON job sempre que o usuario salva configuracoes.

```text
Vantagens:
- CRON executa apenas nos horarios exatos
- Mais eficiente em termos de chamadas

Desvantagens:
- Implementacao mais complexa
- Precisa de trigger na tabela configuracoes_cobranca
```

---

## Solucao Recomendada: Opcao A (CRON a Cada Minuto)

A Edge Function `executar-cron-cobranca` ja verifica se a configuracao esta `ativo = true` antes de processar. Podemos adicionar uma verificacao adicional para checar dia/hora antes de gerar lotes.

### Arquitetura

```text
[pg_cron: a cada minuto]
        |
        v
[executar-cron-cobranca]
        |
        +-- Verificar: ativo = true?
        |       |
        |       +-- NAO: Retorna sem acao
        |       |
        |       +-- SIM: Verificar dia/hora atual
        |               |
        |               +-- NAO e momento certo: Retorna sem acao
        |               |
        |               +-- SIM e momento certo: Gerar lote
```

---

## Arquivos a Modificar

### 1. Executar SQL para Criar CRON Job

Usar a ferramenta de insercao SQL para agendar o CRON:

```sql
SELECT cron.schedule(
  'executar-cron-cobranca',
  '* * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://pjwnkaoeiaylbhmmdbec.supabase.co/functions/v1/executar-cron-cobranca',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### 2. Edge Function: executar-cron-cobranca/index.ts

Adicionar logica para verificar se o momento atual corresponde ao agendamento:

```typescript
// Verificar se deve executar agora
function deveExecutarAgora(config: ConfiguracaoCobranca): boolean {
  const agora = new Date();
  const diaAtual = agora.getDay(); // 0=Dom, 1=Seg, ...
  const horaAtual = agora.getHours();
  const minutoAtual = agora.getMinutes();
  
  // Verificar dia da semana
  if (!config.dias_semana.includes(diaAtual)) {
    return false;
  }
  
  // Verificar hora (formato "HH:MM")
  const [horaConfig, minutoConfig] = config.hora.split(':').map(Number);
  if (horaAtual !== horaConfig || minutoAtual !== minutoConfig) {
    return false;
  }
  
  return true;
}
```

---

## Sequencia de Implementacao

1. Modificar `executar-cron-cobranca` para verificar dia/hora antes de executar
2. Deploy da Edge Function
3. Executar SQL para criar o CRON job (a cada minuto)
4. Testar o fluxo completo

---

## Resultado Esperado

Apos implementacao:

1. O CRON executa a cada minuto
2. A funcao verifica se existe configuracao ativa
3. Se ativa, verifica se e o dia/hora correto
4. Se for o momento certo, gera o lote automaticamente
5. A `ultima_execucao` e atualizada

### Exemplo de Funcionamento

```text
Usuario configura:
- Horario: 08:00
- Dias: Seg, Ter, Qua, Qui, Sex
- Ativo: Sim

Comportamento:
- Segunda as 08:00 -> Executa e gera lote
- Segunda as 08:01 -> Nao executa (horario diferente)
- Sabado as 08:00 -> Nao executa (dia nao selecionado)
- Qualquer momento com Ativo=Nao -> Nao executa
```

---

## Consideracoes de Fuso Horario

O `pg_cron` usa UTC por padrao. O usuario configura no horario local (Brasil). Sera necessario considerar a conversao:

- Horario de Brasilia (UTC-3): 08:00 BRT = 11:00 UTC
- A verificacao na Edge Function deve usar o fuso horario correto

A Edge Function pode usar `Date` com ajuste de timezone ou armazenar a configuracao ja em UTC.

