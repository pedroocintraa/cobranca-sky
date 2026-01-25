-- Habilitar extensões necessárias para CRON
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Agendar execução diária às 00:05 (horário UTC)
SELECT cron.schedule(
  'atualizar-status-cobrancas-diario',
  '5 0 * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://pjwnkaoeiaylbhmmdbec.supabase.co/functions/v1/atualizar-status-cobrancas',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqd25rYW9laWF5bGJobW1kYmVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzk0ODIsImV4cCI6MjA4NDkxNTQ4Mn0.OvkkRg-nyzG4cdz7jJmclJ0vn2F1uikY-38iuFTGJcA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);