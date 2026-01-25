-- Adicionar campo dia_vencimento na tabela cobrancas
ALTER TABLE cobrancas 
ADD COLUMN dia_vencimento INTEGER;

-- Preencher automaticamente baseado na data_vencimento existente
UPDATE cobrancas 
SET dia_vencimento = EXTRACT(DAY FROM data_vencimento)
WHERE dia_vencimento IS NULL;