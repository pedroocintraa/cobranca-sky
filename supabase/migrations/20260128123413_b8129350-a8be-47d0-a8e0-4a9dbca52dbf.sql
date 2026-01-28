-- Adicionar colunas id_instance e telefone à tabela instancias_whatsapp
ALTER TABLE public.instancias_whatsapp 
ADD COLUMN IF NOT EXISTS id_instance text,
ADD COLUMN IF NOT EXISTS telefone text;

-- Criar índice para busca por id_instance
CREATE INDEX IF NOT EXISTS idx_instancias_whatsapp_id_instance ON public.instancias_whatsapp(id_instance);