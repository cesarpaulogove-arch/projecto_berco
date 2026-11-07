
"use client";

import { useState } from "react";
import {
  Camera,
  Eye,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

type CameraItem = {
  nome: string;
  descricao: string;
  url?: string;
};

type CamerasProps = {
  cameras: CameraItem[];
};

type EstadoCamera = "loading" | "online" | "offline";

export default function Cameras({ cameras }: CamerasProps) {
  const [actualizacoes, setActualizacoes] = useState<
    Record<string, number>
  >({});

  const [estados, setEstados] = useState<
    Record<string, EstadoCamera>
  >({});

  function actualizarCamera(nome: string) {
    setEstados((anterior) => ({
      ...anterior,
      [nome]: "loading",
    }));

    setActualizacoes((anterior) => ({
      ...anterior,
      [nome]: (anterior[nome] || 0) + 1,
    }));
  }

  return (
    <section id="cameras" className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs text-slate-500">
          <Eye size={16} />
          {cameras.length} canais de vídeo
        </span>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {cameras.map((camera) => {
          const nome = camera.nome;
          const cameraUrl = camera.url?.trim() || "";
          const refresh = actualizacoes[nome] || 0;
          const estado = estados[nome] || "loading";

          return (
            <div
              key={nome}
              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
            >
              {/* CABEÇALHO */}
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
                    <Camera size={19} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      {nome}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {camera.descricao}
                    </p>
                  </div>
                </div>

                <span
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
                    estado === "online"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : estado === "offline"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {estado === "online" ? (
                    <Wifi size={13} />
                  ) : estado === "offline" ? (
                    <WifiOff size={13} />
                  ) : (
                    <RefreshCw
                      size={13}
                      className="animate-spin"
                    />
                  )}

                  {estado === "online"
                    ? "Ligada"
                    : estado === "offline"
                      ? "Sem ligação"
                      : "A carregar"}
                </span>
              </div>

              {/* VÍDEO ORIGINAL */}
              <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-[#050911]">
                {cameraUrl && estado !== "offline" ? (
                  <img
                    key={`${nome}-${refresh}`}
                    src={cameraUrl}
                    alt={`Transmissão original da ${nome}`}
                    onLoad={() => {
                      setEstados((anterior) => ({
                        ...anterior,
                        [nome]: "online",
                      }));
                    }}
                    onError={() => {
                      setEstados((anterior) => ({
                        ...anterior,
                        [nome]: "offline",
                      }));
                    }}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 px-6 text-center">
                    {estado === "offline" ? (
                      <WifiOff
                        size={38}
                        className="text-red-400"
                      />
                    ) : (
                      <Camera
                        size={38}
                        className="text-slate-600"
                      />
                    )}

                    <p className="font-medium text-slate-300">
                      {!cameraUrl
                        ? "Câmara não configurada"
                        : "Câmara indisponível"}
                    </p>

                    <p className="max-w-xs text-xs leading-5 text-slate-500">
                      {!cameraUrl
                        ? "Configure o endereço de transmissão da ESP32-CAM."
                        : "Verifique a ligação Wi-Fi e o servidor da câmara."}
                    </p>
                  </div>
                )}

                {cameraUrl && estado === "online" && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/70 px-3 py-1.5 text-xs text-white">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    ESP32-CAM — Vídeo original
                  </div>
                )}
              </div>

              {/* RODAPÉ */}
              <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
                <span className="text-xs text-slate-500">
                  Transmissão directa · ESP32
                </span>

                {cameraUrl && (
                  <button
                    type="button"
                    onClick={() => actualizarCamera(nome)}
                    className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800"
                  >
                    <RefreshCw size={14} />
                    Actualizar vídeo
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
