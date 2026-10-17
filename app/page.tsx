
"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Camera,
  Thermometer,
  Droplets,
  Sun,
  Wind,
  DoorClosed,
  DoorOpen,
  CreditCard,
  Wifi,
  WifiOff,
  Activity,
  Clock,
  RefreshCw,
  AlertTriangle,
  LayoutDashboard,
  Radio,
  Eye,
  ShieldAlert,
  Baby,
  Users,
  UserCheck,
  UserPlus,
  Search,
  Pencil,
  UserX,
  Save,
  X,
  Phone,
  CalendarDays,
  DoorOpen as AccessIcon,
} from "lucide-react";

// ======================================================
// TIPOS
// ======================================================

type TipoPessoa = "crianca" | "encarregado" | "autorizado";

type PessoaRegistada = {
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
};

type DadosSistema = {
  temperatura: number | null;
  humidade: number | null;
  luminosidade: (number | null)[];
  gas: number | null;
  portas: (boolean | null)[];
  rfid: string | null;
  online: boolean;
  atualizadoEm: string | null;
};

type FormPessoa = Omit<
  PessoaRegistada,
  "id" | "criadoEm"
>;

const CHAVE_REGISTOS = "bercario_registos_pessoas";

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
};

const cameras = [
  {
    nome: "Câmara 01",
    descricao: "ESP32-CAM · Canal principal",
    url: process.env.NEXT_PUBLIC_CAM1_URL,
  },
  {
    nome: "Câmara 02",
    descricao: "ESP32-CAM · Canal secundário",
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

function lerRegistosLocais(): PessoaRegistada[] {
  try {
    const dados = localStorage.getItem(CHAVE_REGISTOS);
    if (!dados) return [];

    const resultado: unknown = JSON.parse(dados);

    if (!Array.isArray(resultado)) return [];

    return resultado.filter(
      (item): item is PessoaRegistada =>
        item !== null &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.nome === "string" &&
        ["crianca", "encarregado", "autorizado"].includes(item.tipo)
    );
  } catch {
    return [];
  }
}

function guardarRegistosLocais(registos: PessoaRegistada[]) {
  try {
    localStorage.setItem(CHAVE_REGISTOS, JSON.stringify(registos));
    return true;
  } catch {
    return false;
  }
}

function nomeTipo(tipo: TipoPessoa) {
  switch (tipo) {
    case "crianca":
      return "Criança";
    case "encarregado":
      return "Mãe / Encarregado";
    case "autorizado":
      return "Indivíduo autorizado";
  }
}

// ======================================================
// COMPONENTES
// ======================================================

function Indicador({
  titulo,
  valor,
  unidade,
  detalhe,
  icon: Icon,
  cor,
}: {
  titulo: string;
  valor: string | number;
  unidade?: string;
  detalhe: string;
  icon: typeof Thermometer;
  cor: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-slate-600">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{titulo}</span>
        <div className={`rounded-xl p-2 ${cor}`}>
          <Icon size={21} />
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight text-white">
          {valor}
        </span>
        {unidade && (
          <span className="text-sm text-slate-400">{unidade}</span>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">{detalhe}</p>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-700 bg-[#080E1A] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
      />
    </label>
  );
}

// ======================================================
// DASHBOARD
// ======================================================

export default function Dashboard() {
  const [dados, setDados] = useState<DadosSistema>(dadosIniciais);
  const [erro, setErro] = useState(false);
  const [registos, setRegistos] = useState<PessoaRegistada[]>([]);
  const [pesquisa, setPesquisa] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [form, setForm] = useState<FormPessoa>(formularioInicial);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"sucesso" | "erro">("sucesso");
  const [secaoAtiva, setSecaoAtiva] = useState("painel");
  const [ultimaConsulta, setUltimaConsulta] = useState<string | null>(null);
  const [carregado, setCarregado] = useState(false);

  // ----------------------------------------------------
  // CARREGAR REGISTOS DO NAVEGADOR
  // ----------------------------------------------------

  useEffect(() => {
    setRegistos(lerRegistosLocais());
    setCarregado(true);
  }, []);

  // ----------------------------------------------------
  // ATUALIZAR TELEMETRIA DO ESP32
  // ----------------------------------------------------

  useEffect(() => {
    let ativo = true;

    async function atualizar() {
      try {
        const resposta = await fetch("/api/telemetria", {
          cache: "no-store",
        });

        if (!resposta.ok) {
          throw new Error("Falha na comunicação");
        }

        const resultado = await resposta.json();

        if (ativo && resultado && resultado.temperatura !== undefined) {
          setDados({
            ...dadosIniciais,
            ...resultado,
            luminosidade: Array.isArray(resultado.luminosidade)
              ? resultado.luminosidade
              : dadosIniciais.luminosidade,
            portas: Array.isArray(resultado.portas)
              ? resultado.portas
              : dadosIniciais.portas,
          });

          setErro(false);
          setUltimaConsulta(new Date().toISOString());
        } else if (ativo) {
          setErro(true);
        }
      } catch {
        if (ativo) setErro(true);
      }
    }

    atualizar();
    const intervalo = window.setInterval(atualizar, 3000);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, []);

  // ----------------------------------------------------
  // GESTÃO LOCAL DE REGISTOS
  // ----------------------------------------------------

  function atualizarCampo<K extends keyof FormPessoa>(
    campo: K,
    valor: FormPessoa[K]
  ) {
    setForm((atual) => ({
      ...atual,
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
    setForm(formularioInicial);
    setEditandoId(null);
    setMensagem("");
  }

  function guardarPessoa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem("");

    const nome = form.nome.trim();
    const uid = form.uidRfid.trim().toUpperCase();

    if (!nome) {
      mostrarMensagem("Introduza o nome completo.", "erro");
      return;
    }

    if (form.tipo === "crianca" && !form.dataNascimento) {
      mostrarMensagem("Introduza a data de nascimento da criança.", "erro");
      return;
    }

    if (
      (form.tipo === "encarregado" || form.tipo === "autorizado") &&
      !form.telefone.trim()
    ) {
      mostrarMensagem("Introduza o contacto telefónico.", "erro");
      return;
    }

    if (form.tipo === "autorizado" && !form.categoria.trim()) {
      mostrarMensagem("Indique a categoria da pessoa autorizada.", "erro");
      return;
    }

    if (
      form.tipo !== "crianca" &&
      !form.criancaAssociada.trim()
    ) {
      mostrarMensagem(
        "Indique a criança associada a esta pessoa.",
        "erro"
      );
      return;
    }

    if (
      form.tipo === "autorizado" &&
      !form.validade
    ) {
      mostrarMensagem(
        "Defina a data de validade da autorização.",
        "erro"
      );
      return;
    }

    const duplicado = registos.some(
      (p) =>
        uid !== "" &&
        p.uidRfid.toUpperCase() === uid &&
        p.id !== editandoId
    );

    if (duplicado) {
      mostrarMensagem(
        "Este cartão RFID já está associado a um registo.",
        "erro"
      );
      return;
    }

    const agora = new Date().toISOString();

    let novosRegistos: PessoaRegistada[];

    if (editandoId) {
      novosRegistos = registos.map((p) =>
        p.id === editandoId
          ? {
              ...p,
              ...form,
              nome,
              uidRfid: uid,
            }
          : p
      );
    } else {
      const novo: PessoaRegistada = {
        ...form,
        nome,
        uidRfid: uid,
        id: crypto.randomUUID(),
        criadoEm: agora,
      };

      novosRegistos = [...registos, novo];
    }

    if (!guardarRegistosLocais(novosRegistos)) {
      mostrarMensagem(
        "Não foi possível guardar. Verifique o espaço disponível e as permissões do navegador.",
        "erro"
      );
      return;
    }

    setRegistos(novosRegistos);
    setForm(formularioInicial);
    setEditandoId(null);

    mostrarMensagem(
      editandoId
        ? "Registo atualizado com sucesso."
        : "Registo guardado localmente com sucesso."
    );
  }

  function editarPessoa(pessoa: PessoaRegistada) {
    setForm({
      tipo: pessoa.tipo,
      nome: pessoa.nome,
      telefone: pessoa.telefone,
      uidRfid: pessoa.uidRfid,
      criancaAssociada: pessoa.criancaAssociada,
      dataNascimento: pessoa.dataNascimento,
      sala: pessoa.sala,
      categoria: pessoa.categoria,
      validade: pessoa.validade,
      ativo: pessoa.ativo,
    });

    setEditandoId(pessoa.id);
    setMensagem("");
    setSecaoAtiva("registos");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function alterarEstado(pessoa: PessoaRegistada) {
    const novosRegistos = registos.map((p) =>
      p.id === pessoa.id
        ? { ...p, ativo: !p.ativo }
        : p
    );

    if (!guardarRegistosLocais(novosRegistos)) {
      mostrarMensagem("Não foi possível guardar a alteração.", "erro");
      return;
    }

    setRegistos(novosRegistos);

    mostrarMensagem(
      pessoa.ativo
        ? "Registo desativado. A autorização fica marcada como inativa neste navegador."
        : "Registo reativado neste navegador."
    );
  }

  const valor = (n: number | null | undefined) =>
    n === null || n === undefined ? "--" : n;

  const estadoLigacao = dados.online && !erro;

  const criancas = registos.filter((p) => p.tipo === "crianca");
  const encarregados = registos.filter((p) => p.tipo === "encarregado");
  const autorizados = registos.filter((p) => p.tipo === "autorizado");

  const registosFiltrados = registos.filter((p) => {
    const correspondeTipo =
      tipoFiltro === "todos" || p.tipo === tipoFiltro;

    const termo = pesquisa.trim().toLowerCase();

    const correspondePesquisa =
      !termo ||
      p.nome.toLowerCase().includes(termo) ||
      p.telefone.toLowerCase().includes(termo) ||
      p.uidRfid.toLowerCase().includes(termo) ||
      p.criancaAssociada.toLowerCase().includes(termo);

    return correspondeTipo && correspondePesquisa;
  });

  // ----------------------------------------------------
  // INTERFACE
  // ----------------------------------------------------

  return (
    <main className="min-h-screen bg-[#070B14] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-800 bg-[#0B1120] lg:flex lg:flex-col">
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-6">
          <div className="rounded-xl bg-cyan-500/15 p-2.5 text-cyan-400">
            <ShieldCheck size={27} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide">
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
                ? "border border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <LayoutDashboard size={19} />
            Painel principal
          </button>

          <a href="#cameras" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
            <Camera size={19} /> Câmaras
          </a>

          <a href="#sensores" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
            <Activity size={19} /> Sensores
          </a>

          <a href="#acessos" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
            <CreditCard size={19} /> Controlo RFID
          </a>

          <a href="#portas" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">
            <DoorClosed size={19} /> Portas e janelas
          </a>

          <div className="px-4 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Gestão de pessoas
          </div>

          <button
            onClick={() => {
              limparFormulario();
              setForm({ ...formularioInicial, tipo: "crianca" });
              setSecaoAtiva("registos");
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${
              secaoAtiva === "registos" && form.tipo === "crianca"
                ? "bg-cyan-500/10 text-cyan-300"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Baby size={19} /> Registo de crianças
          </button>

          <button
            onClick={() => {
              limparFormulario();
              setForm({ ...formularioInicial, tipo: "encarregado" });
              setSecaoAtiva("registos");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <Users size={19} /> Mães e encarregados
          </button>

          <button
            onClick={() => {
              limparFormulario();
              setForm({ ...formularioInicial, tipo: "autorizado" });
              setSecaoAtiva("registos");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <UserCheck size={19} /> Outros autorizados
          </button>

          <button
            onClick={() => setSecaoAtiva("lista")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${
              secaoAtiva === "lista"
                ? "bg-cyan-500/10 text-cyan-300"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Search size={19} /> Consultar registos
          </button>
        </nav>

        <div className="m-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center gap-2 text-sm">
            {estadoLigacao ? (
              <Wifi size={17} className="text-emerald-400" />
            ) : (
              <WifiOff size={17} className="text-amber-400" />
            )}
            <span className="text-slate-300">Controlador ESP32</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {estadoLigacao ? "Ligação ativa" : "A aguardar ligação"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {registos.length} registos neste navegador
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#070B14]/95 px-5 py-4 backdrop-blur md:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">
              Centro de monitorização
            </p>
            <h2 className="mt-1 text-xl font-semibold md:text-2xl">
              {secaoAtiva === "painel"
                ? "Painel de controlo"
                : secaoAtiva === "registos"
                  ? editandoId ? "Editar registo" : "Registo de pessoas"
                  : "Pessoas registadas"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${
              estadoLigacao
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-400"
            }`}>
              <span className={`h-2 w-2 rounded-full ${
                estadoLigacao ? "bg-emerald-400" : "bg-amber-400"
              }`} />
              {estadoLigacao ? "Sistema online" : "Sem ligação"}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-slate-700 p-2.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Atualizar página"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        <div className="space-y-8 p-5 md:p-8">

          {/* ==========================================
              ÁREA DE REGISTOS
          ========================================== */}

          {secaoAtiva === "registos" && (
            <section className="space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 md:p-7">
                <div className="mb-6 flex items-start gap-4">
                  <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
                    <UserPlus size={25} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {editandoId ? "Editar dados da pessoa" : "Novo registo"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Os dados são guardados localmente neste navegador.
                    </p>
                  </div>
                </div>

                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                  {([
                    ["crianca", "Criança", Baby],
                    ["encarregado", "Mãe / Encarregado", Users],
                    ["autorizado", "Outro autorizado", UserCheck],
                  ] as const).map(([tipo, titulo, Icon]) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => {
                        setForm({ ...formularioInicial, tipo });
                        setEditandoId(null);
                        setMensagem("");
                      }}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                        form.tipo === tipo
                          ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                          : "border-slate-800 bg-[#080E1A] text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      <Icon size={22} />
                      <span className="text-sm font-medium">{titulo}</span>
                    </button>
                  ))}
                </div>

                <form onSubmit={guardarPessoa} className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Campo
                      label="Nome completo"
                      value={form.nome}
                      onChange={(v) => atualizarCampo("nome", v)}
                      required
                      placeholder="Introduza o nome completo"
                    />

                    {form.tipo === "crianca" && (
                      <Campo
                        label="Data de nascimento"
                        type="date"
                        value={form.dataNascimento}
                        onChange={(v) => atualizarCampo("dataNascimento", v)}
                        required
                      />
                    )}

                    {(form.tipo === "encarregado" || form.tipo === "autorizado") && (
                      <Campo
                        label="Contacto telefónico"
                        value={form.telefone}
                        onChange={(v) => atualizarCampo("telefone", v)}
                        required
                        placeholder="+258 8X XXX XXXX"
                      />
                    )}

                    {form.tipo === "crianca" && (
                      <Campo
                        label="Sala / turma"
                        value={form.sala}
                        onChange={(v) => atualizarCampo("sala", v)}
                        placeholder="Ex.: Berçário A"
                      />
                    )}

                    {form.tipo !== "crianca" && (
                      <label className="block">
                        <span className="mb-2 block text-sm text-slate-300">
                          Criança associada
                        </span>
                        <select
                          value={form.criancaAssociada}
                          onChange={(e) =>
                            atualizarCampo("criancaAssociada", e.target.value)
                          }
                          required
                          className="w-full rounded-xl border border-slate-700 bg-[#080E1A] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
                        >
                          <option value="">Selecione uma criança</option>
                          {criancas.map((crianca) => (
                            <option key={crianca.id} value={crianca.nome}>
                              {crianca.nome}
                            </option>
                          ))}
                        </select>
                        {criancas.length === 0 && (
                          <span className="mt-2 block text-xs text-amber-400">
                            Registe primeiro a criança para a poder associar.
                          </span>
                        )}
                      </label>
                    )}

                    {form.tipo === "autorizado" && (
                      <label className="block">
                        <span className="mb-2 block text-sm text-slate-300">
                          Categoria / parentesco
                        </span>
                        <select
                          value={form.categoria}
                          onChange={(e) => atualizarCampo("categoria", e.target.value)}
                          required
                          className="w-full rounded-xl border border-slate-700 bg-[#080E1A] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
                        >
                          <option value="">Selecione a categoria</option>
                          <option value="Pai">Pai</option>
                          <option value="Mãe">Mãe</option>
                          <option value="Familiar">Familiar</option>
                          <option value="Funcionário">Funcionário</option>
                          <option value="Transportador">Transportador</option>
                          <option value="Outro">Outro</option>
                        </select>
                      </label>
                    )}

                    {form.tipo === "encarregado" && (
                      <Campo
                        label="Parentesco (opcional)"
                        value={form.categoria}
                        onChange={(v) => atualizarCampo("categoria", v)}
                        placeholder="Ex.: Mãe, pai ou tutor"
                      />
                    )}

                    <Campo
                      label="UID do cartão RFID"
                      value={form.uidRfid}
                      onChange={(v) => atualizarCampo("uidRfid", v)}
                      placeholder="Ex.: A1B2C3D4"
                    />

                    {form.tipo === "autorizado" && (
                      <Campo
                        label="Validade da autorização"
                        type="date"
                        value={form.validade}
                        onChange={(v) => atualizarCampo("validade", v)}
                        required
                      />
                    )}
                  </div>

                  <p className="text-xs leading-5 text-slate-500">
                    O UID pode ser preenchido manualmente. O formulário ainda
                    não recebe automaticamente a leitura do RC522. Um cartão
                    vazio não identifica uma pessoa para o sistema físico.
                  </p>

                  {editandoId && (
                    <label className="flex items-center gap-3 rounded-xl border border-slate-800 p-4 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={form.ativo}
                        onChange={(e) => atualizarCampo("ativo", e.target.checked)}
                        className="h-4 w-4 accent-cyan-500"
                      />
                      Registo ativo
                    </label>
                  )}

                  {mensagem && (
                    <div className={`rounded-xl border p-4 text-sm ${
                      tipoMensagem === "erro"
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    }`}>
                      {mensagem}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={!carregado}
                      className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
                    >
                      <Save size={18} />
                      {editandoId ? "Guardar alterações" : "Registar pessoa"}
                    </button>

                    <button
                      type="button"
                      onClick={limparFormulario}
                      className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800"
                    >
                      <X size={18} />
                      Limpar
                    </button>

                    <button
                      type="button"
                      onClick={() => setSecaoAtiva("lista")}
                      className="rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800"
                    >
                      Consultar registos
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}

          {/* ==========================================
              LISTA E PESQUISA DE REGISTOS
          ========================================== */}

          {secaoAtiva === "lista" && (
            <section className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { nome: "Total de pessoas", total: registos.length, Icon: Users },
                  { nome: "Crianças", total: criancas.length, Icon: Baby },
                  { nome: "Mães / Encarregados", total: encarregados.length, Icon: Users },
                  { nome: "Outros autorizados", total: autorizados.length, Icon: UserCheck },
                ].map(({ nome, total, Icon }) => (
                  <div key={nome} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                    <Icon className="mb-4 text-cyan-400" size={23} />
                    <p className="text-sm text-slate-400">{nome}</p>
                    <p className="mt-2 text-3xl font-semibold">{total}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="mb-4 text-lg font-semibold">Consultar pessoas registadas</h3>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={pesquisa}
                      onChange={(e) => setPesquisa(e.target.value)}
                      placeholder="Pesquisar nome, telefone ou UID RFID"
                      className="w-full rounded-xl border border-slate-700 bg-[#080E1A] py-3 pl-10 pr-4 text-sm outline-none focus:border-cyan-500"
                    />
                  </div>

                  <select
                    value={tipoFiltro}
                    onChange={(e) => setTipoFiltro(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-[#080E1A] px-4 py-3 text-sm outline-none focus:border-cyan-500"
                  >
                    <option value="todos">Todos os tipos</option>
                    <option value="crianca">Crianças</option>
                    <option value="encarregado">Mães / Encarregados</option>
                    <option value="autorizado">Outros autorizados</option>
                  </select>
                </div>

                <div className="mt-5 space-y-3">
                  {registosFiltrados.map((pessoa) => (
                    <div
                      key={pessoa.id}
                      className="rounded-xl border border-slate-800 bg-[#080E1A] p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400">
                            {pessoa.tipo === "crianca" ? (
                              <Baby size={22} />
                            ) : pessoa.tipo === "encarregado" ? (
                              <Users size={22} />
                            ) : (
                              <UserCheck size={22} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold">{pessoa.nome}</h4>
                              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                                {nomeTipo(pessoa.tipo)}
                              </span>
                              <span className={`rounded-full px-2.5 py-1 text-xs ${
                                pessoa.ativo
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-rose-500/10 text-rose-400"
                              }`}>
                                {pessoa.ativo ? "Ativo" : "Inativo"}
                              </span>
                            </div>

                            <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                              {pessoa.telefone && (
                                <p className="flex items-center gap-2">
                                  <Phone size={14} />
                                  {pessoa.telefone}
                                </p>
                              )}
                              {pessoa.uidRfid && (
                                <p className="flex items-center gap-2">
                                  <CreditCard size={14} />
                                  RFID: {pessoa.uidRfid}
                                </p>
                              )}
                              {pessoa.criancaAssociada && (
                                <p className="flex items-center gap-2">
                                  <Baby size={14} />
                                  Criança: {pessoa.criancaAssociada}
                                </p>
                              )}
                              {pessoa.dataNascimento && (
                                <p className="flex items-center gap-2">
                                  <CalendarDays size={14} />
                                  Nascimento: {pessoa.dataNascimento}
                                </p>
                              )}
                              {pessoa.sala && <p>Sala: {pessoa.sala}</p>}
                              {pessoa.categoria && <p>Categoria: {pessoa.categoria}</p>}
                              {pessoa.validade && (
                                <p>Validade: {pessoa.validade}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => editarPessoa(pessoa)}
                            title="Editar registo"
                            className="rounded-lg border border-slate-700 p-2.5 text-cyan-400 hover:bg-slate-800"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            onClick={() => alterarEstado(pessoa)}
                            title={pessoa.ativo ? "Desativar" : "Reativar"}
                            className={`rounded-lg border border-slate-700 p-2.5 ${
                              pessoa.ativo
                                ? "text-rose-400 hover:bg-rose-500/10"
                                : "text-emerald-400 hover:bg-emerald-500/10"
                            }`}
                          >
                            <UserX size={17} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {registosFiltrados.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">
                      <Users size={30} className="mx-auto text-slate-600" />
                      <p className="mt-3 font-medium text-slate-300">
                        Nenhum registo encontrado
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Altere a pesquisa ou registe uma nova pessoa.
                      </p>
                      <button
                        onClick={() => {
                          limparFormulario();
                          setSecaoAtiva("registos");
                        }}
                        className="mt-4 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950"
                      >
                        Novo registo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ==========================================
              PAINEL DE MONITORIZAÇÃO
          ========================================== */}

          {secaoAtiva === "painel" && (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Indicador
                  titulo="Temperatura"
                  valor={valor(dados.temperatura)}
                  unidade="°C"
                  detalhe="Sensor DHT11"
                  icon={Thermometer}
                  cor="bg-orange-500/10 text-orange-400"
                />
                <Indicador
                  titulo="Humidade"
                  valor={valor(dados.humidade)}
                  unidade="%"
                  detalhe="Sensor DHT11"
                  icon={Droplets}
                  cor="bg-sky-500/10 text-sky-400"
                />
                <Indicador
                  titulo="Luminosidade 01"
                  valor={valor(dados.luminosidade[0])}
                  unidade={dados.luminosidade[0] === null ? "" : "%"}
                  detalhe="Sensor LDR 01"
                  icon={Sun}
                  cor="bg-yellow-500/10 text-yellow-400"
                />
                <Indicador
                  titulo="Fumo e gases"
                  valor={valor(dados.gas)}
                  detalhe="Leitura analógica MQ-2"
                  icon={Wind}
                  cor="bg-rose-500/10 text-rose-400"
                />
              </section>

              {/* RESUMO DOS REGISTOS */}

              <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">Gestão de pessoas</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Resumo dos registos armazenados neste navegador
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      limparFormulario();
                      setSecaoAtiva("registos");
                    }}
                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                  >
                    <UserPlus size={18} />
                    Novo registo
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { nome: "Total de pessoas", total: registos.length, Icon: Users, cor: "text-cyan-400" },
                    { nome: "Crianças", total: criancas.length, Icon: Baby, cor: "text-violet-400" },
                    { nome: "Mães / Encarregados", total: encarregados.length, Icon: Users, cor: "text-sky-400" },
                    { nome: "Outros autorizados", total: autorizados.length, Icon: UserCheck, cor: "text-emerald-400" },
                  ].map(({ nome, total, Icon, cor }) => (
                    <button
                      key={nome}
                      onClick={() => {
                        setTipoFiltro(
                          nome === "Crianças"
                            ? "crianca"
                            : nome === "Mães / Encarregados"
                              ? "encarregado"
                              : nome === "Outros autorizados"
                                ? "autorizado"
                                : "todos"
                        );
                        setPesquisa("");
                        setSecaoAtiva("lista");
                      }}
                      className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-slate-600"
                    >
                      <Icon size={24} className={cor} />
                      <p className="mt-4 text-sm text-slate-400">{nome}</p>
                      <p className="mt-1 text-3xl font-semibold">{total}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Ver registos <span aria-hidden="true">→</span>
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              {/* CÂMARAS */}

              <section id="cameras" className="scroll-mt-24">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Monitorização visual</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Transmissão das duas câmaras ESP32-CAM
                    </p>
                  </div>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    <Eye size={16} /> 2 canais
                  </span>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  {cameras.map((camera) => (
                    <div key={camera.nome} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
                            <Camera size={19} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{camera.nome}</p>
                            <p className="mt-1 text-xs text-slate-500">{camera.descricao}</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
                          {camera.url ? "Configurada" : "Por configurar"}
                        </span>
                      </div>

                      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-[#050911]">
                        {camera.url ? (
                          <img
                            src={camera.url}
                            alt={`Imagem da ${camera.nome}`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-3 px-6 text-center">
                            <Camera size={38} className="text-slate-600" />
                            <p className="font-medium text-slate-300">
                              Câmara ainda não configurada
                            </p>
                            <p className="max-w-xs text-xs leading-5 text-slate-500">
                              Configure o endereço de transmissão da ESP32-CAM.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* SENSORES */}

              <section id="sensores" className="scroll-mt-24">
                <h3 className="text-lg font-semibold">Sensores de luminosidade</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Estado individual dos dois sensores LDR
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {[0, 1].map((i) => (
                    <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                      <div className="rounded-xl bg-yellow-500/10 p-3 text-yellow-400">
                        <Sun size={23} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">LDR {String(i + 1).padStart(2, "0")}</p>
                        <p className="mt-1 text-xs text-slate-500">Nível de luminosidade</p>
                      </div>
                      <p className="text-xl font-semibold">
                        {valor(dados.luminosidade[i])}
                        {dados.luminosidade[i] === null ? "" : "%"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* PORTAS */}

              <section id="portas" className="scroll-mt-24">
                <h3 className="text-lg font-semibold">Portas e janelas</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Monitorização dos três sensores magnéticos Reed Switch
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {dados.portas.map((aberta, i) => (
                    <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                      <div className="flex items-center justify-between">
                        <div className="rounded-xl bg-slate-800 p-3 text-slate-300">
                          {aberta ? <DoorOpen size={22} /> : <DoorClosed size={22} />}
                        </div>
                        {aberta === null ? (
                          <span className="text-xs text-slate-500">Sem dados</span>
                        ) : aberta ? (
                          <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs text-rose-400">Aberta</span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">Fechada</span>
                        )}
                      </div>
                      <h4 className="mt-4 font-semibold">
                        Sensor magnético {String(i + 1).padStart(2, "0")}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">Porta / janela {i + 1}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* RFID */}

              <section id="acessos" className="scroll-mt-24">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">Controlo de acesso RFID</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Leitor RC522 · Última identificação recebida pela telemetria
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-violet-500/10 p-3 text-violet-400">
                      <CreditCard size={25} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Leitor RFID RC522</h4>
                      <p className="mt-1 text-sm text-slate-500">
                        {dados.rfid ?? "A aguardar leitura de cartão"}
                      </p>
                    </div>
                    <Radio size={20} className="text-slate-600" />
                  </div>

                  <button
                    onClick={() => {
                      setForm({ ...formularioInicial, uidRfid: dados.rfid ?? "" });
                      setEditandoId(null);
                      setSecaoAtiva("registos");
                    }}
                    className="mt-5 flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    <UserPlus size={17} />
                    Preparar registo com o último UID
                  </button>

                  <p className="mt-3 text-xs leading-5 text-amber-400">
                    Preparar o registo não confirma a identidade do portador.
                    A validação física do cartão ainda precisa de ser implementada
                    no controlador e no mecanismo de comunicação.
                  </p>
                </div>
              </section>

              {/* ESTADO DA COMUNICAÇÃO */}

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-start gap-3">
                  {erro ? (
                    <ShieldAlert size={21} className="mt-0.5 text-amber-400" />
                  ) : (
                    <AlertTriangle size={21} className="mt-0.5 text-slate-500" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">Estado da comunicação</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {erro
                        ? "Não foi possível obter dados atuais do endpoint de telemetria."
                        : estadoLigacao
                          ? "O controlador reportou ligação ativa."
                          : "A interface está pronta. Aguarda a ligação do ESP32 e o envio das leituras."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-5 text-xs text-slate-500">
                      <span className="flex items-center gap-2">
                        <Clock size={14} />
                        Última consulta: {formatarHora(ultimaConsulta)}
                      </span>
                      <span className="flex items-center gap-2">
                        <RefreshCw size={14} />
                        Consulta a cada 3 segundos
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          <footer className="border-t border-slate-800 pt-5 text-center text-xs text-slate-600">
            SMART SECURITY · Sistema de Monitorização Inteligente
            <p className="mt-2">
              Os registos de pessoas são armazenados localmente neste navegador.
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
