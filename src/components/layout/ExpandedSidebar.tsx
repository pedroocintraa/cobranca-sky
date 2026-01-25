import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Upload,
  Settings,
  Shield,
  Palette,
  ChevronRight,
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

interface ExpandedSidebarProps {
  className?: string;
}

export function ExpandedSidebar({ className }: ExpandedSidebarProps) {
  const { isAdmin } = useAuth();

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col w-60 border-r border-border bg-card',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-violet">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">CRM Cobrança</h1>
          <p className="text-xs text-muted-foreground">Gestão de cobranças</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Menu
        </p>
        {menuItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === '/'}
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-accent hover:text-foreground group"
            activeClassName="bg-primary/10 text-primary font-medium hover:bg-primary/10 hover:text-primary"
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              <span className="text-sm">{item.title}</span>
            </div>
            <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="py-3">
              <div className="h-px bg-border" />
            </div>
            <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Administração
            </p>
            {adminMenuItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-accent hover:text-foreground group"
                activeClassName="bg-primary/10 text-primary font-medium hover:bg-primary/10 hover:text-primary"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm">{item.title}</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Settings */}
      <div className="px-3 pb-4">
        <NavLink
          to="/configuracoes"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
          activeClassName="bg-primary/10 text-primary font-medium"
        >
          <Settings className="h-5 w-5" />
          <span className="text-sm">Configurações</span>
        </NavLink>
      </div>
    </aside>
  );
}
