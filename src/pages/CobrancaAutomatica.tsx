import { useState } from 'react';
import { Plus, Send, Eye, Check, Clock, AlertCircle, CheckCircle2, XCircle, FileText, BarChart3, Settings, Users, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLotesCobranca } from '@/hooks/useLotesCobranca';
import { CreateLoteModal } from '@/components/cobranca/CreateLoteModal';
import { LoteDetailsModal } from '@/components/cobranca/LoteDetailsModal';
import { AgendamentoCard } from '@/components/cobranca/AgendamentoCard';
import { RelatoriosTab } from '@/components/cobranca/RelatoriosTab';
import { ClientesAtrasados } from '@/components/cobranca/ClientesAtrasados';
import { GerenciarRegrasCobranca } from '@/components/cobranca/GerenciarRegrasCobranca';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { LoteStatus } from '@/types/database';

const statusConfig: Record<LoteStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Clock }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary', icon: FileText },
  aguardando_aprovacao: { label: 'Aguardando Aprovação', variant: 'outline', icon: Clock },
  aprovado: { label: 'Aprovado', variant: 'default', icon: Check },
  em_andamento: { label: 'Em Andamento', variant: 'default', icon: Send },
  concluido: { label: 'Concluído', variant: 'default', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', variant: 'destructive', icon: XCircle },
};

export default function CobrancaAutomatica() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);
  
  const { data: lotes, isLoading } = useLotesCobranca();

  // Métricas por status
  const metrics = {
    rascunho: lotes?.filter(l => l.status === 'rascunho').length || 0,
    aguardando: lotes?.filter(l => l.status === 'aguardando_aprovacao').length || 0,
    emAndamento: lotes?.filter(l => l.status === 'em_andamento' || l.status === 'aprovado').length || 0,
    concluidos: lotes?.filter(l => l.status === 'concluido').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cobrança Automática</h1>
          <p className="text-muted-foreground">Gerencie seus disparos de cobrança via WhatsApp</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="clientes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="clientes" className="gap-2">
            <Users className="h-4 w-4" />
            Clientes Atrasados
          </TabsTrigger>
          <TabsTrigger value="regras" className="gap-2">
            <Scale className="h-4 w-4" />
            Regras
          </TabsTrigger>
          <TabsTrigger value="lotes" className="gap-2">
            <FileText className="h-4 w-4" />
            Lotes
          </TabsTrigger>
          <TabsTrigger value="agendamento" className="gap-2">
            <Settings className="h-4 w-4" />
            Agendamento
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        {/* Tab: Clientes Atrasados */}
        <TabsContent value="clientes" className="space-y-6">
          <ClientesAtrasados />
        </TabsContent>

        {/* Tab: Regras */}
        <TabsContent value="regras" className="space-y-6">
          <GerenciarRegrasCobranca />
        </TabsContent>

        {/* Tab: Lotes */}
        <TabsContent value="lotes" className="space-y-6">
          {/* Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Em Rascunho
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{metrics.rascunho}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Aguardando Aprovação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">{metrics.aguardando}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Em Andamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">{metrics.emAndamento}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Concluídos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{metrics.concluidos}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Lotes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Lotes Recentes</CardTitle>
              <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Lote Manual
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !lotes || lotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhum lote encontrado</h3>
                  <p className="text-muted-foreground mb-4">Crie um novo lote para iniciar as cobranças automáticas.</p>
                  <Button onClick={() => setCreateModalOpen(true)} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Primeiro Lote
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Faturas</TableHead>
                      <TableHead className="text-center">Enviados</TableHead>
                      <TableHead className="text-center">Sucesso</TableHead>
                      <TableHead className="text-center">Falha</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotes.map((lote) => {
                      const config = statusConfig[lote.status];
                      const StatusIcon = config.icon;
                      
                      return (
                        <TableRow key={lote.id}>
                          <TableCell className="font-medium">{lote.nome}</TableCell>
                          <TableCell>
                            <Badge variant={config.variant} className="gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{lote.total_faturas}</TableCell>
                          <TableCell className="text-center">
                            {lote.total_enviados}/{lote.total_faturas}
                          </TableCell>
                          <TableCell className="text-center text-green-600">{lote.total_sucesso}</TableCell>
                          <TableCell className="text-center text-red-600">{lote.total_falha}</TableCell>
                          <TableCell>
                            {format(new Date(lote.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLoteId(lote.id)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Agendamento */}
        <TabsContent value="agendamento" className="space-y-6">
          <AgendamentoCard />
        </TabsContent>

        {/* Tab: Relatórios */}
        <TabsContent value="relatorios">
          <RelatoriosTab />
        </TabsContent>
      </Tabs>

      {/* Modais */}
      <CreateLoteModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen} 
      />
      
      <LoteDetailsModal
        loteId={selectedLoteId}
        open={!!selectedLoteId}
        onOpenChange={(open) => !open && setSelectedLoteId(null)}
      />
    </div>
  );
}
