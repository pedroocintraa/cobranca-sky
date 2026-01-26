import { useState } from 'react';
import { Loader2, Send, Check, Sparkles, Edit2, Trash2, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useLoteCobranca, 
  useItensLote, 
  useUpdateLoteStatus,
  useUpdateItemMensagem,
  useDeleteLote 
} from '@/hooks/useLotesCobranca';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { LoteStatus, StatusEnvio } from '@/types/database';
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

interface LoteDetailsModalProps {
  loteId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusEnvioConfig: Record<StatusEnvio, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-gray-100 text-gray-800' },
  enviando: { label: 'Enviando', className: 'bg-blue-100 text-blue-800' },
  enviado: { label: 'Enviado', className: 'bg-green-100 text-green-800' },
  falha: { label: 'Falha', className: 'bg-red-100 text-red-800' },
};

export function LoteDetailsModal({ loteId, open, onOpenChange }: LoteDetailsModalProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingMensagem, setEditingMensagem] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { isAdmin } = useAuth();
  const { data: lote, isLoading: loadingLote } = useLoteCobranca(loteId);
  const { data: itens, isLoading: loadingItens, refetch: refetchItens } = useItensLote(loteId);
  const updateStatus = useUpdateLoteStatus();
  const updateMensagem = useUpdateItemMensagem();
  const deleteLote = useDeleteLote();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Gerar mensagens com IA
  const handleGenerateMensagens = async () => {
    if (!loteId || !itens) return;
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-mensagem', {
        body: { loteId }
      });

      if (error) throw error;

      toast({ title: 'Mensagens geradas com sucesso!', description: `${data.generated} mensagens criadas.` });
      refetchItens();
      
      // Atualizar status para aguardando aprovação
      if (lote?.status === 'rascunho') {
        await updateStatus.mutateAsync({ loteId, status: 'aguardando_aprovacao' });
      }
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao gerar mensagens', 
        description: error.message 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Aprovar lote
  const handleAprovar = async () => {
    if (!loteId) return;
    await updateStatus.mutateAsync({ loteId, status: 'aprovado' });
  };

  // Processar lote (enviar mensagens)
  const handleProcessar = async () => {
    if (!loteId) return;
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('processar-lote', {
        body: { loteId }
      });

      if (error) throw error;

      toast({ 
        title: 'Lote em processamento!', 
        description: 'As mensagens estão sendo enviadas.' 
      });
      refetchItens();
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao processar lote', 
        description: error.message 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Salvar edição de mensagem
  const handleSaveMensagem = async (itemId: string) => {
    await updateMensagem.mutateAsync({ itemId, mensagem: editingMensagem });
    setEditingItemId(null);
    setEditingMensagem('');
  };

  // Deletar lote
  const handleDelete = async () => {
    if (!loteId) return;
    await deleteLote.mutateAsync(loteId);
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  const canEdit = lote?.status === 'rascunho' || lote?.status === 'aguardando_aprovacao';
  const canApprove = isAdmin && lote?.status === 'aguardando_aprovacao';
  const canProcess = isAdmin && lote?.status === 'aprovado';
  const hasMessages = itens?.some(i => i.mensagem_gerada);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{lote?.nome || 'Carregando...'}</DialogTitle>
                <DialogDescription>
                  {lote && `${lote.total_faturas} faturas • ${lote.total_enviados} enviados • ${lote.total_sucesso} sucesso • ${lote.total_falha} falha`}
                </DialogDescription>
              </div>
              {lote && (
                <Badge variant="outline" className="ml-4">
                  {lote.status.replace('_', ' ').toUpperCase()}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {(loadingLote || loadingItens) ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Fatura</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Status Envio</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens?.map((item) => {
                      const statusConfig = statusEnvioConfig[item.status_envio];
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.cliente?.nome || 'Cliente'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.telefone || 'Sem telefone'}
                          </TableCell>
                          <TableCell>
                            {item.fatura?.mes_referencia || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.fatura ? formatCurrency(item.fatura.valor) : '-'}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {editingItemId === item.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingMensagem}
                                  onChange={(e) => setEditingMensagem(e.target.value)}
                                  rows={3}
                                  className="text-sm"
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleSaveMensagem(item.id)}>
                                    Salvar
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingItemId(null)}>
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2">
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {item.mensagem_gerada || <span className="italic">Sem mensagem</span>}
                                </p>
                                {canEdit && item.mensagem_gerada && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => {
                                      setEditingItemId(item.id);
                                      setEditingMensagem(item.mensagem_gerada || '');
                                    }}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig.className}>
                              {statusConfig.label}
                            </Badge>
                            {item.erro_mensagem && (
                              <p className="text-xs text-red-600 mt-1">{item.erro_mensagem}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.mensagem_gerada && (
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>

          <DialogFooter className="flex-wrap gap-2">
            {canEdit && !hasMessages && (
              <Button 
                onClick={handleGenerateMensagens} 
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar Mensagens com IA
              </Button>
            )}
            
            {canApprove && (
              <Button 
                onClick={handleAprovar}
                disabled={updateStatus.isPending}
                variant="default"
                className="gap-2"
              >
                {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Aprovar Lote
              </Button>
            )}
            
            {canProcess && (
              <Button 
                onClick={handleProcessar}
                disabled={isProcessing}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar Mensagens
              </Button>
            )}

            {isAdmin && canEdit && (
              <Button 
                variant="destructive" 
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Excluir Lote
              </Button>
            )}
            
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lote?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os itens do lote serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
