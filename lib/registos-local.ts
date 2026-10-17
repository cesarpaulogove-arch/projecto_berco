
export type TipoPessoa = "crianca" | "encarregado" | "autorizado";

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
};

const CHAVE_REGISTOS = "bercario_registos_pessoas";

function verificarNavegador() {
  return typeof window !== "undefined";
}

export function listarRegistos(): PessoaRegistada[] {
  if (!verificarNavegador()) return [];

  try {
    const dados = localStorage.getItem(CHAVE_REGISTOS);
    return dados ? JSON.parse(dados) as PessoaRegistada[] : [];
  } catch {
    return [];
  }
}

export function guardarRegisto(
  pessoa: Omit<PessoaRegistada, "id" | "criadoEm">
): PessoaRegistada {
  if (!verificarNavegador()) {
    throw new Error("O armazenamento local não está disponível.");
  }

  const registos = listarRegistos();

  const uid = pessoa.uidRfid.trim().toUpperCase();

  if (uid && registos.some(
    (r) => r.uidRfid.toUpperCase() === uid
  )) {
    throw new Error("Este cartão RFID já está registado.");
  }

  const novoRegisto: PessoaRegistada = {
    ...pessoa,
    nome: pessoa.nome.trim(),
    telefone: pessoa.telefone.trim(),
    uidRfid: uid,
    id: crypto.randomUUID(),
    criadoEm: new Date().toISOString(),
  };

  localStorage.setItem(
    CHAVE_REGISTOS,
    JSON.stringify([...registos, novoRegisto])
  );

  return novoRegisto;
}

export function atualizarRegisto(
  id: string,
  alteracoes: Partial<PessoaRegistada>
): void {
  if (!verificarNavegador()) {
    throw new Error("O armazenamento local não está disponível.");
  }

  const registos = listarRegistos();
  const uid = alteracoes.uidRfid?.trim().toUpperCase();

  if (uid && registos.some(
    (r) => r.id !== id && r.uidRfid.toUpperCase() === uid
  )) {
    throw new Error("Este cartão RFID já está associado a outra pessoa.");
  }

  const atualizados = registos.map((r) =>
    r.id === id
      ? {
          ...r,
          ...alteracoes,
          nome: alteracoes.nome?.trim() ?? r.nome,
          uidRfid: uid ?? r.uidRfid,
        }
      : r
  );

  localStorage.setItem(
    CHAVE_REGISTOS,
    JSON.stringify(atualizados)
  );
}

export function desativarRegisto(id: string): void {
  atualizarRegisto(id, { ativo: false });
}
