import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MessageSquare, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoricoMensagensProps {
  data: Array<{
    id: string;
    mensagem: string;
    tipo: string;
    status: string | null;
    canal: string;
    created_at: string;
    cliente: { id: string; nome: string; telefone: string | null } | null;
    fatura: { id: string; mes_referencia: string; valor: number } | null;
  }>;
  isLoading: boolean;
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; variant: 'default' | 'outline' | 'destructive' }> = {
  enviado: { label: 'Enviado', icon: CheckCircle2, variant: 'default' },
  sucesso: { label: 'Sucesso', icon: CheckCircle2, variant: 'default' },
  falha: { label: 'Falha', icon: XCircle, variant: 'destructive' },
  pendente: { label: 'Pendente', icon: Clock, variant: 'outline' },
};

export function HistoricoMensagens({ data, isLoading }: HistoricoMensagensProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Histórico de Mensagens Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            Nenhuma mensagem enviada ainda
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="max-w-[300px]">Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((msg) => {
                const status = statusConfig[msg.status?.toLowerCase() || 'pendente'] || statusConfig.pendente;
                const StatusIcon = status.icon;

                return (
                  <TableRow key={msg.id}>
                    <TableCell className="font-medium">
                      {msg.cliente?.nome || 'Cliente desconhecido'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(msg.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {msg.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground">
                      {msg.mensagem}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
