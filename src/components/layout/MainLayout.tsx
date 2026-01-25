import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Upload,
  LogOut,
  Menu,
  Shield,
  Palette,
  Leaf,
} from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Clientes', url: '/clientes', icon: Users },
  { title: 'Cobranças', url: '/cobrancas', icon: Receipt },
  { title: 'Importar', url: '/importar', icon: Upload },
];

const adminMenuItems = [
  { title: 'Status', url: '/status', icon: Palette },
  { title: 'Usuários', url: '/usuarios', icon: Shield },
];

export default function MainLayout() {
  const { profile, role, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const getInitials = (nome: string | null | undefined) => {
    if (!nome) return 'U';
    return nome
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar className="border-r border-sidebar-border/60">
          <SidebarHeader className="border-b border-sidebar-border/60 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Leaf className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-sidebar-foreground">
                  CRM Cobrança
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {role || 'Usuário'}
                </span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === '/'}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="text-sm">{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}

                  {isAdmin && (
                    <>
                      <div className="my-3 px-3">
                        <div className="h-px bg-sidebar-border/60" />
                      </div>
                      <p className="px-3 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Administração
                      </p>
                      {adminMenuItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={item.url}
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
                              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            >
                              <item.icon className="h-4 w-4" />
                              <span className="text-sm">{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
            <SidebarTrigger className="lg:hidden">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>

            <div className="flex-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                      {getInitials(profile?.nome)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-popover" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.nome || 'Usuário'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {profile?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6 bg-background">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
