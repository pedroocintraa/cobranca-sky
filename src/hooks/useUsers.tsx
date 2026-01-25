import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Profile, AppRole } from '@/types/database';
import { toast } from '@/hooks/use-toast';

export interface UserWithRole extends Profile {
  role?: AppRole;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Fetch all profiles (admin only via RLS)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role as AppRole | undefined,
        };
      });

      return usersWithRoles;
    },
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First, remove existing role if any
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Then, insert new role
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Papel atribuído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atribuir papel',
        description: error.message,
      });
    },
  });
}

export function useRemoveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Acesso removido!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover acesso',
        description: error.message,
      });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, nome }: { userId: string; nome: string }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ nome })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Perfil atualizado!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar perfil',
        description: error.message,
      });
    },
  });
}
