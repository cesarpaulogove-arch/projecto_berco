
"use client";

import {
  Thermometer,
  Droplets,
  Sun,
  Wind,
  DoorClosed,
  DoorOpen,
} from "lucide-react";

import type { DadosSistema } from "./types";

type SensoresProps = {
  dados: DadosSistema;
};

export default function Sensores({ dados }: SensoresProps) {
  const valor = (n: number | null | undefined) =>
    n === null || n === undefined ? "--" : n;

  return (
    <div className="space-y-5 sm:space-y-8">

      {/* INDICADORES PRINCIPAIS */}

      <section className="grid grid-cols-3 gap-2 sm:gap-4">

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
          titulo="Fumo e gases"
          valor={valor(dados.gas)}
          unidade=""
          detalhe="Leitura analógica MQ-2"
          icon={Wind}
          cor="bg-rose-500/10 text-rose-400"
        />

      </section>

      {/* SENSORES DE LUMINOSIDADE */}

      <section id="sensores" className="scroll-mt-24">

        <div className="grid grid-cols-2 gap-2 sm:gap-4">

          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-2 sm:gap-4 sm:rounded-2xl sm:p-5"
            >
              <div className="shrink-0 rounded-lg bg-yellow-500/10 p-2 text-yellow-400 sm:rounded-xl sm:p-3">
                <Sun size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="break-words text-xs font-medium sm:text-sm">
                  LDR - LUMINOSIDADE {String(i + 1).padStart(2, "0")}
                </p>

                <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
                  Nível de luminosidade
                </p>
              </div>

              <p className="shrink-0 text-base font-semibold sm:text-xl">
                {valor(dados.luminosidade[i])}
                {dados.luminosidade[i] === null ? "" : "%"}
              </p>
            </div>
          ))}

        </div>
      </section>

      {/* PORTAS E JANELAS */}

      <section id="portas" className="scroll-mt-24">

        <div className="grid grid-cols-3 gap-2 sm:gap-4">

          {dados.portas.map((aberta, i) => (
            <div
              key={i}
              className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-2 sm:rounded-2xl sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-1">

                <div className="rounded-lg bg-slate-800 p-2 text-slate-300 sm:rounded-xl sm:p-3">
                  {aberta === null ? (
                    <DoorClosed size={20} />
                  ) : aberta ? (
                    <DoorOpen size={20} />
                  ) : (
                    <DoorClosed size={20} />
                  )}
                </div>

                {aberta === null ? (
                  <span className="text-[9px] text-slate-500 sm:text-xs">
                    Sem dados
                  </span>
                ) : aberta ? (
                  <span className="rounded-full bg-rose-500/10 px-2 py-1 text-[9px] text-rose-400 sm:text-xs">
                    Aberta
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] text-emerald-400 sm:text-xs">
                    Fechada
                  </span>
                )}

              </div>

              <h4 className="mt-3 break-words text-xs font-semibold sm:mt-4 sm:text-base">
                Sensor Magnético-Porta {String(i + 1).padStart(2, "0")}
              </h4>

              <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">
                Porta / janela {i + 1}
              </p>
            </div>
          ))}

        </div>
      </section>

    </div>
  );
}

/* INDICADOR */

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
  unidade: string;
  detalhe: string;
  icon: React.ElementType;
  cor: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-2 sm:rounded-2xl sm:p-5">

      <div className={`mb-2 inline-flex rounded-lg p-2 sm:mb-4 sm:rounded-xl sm:p-3 ${cor}`}>
        <Icon size={20} />
      </div>

      <p className="break-words text-xs text-slate-400 sm:text-sm">
        {titulo}
      </p>

      <p className="mt-1 text-xl font-semibold sm:mt-2 sm:text-3xl">
        {valor}
        <span className="ml-0.5 text-xs text-slate-400 sm:ml-1 sm:text-base">
          {unidade}
        </span>
      </p>

      <p className="mt-1 break-words text-[10px] text-slate-500 sm:mt-2 sm:text-xs">
        {detalhe}
      </p>

    </div>
  );
}
