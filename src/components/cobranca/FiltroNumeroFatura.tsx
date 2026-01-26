import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface FiltroNumeroFaturaProps {
  value: number[];
  onChange: (value: number[]) => void;
}

export function FiltroNumeroFatura({ value, onChange }: FiltroNumeroFaturaProps) {
  const opcoes = [
    { numero: 1, label: '1ª Fatura' },
    { numero: 2, label: '2ª Fatura' },
    { numero: 3, label: '3ª Fatura' },
    { numero: 4, label: '4ª+ Faturas' },
  ];

  const toggleNumero = (numero: number) => {
    if (value.includes(numero)) {
      onChange(value.filter(n => n !== numero));
    } else {
      onChange([...value, numero].sort());
    }
  };

  const selecionarTodos = () => {
    if (value.length === 4) {
      onChange([]);
    } else {
      onChange([1, 2, 3, 4]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Número da Fatura</Label>
        <button
          type="button"
          onClick={selecionarTodos}
          className="text-xs text-primary hover:underline"
        >
          {value.length === 4 ? 'Desmarcar todos' : 'Selecionar todos'}
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        {opcoes.map((opcao) => (
          <div key={opcao.numero} className="flex items-center gap-2">
            <Checkbox
              id={`fatura-${opcao.numero}`}
              checked={value.includes(opcao.numero)}
              onCheckedChange={() => toggleNumero(opcao.numero)}
            />
            <Label 
              htmlFor={`fatura-${opcao.numero}`}
              className="text-sm cursor-pointer"
            >
              {opcao.label}
            </Label>
          </div>
        ))}
      </div>
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum filtro selecionado = todas as faturas
        </p>
      )}
    </div>
  );
}
