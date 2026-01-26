import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Upload,
  Settings,
  Shield,
  Palette,
  Sparkles,
  MessageSquareMore,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Clientes', url: '/clientes', icon: Users },
  { title: 'Cobranças', url: '/cobrancas', icon: Receipt },
  { title: 'Cobrança Automática', url: '/cobranca-automatica', icon: MessageSquareMore },
  { title: 'Importar', url: '/importar', icon: Upload },
];

const adminMenuItems = [
  { title: 'Status', url: '/status', icon: Palette },
  { title: 'Usuários', url: '/usuarios', icon: Shield },
];

interface MiniSidebarProps {
  className?: string;
}

export function MiniSidebar({ className }: MiniSidebarProps) {
  const { profile, isAdmin } = useAuth();

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
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col items-center w-16 border-r border-border bg-card py-4',
          className
        )}
      >
        {/* Logo */}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-violet mb-6">
          <Sparkles className="h-5 w-5 text-white" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col items-center gap-2">
          {menuItems.map((item) => (
            <Tooltip key={item.title}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.url}
                  end={item.url === '/'}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
                  activeClassName="bg-primary/10 text-primary"
                >
                  <item.icon className="h-5 w-5" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {item.title}
              </TooltipContent>
            </Tooltip>
          ))}

          {isAdmin && (
            <>
              <div className="my-2 h-px w-8 bg-border" />
              {adminMenuItems.map((item) => (
                <Tooltip key={item.title}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.url}
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
                      activeClassName="bg-primary/10 text-primary"
                    >
                      <item.icon className="h-5 w-5" />
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              ))}
            </>
          )}
        </nav>

        {/* Settings & Avatar */}
        <div className="flex flex-col items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink
                to="/configuracoes"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
                activeClassName="bg-primary/10 text-primary"
              >
                <Settings className="h-5 w-5" />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Configurações
            </TooltipContent>
          </Tooltip>

          <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getInitials(profile?.nome)}
            </AvatarFallback>
          </Avatar>
        </div>
      </aside>
    </TooltipProvider>
  );
}
