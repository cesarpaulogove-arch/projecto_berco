"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import mqtt from "mqtt";
import type { MqttClient } from "mqtt";

import {
  ShieldCheck,
  LayoutDashboard,
  Camera,
  Activity,
  CreditCard,
  Users,
  Baby,
  UserCheck,
  UserPlus,
  Search,
  Wifi,
  WifiOff,
  RefreshCw,
  History,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  UserRoundCheck,
} from "lucide-react";

import Cameras from "./Cameras";
import Sensores from "./Sensores";
import RFIDRegistos from "./RFIDRegistos";
import Historicos from "./Historicos";

import type {
  TipoPessoa,
  PessoaRegistada,
  FormPessoa,
  DadosSistema,
  EventoHistorico,
} from "./types";

// ======================================================
// CONFIGURAÇÕES
// ======================================================

const CHAVE_REGISTOS = "bercario_registos_pessoas";
const CHAVE_HISTORICO = "bercario_historico";

const MQTT_URL = process.env.NEXT_PUBLIC_MQTT_URL;

const MQTT_TOPIC_TELEMETRIA =
  process.env.NEXT_PUBLIC_MQTT_TOPIC || "scada/telemetria";

const MQTT_TOPIC_RFID =
  process.env.NEXT_PUBLIC_MQTT_RFID_TOPIC || "scada/bercario/rfid";

const MQTT_TOPIC_EVENTOS =
  process.env.NEXT_PUBLIC_MQTT_EVENTOS_TOPIC || "scada/bercario/eventos";

const MQTT_DEVICE =
  process.env.NEXT_PUBLIC_MQTT_DEVICE || "ESP32_BERCARIO_01";

const TEMPO_SEM_DADOS = 15000;
const TEMPO_MAXIMO_VALIDACAO = 20000;
const MAXIMO_HISTORICO = 300;
const MAXIMO_EVENTOS_RFID_MEMORIA = 500;

// ======================================================
// TIPOS LOCAIS
// ======================================================

type PessoaComPresenca = PessoaRegistada & {
  presente?: boolean;
};

type OperacaoCrianca = "entrada" | "saida";

type RecolhaPendente = {
  criancaId: string;
  criancaNome: string;
  operacao: OperacaoCrianca;
  iniciadoEm: string;
};

type MensagemMQTT = Record<string, unknown>;

// ======================================================
// DADOS INICIAIS
// ======================================================

const dadosIniciais: DadosSistema = {
  temperatura: null,
  humidade: null,
  luminosidade: [null, null],
  gas: null,
  portas: [null, null, null],
  rfid: null,
  online: false,
  atualizadoEm: null,
};

const formularioInicial: FormPessoa = {
  tipo: "crianca",
  nome: "",
  telefone: "",
  uidRfid: "",
  criancaAssociada: "",
  dataNascimento: "",
  sala: "",
  categoria: "",
  validade: "",
  ativo: true,
  fotoResponsavel: "",
};

const cameras = [
  {
    nome: "Quarto 1",
    descricao: "ESP32-CAM · Transmissão original",
    url: process.env.NEXT_PUBLIC_CAM1_URL,
  },
  {
    nome: "Quarto 2",
    descricao: "ESP32-WROVER-DEV · Transmissão original",
    url: process.env.NEXT_PUBLIC_CAM2_URL,
  },
];

// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

