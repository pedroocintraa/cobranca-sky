import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2 } from 'lucide-react';

interface TopInadimplentesProps {
  data: Array<{
    id: string;
    nome: string;
    telefone: string | null;
    totalFaturas: number;
    valorTotal: number;
    diasAtraso: number;
  }>;
  isLoading: boolean;
}

export function TopInadimplentes({ data, isLoading }: TopInadimplentesProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-destructive" />
          Top 10 Inadimplentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            Nenhum cliente inadimplente
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((cliente, index) => (
              <div 
                key={cliente.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{cliente.nome}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{cliente.totalFaturas} faturas</span>
                    <span>•</span>
                    <span>{formatCurrency(cliente.valorTotal)}</span>
                  </div>
                </div>
                <Badge 
                  variant={cliente.diasAtraso > 60 ? 'destructive' : 'outline'}
                  className="text-xs"
                >
                  {cliente.diasAtraso}d
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
