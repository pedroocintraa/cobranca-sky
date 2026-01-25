import { useState } from 'react';
import { useUsers, useAssignRole, useRemoveRole, useUpdateProfile, UserWithRole } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Pencil, ShieldCheck, ShieldX, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AppRole } from '@/types/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const editSchema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres').max(100, 'Máximo 100 caracteres'),
  role: z.enum(['admin', 'operator', 'none']),
});

type EditFormData = z.infer<typeof editSchema>;

export default function Usuarios() {
  const { user } = useAuth();
  const { data: users, isLoading } = useUsers();
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();
  const updateProfile = useUpdateProfile();

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);

  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { nome: '', role: 'none' },
  });

  const openEditDialog = (u: UserWithRole) => {
    setEditingUser(u);
    form.reset({
      nome: u.nome || '',
      role: u.role || 'none',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (data: EditFormData) => {
    if (!editingUser) return;

    // Update profile name
    if (data.nome !== editingUser.nome) {
      await updateProfile.mutateAsync({ userId: editingUser.user_id, nome: data.nome });
    }

    // Update role
    if (data.role === 'none' && editingUser.role) {
      await removeRole.mutateAsync(editingUser.user_id);
    } else if (data.role !== 'none' && data.role !== editingUser.role) {
      await assignRole.mutateAsync({ userId: editingUser.user_id, role: data.role as AppRole });
    }

    setIsDialogOpen(false);
  };

  const filteredUsers = users?.filter((u) =>
    u.nome?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role?: AppRole) => {
    if (!role) {
      return <Badge variant="outline" className="text-muted-foreground">Aguardando</Badge>;
    }
    if (role === 'admin') {
      return <Badge className="bg-primary">Admin</Badge>;
    }
    return <Badge variant="secondary">Operador</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-muted-foreground">Gerencie os acessos e permissões do sistema</p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários
          </CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.nome || <span className="text-muted-foreground italic">Sem nome</span>}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{getRoleBadge(u.role)}</TableCell>
                      <TableCell>
                        {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(u)}
                          disabled={u.user_id === user?.id}
                          title={u.user_id === user?.id ? 'Você não pode editar seu próprio acesso' : 'Editar usuário'}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">Nenhum usuário encontrado.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Email: <strong>{editingUser?.email}</strong>
              </div>
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do usuário" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Papel no Sistema</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um papel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">
                          <div className="flex items-center gap-2">
                            <ShieldX className="h-4 w-4 text-muted-foreground" />
                            Sem Acesso
                          </div>
                        </SelectItem>
                        <SelectItem value="operator">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-secondary-foreground" />
                            Operador
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            Administrador
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={assignRole.isPending || removeRole.isPending || updateProfile.isPending}
                >
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