function formatarHora(valor: string | null) {
  if (!valor) return "--:--:--";

  return new Date(valor).toLocaleTimeString("pt-MZ", {
    timeZone: "Africa/Maputo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function dataActualMaputo() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Maputo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const ano = partes.find((p) => p.type === "year")?.value;
  const mes = partes.find((p) => p.type === "month")?.value;
  const dia = partes.find((p) => p.type === "day")?.value;

  return `${ano}-${mes}-${dia}`;
}

function normalizarTexto(valor: string | undefined | null) {
  return (valor ?? "").trim().toLocaleLowerCase("pt-MZ");
}

function normalizarUID(valor: string | undefined | null) {
  return (valor ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

function criarId() {
  return crypto.randomUUID();
}

function lerRegistosLocais(): PessoaComPresenca[] {
  try {
    const dados = localStorage.getItem(CHAVE_REGISTOS);

    if (!dados) return [];

    const resultado: unknown = JSON.parse(dados);

    if (!Array.isArray(resultado)) return [];

    return resultado
      .filter(
        (item): item is PessoaRegistada =>
          item !== null &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.nome === "string" &&
          ["crianca", "encarregado", "autorizado"].includes(item.tipo)
      )
      .map((pessoa) => ({
        ...pessoa,
        telefone: pessoa.telefone ?? "",
        uidRfid: pessoa.uidRfid ?? "",
        criancaAssociada: pessoa.criancaAssociada ?? "",
        dataNascimento: pessoa.dataNascimento ?? "",
        sala: pessoa.sala ?? "",
        categoria: pessoa.categoria ?? "",
        validade: pessoa.validade ?? "",
        fotoResponsavel: pessoa.fotoResponsavel ?? "",
        ativo: pessoa.ativo !== false,
        presente:
          typeof pessoa.presente === "boolean"
            ? pessoa.presente
            : false,
      }));
  } catch {
    return [];
  }
}

function guardarRegistosLocais(registos: PessoaComPresenca[]) {
  try {
    localStorage.setItem(CHAVE_REGISTOS, JSON.stringify(registos));
    return true;
  } catch (error) {
    console.error("Erro ao guardar registos:", error);
    return false;
  }
}

function lerHistoricoLocal(): EventoHistorico[] {
  try {
    const dados = localStorage.getItem(CHAVE_HISTORICO);

    if (!dados) return [];

    const resultado: unknown = JSON.parse(dados);

    return Array.isArray(resultado) ? resultado : [];
  } catch {
    return [];
  }
}

function numeroValido(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor)
    ? valor
    : null;
}

function lerNumeroArray(
  valor: unknown,
  quantidade: number
): (number | null)[] {
  if (!Array.isArray(valor)) {
    return Array(quantidade).fill(null);
  }

  return Array.from(
    { length: quantidade },
    (_, indice) => numeroValido(valor[indice])
  );
}

function lerBooleanArray(
  valor: unknown,
  quantidade: number
): (boolean | null)[] {
  if (!Array.isArray(valor)) {
    return Array(quantidade).fill(null);
  }

  return Array.from(
    { length: quantidade },
    (_, indice) =>
      typeof valor[indice] === "boolean"
        ? valor[indice]
        : null
  );
}

function interpretarJSON(payload: Uint8Array): MensagemMQTT | null {
  try {
    const texto = new TextDecoder().decode(payload);
    const resultado: unknown = JSON.parse(texto);

    if (
      resultado === null ||
      typeof resultado !== "object" ||
      Array.isArray(resultado)
    ) {
      return null;
    }

    return resultado as MensagemMQTT;
  } catch {
    return null;
  }
}

function obterUIDMensagem(msg: MensagemMQTT): string | null {
  const possiveisCampos = [
    msg.uid,
    msg.rfid,
    msg.uid_rfid,
    msg.cartao,
  ];

  for (const valor of possiveisCampos) {
    if (typeof valor === "string" && valor.trim()) {
      return normalizarUID(valor);
    }
  }

  return null;
}

function obterIdentificadorEvento(msg: MensagemMQTT) {
  const identificador =
    msg.rfid_evento ??
    msg.event_id ??
    msg.sequencia ??
    msg.sequence ??
    msg.id;

  if (identificador === undefined || identificador === null) {
    return null;
  }

  return String(identificador);
}

// ======================================================
// DASHBOARD
// ======================================================

export default function Dashboard() {
  const [dados, setDados] = useState<DadosSistema>(dadosIniciais);

  const [erro, setErro] = useState(false);

  const [estadoMqtt, setEstadoMqtt] = useState<
    "ligando" | "online" | "offline"
  >("ligando");

  const [registos, setRegistos] = useState<PessoaComPresenca[]>([]);
  const [eventos, setEventos] = useState<EventoHistorico[]>([]);

  const [pesquisa, setPesquisa] = useState("");

  const [tipoFiltro, setTipoFiltro] = useState<
    "todos" | TipoPessoa
  >("todos");

  const [form, setForm] = useState<FormPessoa>(formularioInicial);

  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [mensagem, setMensagem] = useState("");

  const [tipoMensagem, setTipoMensagem] = useState<
    "sucesso" | "erro"
  >("sucesso");

  const [secaoAtiva, setSecaoAtiva] = useState("painel");

  const [carregado, setCarregado] = useState(false);

  const [recolhaPendente, setRecolhaPendente] =
    useState<RecolhaPendente | null>(null);

  const registosRef = useRef<PessoaComPresenca[]>([]);

  const recolhaPendenteRef = useRef<RecolhaPendente | null>(null);

  const ultimoRfid = useRef<string | null>(null);

  const ultimoEventoRfid = useRef<string | null>(null);

  const eventosRfidProcessados = useRef<Set<string>>(new Set());

  const ultimasPortas = useRef<(boolean | null)[]>([
    null,
    null,
    null,
  ]);

  const temporizadorValidacao =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const estadoLigacao = dados.online && !erro;

  // ====================================================
  // REFERÊNCIAS ACTUALIZADAS
  // ====================================================

  useEffect(() => {
    registosRef.current = registos;
  }, [registos]);

  useEffect(() => {
    recolhaPendenteRef.current = recolhaPendente;
  }, [recolhaPendente]);

  // ====================================================
  // HISTÓRICO
  // ====================================================

  const adicionarEvento = useCallback(
    (
      tipo: EventoHistorico["tipo"],
      titulo: string,
      descricao: string,
      estado: EventoHistorico["estado"] = "normal",
      identificacao?: string,
      local?: EventoHistorico["local"],
      metodoIdentificacao?: EventoHistorico["metodoIdentificacao"],
      equipamento?: string
    ) => {
      const novoEvento: EventoHistorico = {
        id: criarId(),
        tipo,
        titulo,
        descricao,
        identificacao,
        local,
        metodoIdentificacao,
        equipamento,
        dataHora: new Date().toISOString(),
        estado,
      };

      setEventos((anteriores) => {
        const novos = [
          novoEvento,
          ...anteriores,
        ].slice(0, MAXIMO_HISTORICO);

        try {
          localStorage.setItem(
            CHAVE_HISTORICO,
            JSON.stringify(novos)
          );
        } catch (error) {
          console.error("Não foi possível guardar o histórico:", error);
        }

        return novos;
      });
    },
    []
  );

  function limparHistorico() {
    setEventos([]);

    try {
      localStorage.removeItem(CHAVE_HISTORICO);
    } catch (error) {
      console.error("Não foi possível limpar o histórico:", error);
    }
  }

  // ====================================================
  // ACTUALIZAÇÃO DOS REGISTOS
  // ====================================================

  const actualizarRegistos = useCallback(
    (novosRegistos: PessoaComPresenca[]) => {
      if (!guardarRegistosLocais(novosRegistos)) {
        adicionarEvento(
          "sistema",
          "Erro ao guardar registos",
          "Não foi possível guardar os dados no armazenamento local.",
          "critico"
        );

        return false;
      }

      registosRef.current = novosRegistos;
      setRegistos(novosRegistos);

      return true;
    },
    [adicionarEvento]
  );

  // ====================================================
  // VALIDAÇÃO PENDENTE
  // ====================================================

  const actualizarRecolha = useCallback(
    (novaRecolha: RecolhaPendente | null) => {
      if (temporizadorValidacao.current) {
        clearTimeout(temporizadorValidacao.current);
        temporizadorValidacao.current = null;
      }

      recolhaPendenteRef.current = novaRecolha;
      setRecolhaPendente(novaRecolha);

      if (!novaRecolha) return;

      temporizadorValidacao.current = setTimeout(() => {
        const actual = recolhaPendenteRef.current;

        if (
          !actual ||
          actual.iniciadoEm !== novaRecolha.iniciadoEm
        ) {
          return;
        }

        recolhaPendenteRef.current = null;
        setRecolhaPendente(null);

        adicionarEvento(
          "bloqueio",
          "Tempo de validação expirado",
          `A operação de ${actual.operacao} de ${actual.criancaNome} expirou por falta do cartão do responsável.`,
          "critico",
          undefined,
          "recepcao",
          "sistema"
        );
      }, TEMPO_MAXIMO_VALIDACAO);
    },
    [adicionarEvento]
  );

  // ====================================================
  // CARREGAR DADOS LOCAIS
  // ====================================================

  useEffect(() => {
    const guardados = lerRegistosLocais();

    registosRef.current = guardados;

    setRegistos(guardados);
    setEventos(lerHistoricoLocal());
    setCarregado(true);

    return () => {
      if (temporizadorValidacao.current) {
        clearTimeout(temporizadorValidacao.current);
      }
    };
  }, []);

  // ====================================================
  // REGISTAR PRESENÇA DE ADULTOS
  // ====================================================

  const registarPresencaAdulto = useCallback(
    (pessoa: PessoaComPresenca, uid: string) => {
      const novaPresenca = pessoa.presente !== true;

      const novosRegistos = registosRef.current.map((item) =>
        item.id === pessoa.id
          ? { ...item, presente: novaPresenca }
          : item
      );

      if (!actualizarRegistos(novosRegistos)) {
        adicionarEvento(
          "bloqueio",
          "Operação não concluída",
          `Não foi possível actualizar a presença de ${pessoa.nome}.`,
          "critico",
          uid,
          "recepcao",
          "rfid"
        );

        return;
      }

      adicionarEvento(
        novaPresenca ? "entrada" : "saida",
        novaPresenca
          ? "Entrada de responsável registada"
          : "Saída de responsável registada",
        `${pessoa.nome}: ${novaPresenca ? "entrada" : "saída"} independente registada pelo cartão RFID.`,
        "normal",
        uid,
        "recepcao",
        "rfid"
      );
    },
    [actualizarRegistos, adicionarEvento]
  );

  // ====================================================
  // PROCESSAMENTO INTELIGENTE RFID
  // ====================================================

  const processarLeituraRFID = useCallback(
    (uidRecebido: string) => {
      const uid = normalizarUID(uidRecebido);

      if (!uid) return;

      const lista = registosRef.current;

      const pendente = recolhaPendenteRef.current;

      const pessoa = lista.find(
        (item) => normalizarUID(item.uidRfid) === uid
      );

      // ------------------------------------------------
      // CARTÃO DESCONHECIDO
      // ------------------------------------------------

      if (!pessoa) {
        adicionarEvento(
          "bloqueio",
          "Cartão não reconhecido",
          "Tentativa com cartão RFID sem registo associado.",
          "critico",
          uid,
          "recepcao",
          "rfid"
        );

        return;
      }

      // ------------------------------------------------
      // CARTÃO DESACTIVADO
      // ------------------------------------------------

      if (!pessoa.ativo) {
        adicionarEvento(
          "bloqueio",
          "Cartão desactivado",
          `O cartão associado a ${pessoa.nome} está desactivado.`,
          "critico",
          uid,
          "recepcao",
          "rfid"
        );

        return;
      }

      // ------------------------------------------------
      // ADULTOS: ENTRADA E SAÍDA INDEPENDENTES
      // ------------------------------------------------
      //
      // Um adulto não associado à criança pendente pode
      // registar a sua própria entrada ou saída.
      //
      // Um adulto associado à criança pendente valida
      // essa operação.
      // ------------------------------------------------

      if (
        pessoa.tipo === "encarregado" ||
        pessoa.tipo === "autorizado"
      ) {
        if (pendente) {
          const crianca = lista.find(
            (item) =>
              item.id === pendente.criancaId &&
              item.tipo === "crianca"
          );

          if (!crianca || !crianca.ativo) {
            adicionarEvento(
              "bloqueio",
              "Criança não disponível",
              "Não foi possível localizar um registo activo para a criança.",
              "critico",
              uid,
              "recepcao",
              "rfid"
            );

            actualizarRecolha(null);
            return;
          }

          const associacaoValida =
            normalizarTexto(pessoa.criancaAssociada) ===
            normalizarTexto(crianca.nome);

          if (associacaoValida) {
            // ------------------------------------------
            // VALIDADE DO AUTORIZADO
            // ------------------------------------------

            if (pessoa.tipo === "autorizado") {
              const hoje = dataActualMaputo();

              if (!pessoa.validade || pessoa.validade < hoje) {
                adicionarEvento(
                  "bloqueio",
                  "Autorização expirada",
                  `A autorização de ${pessoa.nome} para ${crianca.nome} está expirada.`,
                  "critico",
                  uid,
                  "recepcao",
                  "rfid"
                );

                actualizarRecolha(null);
                return;
              }
            }

            // ------------------------------------------
            // CONFIRMAR ESTADO DA CRIANÇA
            // ------------------------------------------

            const estadoEsperado =
              pendente.operacao === "entrada" ? false : true;

            if (crianca.presente !== estadoEsperado) {
              adicionarEvento(
                "bloqueio",
                "Estado de presença inválido",
                `O estado de presença de ${crianca.nome} foi alterado durante a validação.`,
                "critico",
                uid,
                "recepcao",
                "rfid"
              );

              actualizarRecolha(null);
              return;
            }

            // ------------------------------------------
            // ACTUALIZAR PRESENÇA DA CRIANÇA
            // ------------------------------------------

            const novaPresenca =
              pendente.operacao === "entrada";

            const novosRegistos = lista.map((item) =>
              item.id === crianca.id
                ? { ...item, presente: novaPresenca }
                : item
            );

            if (!actualizarRegistos(novosRegistos)) {
              adicionarEvento(
                "bloqueio",
                "Operação não concluída",
                "A validação foi positiva, mas não foi possível guardar a alteração.",
                "critico"
              );

              actualizarRecolha(null);
              return;
            }

            adicionarEvento(
              pendente.operacao,
              pendente.operacao === "entrada"
                ? "Entrada de criança autorizada"
                : "Saída de criança autorizada",
              `${crianca.nome}: ${pendente.operacao} validada pelo responsável ${pessoa.nome}.`,
              "normal",
              uid,
              "recepcao",
              "rfid"
            );

            actualizarRecolha(null);
            return;
          }

          // --------------------------------------------
          // ADULTO NÃO ASSOCIADO À CRIANÇA PENDENTE
          // --------------------------------------------
          //
          // A presença do adulto é processada normalmente.
          // A validação da criança continua pendente.
          // --------------------------------------------

          adicionarEvento(
            "bloqueio",
            "Responsável não associado à validação pendente",
            `${pessoa.nome} não está associado à criança ${crianca.nome}. A validação da criança continua pendente.`,
            "alerta",
            uid,
            "recepcao",
            "rfid"
          );

          registarPresencaAdulto(pessoa, uid);
          return;
        }

        // Sem criança pendente: adulto entra ou sai livremente.
        registarPresencaAdulto(pessoa, uid);
        return;
      }

      // ------------------------------------------------
      // CRIANÇA: PRIMEIRA LEITURA
      // ------------------------------------------------

      if (pessoa.tipo === "crianca") {
        const operacao: OperacaoCrianca =
          pessoa.presente === true ? "saida" : "entrada";

        const novaRecolha: RecolhaPendente = {
          criancaId: pessoa.id,
          criancaNome: pessoa.nome,
          operacao,
          iniciadoEm: new Date().toISOString(),
        };

        actualizarRecolha(novaRecolha);

        adicionarEvento(
          "rfid",
          operacao === "entrada"
            ? "Entrada pendente de validação"
            : "Saída pendente de validação",
          `${pessoa.nome} apresentou o cartão. Aguarda o cartão do responsável associado.`,
          "alerta",
          uid,
          "recepcao",
          "rfid"
        );
      }
    },
    [
      adicionarEvento,
      actualizarRegistos,
      actualizarRecolha,
      registarPresencaAdulto,
    ]
  );

  // ====================================================
  // DEDUPLICAÇÃO DE EVENTOS RFID
  // ====================================================

  const processarEventoRFID = useCallback(
    (msg: MensagemMQTT) => {
      if (
        msg.dispositivo !== undefined &&
        msg.dispositivo !== MQTT_DEVICE
      ) {
        return;
      }

      const uid = obterUIDMensagem(msg);

      if (!uid) return;

      const identificador = obterIdentificadorEvento(msg);

      if (identificador !== null) {
        const chave = `${MQTT_DEVICE}:${identificador}:${uid}`;

        if (eventosRfidProcessados.current.has(chave)) {
          return;
        }

        eventosRfidProcessados.current.add(chave);

        if (
          eventosRfidProcessados.current.size >
          MAXIMO_EVENTOS_RFID_MEMORIA
        ) {
          const primeiro = eventosRfidProcessados.current
            .values()
            .next().value;

          if (primeiro) {
            eventosRfidProcessados.current.delete(primeiro);
          }
        }

        ultimoEventoRfid.current = identificador;
        ultimoRfid.current = uid;

        processarLeituraRFID(uid);
        return;
      }

      // Compatibilidade com firmware antigo.
      // Sem identificador único não é possível garantir
      // a detecção de duas passagens consecutivas iguais.

      if (ultimoRfid.current !== uid) {
        ultimoRfid.current = uid;
        processarLeituraRFID(uid);
      }
    },
    [processarLeituraRFID]
  );

  // ====================================================
  // CANCELAR VALIDAÇÃO PENDENTE
  // ====================================================

  const cancelarRecolha = useCallback(() => {
    const pendente = recolhaPendenteRef.current;

    if (!pendente) return;

    actualizarRecolha(null);

    adicionarEvento(
      "bloqueio",
      "Validação cancelada",
      `A operação de ${pendente.operacao} de ${pendente.criancaNome} foi cancelada pelo funcionário.`,
      "alerta",
      undefined,
      "recepcao",
      "manual"
    );
  }, [adicionarEvento, actualizarRecolha]);

  // ====================================================
  // PROCESSAMENTO DE PORTAS
  // ====================================================

  const processarPortas = useCallback(
    (portas: (boolean | null)[]) => {
      const nomesPortas = [
        "Porta da recepção",
        "Porta do quarto 1",
        "Porta do quarto 2",
      ];

      portas.forEach((aberta, indice) => {
        const anterior = ultimasPortas.current[indice];

        if (aberta === null || anterior === null) return;

        if (aberta === anterior) return;

        const local: EventoHistorico["local"] =
          indice === 0
            ? "recepcao"
            : indice === 1
              ? "quarto_1"
              : "quarto_2";

        adicionarEvento(
          aberta ? "abertura" : "fechamento",
          aberta
            ? `${nomesPortas[indice]} aberta`
            : `${nomesPortas[indice]} fechada`,
          aberta
            ? `${nomesPortas[indice]} foi aberta.`
            : `${nomesPortas[indice]} foi fechada.`,
          aberta ? "alerta" : "normal",
          undefined,
          local,
          "sensor",
          `Sensor magnético ${indice + 1}`
        );
      });

      ultimasPortas.current = portas;
    },
    [adicionarEvento]
  );

  // ====================================================
  // PROCESSAMENTO DE EVENTOS MQTT
  // ====================================================

  const processarEventoMQTT = useCallback(
    (msg: MensagemMQTT) => {
      if (
        msg.dispositivo !== undefined &&
        msg.dispositivo !== MQTT_DEVICE
      ) {
        return;
      }

      const tipoRecebido = String(
        msg.tipo ?? msg.evento ?? msg.event ?? ""
      ).toLowerCase();

      const descricao =
        typeof msg.descricao === "string"
          ? msg.descricao
          : typeof msg.mensagem === "string"
            ? msg.mensagem
            : "Evento recebido do controlador ESP32.";

      const equipamento =
        typeof msg.equipamento === "string"
          ? msg.equipamento
          : undefined;

      const identificacao =
        typeof msg.uid === "string"
          ? msg.uid
          : typeof msg.identificacao === "string"
            ? msg.identificacao
            : undefined;

      const localRecebido = String(msg.local ?? "").toLowerCase();

      const local: EventoHistorico["local"] =
        localRecebido.includes("quarto_1")
          ? "quarto_1"
          : localRecebido.includes("quarto_2")
            ? "quarto_2"
            : localRecebido.includes("recepcao")
              ? "recepcao"
              : "sistema";

      if (
        tipoRecebido === "rfid" ||
        tipoRecebido === "leitura_rfid"
      ) {
        processarEventoRFID(msg);
        return;
      }

      if (
        tipoRecebido === "abertura" ||
        tipoRecebido === "aberta" ||
        tipoRecebido === "porta_aberta"
      ) {
        adicionarEvento(
          "abertura",
          "Porta aberta",
          descricao,
          "alerta",
          identificacao,
          local,
          "sensor",
          equipamento
        );

        return;
      }

      if (
        tipoRecebido === "fechamento" ||
        tipoRecebido === "fechada" ||
        tipoRecebido === "porta_fechada"
      ) {
        adicionarEvento(
          "fechamento",
          "Porta fechada",
          descricao,
          "normal",
          identificacao,
          local,
          "sensor",
          equipamento
        );

        return;
      }

      adicionarEvento(
        "sensor",
        typeof msg.titulo === "string"
          ? msg.titulo
          : "Evento do controlador",
        descricao,
        msg.estado === "critico"
          ? "critico"
          : msg.estado === "alerta"
            ? "alerta"
            : "normal",
        identificacao,
        local,
        "sensor",
        equipamento
      );
    },
    [adicionarEvento, processarEventoRFID]
  );

  // ====================================================
  // COMUNICAÇÃO MQTT
  // ====================================================

  useEffect(() => {
    if (!carregado) return;

    if (!MQTT_URL) {
      console.error(
        "MQTT: NEXT_PUBLIC_MQTT_URL não está configurado."
      );

      setErro(true);
      setEstadoMqtt("offline");

      return;
    }

    let componenteAtivo = true;

    let temporizadorInatividade:
      | ReturnType<typeof setTimeout>
      | null = null;

    function limparTemporizador() {
      if (temporizadorInatividade) {
        clearTimeout(temporizadorInatividade);
        temporizadorInatividade = null;
      }
    }

    function marcarInatividade() {
      limparTemporizador();

      temporizadorInatividade = setTimeout(() => {
        if (!componenteAtivo) return;

        setDados((actual) => ({
          ...actual,
          online: false,
        }));

        setErro(true);
        setEstadoMqtt("offline");

        adicionarEvento(
          "sistema",
          "Comunicação interrompida",
          "Não foram recebidos dados recentes de telemetria do ESP32.",
          "alerta",
          undefined,
          "sistema",
          "sistema"
        );
      }, TEMPO_SEM_DADOS);
    }

    // --------------------------------------------------
    // TELEMETRIA
    // --------------------------------------------------

    function processarTelemetria(msg: MensagemMQTT) {
      if (
        msg.dispositivo !== undefined &&
        msg.dispositivo !== MQTT_DEVICE
      ) {
        return;
      }

      const temperatura = numeroValido(msg.temperatura);
      const humidade = numeroValido(msg.humidade);
      const gas = numeroValido(msg.gas);

      const luminosidade = lerNumeroArray(
        msg.luminosidade,
        2
      );

      const portas = lerBooleanArray(msg.portas, 3);

      const rfid = obterUIDMensagem(msg);

      const agora = new Date().toISOString();

      // Compatibilidade: também aceita RFID publicado
      // dentro da mensagem de telemetria.
      if (rfid) {
        processarEventoRFID(msg);
      } else {
        ultimoRfid.current = null;
      }

      processarPortas(portas);

      setDados({
        temperatura,
        humidade,
        luminosidade,
        gas,
        portas,
        rfid,
        online: msg.online !== false,
        atualizadoEm: agora,
      });

      setErro(false);
      setEstadoMqtt("online");

      marcarInatividade();
    }

    // --------------------------------------------------
    // RECEBER MENSAGENS
    // --------------------------------------------------

    function processarMensagem(
      topico: string,
      payload: Uint8Array
    ) {
      if (!componenteAtivo) return;

      const msg = interpretarJSON(payload);

      if (!msg) {
        console.error(
          `MQTT: mensagem JSON inválida no tópico ${topico}.`
        );

        return;
      }

      if (topico === MQTT_TOPIC_TELEMETRIA) {
        processarTelemetria(msg);
        return;
      }

      if (topico === MQTT_TOPIC_RFID) {
        if (
          msg.dispositivo !== undefined &&
          msg.dispositivo !== MQTT_DEVICE
        ) {
          return;
        }

        const uid = obterUIDMensagem(msg);

        if (uid) {
          setDados((actual) => ({
            ...actual,
            rfid: uid,
          }));
        }

        processarEventoRFID(msg);
        return;
      }

      if (topico === MQTT_TOPIC_EVENTOS) {
        processarEventoMQTT(msg);
      }
    }

    // --------------------------------------------------
    // LIGAÇÃO
    // --------------------------------------------------

    setEstadoMqtt("ligando");

    const cliente: MqttClient = mqtt.connect(MQTT_URL, {
      clientId: `bercario_web_${Math.random()
        .toString(16)
        .slice(2, 10)}`,
      clean: true,
      connectTimeout: 30000,
      reconnectPeriod: 5000,
      keepalive: 60,
      protocolVersion: 4,
    });

cliente.on("connect", () => {
  if (!componenteAtivo) return;

  const topicos = [
    MQTT_TOPIC_TELEMETRIA,
    MQTT_TOPIC_RFID,
    MQTT_TOPIC_EVENTOS,
  ];

  cliente.subscribe(
    topicos,
    { qos: 0 },
    (err) => {
      if (!componenteAtivo) return;

      if (err) {
        console.error("MQTT: erro ao subscrever tópicos:", err);

        setErro(true);
        setEstadoMqtt("offline");

        return;
      }

      setErro(false);
      setEstadoMqtt("online");

      adicionarEvento(
        "sistema",
        "Ligação MQTT estabelecida",
        `Subscrição activa: ${topicos.join(", ")}.`,
        "normal",
        undefined,
        "sistema",
        "sistema"
      );
    }
  );
});

    cliente.on("message", (topico, payload) => {
      processarMensagem(topico, payload);
    });

    cliente.on("reconnect", () => {
      if (!componenteAtivo) return;

      setEstadoMqtt("ligando");
    });

    cliente.on("offline", () => {
      if (!componenteAtivo) return;

      limparTemporizador();

      setErro(true);
      setEstadoMqtt("offline");

      setDados((actual) => ({
        ...actual,
        online: false,
      }));
    });

    cliente.on("close", () => {
      if (!componenteAtivo) return;

      setEstadoMqtt("offline");
    });

    cliente.on("error", (error) => {
      if (!componenteAtivo) return;

      console.error("MQTT:", error);

      setErro(true);
      setEstadoMqtt("offline");
    });

    return () => {
      componenteAtivo = false;

      limparTemporizador();

      cliente.removeAllListeners();
      cliente.end(true);
    };
  }, [
    carregado,
    adicionarEvento,
    processarEventoRFID,
    processarEventoMQTT,
    processarPortas,
  ]);

  // ====================================================
  // GESTÃO DO FORMULÁRIO
  // ====================================================

  function atualizarCampo<K extends keyof FormPessoa>(
    campo: K,
    valor: FormPessoa[K]
  ) {
    setForm((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function mostrarMensagem(
    texto: string,
    tipo: "sucesso" | "erro" = "sucesso"
  ) {
    setMensagem(texto);
    setTipoMensagem(tipo);
  }

  function limparFormulario() {
    setForm({ ...formularioInicial });
    setEditandoId(null);
    setMensagem("");
  }

  // ====================================================
  // GUARDAR PESSOA
  // ====================================================

  function guardarPessoa(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const nome = form.nome.trim();
    const uid = normalizarUID(form.uidRfid);

    if (!nome) {
      mostrarMensagem("Introduza o nome completo.", "erro");
      return;
    }

    if (!uid) {
      mostrarMensagem("Associe um cartão RFID à pessoa.", "erro");
      return;
    }

    if (
      form.tipo === "crianca" &&
      !form.dataNascimento
    ) {
      mostrarMensagem(
        "Introduza a data de nascimento da criança.",
        "erro"
      );

      return;
    }

    if (
      (form.tipo === "encarregado" ||
        form.tipo === "autorizado") &&
      !form.telefone.trim()
    ) {
      mostrarMensagem(
        "Introduza o contacto telefónico.",
        "erro"
      );

      return;
    }

    if (
      form.tipo !== "crianca" &&
      !form.criancaAssociada.trim()
    ) {
      mostrarMensagem(
        "Indique a criança associada.",
        "erro"
      );

      return;
    }

    if (
      form.tipo === "autorizado" &&
      !form.categoria.trim()
    ) {
      mostrarMensagem(
        "Indique a categoria da pessoa autorizada.",
        "erro"
      );

      return;
    }

    if (
      form.tipo === "autorizado" &&
      !form.validade
    ) {
      mostrarMensagem(
        "Defina a validade da autorização.",
        "erro"
      );

      return;
    }

    if (
      form.tipo === "autorizado" &&
      form.validade < dataActualMaputo()
    ) {
      mostrarMensagem(
        "A validade da autorização não pode estar no passado.",
        "erro"
      );

      return;
    }

    const duplicado = registosRef.current.some(
      (pessoa) =>
        normalizarUID(pessoa.uidRfid) === uid &&
        pessoa.id !== editandoId
    );

    if (duplicado) {
      mostrarMensagem(
        "Este cartão RFID já está associado a outro registo.",
        "erro"
      );

      return;
    }

    // --------------------------------------------------
    // VALIDAR ASSOCIAÇÃO DA CRIANÇA
    // --------------------------------------------------

    if (form.tipo !== "crianca") {
      const criancaExiste = registosRef.current.some(
        (pessoa) =>
          pessoa.tipo === "crianca" &&
          pessoa.ativo &&
          normalizarTexto(pessoa.nome) ===
            normalizarTexto(form.criancaAssociada)
      );

      if (!criancaExiste) {
        mostrarMensagem(
          "A criança indicada não existe ou está desactivada.",
          "erro"
        );

        return;
      }
    }

    let novosRegistos: PessoaComPresenca[];

    if (editandoId) {
      novosRegistos = registosRef.current.map((pessoa) =>
        pessoa.id === editandoId
          ? {
              ...pessoa,
              ...form,
              nome,
              uidRfid: uid,
              fotoResponsavel:
                form.fotoResponsavel || "",
            }
          : pessoa
      );
    } else {
      const novo: PessoaComPresenca = {
        ...form,
        nome,
        uidRfid: uid,
        fotoResponsavel: form.fotoResponsavel || "",
        id: criarId(),
        criadoEm: new Date().toISOString(),
        presente: false,
      };

      novosRegistos = [
        ...registosRef.current,
        novo,
      ];
    }

    if (!actualizarRegistos(novosRegistos)) {
      mostrarMensagem(
        "Não foi possível guardar os dados no navegador.",
        "erro"
      );

      return;
    }

    setForm({ ...formularioInicial });
    setEditandoId(null);

    mostrarMensagem(
      editandoId
        ? "Registo actualizado com sucesso."
        : "Registo guardado com sucesso."
    );
  }

  // ====================================================
  // EDITAR PESSOA
  // ====================================================

  function editarPessoa(pessoa: PessoaRegistada) {
    setForm({
      tipo: pessoa.tipo,
      nome: pessoa.nome,
      telefone: pessoa.telefone ?? "",
      uidRfid: pessoa.uidRfid ?? "",
      criancaAssociada: pessoa.criancaAssociada ?? "",
      dataNascimento: pessoa.dataNascimento ?? "",
      sala: pessoa.sala ?? "",
      categoria: pessoa.categoria ?? "",
      validade: pessoa.validade ?? "",
      ativo: pessoa.ativo,
      fotoResponsavel: pessoa.fotoResponsavel ?? "",
    });

    setEditandoId(pessoa.id);
    setMensagem("");
    setSecaoAtiva("registos");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ====================================================
  // ACTIVAR / DESACTIVAR PESSOA
  // ====================================================

  function alterarEstado(pessoa: PessoaRegistada) {
    const novosRegistos = registosRef.current.map((item) =>
      item.id === pessoa.id
        ? { ...item, ativo: !item.ativo }
        : item
    );

    if (!actualizarRegistos(novosRegistos)) {
      mostrarMensagem(
        "Não foi possível guardar a alteração.",
        "erro"
      );

      return;
    }

    adicionarEvento(
      "sistema",
      pessoa.ativo
        ? "Registo desactivado"
        : "Registo reactivado",
      `${pessoa.nome}: registo ${pessoa.ativo ? "desactivado" : "reactivado"}.`,
      "normal",
      pessoa.uidRfid,
      "recepcao",
      "manual"
    );

    mostrarMensagem(
      pessoa.ativo
        ? "Registo desactivado."
        : "Registo reactivado."
    );
  }

  // ====================================================
  // DADOS DERIVADOS
  // ====================================================

  const criancas = registos.filter(
    (pessoa) => pessoa.tipo === "crianca"
  );

  const encarregados = registos.filter(
    (pessoa) => pessoa.tipo === "encarregado"
  );

  const autorizados = registos.filter(
    (pessoa) => pessoa.tipo === "autorizado"
  );

  const criancasPresentes = criancas.filter(
    (pessoa) => pessoa.presente === true
  );

  const registosFiltrados = registos.filter((pessoa) => {
    const correspondeTipo =
      tipoFiltro === "todos" ||
      pessoa.tipo === tipoFiltro;

    const termo = normalizarTexto(pesquisa);

    const correspondePesquisa =
      !termo ||
      normalizarTexto(pessoa.nome).includes(termo) ||
      normalizarTexto(pessoa.telefone).includes(termo) ||
      normalizarTexto(pessoa.uidRfid).includes(termo) ||
      normalizarTexto(pessoa.criancaAssociada).includes(termo);

    return correspondeTipo && correspondePesquisa;
  });

  function abrirRegisto(tipo: TipoPessoa) {
    limparFormulario();

    setForm({
      ...formularioInicial,
      tipo,
    });

    setSecaoAtiva("registos");
  }

  // ====================================================
  // INTERFACE
  // ====================================================

  return (
    <main className="min-h-screen bg-[#070B14] text-slate-100">
      {/* MENU LATERAL */}

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-800 bg-[#0B1120] lg:flex lg:flex-col">
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-6">
          <div className="rounded-xl bg-cyan-500/15 p-2.5 text-cyan-400">
            <ShieldCheck size={27} />
          </div>

          <div>
            <h1 className="text-sm font-bold">
              SISTEMA INTELIGENTE DE BERÇÁRIO
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Monitorização inteligente
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <button
            onClick={() => setSecaoAtiva("painel")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${
              secaoAtiva === "painel"
                ? "bg-cyan-500/10 text-cyan-300"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <LayoutDashboard size={19} />
            Painel principal
          </button>

          <button
            onClick={() => setSecaoAtiva("cameras")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${
              secaoAtiva === "cameras"
                ? "bg-cyan-500/10 text-cyan-300"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <Camera size={19} />
            Câmaras
          </button>

          <button
            onClick={() => setSecaoAtiva("sensores")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${
              secaoAtiva === "sensores"
                ? "bg-cyan-500/10 text-cyan-300"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <Activity size={19} />
            Sensores
          </button>

          <button
            onClick={() => setSecaoAtiva("rfid")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${
              secaoAtiva === "rfid"
                ? "bg-cyan-500/10 text-cyan-300"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <CreditCard size={19} />
            Controlo RFID
          </button>

          <button
            onClick={() => setSecaoAtiva("historicos")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${
              secaoAtiva === "historicos"
                ? "bg-cyan-500/10 text-cyan-300"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <History size={19} />
            Históricos
          </button>

          <button
            onClick={() => abrirRegisto("crianca")}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-slate-400 hover:bg-slate-800"
          >
            <Baby size={19} />
            Registo de crianças
          </button>

          <button
            onClick={() => abrirRegisto("encarregado")}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-slate-400 hover:bg-slate-800"
          >
            <Users size={19} />
            Mães e encarregados
          </button>

          <button
            onClick={() => abrirRegisto("autorizado")}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-slate-400 hover:bg-slate-800"
          >
            <UserCheck size={19} />
            Outros autorizados
          </button>

          <button
            onClick={() => setSecaoAtiva("lista")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${
              secaoAtiva === "lista"
                ? "bg-cyan-500/10 text-cyan-300"
                : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            <Search size={19} />
            Consultar registos
          </button>
        </nav>

        <div className="m-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center gap-2 text-sm">
            {estadoLigacao ? (
              <Wifi
                size={17}
                className="text-emerald-400"
              />
            ) : (
              <WifiOff
                size={17}
                className="text-amber-400"
              />
            )}

            <span className="text-slate-300">
              Controlador ESP32
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            {estadoMqtt === "online"
              ? "MQTT conectado · Dados recebidos"
              : estadoMqtt === "ligando"
                ? "A ligar ao broker MQTT..."
                : "Sem ligação MQTT"}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            {registos.length} registos neste navegador
          </p>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}

      <div className="lg:pl-64">
        {/* CABEÇALHO */}

        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#070B14]/95 px-5 py-4 backdrop-blur md:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">
              Centro de monitorização
            </p>

            <h2 className="mt-1 text-xl font-semibold md:text-2xl">
              {secaoAtiva === "painel"
                ? "Painel de controlo"
                : secaoAtiva === "registos"
                  ? editandoId
                    ? "Editar registo"
                    : "Registo de pessoas"
                  : secaoAtiva === "lista"
                    ? "Pessoas registadas"
                    : secaoAtiva === "cameras"
                      ? "Monitorização visual"
                      : secaoAtiva === "sensores"
                        ? "Sensores"
                        : secaoAtiva === "rfid"
                          ? "Controlo RFID"
                          : "Históricos"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${
                estadoLigacao
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  estadoLigacao
                    ? "bg-emerald-400"
                    : "bg-amber-400"
                }`}
              />

              {estadoLigacao
                ? "Sistema online"
                : "Sem ligação"}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-slate-700 p-2.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Actualizar página"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        <div className="space-y-8 p-5 md:p-8">
          {/* PAINEL PRINCIPAL */}

          {secaoAtiva === "painel" && (
            <>
              <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => abrirRegisto("crianca")}
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    <UserPlus size={18} />
                    Novo registo
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
                  {[
                    {
                      nome: "Total de pessoas",
                      total: registos.length,
                      filtro: "todos" as const,
                      Icon: Users,
                    },
                    {
                      nome: "Crianças",
                      total: criancas.length,
                      filtro: "crianca" as const,
                      Icon: Baby,
                    },
                    {
                      nome: "Mães / Encarregados",
                      total: encarregados.length,
                      filtro: "encarregado" as const,
                      Icon: Users,
                    },
                    {
                      nome: "Outros autorizados",
                      total: autorizados.length,
                      filtro: "autorizado" as const,
                      Icon: UserCheck,
                    },
                  ].map(({ nome, total, filtro, Icon }) => (
                    <button
                      key={nome}
                      onClick={() => {
                        setTipoFiltro(filtro);
                        setPesquisa("");
                        setSecaoAtiva("lista");
                      }}
                      className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-3 text-left transition hover:border-slate-600 sm:rounded-2xl sm:p-5"
                    >
                      <Icon
                        size={24}
                        className="text-cyan-400"
                      />

                      <p className="mt-2 break-words text-xs leading-tight text-slate-400 sm:mt-4 sm:text-sm">
                        {nome}
                      </p>

                      <p className="mt-1 text-xl font-semibold sm:text-3xl">
                        {total}
                      </p>

                      <p className="mt-1 text-[10px] text-slate-500 sm:mt-2 sm:text-xs">
                        Ver registos →
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              {/* PRESENÇA */}

              <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">
                      Presença no berçário
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                      Crianças com entrada validada pelo responsável
                    </p>
                  </div>

                  <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-emerald-400">
                    <span className="text-2xl font-bold">
                      {criancasPresentes.length}
                    </span>

                    <span className="ml-2 text-xs">
                      presentes
                    </span>
                  </div>
                </div>

                {criancasPresentes.length > 0 ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {criancasPresentes.map((crianca) => (
                      <div
                        key={crianca.id}
                        className="rounded-xl border border-slate-700 bg-slate-950/50 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Baby
                            size={18}
                            className="text-cyan-400"
                          />

                          <span className="text-sm font-medium">
                            {crianca.nome}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-emerald-400">
                          Presente no berçário
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    Não existem crianças registadas como presentes.
                  </p>
                )}
              </section>

              <section>
                <Sensores dados={dados} />
              </section>

              <section>
                <Cameras cameras={cameras} />
              </section>
            </>
          )}

          {/* CÂMARAS */}

          {secaoAtiva === "cameras" && (
            <Cameras cameras={cameras} />
          )}

          {/* SENSORES */}

          {secaoAtiva === "sensores" && (
            <Sensores dados={dados} />
          )}

          {/* RFID */}

          {secaoAtiva === "rfid" && (
            <section className="space-y-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-violet-500/10 p-3 text-violet-400">
                    <CreditCard size={25} />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold">
                      Leitor RFID RC522
                    </h3>

                    <p className="mt-1 break-all text-sm text-slate-400">
                      {dados.rfid ?? "A aguardar leitura de cartão"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setForm({
                      ...formularioInicial,
                      uidRfid: dados.rfid ?? "",
                    });

                    setEditandoId(null);
                    setMensagem("");
                    setSecaoAtiva("registos");
                  }}
                  className="mt-5 rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Preparar registo com o último UID
                </button>

                <p className="mt-3 text-xs leading-5 text-amber-400">
                  A leitura do UID identifica o cartão, mas não
                  confirma, por si só, a identidade do portador
                  nem autoriza o acesso físico.
                </p>
              </div>

              {/* VALIDAÇÃO DA CRIANÇA */}

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
                    <UserRoundCheck size={23} />
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      Validação de entrada e saída de crianças
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      Dois cartões: criança + responsável associado
                    </p>
                  </div>
                </div>

                {!recolhaPendente && (
                  <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 size={19} />

                      <span className="text-sm font-medium">
                        Sem validações pendentes
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      A criança deve passar primeiro o seu cartão.
                      Em seguida, o responsável associado deve
                      apresentar o seu cartão.
                    </p>
                  </div>
                )}

                {recolhaPendente && (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                      <div className="flex items-center gap-2 text-amber-400">
                        <AlertTriangle size={19} />

                        <span className="text-sm font-semibold">
                          {recolhaPendente.operacao === "entrada"
                            ? "Entrada pendente de validação"
                            : "Saída pendente de validação"}
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-sm">
                        <p className="text-slate-400">
                          Criança:
                          <span className="ml-2 font-semibold text-white">
                            {recolhaPendente.criancaNome}
                          </span>
                        </p>

                        <p className="text-slate-400">
                          Operação:
                          <span className="ml-2 font-semibold text-white">
                            {recolhaPendente.operacao === "entrada"
                              ? "Entrada"
                              : "Saída"}
                          </span>
                        </p>

                        <p className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock size={14} />
                          Iniciado às{" "}
                          {formatarHora(recolhaPendente.iniciadoEm)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                      <div className="flex items-center gap-2 text-cyan-400">
                        <CreditCard size={18} />

                        <span className="text-sm font-semibold">
                          A aguardar cartão do responsável
                        </span>
                      </div>

                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Passe o cartão da mãe, encarregado ou pessoa
                        autorizada associada a esta criança. Se os
                        dados não corresponderem, a validação não
                        será concluída.
                      </p>
                    </div>

                    <button
                      onClick={cancelarRecolha}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10"
                    >
                      <XCircle size={17} />
                      Cancelar validação
                    </button>
                  </div>
                )}
              </div>

              <RFIDRegistos
                dados={dados}
                registos={registos}
                form={form}
                editandoId={editandoId}
                pesquisa={pesquisa}
                tipoFiltro={tipoFiltro}
                mensagem={mensagem}
                tipoMensagem={tipoMensagem}
                carregado={carregado}
                setForm={setForm}
                setPesquisa={setPesquisa}
                setTipoFiltro={setTipoFiltro}
                atualizarCampo={atualizarCampo}
                guardarPessoa={guardarPessoa}
                limparFormulario={limparFormulario}
                editarPessoa={editarPessoa}
                alterarEstado={alterarEstado}
                mostrarMensagem={mostrarMensagem}
              />
            </section>
          )}

          {/* REGISTOS E CONSULTA */}

          {(secaoAtiva === "registos" ||
            secaoAtiva === "lista") && (
            <RFIDRegistos
              dados={dados}
              registos={
                secaoAtiva === "registos"
                  ? registos
                  : registosFiltrados
              }
              form={form}
              editandoId={editandoId}
              pesquisa={pesquisa}
              tipoFiltro={tipoFiltro}
              mensagem={mensagem}
              tipoMensagem={tipoMensagem}
              carregado={carregado}
              setForm={setForm}
              setPesquisa={setPesquisa}
              setTipoFiltro={setTipoFiltro}
              atualizarCampo={atualizarCampo}
              guardarPessoa={guardarPessoa}
              limparFormulario={limparFormulario}
              editarPessoa={editarPessoa}
              alterarEstado={alterarEstado}
              mostrarMensagem={mostrarMensagem}
            />
          )}

          {/* HISTÓRICOS */}

          {secaoAtiva === "historicos" && (
            <Historicos
              eventos={eventos}
              limparHistorico={limparHistorico}
            />
          )}
        </div>
      </div>
    </main>
  );
}