
"use client";

import { useMemo, useState } from "react";

import {
  Search,
  Trash2,
  LogIn,
  LogOut,
  ShieldAlert,
  History,
  Filter,
  CalendarDays,
  Camera,
  CreditCard,
  DoorOpen,
  DoorClosed,
  MapPin,
  Cpu,
} from "lucide-react";

import type { EventoHistorico } from "./types";

type FiltroHistorico =
  | "todos"
  | "entrada"
  | "saida"
  | "bloqueio"
  | "camera"
  | "abertura"
  | "fechamento";

type FiltroLocal =
  | "todos"
  | "recepcao"
  | "quarto_1"
  | "quarto_2";

type HistoricosProps = {
  eventos: EventoHistorico[];
  limparHistorico?: () => void;
};

export default function Historicos({
  eventos,
  limparHistorico,
}: HistoricosProps) {
  const [filtro, setFiltro] =
    useState<FiltroHistorico>("todos");

  const [filtroLocal, setFiltroLocal] =
    useState<FiltroLocal>("todos");

  const [pesquisa, setPesquisa] = useState("");

  const eventosFiltrados = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();

    return eventos
      .filter((evento) => {
        if (filtro === "todos") return true;

        if (filtro === "bloqueio") {
          return (
            evento.tipo === "bloqueio" ||
            evento.tipo === "invasao"
          );
        }

        return evento.tipo === filtro;
      })
      .filter((evento) => {
        if (filtroLocal === "todos") return true;

        return evento.local === filtroLocal;
      })
      .filter((evento) => {
        if (!termo) return true;

        return [
          evento.titulo,
          evento.descricao,
          evento.identificacao,
          evento.identificacaoCamera,
          evento.equipamento,
          evento.local,
          evento.metodoIdentificacao,
        ].some((valor) =>
          (valor || "").toLowerCase().includes(termo)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.dataHora).getTime() -
          new Date(a.dataHora).getTime()
      );
  }, [eventos, filtro, filtroLocal, pesquisa]);

  const totalEntradas = eventos.filter(
    (e) => e.tipo === "entrada"
  ).length;

  const totalSaidas = eventos.filter(
    (e) => e.tipo === "saida"
  ).length;

  const totalBloqueios = eventos.filter(
    (e) =>
      e.tipo === "bloqueio" ||
      e.tipo === "invasao"
  ).length;

  const totalAberturas = eventos.filter(
    (e) => e.tipo === "abertura"
  ).length;

  const totalFechamentos = eventos.filter(
    (e) => e.tipo === "fechamento"
  ).length;

  function formatarData(data: string) {
    const dataValida = new Date(data);

    if (isNaN(dataValida.getTime())) {
      return "Data indisponível";
    }

    return dataValida.toLocaleString("pt-MZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function obterTipo(tipo: string) {
    const nomes: Record<string, string> = {
      entrada: "Entrada",
      saida: "Saída",
      bloqueio: "Bloqueio",
      invasao: "Invasão",
      abertura: "Abertura",
      fechamento: "Fechamento",
      camera: "Câmara",
      rfid: "RFID",
      porta: "Porta",
      sensor: "Sensor",
      sistema: "Sistema",
    };

    return nomes[tipo] || tipo;
  }

  function obterLocal(local?: string) {
    const nomes: Record<string, string> = {
      recepcao: "Recepção",
      quarto_1: "Quarto 1",
      quarto_2: "Quarto 2",
      sistema: "Sistema",
    };

    return local ? nomes[local] || local : "Não indicado";
  }

  function obterIcone(tipo: string) {
    switch (tipo) {
      case "entrada":
        return <LogIn size={15} />;

      case "saida":
        return <LogOut size={15} />;

      case "camera":
        return <Camera size={15} />;

      case "abertura":
        return <DoorOpen size={15} />;

      case "fechamento":
        return <DoorClosed size={15} />;

      case "rfid":
        return <CreditCard size={15} />;

      case "sensor":
      case "porta":
        return <Cpu size={15} />;

      default:
        return <ShieldAlert size={15} />;
    }
  }

  function obterCor(tipo: string) {
    const cores: Record<string, string> = {
      entrada:
        "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",

      saida:
        "bg-sky-500/15 text-sky-300 border border-sky-500/30",

      camera:
        "bg-violet-500/15 text-violet-300 border border-violet-500/30",

      abertura:
        "bg-amber-500/15 text-amber-300 border border-amber-500/30",

      fechamento:
        "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30",

      rfid:
        "bg-sky-500/15 text-sky-300 border border-sky-500/30",

      bloqueio:
        "bg-red-500/15 text-red-300 border border-red-500/30",

      invasao:
        "bg-red-500/15 text-red-300 border border-red-500/30",

      porta:
        "bg-amber-500/15 text-amber-300 border border-amber-500/30",

      sensor:
        "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30",

      sistema:
        "bg-slate-500/15 text-slate-300 border border-slate-500/30",
    };

    return (
      cores[tipo] ||
      "bg-slate-500/15 text-slate-300 border border-slate-500/30"
    );
  }

  function obterMetodo(metodo?: string) {
    const metodos: Record<string, string> = {
      rfid: "RFID",
      camera: "Câmara",
      sensor: "Sensor",
      manual: "Manual",
      sistema: "Sistema",
    };

    return metodo ? metodos[metodo] || metodo : "Não indicado";
  }

  function obterIdentificacao(evento: EventoHistorico) {
    if (evento.metodoIdentificacao === "camera") {
      return (
        evento.identificacaoCamera ||
        evento.identificacao ||
        "Detecção registada"
      );
    }

    if (
      evento.tipo === "abertura" ||
      evento.tipo === "fechamento"
    ) {
      return evento.equipamento || "Sensor de porta";
    }

    return evento.identificacao || "—";
  }

  function obterEstado(evento: EventoHistorico) {
    if (
      evento.tipo === "bloqueio" ||
      evento.tipo === "invasao" ||
      evento.estado === "critico"
    ) {
      return {
        nome: "Crítico",
        cor: "text-red-300",
        ponto: "bg-red-400",
      };
    }

    if (evento.estado === "alerta") {
      return {
        nome: "Alerta",
        cor: "text-amber-300",
        ponto: "bg-amber-400",
      };
    }

    if (evento.tipo === "abertura") {
      return {
        nome: "Aberta",
        cor: "text-amber-300",
        ponto: "bg-amber-400",
      };
    }

    if (evento.tipo === "fechamento") {
      return {
        nome: "Fechada",
        cor: "text-emerald-300",
        ponto: "bg-emerald-400",
      };
    }

    return {
      nome: "Registado",
      cor: "text-emerald-300",
      ponto: "bg-emerald-400",
    };
  }

  const filtros: {
    valor: FiltroHistorico;
    nome: string;
  }[] = [
    { valor: "todos", nome: "Todos" },
    { valor: "entrada", nome: "Entradas" },
    { valor: "saida", nome: "Saídas" },
    { valor: "bloqueio", nome: "Bloqueios" },
    { valor: "camera", nome: "Câmaras" },
    { valor: "abertura", nome: "Aberturas" },
    { valor: "fechamento", nome: "Fechamentos" },
  ];

  const locais: {
    valor: FiltroLocal;
    nome: string;
  }[] = [
    { valor: "todos", nome: "Todos os locais" },
    { valor: "recepcao", nome: "Recepção" },
    { valor: "quarto_1", nome: "Quarto 1" },
    { valor: "quarto_2", nome: "Quarto 2" },
  ];

  return (
    <div className="space-y-6 text-slate-100">

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <History className="text-emerald-400" size={23} />
          </div>

          <div>
            <h2 className="text-xl md:text-2xl font-bold">
              Histórico de Movimentos
            </h2>

            <p className="text-sm text-slate-400 mt-1">
              Controlo de acessos, câmaras e portas do berçário.
            </p>
          </div>
        </div>

        {limparHistorico && (
          <button
            onClick={limparHistorico}
            disabled={eventos.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-500/30 text-red-300 bg-red-500/5 hover:bg-red-500/15 disabled:opacity-40 transition"
          >
            <Trash2 size={16} />
            Limpar histórico
          </button>
        )}
      </div>

      {/* INDICADORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">

        <Indicador
          titulo="Total de entradas"
          total={totalEntradas}
          descricao="Entradas pela recepção"
          icone={<LogIn size={20} />}
          cor="text-emerald-400"
          fundo="bg-emerald-500/10"
        />

        <Indicador
          titulo="Total de saídas"
          total={totalSaidas}
          descricao="Saídas pela recepção"
          icone={<LogOut size={20} />}
          cor="text-sky-400"
          fundo="bg-sky-500/10"
        />

        <Indicador
          titulo="Total de bloqueios"
          total={totalBloqueios}
          descricao="Ocorrências de segurança"
          icone={<ShieldAlert size={20} />}
          cor="text-red-400"
          fundo="bg-red-500/10"
        />

        <Indicador
          titulo="Aberturas de portas"
          total={totalAberturas}
          descricao="Portas abertas"
          icone={<DoorOpen size={20} />}
          cor="text-amber-400"
          fundo="bg-amber-500/10"
        />

        <Indicador
          titulo="Fechamentos de portas"
          total={totalFechamentos}
          descricao="Portas fechadas"
          icone={<DoorClosed size={20} />}
          cor="text-cyan-400"
          fundo="bg-cyan-500/10"
        />
      </div>

      {/* FILTROS */}
      <div className="rounded-xl border border-slate-700 bg-[#142338] p-5 space-y-4">

        <div className="flex items-center gap-2">
          <Filter size={18} className="text-emerald-400" />

          <h3 className="font-semibold">
            Filtros de consulta
          </h3>
        </div>

        {/* FILTRO POR EVENTO */}
        <div className="flex flex-wrap gap-2">
          {filtros.map(({ valor, nome }) => (
            <button
              key={valor}
              onClick={() => setFiltro(valor)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                filtro === valor
                  ? "bg-emerald-500 text-[#071526] shadow-sm"
                  : "bg-[#1C3049] text-slate-300 hover:bg-[#29415E]"
              }`}
            >
              {nome}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-4">

          {/* FILTRO POR LOCAL */}
          <select
            value={filtroLocal}
            onChange={(e) =>
              setFiltroLocal(e.target.value as FiltroLocal)
            }
            className="border border-slate-600 bg-[#0B1728] rounded-lg px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-emerald-500"
          >
            {locais.map((local) => (
              <option key={local.valor} value={local.valor}>
                {local.nome}
              </option>
            ))}
          </select>

          {/* PESQUISA */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar pessoa, RFID, câmara, porta ou descrição..."
              className="w-full border border-slate-600 bg-[#0B1728] rounded-lg py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>

      {/* TABELA */}
      <div className="rounded-xl border border-slate-700 overflow-hidden bg-[#142338]">

        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div>
            <h3 className="font-semibold">
              Registos de movimentação
            </h3>

            <p className="text-xs text-slate-400 mt-1">
              Recepção, quartos 1 e 2, câmaras e portas.
            </p>
          </div>

          <span className="px-3 py-1.5 rounded-lg bg-[#1C3049] text-slate-300 text-xs font-medium">
            {eventosFiltrados.length} registo(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[1100px]">

            <thead className="bg-[#1C3049] text-slate-200">
              <tr>
                <th className="px-4 py-4 font-semibold whitespace-nowrap">
                  Data e hora
                </th>

                <th className="px-4 py-4 font-semibold">
                  Evento
                </th>

                <th className="px-4 py-4 font-semibold">
                  Local
                </th>

                <th className="px-4 py-4 font-semibold">
                  Método
                </th>

                <th className="px-4 py-4 font-semibold">
                  Pessoa / Equipamento
                </th>

                <th className="px-4 py-4 font-semibold">
                  Descrição
                </th>

                <th className="px-4 py-4 font-semibold">
                  Estado
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-700/80">

              {eventosFiltrados.length > 0 ? (
                eventosFiltrados.map((evento) => {
                  const estado = obterEstado(evento);

                  return (
                    <tr
                      key={evento.id}
                      className="hover:bg-[#1C3049]/70 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-slate-300">
                        <div className="flex items-center gap-2">
                          <CalendarDays
                            size={15}
                            className="text-slate-400"
                          />

                          {formatarData(evento.dataHora)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold ${obterCor(
                            evento.tipo
                          )}`}
                        >
                          {obterIcone(evento.tipo)}
                          {obterTipo(evento.tipo)}
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <MapPin
                            size={14}
                            className="text-slate-400"
                          />
                          {obterLocal(evento.local)}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {obterMetodo(evento.metodoIdentificacao)}
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-100">
                        {obterIdentificacao(evento)}
                      </td>

                      <td className="px-4 py-4 text-slate-300 min-w-48">
                        {evento.descricao}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${estado.cor}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${estado.ponto}`}
                          />

                          {estado.nome}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-14 text-slate-400"
                  >
                    <History
                      size={32}
                      className="mx-auto mb-3 text-slate-500"
                    />

                    <p className="font-medium text-slate-300">
                      Nenhum registo encontrado
                    </p>

                    <p className="text-xs mt-1 text-slate-500">
                      Os eventos registados aparecerão aqui.
                    </p>
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type IndicadorProps = {
  titulo: string;
  total: number;
  descricao: string;
  icone: React.ReactNode;
  cor: string;
  fundo: string;
};

function Indicador({
  titulo,
  total,
  descricao,
  icone,
  cor,
  fundo,
}: IndicadorProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-[#142338] p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-300">
          {titulo}
        </span>

        <div className={`p-2 rounded-lg ${fundo} ${cor}`}>
          {icone}
        </div>
      </div>

      <p className="text-3xl font-bold text-slate-100 mt-3">
        {total}
      </p>

      <p className="text-xs text-slate-400 mt-1">
        {descricao}
      </p>
    </div>
  );
}
