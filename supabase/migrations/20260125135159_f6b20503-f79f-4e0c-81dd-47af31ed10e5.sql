-- Adicionar coluna mes_referencia na tabela cobrancas
ALTER TABLE cobrancas 
ADD COLUMN mes_referencia VARCHAR(7);

-- Preencher mes_referencia baseado na data_vencimento existente
UPDATE cobrancas 
SET mes_referencia = TO_CHAR(data_vencimento, 'YYYY-MM')
WHERE mes_referencia IS NULL;