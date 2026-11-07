
"use client";

import {
  Baby,
  Users,
  UserCheck,
  UserPlus,
  CreditCard,
  Search,
  Pencil,
  Phone,
  CalendarDays,
  Save,
  X,
  Radio,
  Camera,
  ImagePlus,
} from "lucide-react";

import type {
  PessoaRegistada,
  FormPessoa,
  DadosSistema,
} from "./types";

type TipoFiltro = "todos" | "crianca" | "encarregado" | "autorizado";

type RFIDRegistosProps = {
  dados: DadosSistema;
  registos: PessoaRegistada[];
  form: FormPessoa;
  editandoId: string | null;
  pesquisa: string;
  tipoFiltro: TipoFiltro;
  mensagem: string;
  tipoMensagem: "sucesso" | "erro";
  carregado: boolean;

  setForm: (form: FormPessoa) => void;
  setPesquisa: (valor: string) => void;
  setTipoFiltro: (valor: TipoFiltro) => void;

  atualizarCampo: <K extends keyof FormPessoa>(
    campo: K,
    valor: FormPessoa[K]
  ) => void;

  guardarPessoa: (e: React.FormEvent<HTMLFormElement>) => void;
  limparFormulario: () => void;
  editarPessoa: (pessoa: PessoaRegistada) => void;
  alterarEstado: (pessoa: PessoaRegistada) => void;
  mostrarMensagem: (
    texto: string,
    tipo?: "sucesso" | "erro"
  ) => void;
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

export default function RFIDRegistos({
  dados,
  registos,
  form,
  editandoId,
  pesquisa,
  tipoFiltro,
  mensagem,
  tipoMensagem,
  carregado,
  setForm,
  setPesquisa,
  setTipoFiltro,
  atualizarCampo,
  guardarPessoa,
  limparFormulario,
  editarPessoa,
  alterarEstado,
  mostrarMensagem,
}: RFIDRegistosProps) {
  const criancas = registos.filter(
    (p) => p.tipo === "crianca"
  );

  const encarregados = registos.filter(
    (p) => p.tipo === "encarregado"
  );

  const autorizados = registos.filter(
    (p) => p.tipo === "autorizado"
  );

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

  // CARREGAR FOTOGRAFIA DO RESPONSÁVEL

  function selecionarFotografia(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const ficheiro = e.target.files?.[0];

    if (!ficheiro) return;

    if (!ficheiro.type.startsWith("image/")) {
      mostrarMensagem(
        "Seleccione um ficheiro de imagem válido.",
        "erro"
      );

      e.target.value = "";
      return;
    }

    if (ficheiro.size > 2 * 1024 * 1024) {
      mostrarMensagem(
        "A fotografia não pode ultrapassar 2 MB.",
        "erro"
      );

      e.target.value = "";
      return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
      const imagem = leitor.result as string;

      atualizarCampo("fotoResponsavel", imagem);

      mostrarMensagem(
        "Fotografia carregada com sucesso.",
        "sucesso"
      );
    };

    leitor.onerror = () => {
      mostrarMensagem(
        "Não foi possível carregar a fotografia.",
        "erro"
      );
    };

    leitor.readAsDataURL(ficheiro);
  }

  // PREPARAR REGISTO RFID

  function prepararRegisto() {
    if (!dados.rfid) {
      mostrarMensagem(
        "Ainda não foi recebida uma leitura RFID.",
        "erro"
      );
      return;
    }

    setForm({
      ...formularioInicial,
      uidRfid: dados.rfid,
    });
  }

  // LIMPAR FORMULÁRIO

  function limparFormularioCompleto() {
    limparFormulario();
  }

  // NOME DO TIPO DE PESSOA

  function nomeTipo(tipo: PessoaRegistada["tipo"]) {
    if (tipo === "crianca") return "Criança";
    if (tipo === "encarregado") return "Mãe / Encarregado";
    return "Outro autorizado";
  }

  // GUARDAR REGISTO COM VALIDAÇÃO DA FOTOGRAFIA

  function submeterFormulario(
    e: React.FormEvent<HTMLFormElement>
  ) {
    if (
      (form.tipo === "encarregado" ||
        form.tipo === "autorizado") &&
      !form.fotoResponsavel
    ) {
      e.preventDefault();

      mostrarMensagem(
        "É obrigatório carregar a fotografia do responsável.",
        "erro"
      );

      return;
    }

    guardarPessoa(e);
  }

  return (
    <div className="space-y-6">

      {/* LEITOR RFID */}

      <section
        id="acessos"
        className="scroll-mt-24 rounded-2xl border border-slate-800 bg-slate-900 p-5"
      >
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-violet-500/10 p-3 text-violet-400">
            <CreditCard size={25} />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold">
              Controlo de acesso RFID
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Leitor RC522 · Última identificação recebida por MQTT
            </p>

            <p className="mt-2 text-sm font-medium text-violet-300">
              {dados.rfid ?? "A aguardar leitura de cartão"}
            </p>
          </div>

          <Radio size={20} className="text-slate-500" />
        </div>

        <button
          type="button"
          onClick={prepararRegisto}
          disabled={!dados.rfid}
          className="mt-5 flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <UserPlus size={17} />
          Preparar registo com o último UID
        </button>

        <p className="mt-3 text-xs leading-5 text-amber-400">
          A leitura do UID não confirma, por si só, a identidade
          do portador. A validação do cartão deve ser implementada
          no controlador.
        </p>
      </section>

      {/* FORMULÁRIO DE REGISTO */}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 md:p-7">

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

        {/* TIPO DE REGISTO */}

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["crianca", "Criança", Baby],
              ["encarregado", "Mãe / Encarregado", Users],
              ["autorizado", "Outro autorizado", UserCheck],
            ] as const
          ).map(([tipo, titulo, Icon]) => (
            <button
              key={tipo}
              type="button"
              onClick={() => {
                setForm({
                  ...formularioInicial,
                  tipo,
                });
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

        <form
          onSubmit={submeterFormulario}
          className="space-y-5"
        >

          <div className="grid gap-5 md:grid-cols-2">

            {/* NOME */}

            <Campo
              label="Nome completo"
              value={form.nome}
              onChange={(v) => atualizarCampo("nome", v)}
              required
              placeholder="Introduza o nome completo"
            />

            {/* DATA DE NASCIMENTO */}

            {form.tipo === "crianca" && (
              <Campo
                label="Data de nascimento"
                type="date"
                value={form.dataNascimento}
                onChange={(v) => atualizarCampo("dataNascimento", v)}
                required
              />
            )}

            {/* CONTACTO */}

            {(form.tipo === "encarregado" ||
              form.tipo === "autorizado") && (
              <Campo
                label="Contacto telefónico"
                value={form.telefone}
                onChange={(v) => atualizarCampo("telefone", v)}
                required
                placeholder="+258 8X XXX XXXX"
              />
            )}

            {/* SALA */}

            {form.tipo === "crianca" && (
              <Campo
                label="Sala / turma"
                value={form.sala}
                onChange={(v) => atualizarCampo("sala", v)}
                placeholder="Ex.: Berçário A"
              />
            )}

            {/* CRIANÇA ASSOCIADA */}

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
                    Registe primeiro uma criança.
                  </span>
                )}
              </label>
            )}

            {/* CATEGORIA AUTORIZADO */}

            {form.tipo === "autorizado" && (
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">
                  Categoria / parentesco
                </span>

                <select
                  value={form.categoria}
                  onChange={(e) =>
                    atualizarCampo("categoria", e.target.value)
                  }
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

            {/* PARENTESCO ENCARREGADO */}

            {form.tipo === "encarregado" && (
              <Campo
                label="Parentesco (opcional)"
                value={form.categoria}
                onChange={(v) => atualizarCampo("categoria", v)}
                placeholder="Ex.: Mãe, pai ou tutor"
              />
            )}

            {/* FOTOGRAFIA DO RESPONSÁVEL */}

            {(form.tipo === "encarregado" ||
              form.tipo === "autorizado") && (
              <div className="md:col-span-2">

                <label className="mb-2 block text-sm text-slate-300">
                  Fotografia do responsável
                  <span className="ml-2 text-rose-400">*</span>
                </label>

                <div className="flex flex-col gap-5 rounded-xl border border-slate-700 bg-[#080E1A] p-4 sm:flex-row sm:items-center">

                  {/* PRÉ-VISUALIZAÇÃO */}

                  <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-900">

                    {form.fotoResponsavel ? (
                      <img
                        src={form.fotoResponsavel}
                        alt="Fotografia do responsável"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Camera
                        size={38}
                        className="text-slate-500"
                      />
                    )}

                  </div>

                  {/* CARREGAMENTO */}

                  <div className="space-y-3">

                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        Fotografia de identificação
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Carregue uma fotografia nítida do rosto,
                        preferencialmente de frente e com boa iluminação.
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        JPG, PNG ou WEBP · Máximo 2 MB.
                      </p>
                    </div>

                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">

                      <ImagePlus size={17} />

                      {form.fotoResponsavel
                        ? "Alterar fotografia"
                        : "Seleccionar fotografia"}

                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={selecionarFotografia}
                        className="hidden"
                      />

                    </label>

                    {form.fotoResponsavel && (
                      <button
                        type="button"
                        onClick={() => {
                          atualizarCampo("fotoResponsavel", "");
                        }}
                        className="ml-3 text-xs text-rose-400 hover:text-rose-300"
                      >
                        Remover fotografia
                      </button>
                    )}

                  </div>
                </div>
              </div>
            )}

            {/* UID RFID */}

            <Campo
              label="UID do cartão RFID"
              value={form.uidRfid}
              onChange={(v) => atualizarCampo("uidRfid", v)}
              placeholder="Ex.: A1B2C3D4"
            />

            {/* VALIDADE */}

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
            O UID também pode ser preenchido manualmente.
            A leitura automática do RC522 precisa de integração
            com o controlador.
          </p>

          {/* ESTADO */}

          {editandoId && (
            <label className="flex items-center gap-3 rounded-xl border border-slate-800 p-4 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) =>
                  atualizarCampo("ativo", e.target.checked)
                }
                className="h-4 w-4 accent-cyan-500"
              />
              Registo ativo
            </label>
          )}

          {/* MENSAGEM */}

          {mensagem && (
            <div
              className={`rounded-xl border p-4 text-sm ${
                tipoMensagem === "erro"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {mensagem}
            </div>
          )}

          {/* BOTÕES */}

          <div className="flex flex-wrap gap-3">

            <button
              type="submit"
              disabled={!carregado}
              className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              <Save size={18} />
              {editandoId
                ? "Guardar alterações"
                : "Registar pessoa"}
            </button>

            <button
              type="button"
              onClick={limparFormularioCompleto}
              className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800"
            >
              <X size={18} />
              Limpar
            </button>

          </div>
        </form>
      </section>

      {/* RESUMO DOS REGISTOS */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {[
          { nome: "Total de pessoas", total: registos.length, Icon: Users },
          { nome: "Crianças", total: criancas.length, Icon: Baby },
          { nome: "Mães / Encarregados", total: encarregados.length, Icon: Users },
          { nome: "Outros autorizados", total: autorizados.length, Icon: UserCheck },
        ].map(({ nome, total, Icon }) => (
          <div
            key={nome}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <Icon className="mb-4 text-cyan-400" size={23} />

            <p className="text-sm text-slate-400">{nome}</p>

            <p className="mt-2 text-3xl font-semibold">
              {total}
            </p>
          </div>
        ))}

      </section>

      {/* PESQUISA E LISTA */}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

        <h3 className="mb-4 text-lg font-semibold">
          Consultar pessoas registadas
        </h3>

        <div className="grid gap-3 md:grid-cols-2">

          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar nome, telefone ou UID RFID"
              className="w-full rounded-xl border border-slate-700 bg-[#080E1A] py-3 pl-10 pr-4 text-sm outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={tipoFiltro}
            onChange={(e) =>
              setTipoFiltro(e.target.value as TipoFiltro)
            }
            className="rounded-xl border border-slate-700 bg-[#080E1A] px-4 py-3 text-sm outline-none focus:border-cyan-500"
          >
            <option value="todos">Todos os tipos</option>
            <option value="crianca">Crianças</option>
            <option value="encarregado">Mães / Encarregados</option>
            <option value="autorizado">Outros autorizados</option>
          </select>

        </div>

        {/* LISTA */}

        <div className="mt-5 space-y-3">

          {registosFiltrados.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              Nenhum registo encontrado.
            </p>
          )}

          {registosFiltrados.map((pessoa) => (
            <div
              key={pessoa.id}
              className="rounded-xl border border-slate-800 bg-[#080E1A] p-4"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center">

                <div className="flex min-w-0 flex-1 items-start gap-3">

                  {/* FOTOGRAFIA OU ÍCONE */}

                  {pessoa.fotoResponsavel ? (
                    <img
                      src={pessoa.fotoResponsavel}
                      alt={`Fotografia de ${pessoa.nome}`}
                      className="h-14 w-14 shrink-0 rounded-xl border border-slate-700 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                      {pessoa.tipo === "crianca" ? (
                        <Baby size={22} />
                      ) : pessoa.tipo === "encarregado" ? (
                        <Users size={22} />
                      ) : (
                        <UserCheck size={22} />
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">

                    <div className="flex flex-wrap items-center gap-2">

                      <h4 className="font-semibold">
                        {pessoa.nome}
                      </h4>

                      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                        {nomeTipo(pessoa.tipo)}
                      </span>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          pessoa.ativo
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {pessoa.ativo ? "Ativo" : "Inativo"}
                      </span>

                      {(pessoa.tipo === "encarregado" ||
                        pessoa.tipo === "autorizado") && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            pessoa.fotoResponsavel
                              ? "bg-cyan-500/10 text-cyan-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {pessoa.fotoResponsavel
                            ? "Fotografia registada"
                            : "Sem fotografia"}
                        </span>
                      )}

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

                      {pessoa.sala && (
                        <p>Sala: {pessoa.sala}</p>
                      )}

                      {pessoa.categoria && (
                        <p>Categoria: {pessoa.categoria}</p>
                      )}

                      {pessoa.validade && (
                        <p>Validade: {pessoa.validade}</p>
                      )}

                    </div>
                  </div>
                </div>

                {/* ACÇÕES */}

                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={() => editarPessoa(pessoa)}
                    title="Editar registo"
                    className="rounded-lg border border-slate-700 p-2.5 text-cyan-400 hover:bg-slate-800"
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    type="button"
                    onClick={() => alterarEstado(pessoa)}
                    title={pessoa.ativo ? "Desactivar" : "Reactivar"}
                    className={`rounded-lg border border-slate-700 p-2.5 ${
                      pessoa.ativo
                        ? "text-rose-400 hover:bg-rose-500/10"
                        : "text-emerald-400 hover:bg-emerald-500/10"
                    }`}
                  >
                    {pessoa.ativo ? (
                      <X size={17} />
                    ) : (
                      <UserCheck size={17} />
                    )}
                  </button>

                </div>
              </div>
            </div>
          ))}

        </div>
      </section>
    </div>
  );
}

/* CAMPO REUTILIZÁVEL */

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

      <span className="mb-2 block text-sm text-slate-300">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-700 bg-[#080E1A] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
      />

    </label>
  );
}
