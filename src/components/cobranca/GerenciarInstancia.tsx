import { useState, useEffect } from 'react';
import { Smartphone, Plus, Loader2, QrCode, CheckCircle2, XCircle, Trash2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInstanciasWhatsApp, useCriarInstancia, useConectarInstancia, useDeleteInstancia, useConfiguracaoWebhooks } from '@/hooks/useWebhooks';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { InstanciaWhatsApp } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function GerenciarInstancia() {
  const queryClient = useQueryClient();
  const { data: instancias, isLoading } = useInstanciasWhatsApp();
  const { data: configWebhooks } = useConfiguracaoWebhooks();
  const criarInstancia = useCriarInstancia();
  const conectarInstancia = useConectarInstancia();
  const deleteInstancia = useDeleteInstancia();

  const [nomeInstancia, setNomeInstancia] = useState('');
  const [isCriarDialogOpen, setIsCriarDialogOpen] = useState(false);
  const [respostaCriacao, setRespostaCriacao] = useState<any>(null);
  const [respostaConexao, setRespostaConexao] = useState<any>(null);
  const [instanciaParaConectar, setInstanciaParaConectar] = useState<InstanciaWhatsApp | null>(null);
  const [instanciaParaDeletar, setInstanciaParaDeletar] = useState<InstanciaWhatsApp | null>(null);
  const [instanciaConectada, setInstanciaConectada] = useState<InstanciaWhatsApp | null>(null);

  // Realtime subscription para detectar quando a instância é atualizada
  useEffect(() => {
    const channel = supabase
      .channel('instancias-whatsapp-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'instancias_whatsapp',
        },
        (payload) => {
          console.log('Instância atualizada:', payload);
          const updatedInstancia = payload.new as InstanciaWhatsApp;
          
          // Se a instância foi conectada, mostrar popup de sucesso
          if (updatedInstancia.status === 'conectada' && respostaConexao) {
            setInstanciaConectada(updatedInstancia);
            setRespostaConexao(null); // Fechar o popup do QR Code
          }
          
          // Invalidar cache para atualizar a lista
          queryClient.invalidateQueries({ queryKey: ['instancias-whatsapp'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, respostaConexao]);

  const handleCriarInstancia = async () => {
    if (!nomeInstancia.trim()) {
      return;
    }

    if (!configWebhooks?.webhook_criar_instancia) {
      setRespostaCriacao({
        success: false,
        message: 'Webhook de criar instância não configurado. Configure na seção de Webhooks.',
      });
      setIsCriarDialogOpen(false);
      return;
    }

    try {
      const result = await criarInstancia.mutateAsync({
        nome: nomeInstancia,
        webhookUrl: configWebhooks.webhook_criar_instancia,
      });

      setRespostaCriacao({
        success: true,
        ...result.resposta,
      });
      setNomeInstancia('');
      setIsCriarDialogOpen(false);
    } catch (error) {
      setRespostaCriacao({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      setIsCriarDialogOpen(false);
    }
  };

  const handleConectarInstancia = async (instancia: InstanciaWhatsApp) => {
    if (!configWebhooks?.webhook_conectar_instancia) {
      setRespostaConexao({
        success: false,
        message: 'Webhook de conectar instância não configurado. Configure na seção de Webhooks.',
      });
      return;
    }

    try {
      const result = await conectarInstancia.mutateAsync({
        instanciaId: instancia.id,
        token: instancia.token,
        webhookUrl: configWebhooks.webhook_conectar_instancia,
      });

      setRespostaConexao({
        success: true,
        ...result.resposta,
      });
      setInstanciaParaConectar(null);
    } catch (error) {
      setRespostaConexao({
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  const handleDelete = async () => {
    if (instanciaParaDeletar) {
      await deleteInstancia.mutateAsync(instanciaParaDeletar.id);
      setInstanciaParaDeletar(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'conectada':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Conectada
          </Badge>
        );
      case 'criada':
        return (
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Criada
          </Badge>
        );
      case 'erro':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            Desconectada
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Instâncias WhatsApp
              </CardTitle>
              <CardDescription>
                Gerencie as instâncias WhatsApp para envio de mensagens
              </CardDescription>
            </div>
            <Button onClick={() => setIsCriarDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Instância
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !instancias || instancias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhuma instância configurada</h3>
              <p className="text-muted-foreground mb-4">
                Crie uma nova instância para começar a enviar mensagens.
              </p>
              <Button onClick={() => setIsCriarDialogOpen(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Primeira Instância
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>ID Instância</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instancias.map((instancia) => (
                    <TableRow key={instancia.id}>
                      <TableCell className="font-medium">{instancia.nome}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {instancia.id_instance || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {instancia.token.slice(0, 20)}...
                      </TableCell>
                      <TableCell>{getStatusBadge(instancia.status)}</TableCell>
                      <TableCell>
                        {format(new Date(instancia.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {instancia.status === 'criada' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setInstanciaParaConectar(instancia);
                                setRespostaConexao(null);
                              }}
                              className="gap-1"
                            >
                              <QrCode className="h-4 w-4" />
                              Conectar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setInstanciaParaDeletar(instancia)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criar Instância */}
      <Dialog open={isCriarDialogOpen} onOpenChange={setIsCriarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Instância</DialogTitle>
            <DialogDescription>
              Digite um nome para a nova instância WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome-instancia">Nome da Instância</Label>
              <Input
                id="nome-instancia"
                placeholder="Ex: Instância Principal"
                value={nomeInstancia}
                onChange={(e) => setNomeInstancia(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCriarInstancia();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCriarDialogOpen(false);
                  setNomeInstancia('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCriarInstancia}
                disabled={!nomeInstancia.trim() || criarInstancia.isPending}
                className="gap-2"
              >
                {criarInstancia.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Criar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Resposta - Criar Instância */}
      <Dialog open={!!respostaCriacao} onOpenChange={(open) => !open && setRespostaCriacao(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {respostaCriacao?.success !== false ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {respostaCriacao?.success !== false ? 'Instância Criada com Sucesso!' : 'Erro ao Criar Instância'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-auto">
            {respostaCriacao?.message && (
              <p className={respostaCriacao.success !== false ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {respostaCriacao.message}
              </p>
            )}
            {(respostaCriacao?.qrcode || respostaCriacao?.data?.qrcode) && (
              <div className="space-y-2">
                <Label>QR Code para Conectar</Label>
                <div className="flex justify-center p-4 bg-muted rounded-lg">
                  <img src={respostaCriacao.qrcode || respostaCriacao.data?.qrcode} alt="QR Code" className="max-w-xs" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Resposta Completa do Webhook</Label>
              <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-64">
                {JSON.stringify(respostaCriacao, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Conectar Instância */}
      <Dialog open={!!instanciaParaConectar} onOpenChange={(open) => !open && setInstanciaParaConectar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar Instância</DialogTitle>
            <DialogDescription>
              Conecte a instância "{instanciaParaConectar?.nome}" ao WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Clique no botão abaixo para conectar esta instância. O sistema irá chamar o webhook de conexão.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setInstanciaParaConectar(null)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => instanciaParaConectar && handleConectarInstancia(instanciaParaConectar)}
                disabled={conectarInstancia.isPending}
                className="gap-2"
              >
                {conectarInstancia.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="h-4 w-4" />
                )}
                Conectar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Resposta - Conectar Instância */}
      <Dialog open={!!respostaConexao} onOpenChange={(open) => !open && setRespostaConexao(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {respostaConexao?.connected ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : respostaConexao?.success === false ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <QrCode className="h-5 w-5 text-primary" />
              )}
              {respostaConexao?.connected 
                ? 'Instância Conectada com Sucesso!' 
                : respostaConexao?.success === false 
                  ? 'Erro ao Conectar Instância'
                  : 'Aguardando Conexão'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Mensagem de sucesso quando conectado */}
            {respostaConexao?.connected && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <p className="text-lg font-medium text-green-600 mb-2">
                  WhatsApp conectado!
                </p>
                <p className="text-sm text-muted-foreground">
                  A instância está pronta para enviar mensagens.
                </p>
              </div>
            )}

            {/* Mensagem de erro */}
            {respostaConexao?.success === false && (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <p className="text-red-600 font-medium">
                  {respostaConexao.message || 'Erro ao conectar instância'}
                </p>
              </div>
            )}

            {/* QR Code apenas quando não conectado e não é erro */}
            {!respostaConexao?.connected && respostaConexao?.success !== false && (respostaConexao?.qrcode || respostaConexao?.instance?.qrcode) && (
              <div className="space-y-2">
                <Label>Escaneie o QR Code com o WhatsApp</Label>
                <div className="flex justify-center p-4 bg-muted rounded-lg">
                  <img 
                    src={respostaConexao.qrcode || respostaConexao.instance?.qrcode} 
                    alt="QR Code" 
                    className="max-w-xs" 
                  />
                </div>
              </div>
            )}

            {/* Botão de fechar */}
            <div className="flex justify-end">
              <Button onClick={() => setRespostaConexao(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Excluir */}
      <AlertDialog open={!!instanciaParaDeletar} onOpenChange={() => setInstanciaParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir instância?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A instância "{instanciaParaDeletar?.nome}" será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Sucesso - Instância Conectada via Realtime */}
      <Dialog open={!!instanciaConectada} onOpenChange={(open) => !open && setInstanciaConectada(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Instância Conectada com Sucesso!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <p className="text-lg font-medium text-green-600 mb-2">
                WhatsApp conectado!
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                A instância "{instanciaConectada?.nome}" está pronta para enviar mensagens.
              </p>
              {instanciaConectada?.telefone && (
                <p className="text-sm text-muted-foreground">
                  Telefone: <span className="font-medium">{instanciaConectada.telefone}</span>
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setInstanciaConectada(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
