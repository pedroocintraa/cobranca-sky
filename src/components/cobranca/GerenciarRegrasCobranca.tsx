import { useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical, Settings, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRegrasCobranca, useCreateRegraCobranca, useUpdateRegraCobranca, useDeleteRegraCobranca, formatarRegraCobranca } from '@/hooks/useRegrasCobranca';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { RegraCobranca, TipoRegraCobranca } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

const regraSchema = z.object({
  tipo: z.enum(['antes_vencimento', 'apos_vencimento']),
  dias: z.number().int().min(-30).max(90),
  ativo: z.boolean().default(true),
  ordem: z.number().int().min(0).default(0),
});

type RegraFormData = z.infer<typeof regraSchema>;

export function GerenciarRegrasCobranca() {
  const { data: regras, isLoading } = useRegrasCobranca();
  const createRegra = useCreateRegraCobranca();
  const updateRegra = useUpdateRegraCobranca();
  const deleteRegra = useDeleteRegraCobranca();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRegra, setEditingRegra] = useState<RegraCobranca | null>(null);
  const [deletingRegra, setDeletingRegra] = useState<RegraCobranca | null>(null);

  const form = useForm<RegraFormData>({
    resolver: zodResolver(regraSchema),
    defaultValues: {
      tipo: 'apos_vencimento',
      dias: 0,
      ativo: true,
      ordem: 0,
    },
  });

  const openCreateDialog = () => {
    setEditingRegra(null);
    form.reset({
      tipo: 'apos_vencimento',
      dias: 0,
      ativo: true,
      ordem: regras?.length || 0,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (regra: RegraCobranca) => {
    setEditingRegra(regra);
    form.reset({
      tipo: regra.tipo,
      dias: regra.dias,
      ativo: regra.ativo,
      ordem: regra.ordem,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: RegraFormData) => {
    // Validar dias baseado no tipo
    if (data.tipo === 'antes_vencimento' && data.dias >= 0) {
      form.setError('dias', { message: 'Dias deve ser negativo para antes do vencimento' });
      return;
    }
    if (data.tipo === 'apos_vencimento' && data.dias < 0) {
      form.setError('dias', { message: 'Dias deve ser positivo ou zero para após o vencimento' });
      return;
    }

    // Garantir que todos os campos obrigatórios estejam presentes
    const regraData = {
      tipo: data.tipo,
      dias: data.dias,
      ativo: data.ativo ?? true,
      ordem: data.ordem ?? 0,
    };

    if (editingRegra) {
      await updateRegra.mutateAsync({ id: editingRegra.id, ...regraData });
    } else {
      await createRegra.mutateAsync(regraData);
    }
    setIsDialogOpen(false);
    form.reset();
  };

  const handleDelete = async () => {
    if (deletingRegra) {
      await deleteRegra.mutateAsync(deletingRegra.id);
      setDeletingRegra(null);
    }
  };

  const toggleAtivo = async (regra: RegraCobranca) => {
    await updateRegra.mutateAsync({ id: regra.id, ativo: !regra.ativo });
  };

  const ajustarOrdem = async (regra: RegraCobranca, direcao: 'up' | 'down') => {
    if (!regras) return;
    
    const index = regras.findIndex(r => r.id === regra.id);
    if (index === -1) return;

    const novaOrdem = direcao === 'up' 
      ? regras[index - 1]?.ordem ?? regra.ordem - 1
      : regras[index + 1]?.ordem ?? regra.ordem + 1;

    // Trocar ordens
    const outraRegra = direcao === 'up' ? regras[index - 1] : regras[index + 1];
    if (outraRegra) {
      await updateRegra.mutateAsync({ id: outraRegra.id, ordem: regra.ordem });
    }
    await updateRegra.mutateAsync({ id: regra.id, ordem: novaOrdem });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Regras de Cobrança
            </CardTitle>
            <CardDescription>
              Configure quando o sistema deve cobrar os clientes automaticamente
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Regra
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
        ) : !regras || regras.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhuma regra configurada</h3>
            <p className="text-muted-foreground mb-4">
              Crie regras para definir quando o sistema deve cobrar automaticamente.
            </p>
            <Button onClick={openCreateDialog} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeira Regra
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Dias</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regras.map((regra, index) => (
                  <TableRow key={regra.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => ajustarOrdem(regra, 'up')}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium w-8 text-center">{regra.ordem}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => ajustarOrdem(regra, 'down')}
                          disabled={index === regras.length - 1}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatarRegraCobranca(regra)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={regra.tipo === 'antes_vencimento' ? 'default' : 'secondary'}>
                        {regra.tipo === 'antes_vencimento' ? 'Antes' : 'Depois'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {regra.dias > 0 ? '+' : ''}{regra.dias}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={regra.ativo}
                        onCheckedChange={() => toggleAtivo(regra)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(regra)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingRegra(regra)}
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

      {/* Dialog de Criar/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRegra ? 'Editar Regra' : 'Nova Regra'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value: TipoRegraCobranca) => {
                        field.onChange(value);
                        // Ajustar dias quando mudar tipo
                        if (value === 'antes_vencimento' && form.getValues('dias') >= 0) {
                          form.setValue('dias', -3);
                        } else if (value === 'apos_vencimento' && form.getValues('dias') < 0) {
                          form.setValue('dias', 0);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="antes_vencimento">Antes do Vencimento</SelectItem>
                        <SelectItem value="apos_vencimento">Após o Vencimento</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Dias {form.watch('tipo') === 'antes_vencimento' ? '(negativo)' : '(positivo ou zero)'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        min={form.watch('tipo') === 'antes_vencimento' ? -30 : 0}
                        max={90}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ordem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem (prioridade)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        min={0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Regra Ativa</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createRegra.isPending || updateRegra.isPending}
                >
                  {editingRegra ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Excluir */}
      <AlertDialog open={!!deletingRegra} onOpenChange={() => setDeletingRegra(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A regra "{deletingRegra && formatarRegraCobranca(deletingRegra)}" será excluída permanentemente.
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
    </Card>
  );
}
