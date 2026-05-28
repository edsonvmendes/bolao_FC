import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { joinPool, savePredictions } from "@/app/palpites/actions";
import {
  AlertMessage,
  EmptyState,
  ProgressBar,
  StatusChip,
  SubmitButton,
} from "@/components/ui/base";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TeamRelation = {
  name_pt?: string;
  country_code?: string;
};

type MatchRow = {
  id: string;
  group_name: string | null;
  round_number: number | null;
  match_datetime: string;
  prediction_deadline: string | null;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home: TeamRelation | TeamRelation[] | null;
  away: TeamRelation | TeamRelation[] | null;
};

type PredictionRow = {
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  points: number;
};

function flagUrl(code?: string) {
  return `https://hatscripts.github.io/circle-flags/flags/${code ?? "br"}.svg`;
}

function filterHref(filter: { group?: string; round?: string }) {
  const params = new URLSearchParams();
  if (filter.group) params.set("group", filter.group);
  if (filter.round) params.set("round", filter.round);
  const query = params.toString();
  return query ? `/palpites?${query}` : "/palpites";
}

function matchStatus(match: MatchRow, hasPrediction: boolean) {
  if (match.status === "finished") {
    return { label: "Resultado lancado", tone: "success" as const };
  }
  if (match.status === "locked") {
    return { label: "Prazo encerrado", tone: "danger" as const };
  }
  if (hasPrediction) {
    return { label: "Salvo", tone: "success" as const };
  }
  return { label: "Pendente", tone: "warning" as const };
}

