export enum StatusArma {
  SEM_PERMISSAO = 'SEM_PERMISSAO',
  DEVOLVIDO_TOTAL = 'DEVOLVIDO_TOTAL',
}

export enum CategoriaItem {
  GERAL = 'GERAL',
  ARMA = 'ARMA',
  MEDICAMENTO = 'MEDICAMENTO',
  CONSUMIVEL = 'CONSUMIVEL',
}

export interface ControleArmasCreate {
  nickname: string;
  itemSlug: string;
  quantidade: number;
  dataHoraRetirada: Date;
  cidade: string;
  patente: string;
  statusArma?: StatusArma;
  motivoRetirada?: string;
  superiOrAutorizador?: string;
  observacoes?: string;
}

export interface ControleArmasUpdate {
  statusArma?: StatusArma;
  dataHoraDevolucao?: Date;
  observacoes?: string;
}
