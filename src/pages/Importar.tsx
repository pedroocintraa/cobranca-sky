import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { useClientes, useCreateCliente } from '@/hooks/useClientes';
import { useCreateCobranca } from '@/hooks/useCobrancas';
import { useStatusPagamento } from '@/hooks/useStatusPagamento';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, Check, X, AlertCircle, Loader2 } from 'lucide-react';

interface ParsedRow {
  nome?: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  numero_proposta?: string;
  valor?: string;
  data_instalacao?: string;
  data_vencimento?: string;
  status?: string;
  [key: string]: string | undefined;
}

interface ColumnMapping {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  numero_proposta: string;
  valor: string;
  data_instalacao: string;
  data_vencimento: string;
  status: string;
}

const defaultMapping: ColumnMapping = {
  nome: '',
  cpf: '',
  telefone: '',
  email: '',
  numero_proposta: '',
  valor: '',
  data_instalacao: '',
  data_vencimento: '',
  status: '',
};

const fieldLabels: Record<keyof ColumnMapping, string> = {
  cpf: 'CPF *',
  nome: 'Nome do Cliente',
  telefone: 'Telefone',
  email: 'Email',
  numero_proposta: 'Nº Proposta',
  valor: 'Valor',
  data_instalacao: 'Data Instalação',
  data_vencimento: 'Data Vencimento',
  status: 'Status',
};