export default async function PredictionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    group?: string;
    round?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nickname, role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: pool } = await supabase
    .from("pools")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!pool) {
    return (
      <Shell
        nickname={profile?.nickname ?? user.email ?? "Participante"}
        isAdmin={profile?.role === "admin"}
      >
        <EmptyState
          title="Bolao ainda sem setup"
          description="O admin precisa criar o bolao, importar selecoes e cadastrar jogos antes dos palpites."
        />
      </Shell>
    );
  }

  const { data: participant } = await supabase
    .from("participants")
    .select("*")
    .eq("pool_id", pool.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participant) {
    return (
      <Shell
        nickname={profile?.nickname ?? user.email ?? "Participante"}
        isAdmin={profile?.role === "admin"}
      >
        <section className="rounded-lg border-2 border-lime-950 bg-yellow-300 p-5">
          <h1 className="text-2xl font-black">Entrar no bolao</h1>
          <p className="mt-2 text-sm font-bold text-lime-950/75">
            Entre no bolao para liberar a grade de palpites da primeira fase.
          </p>
          <form action={joinPool} className="mt-4">
            <input type="hidden" name="pool_id" value={pool.id} />
            <button className="h-11 rounded-md bg-lime-950 px-4 text-sm font-black text-white">
              Entrar no bolao
            </button>
          </form>
        </section>
      </Shell>
    );
  }

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, group_name, round_number, match_datetime, prediction_deadline, status, home_score, away_score, home:teams!matches_home_team_id_fkey(name_pt,country_code), away:teams!matches_away_team_id_fkey(name_pt,country_code)",
    )
    .eq("pool_id", pool.id)
    .eq("phase", "group_stage")
    .order("group_name", { ascending: true })
    .order("round_number", { ascending: true })
    .order("match_datetime", { ascending: true });

  const { data: predictions } = await supabase
    .from("predictions")
    .select("match_id, predicted_home_score, predicted_away_score, points")
    .eq("participant_id", participant.id);

  const predictionByMatch = new Map<string, PredictionRow>(
    ((predictions ?? []) as PredictionRow[]).map((prediction) => [
      prediction.match_id,
      prediction,
    ]),
  );
  const allMatches = (matches ?? []) as MatchRow[];
  const selectedGroup = params.group ?? "";
  const selectedRound = params.round ?? "";
  const groups = Array.from(
    new Set(allMatches.map((match) => match.group_name).filter(Boolean)),
  ) as string[];
  const rounds = Array.from(
    new Set(allMatches.map((match) => match.round_number).filter(Boolean)),
  ).sort((a, b) => Number(a) - Number(b)) as number[];
  const visibleMatches = allMatches.filter((match) => {
    const groupMatches = !selectedGroup || match.group_name === selectedGroup;
    const roundMatches =
      !selectedRound || String(match.round_number) === selectedRound;
    return groupMatches && roundMatches;
  });
  const matchesCount = allMatches.length;
  const predictionsCount = predictions?.length ?? 0;
  const completed = matchesCount > 0 && predictionsCount >= matchesCount;
  const progress =
    matchesCount > 0 ? Math.round((predictionsCount / matchesCount) * 100) : 0;

  return (
    <Shell
      nickname={profile?.nickname ?? participant.nickname}
      isAdmin={profile?.role === "admin"}
    >
      <section
        className={`min-w-0 overflow-hidden rounded-lg border-2 p-5 ${
          completed
            ? "border-lime-950 bg-lime-950 text-white"
            : "border-lime-950 bg-yellow-300"
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p
              className={`text-xs font-black uppercase ${
                completed ? "text-lime-100/75" : "text-lime-900/70"
              }`}
            >
              {completed ? "Etapa concluida" : "Etapa do participante"}
            </p>
            <h1 className="text-2xl font-black">
              {completed ? "Palpites completos" : "Preencha a primeira fase"}
            </h1>
            <p
              className={`mt-1 text-sm font-bold ${
                completed ? "text-lime-50/75" : "text-lime-950/75"
              }`}
            >
              {completed
                ? "Agora e acompanhar resultados e ranking. Voce ainda pode editar enquanto os prazos estiverem abertos."
                : "Salve todos os jogos em lote. Depois do prazo, o banco bloqueia alteracao automaticamente."}
            </p>
          </div>
          <span
            className={`rounded-md px-3 py-2 text-sm font-black ${
              completed ? "bg-white text-lime-950" : "bg-white"
            }`}
          >
            {predictionsCount} / {matchesCount}
          </span>
        </div>
        {completed && (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Link
              href="/ranking"
              className="grid h-11 place-items-center rounded-md bg-yellow-300 px-3 text-sm font-black text-lime-950"
            >
              Ver ranking
            </Link>
            <Link
              href="/"
              className="grid h-11 place-items-center rounded-md bg-white/10 px-3 text-sm font-black text-white"
            >
              Inicio
            </Link>
            {profile?.role === "admin" && (
              <Link
                href="/admin"
                className="grid h-11 place-items-center rounded-md bg-white px-3 text-sm font-black text-lime-950"
              >
                Admin
              </Link>
            )}
          </div>
        )}
      </section>

      {params.saved && (
        <AlertMessage tone="success">
          Palpites salvos.
        </AlertMessage>
      )}
      {params.error && (
        <AlertMessage tone="danger">
          Nao foi possivel salvar: {params.error}
        </AlertMessage>
      )}

      {!matches?.length ? (
        <EmptyState
          title="Sem jogos cadastrados"
          description="Quando o admin importar a tabela oficial, os palpites aparecem aqui."
        />
      ) : (
        <>
          <section className="min-w-0 overflow-hidden rounded-lg border-2 border-lime-950/10 bg-white/95 p-3 shadow-sm">
            <ProgressBar
              label="Progresso geral"
              value={progress}
              detail={`${predictionsCount} de ${matchesCount} jogos preenchidos.`}
            />
            <div className="mt-3 grid gap-3">
              <FilterRail
                label="Rodada"
                options={rounds.map((round) => ({
                  label: `Rodada ${round}`,
                  href: filterHref({ group: selectedGroup, round: String(round) }),
                  active: selectedRound === String(round),
                }))}
                allHref={filterHref({ group: selectedGroup })}
                allActive={!selectedRound}
              />
              <FilterRail
                label="Grupo"
                options={groups.map((group) => ({
                  label: group,
                  href: filterHref({ group, round: selectedRound }),
                  active: selectedGroup === group,
                }))}
                allHref={filterHref({ round: selectedRound })}
                allActive={!selectedGroup}
              />
            </div>
            <p className="mt-3 text-xs font-bold text-lime-900/60">
              Mostrando {visibleMatches.length} de {matchesCount} jogos.
            </p>
          </section>

          <form action={savePredictions} className="grid gap-3">
            <input type="hidden" name="pool_id" value={pool.id} />
            {visibleMatches.map((match) => {
              const prediction = predictionByMatch.get(match.id);
              const home = Array.isArray(match.home) ? match.home[0] : match.home;
              const away = Array.isArray(match.away) ? match.away[0] : match.away;
              const status = matchStatus(match, Boolean(prediction));

              return (
                <MatchPredictionCard
                  key={match.id}
                  match={match}
                  home={home}
                  away={away}
                  prediction={prediction}
                  status={status}
                />
              );
            })}
            <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-20 rounded-lg border-2 border-lime-950 bg-white/95 p-2 shadow-lg backdrop-blur">
              <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div className="min-w-0 px-1">
                  <p className="truncate text-xs font-black uppercase text-lime-900/60">
                    Salvar visiveis
                  </p>
                  <p className="truncate text-sm font-black">
                    {visibleMatches.length} jogos nesta tela
                  </p>
                </div>
                <SubmitButton className="h-12 px-4">Salvar</SubmitButton>
              </div>
            </div>
          </form>
        </>
      )}
    </Shell>
  );
}

function FilterRail({
  label,
  options,
  allHref,
  allActive,
}: {
  label: string;
  options: Array<{ label: string; href: string; active: boolean }>;
  allHref: string;
  allActive: boolean;
}) {
  return (
    <div className="min-w-0 overflow-hidden">
      <p className="mb-2 text-xs font-black uppercase text-lime-900/60">
        {label}
      </p>
      <div className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1">
        <Link
          href={allHref}
          className={`shrink-0 rounded-md px-3 py-2 text-xs font-black ${
            allActive ? "bg-lime-950 text-white" : "bg-lime-50 text-lime-950"
          }`}
        >
          Todos
        </Link>
        {options.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className={`shrink-0 rounded-md px-3 py-2 text-xs font-black ${
              option.active
                ? "bg-lime-950 text-white"
                : "bg-lime-50 text-lime-950"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function MatchPredictionCard({
  match,
  home,
  away,
  prediction,
  status,
}: {
  match: MatchRow;
  home?: TeamRelation | null;
  away?: TeamRelation | null;
  prediction?: PredictionRow;
  status: { label: string; tone: "success" | "warning" | "danger" };
}) {
  const locked = match.status === "locked" || match.status === "finished";

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border-2 border-lime-950/10 bg-white/95 p-3 shadow-sm">
      <input type="hidden" name="match_id" value={match.id} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase text-lime-900/60">
            {match.group_name} - Rodada {match.round_number}
          </p>
          <p className="text-xs font-bold text-lime-900/70">
            {new Intl.DateTimeFormat("pt-BR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(match.match_datetime))}
          </p>
        </div>
        <StatusChip tone={status.tone}>{status.label}</StatusChip>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_112px_minmax(0,1fr)]">
        <Team name={home?.name_pt} code={home?.country_code} />
        <div className="flex items-end justify-center gap-1">
          <Score
            name={`home_${match.id}`}
            defaultValue={prediction?.predicted_home_score}
            label="Casa"
            readOnly={locked}
          />
          <span className="pb-3 font-black">x</span>
          <Score
            name={`away_${match.id}`}
            defaultValue={prediction?.predicted_away_score}
            label="Fora"
            readOnly={locked}
          />
        </div>
        <Team name={away?.name_pt} code={away?.country_code} />
      </div>
    </article>
  );
}

function Shell({
  children,
  nickname,
  isAdmin = false,
}: {
  children: React.ReactNode;
  nickname: string;
  isAdmin?: boolean;
}) {
  return (
    <main className="football-field min-h-screen pb-[calc(env(safe-area-inset-bottom)+7rem)] text-lime-950">
      <div className="relative z-10 mx-auto grid w-full max-w-3xl gap-4 px-3 py-4">
        <header className="min-w-0 overflow-hidden rounded-lg border-2 border-lime-950 bg-yellow-300 p-4">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <Link href="/" className="min-w-0 truncate text-xl font-black">
              Bolao da Resenha
            </Link>
            <form action={signOut}>
              <button className="rounded-md bg-lime-950 px-3 py-2 text-xs font-black text-white">
                Sair
              </button>
            </form>
          </div>
          <p className="mt-2 text-sm font-bold text-lime-950/70">
            Fala, {nickname}
          </p>
          <nav className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-black sm:grid-cols-4">
            <Link className="rounded-md bg-white px-3 py-2" href="/palpites">
              Palpites
            </Link>
            <Link className="rounded-md bg-white px-3 py-2" href="/ranking">
              Ranking
            </Link>
            <Link className="rounded-md bg-white px-3 py-2" href="/">
              Inicio
            </Link>
            {isAdmin && (
              <Link className="rounded-md bg-lime-950 px-3 py-2 text-white" href="/admin">
                Admin
              </Link>
            )}
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}

function Team({ name, code }: { name?: string; code?: string }) {
  return (
    <div className="grid min-w-0 justify-items-center gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={flagUrl(code)} alt="" className="h-8 w-8 rounded-full bg-white" />
      <span className="max-w-full truncate text-center text-[10px] font-black leading-tight">
        {name ?? "Selecao"}
      </span>
    </div>
  );
}

function Score({
  name,
  label,
  defaultValue,
  readOnly = false,
}: {
  name: string;
  label: string;
  defaultValue?: number;
  readOnly?: boolean;
}) {
  return (
    <label className="grid gap-1 text-center text-[10px] font-black uppercase text-lime-900/60">
      {label}
      <input
        name={name}
        type="number"
        min={0}
        max={20}
        defaultValue={defaultValue}
        required
        readOnly={readOnly}
        className="h-10 w-9 rounded-md border-2 border-lime-900/20 bg-white text-center text-base font-black outline-none focus:border-yellow-400 read-only:bg-lime-100 sm:w-10"
      />
    </label>
  );
}
