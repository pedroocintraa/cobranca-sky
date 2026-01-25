import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface WelcomeHeaderProps {
  userName?: string | null;
}

export function WelcomeHeader({ userName }: WelcomeHeaderProps) {
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {greeting()}, {userName?.split(' ')[0] || 'Usuário'}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Aqui está o resumo das suas cobranças
        </p>
      </div>
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar..."
          className="pl-10 h-10 bg-card border-border/50"
        />
      </div>
    </div>
  );
}
