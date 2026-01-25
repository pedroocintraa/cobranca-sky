import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OverviewChartProps {
  data?: { month: string; value: number }[];
}

const defaultData = [
  { month: 'Jan', value: 4000 },
  { month: 'Fev', value: 3000 },
  { month: 'Mar', value: 5000 },
  { month: 'Abr', value: 4500 },
  { month: 'Mai', value: 6000 },
  { month: 'Jun', value: 5500 },
  { month: 'Jul', value: 7000 },
  { month: 'Ago', value: 6500 },
  { month: 'Set', value: 8000 },
  { month: 'Out', value: 7500 },
  { month: 'Nov', value: 9000 },
  { month: 'Dez', value: 8500 },
];

export function OverviewChart({ data = defaultData }: OverviewChartProps) {
  const currentMonth = new Date().getMonth();

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Visão Geral</CardTitle>
        <Select defaultValue="year">
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="year">Este ano</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={(value) => `${value / 1000}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) =>
                new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(value)
              }
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === currentMonth ? 'hsl(239 84% 67%)' : 'hsl(239 84% 67% / 0.3)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
