
export type TipoPessoa =
  | "crianca"
  | "encarregado"
  | "autorizado";

export type PessoaRegistada = {
  id: string;
  tipo: TipoPessoa;
  nome: string;
  telefone: string;
  uidRfid: string;
  criancaAssociada: string;
  dataNascimento: string;
  sala: string;
  categoria: string;
  validade: string;
  ativo: boolean;
  criadoEm: string;

  // Controlo de presença
  presente?: boolean;

  // Fotografia de referência do responsável
  fotoResponsavel?: string;
};

export type FormPessoa = Omit<
  PessoaRegistada,
  "id" | "criadoEm" | "presente"
>;

export type DadosSistema = {
  temperatura: number | null;
  humidade: number | null;
  luminosidade: (number | null)[];
  gas: number | null;
  portas: (boolean | null)[];
  rfid: string | null;
  online: boolean;
  atualizadoEm: string | null;
};

// Tipos de eventos do sistema
export type TipoEvento =
  | "entrada"
  | "saida"
  | "bloqueio"
  | "invasao"
  | "porta"
  | "abertura"
  | "fechamento"
  | "camera"
  | "rfid"
  | "sensor"
  | "sistema";

// Locais onde os eventos podem ocorrer
export type LocalEvento =
  | "recepcao"
  | "quarto_1"
  | "quarto_2"
  | "sistema";

// Métodos ou equipamentos responsáveis pelo evento
export type MetodoIdentificacao =
  | "rfid"
  | "camera"
  | "sensor"
  | "manual"
  | "sistema";

export type EventoHistorico = {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  descricao: string;

  // Identificação da pessoa ou equipamento
  identificacao?: string;
  identificacaoCamera?: string;

  // Origem do evento
  metodoIdentificacao?: MetodoIdentificacao;
  local?: LocalEvento;
  equipamento?: string;

  // Estado do evento
  estado: "normal" | "alerta" | "critico";

  dataHora: string;
};

// Estados do processo de recolha de uma criança
export type EstadoRecolha =
  | "inativo"
  | "aguardando_responsavel"
  | "aguardando_confirmacao"
  | "bloqueado";

export type RecolhaPendente = {
  criancaId: string;
  criancaNome: string;
  responsavelId?: string;
  responsavelNome?: string;
  iniciadoEm: string;
  estado: EstadoRecolha;
};
