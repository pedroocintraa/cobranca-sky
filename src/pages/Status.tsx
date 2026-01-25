import { useState } from 'react';
import { useAllStatusPagamento, useCreateStatusPagamento, useUpdateStatusPagamento, useDeleteStatusPagamento } from '@/hooks/useStatusPagamento';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Palette, GripVertical } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { StatusPagamento } from '@/types/database';

const statusSchema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres').max(50, 'Máximo 50 caracteres'),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
  ordem: z.number().min(0),
  ativo: z.boolean(),
});

type StatusFormData = z.infer<typeof statusSchema>;

export default function Status() {
  const { data: statusList, isLoading } = useAllStatusPagamento();
  const createStatus = useCreateStatusPagamento();
  const updateStatus = useUpdateStatusPagamento();
  const deleteStatus = useDeleteStatusPagamento();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusPagamento | null>(null);

  const form = useForm<StatusFormData>({
    resolver: zodResolver(statusSchema),
    defaultValues: { nome: '', cor: '#6b7280', ordem: 0, ativo: true },
  });

  const openCreateDialog = () => {
    setEditingStatus(null);
    form.reset({ nome: '', cor: '#6b7280', ordem: (statusList?.length || 0) + 1, ativo: true });
    setIsDialogOpen(true);
  };

  const openEditDialog = (status: StatusPagamento) => {
    setEditingStatus(status);
    form.reset({ nome: status.nome, cor: status.cor, ordem: status.ordem, ativo: status.ativo });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: StatusFormData) => {
    if (editingStatus) {
      await updateStatus.mutateAsync({ id: editingStatus.id, ...data });
    } else {
      await createStatus.mutateAsync(data);
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Status de Pagamento</h1>
          <p className="text-muted-foreground">Gerencie os status personalizados</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}><Plus className="mr-2 h-4 w-4" />Novo Status</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingStatus ? 'Editar Status' : 'Novo Status'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl><Input placeholder="Ex: Pago, Pendente..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="cor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input type="color" className="h-10 w-14 p-1" {...field} />
                        <Input placeholder="#000000" {...field} className="flex-1" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ativo" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="cursor-pointer">Ativo</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createStatus.isPending || updateStatus.isPending}>Salvar</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />Lista de Status</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : statusList && statusList.length > 0 ? (
            <div className="space-y-2">
              {statusList.map((status) => (
                <div key={status.id} className={`flex items-center gap-3 rounded-lg border p-3 ${!status.ativo ? 'opacity-50' : ''}`}>
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <div className="h-6 w-6 rounded-full" style={{ backgroundColor: status.cor }} />
                  <span className="flex-1 font-medium">{status.nome}</span>
                  {!status.ativo && <span className="text-xs text-muted-foreground">Inativo</span>}
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(status)}><Pencil className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">Nenhum status cadastrado.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
