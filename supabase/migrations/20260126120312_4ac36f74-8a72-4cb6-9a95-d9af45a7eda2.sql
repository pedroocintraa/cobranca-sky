-- Adicionar coluna para intervalo de envio configurável
ALTER TABLE public.configuracoes_cobranca 
ADD COLUMN IF NOT EXISTS intervalo_envio_segundos INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.configuracoes_cobranca.intervalo_envio_segundos 
IS 'Intervalo em segundos entre o envio de cada mensagem';