export default function Importar() {
  const { user } = useAuth();
  const { data: clientes } = useClientes();
  const { data: statusList } = useStatusPagamento();
  const createCliente = useCreateCliente();
  const createCobranca = useCreateCobranca();

  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(defaultMapping);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'done'>('upload');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({ success: 0, errors: 0, updated: 0 });

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          toast({
            variant: 'destructive',
            title: 'Arquivo vazio',
            description: 'O arquivo não contém dados para importar.',
          });
          return;
        }

        const headerRow = jsonData[0] as unknown as string[];
        const rows = jsonData.slice(1).map((row) => {
          const obj: ParsedRow = {};
          (row as unknown as string[]).forEach((cell, index) => {
            if (headerRow[index]) {
              obj[headerRow[index]] = String(cell || '');
            }
          });
          return obj;
        }).filter((row) => Object.values(row).some((v) => v));

        setHeaders(headerRow.filter(Boolean));
        setData(rows);
        setStep('mapping');

        // Auto-map columns
        const autoMapping = { ...defaultMapping };
        headerRow.forEach((header) => {
          const headerLower = header?.toLowerCase() || '';
          if (headerLower.includes('nome') && !autoMapping.nome) autoMapping.nome = header;
          if (headerLower.includes('cpf') && !autoMapping.cpf) autoMapping.cpf = header;
          if ((headerLower.includes('telefone') || headerLower.includes('celular') || headerLower.includes('fone')) && !autoMapping.telefone) autoMapping.telefone = header;
          if (headerLower.includes('email') && !autoMapping.email) autoMapping.email = header;
          if ((headerLower.includes('proposta') || headerLower.includes('contrato')) && !autoMapping.numero_proposta) autoMapping.numero_proposta = header;
          if (headerLower.includes('valor') && !autoMapping.valor) autoMapping.valor = header;
          if (headerLower.includes('instalação') || headerLower.includes('instalacao')) autoMapping.data_instalacao = header;
          if (headerLower.includes('vencimento')) autoMapping.data_vencimento = header;
          if (headerLower.includes('status') || headerLower.includes('situação') || headerLower.includes('situacao')) autoMapping.status = header;
        });
        setMapping(autoMapping);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao ler arquivo',
          description: 'Não foi possível ler o arquivo. Verifique se é um arquivo Excel ou CSV válido.',
        });
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      parseFile(file);
    }
  }, [parseFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  const parseDate = (value: string): string | null => {
    if (!value) return null;
    
    // Try different formats
    const formats = [
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    ];

    for (const format of formats) {
      const match = value.match(format);
      if (match) {
        if (format === formats[0]) {
          return `${match[3]}-${match[2]}-${match[1]}`;
        }
        if (format === formats[1]) {
          return value;
        }
        if (format === formats[2]) {
          return `${match[3]}-${match[2]}-${match[1]}`;
        }
      }
    }

    // Try parsing as Excel serial date
    const serial = parseFloat(value);
    if (!isNaN(serial) && serial > 0) {
      const date = XLSX.SSF.parse_date_code(serial);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    }

    return null;
  };

  const parseValor = (value: string): number => {
    if (!value) return 0;
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const handleImport = async () => {
    if (!mapping.cpf) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'Mapeie o campo CPF.',
      });
      return;
    }

    setStep('importing');
    setProgress(0);
    const results = { success: 0, errors: 0, updated: 0 };
    const errorDetails: { linha: number; erro: string }[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      setProgress(Math.round(((i + 1) / data.length) * 100));

      try {
        const cpf = row[mapping.cpf]?.trim();
        
        if (!cpf) {
          errorDetails.push({ linha: i + 2, erro: 'CPF inválido ou vazio' });
          results.errors++;
          continue;
        }
        
        const nome = mapping.nome ? row[mapping.nome]?.trim() : cpf;
        const telefone = mapping.telefone ? row[mapping.telefone]?.trim() || null : null;
        const email = mapping.email ? row[mapping.email]?.trim() || null : null;
        const numeroProposta = mapping.numero_proposta ? row[mapping.numero_proposta]?.trim() || null : null;
        const valor = mapping.valor ? parseValor(row[mapping.valor] || '') : 0;
        const dataInstalacao = mapping.data_instalacao ? parseDate(row[mapping.data_instalacao] || '') : null;
        const dataVencimento = mapping.data_vencimento 
          ? parseDate(row[mapping.data_vencimento] || '') 
          : new Date().toISOString().split('T')[0];
        const statusNome = mapping.status ? row[mapping.status]?.trim()?.toLowerCase() : null;

        // Find or create cliente by CPF
        let clienteId: string | null = null;
        const existingCliente = clientes?.find((c) => c.cpf === cpf);

        if (existingCliente) {
          clienteId = existingCliente.id;
        } else {
          const { data: newCliente, error: clienteError } = await supabase
            .from('clientes')
            .insert([{ nome, cpf, telefone, email }])
            .select()
            .single();

          if (clienteError) {
            errorDetails.push({ linha: i + 2, erro: `Erro ao criar cliente: ${clienteError.message}` });
            results.errors++;
            continue;
          }
          clienteId = newCliente.id;
        }

        // Find status
        let statusId: string | null = null;
        if (statusNome) {
          const matchedStatus = statusList?.find(
            (s) => s.nome.toLowerCase() === statusNome
          );
          statusId = matchedStatus?.id || null;
        }

        // Create cobranca
        const { error: cobrancaError } = await supabase.from('cobrancas').insert([{
          cliente_id: clienteId,
          numero_proposta: numeroProposta,
          valor,
          data_instalacao: dataInstalacao,
          data_vencimento: dataVencimento,
          status_id: statusId,
          created_by: user?.id || null,
          updated_by: user?.id || null,
        }]);

        if (cobrancaError) {
          errorDetails.push({ linha: i + 2, erro: `Erro ao criar cobrança: ${cobrancaError.message}` });
          results.errors++;
        } else {
          results.success++;
        }
      } catch (error) {
        errorDetails.push({ linha: i + 2, erro: 'Erro inesperado' });
        results.errors++;
      }
    }

    // Log import
    await supabase.from('import_logs').insert([{
      user_id: user?.id || null,
      nome_arquivo: file?.name || 'unknown',
      registros_importados: results.success,
      registros_atualizados: results.updated,
      registros_erro: results.errors,
      detalhes_erro: errorDetails.length > 0 ? { errors: errorDetails } : null,
    }]);

    setResults(results);
    setStep('done');

    if (results.errors === 0) {
      toast({
        title: 'Importação concluída!',
        description: `${results.success} registros importados com sucesso.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Importação com erros',
        description: `${results.success} importados, ${results.errors} erros.`,
      });
    }
  };

  const resetImport = () => {
    setFile(null);
    setHeaders([]);
    setData([]);
    setMapping(defaultMapping);
    setStep('upload');
    setProgress(0);
    setResults({ success: 0, errors: 0, updated: 0 });
  };

  const getMappedData = () => {
    return data.slice(0, 5).map((row) => ({
      nome: row[mapping.nome] || '',
      cpf: row[mapping.cpf] || '',
      telefone: row[mapping.telefone] || '',
      valor: row[mapping.valor] || '',
      data_vencimento: row[mapping.data_vencimento] || '',
      status: row[mapping.status] || '',
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importar Planilha</h1>
        <p className="text-muted-foreground">Importe dados de Excel ou CSV</p>
      </div>

      {step === 'upload' && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Upload de Arquivo</CardTitle>
            <CardDescription>
              Arraste um arquivo ou clique para selecionar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors cursor-pointer ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-center text-muted-foreground">
                {isDragActive
                  ? 'Solte o arquivo aqui...'
                  : 'Arraste um arquivo Excel (.xlsx, .xls) ou CSV'}
              </p>
              <Button variant="outline" className="mt-4">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Selecionar Arquivo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'mapping' && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Mapeamento de Colunas</CardTitle>
            <CardDescription>
              Associe as colunas da planilha aos campos do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(fieldLabels) as (keyof ColumnMapping)[]).map((field) => (
                <div key={field} className="space-y-2">
                  <label className="text-sm font-medium">{fieldLabels[field]}</label>
                  <Select
                    value={mapping[field] || '__none__'}
                    onValueChange={(value) =>
                      setMapping((prev) => ({ ...prev, [field]: value === '__none__' ? '' : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="__none__">Não mapeado</SelectItem>
                      {headers.filter(h => h && h.trim() !== '').map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={resetImport}>
                Cancelar
              </Button>
              <Button onClick={() => setStep('preview')}>
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Preview dos Dados</CardTitle>
            <CardDescription>
              Verifique os primeiros registros antes de importar ({data.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getMappedData().map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.nome || '-'}</TableCell>
                      <TableCell>{row.cpf || '-'}</TableCell>
                      <TableCell>{row.telefone || '-'}</TableCell>
                      <TableCell>{row.valor || '-'}</TableCell>
                      <TableCell>{row.data_vencimento || '-'}</TableCell>
                      <TableCell>{row.status || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Voltar
              </Button>
              <Button onClick={handleImport}>
                Importar {data.length} registros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'importing' && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Importando...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="h-3" />
            <p className="mt-2 text-center text-muted-foreground">{progress}%</p>
          </CardContent>
        </Card>
      )}

      {step === 'done' && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              Importação Concluída
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <Check className="h-8 w-8 text-success" />
                <div>
                  <p className="text-2xl font-bold">{results.success}</p>
                  <p className="text-sm text-muted-foreground">Importados</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <AlertCircle className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold">{results.updated}</p>
                  <p className="text-sm text-muted-foreground">Atualizados</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <X className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{results.errors}</p>
                  <p className="text-sm text-muted-foreground">Erros</p>
                </div>
              </div>
            </div>

            <Button onClick={resetImport} className="mt-6">
              Nova Importação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
