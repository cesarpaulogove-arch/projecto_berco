import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    mensagem: "A telemetria é recebida diretamente através de MQTT.",
    protocolo: "MQTT",
    estado: "A aguardar dados do ESP32",
    atualizadoEm: new Date().toISOString(),
  });
}