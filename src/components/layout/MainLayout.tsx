import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MiniSidebar } from './MiniSidebar';
import { ExpandedSidebar } from './ExpandedSidebar';
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
import { LogOut, Menu, Bell, X } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { NavLink } from '@/components/NavLink';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Upload,
  Shield,
  Palette,
  Sparkles,
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
  const [mobileOpen, setMobileOpen] = useState(false);

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
    <div className="flex min-h-screen w-full bg-background">
      {/* Mini Sidebar - Desktop */}
      <MiniSidebar className="hidden md:flex" />

      {/* Expanded Sidebar - Large screens */}
      <ExpandedSidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-4 lg:px-6">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-violet">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-base font-semibold text-foreground">CRM Cobrança</h1>
                      <p className="text-xs text-muted-foreground">Gestão</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                  {menuItems.map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      end={item.url === '/'}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm">{item.title}</span>
                    </NavLink>
                  ))}

                  {isAdmin && (
                    <>
                      <div className="py-3">
                        <div className="h-px bg-border" />
                      </div>
                      <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Admin
                      </p>
                      {adminMenuItems.map((item) => (
                        <NavLink
                          key={item.title}
                          to={item.url}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
                          activeClassName="bg-primary/10 text-primary font-medium"
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="text-sm">{item.title}</span>
                        </NavLink>
                      ))}
                    </>
                  )}
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          <div className="hidden md:block" />

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
                3
              </span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground font-medium">
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
                    <p className="text-xs leading-none text-muted-foreground capitalize mt-1">
                      {role || 'Usuário'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
