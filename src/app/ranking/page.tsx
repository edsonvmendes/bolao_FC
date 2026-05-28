import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { AlertMessage, MetricCard, Panel, StatusChip } from "@/components/ui/base";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RankingRow = {
  participant_id: string;
  nickname: string;
  payment_status: string;
  total_points: number;
  exact_score_hits: number;
  position: number;
};

type Participant = {
  id: string;
  user_id: string;
};

type MatchResult = {
  id: string;
  group_name: string | null;
  round_number: number | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  home: { name_pt?: string } | { name_pt?: string }[] | null;
  away: { name_pt?: string } | { name_pt?: string }[] | null;
};

function paymentStatusLabel(status: string) {
  if (status === "paid") return "Pago";
  if (status === "pending") return "Pendente";
  return "Nao registrado";
}

function paymentStatusTone(status: string) {
  return status === "paid" ? "success" : "warning";
}

function positionLabel(position: number) {
  return `${position}o`;
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
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
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: participant } = pool
    ? await supabase
        .from("participants")
        .select("id, user_id")
        .eq("pool_id", pool.id)
        .eq("user_id", user.id)
        .maybeSingle<Participant>()
    : { data: null };

  const { data: ranking } = pool
    ? await supabase
        .from("ranking_view")
        .select(
          "participant_id, nickname, payment_status, total_points, exact_score_hits, position",
        )
        .eq("pool_id", pool.id)
        .order("position", { ascending: true })
    : { data: [] };

  const { data: results } = pool
    ? await supabase
        .from("matches")
        .select(
          "id, group_name, round_number, home_score, away_score, status, home:teams!matches_home_team_id_fkey(name_pt), away:teams!matches_away_team_id_fkey(name_pt)",
        )
        .eq("pool_id", pool.id)
        .eq("status", "finished")
        .order("match_datetime", { ascending: false })
        .limit(12)
    : { data: [] };

  const rankingRows = (ranking ?? []) as RankingRow[];
  const topThree = rankingRows.slice(0, 3);
  const remainingRows = rankingRows.slice(3);
  const myRow = participant
    ? rankingRows.find((row) => row.participant_id === participant.id)
    : undefined;
  const bagreRow = rankingRows.length > 1 ? rankingRows[rankingRows.length - 1] : undefined;
  const leader = rankingRows[0];

  return (
    <main className="football-field min-h-screen pb-28 text-lime-950">
      <div className="relative z-10 mx-auto grid w-full max-w-4xl gap-4 px-3 py-4">
        <header className="rounded-lg border-2 border-lime-950 bg-yellow-300 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Link href="/" className="text-xl font-black">
                Bolao da Resenha
              </Link>
              <p className="mt-1 text-sm font-bold text-lime-950/70">
                Ranking e resultados
              </p>
            </div>
            <form action={signOut}>
              <button className="rounded-md bg-lime-950 px-3 py-2 text-xs font-black text-white">
                Sair
              </button>
            </form>
          </div>
          <nav className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-black sm:grid-cols-4">
            <Link className="rounded-md bg-white px-3 py-2" href="/palpites">
              Palpites
            </Link>
            <Link
              className="rounded-md bg-lime-950 px-3 py-2 text-white"
              href="/ranking"
            >
              Ranking
            </Link>
            <Link className="rounded-md bg-white px-3 py-2" href="/">
              Inicio
            </Link>
            {profile?.role === "admin" && (
              <Link className="rounded-md bg-white px-3 py-2" href="/admin">
                Admin
              </Link>
            )}
          </nav>
        </header>

        {params.saved && (
          <AlertMessage tone="success">
            Palpites salvos. Agora e acompanhar o bolao.
          </AlertMessage>
        )}

        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-black">Ranking</h1>
              <p className="mt-1 text-sm font-bold text-lime-900/65">
                Lideres, sua posicao e a briga pelo Trofeu Bagre.
              </p>
            </div>
            {leader && (
              <StatusChip tone="inverse">
                Lider: {leader.nickname} - {leader.total_points} pts
              </StatusChip>
            )}
          </div>

          {rankingRows.length ? (
            <div className="mt-4 grid gap-4">
              <section className="grid gap-2 sm:grid-cols-3 sm:items-end">
                {topThree.map((row, index) => (
                  <PodiumCard key={row.participant_id} row={row} rankIndex={index} />
                ))}
              </section>

              {myRow && (
                <section className="rounded-lg border-2 border-yellow-400 bg-yellow-50 p-3">
                  <p className="text-xs font-black uppercase text-lime-900/60">
                    Minha posicao
                  </p>
                  <RankingItem row={myRow} highlight />
                </section>
              )}

              <section className="grid gap-2">
                {remainingRows.map((row) => (
                  <RankingItem
                    key={row.participant_id}
                    row={row}
                    highlight={row.participant_id === myRow?.participant_id}
                  />
                ))}
              </section>

              {bagreRow && (
                <section className="rounded-lg border-2 border-lime-950 bg-lime-950 p-3 text-white">
                  <p className="text-xs font-black uppercase text-yellow-300">
                    Trofeu Bagre
                  </p>
                  <div className="mt-2 grid grid-cols-[44px_1fr_auto] items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-md bg-white/10 font-black">
                      {positionLabel(bagreRow.position)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-black">{bagreRow.nickname}</p>
                      <p className="text-xs font-bold text-white/65">
                        Ainda da tempo de reagir.
                      </p>
                    </div>
                    <p className="text-xl font-black">{bagreRow.total_points}</p>
                  </div>
                </section>
              )}
            </div>
            ) : (
            <p className="mt-4 rounded-md bg-lime-50 p-3 text-sm font-bold text-lime-900/70">
                Ranking ainda vazio. Ele aparece quando participantes entram no bolao.
              </p>
            )}
        </Panel>

        <section className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Participantes" value={rankingRows.length} />
          <MetricCard label="Jogos com resultado" value={(results ?? []).length} />
          <MetricCard
            label="Maior pontuacao"
            value={leader?.total_points ?? 0}
            detail={leader ? leader.nickname : "Aguardando ranking"}
          />
        </section>

        <Panel>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black">Resultados lancados</h2>
              <p className="text-sm font-bold text-lime-900/65">
                Ultimos jogos usados para atualizar a pontuacao.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {(results as MatchResult[] | null)?.length ? (
              (results as MatchResult[]).map((match) => {
                const home = Array.isArray(match.home) ? match.home[0] : match.home;
                const away = Array.isArray(match.away) ? match.away[0] : match.away;

                return (
                  <div
                    key={match.id}
                    className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg bg-lime-50 p-3"
                  >
                    <p className="min-w-0 truncate text-sm font-black">
                      {home?.name_pt}
                    </p>
                    <div className="grid justify-items-center">
                      <p className="rounded-md bg-white px-3 py-2 text-lg font-black">
                        {match.home_score} x {match.away_score}
                      </p>
                      <p className="text-xs font-bold text-lime-900/60">
                        {match.group_name} - Rodada {match.round_number}
                      </p>
                    </div>
                    <p className="min-w-0 truncate text-right text-sm font-black">
                      {away?.name_pt}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="rounded-md bg-lime-50 p-3 text-sm font-bold text-lime-900/70">
                Nenhum resultado oficial lancado ainda.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </main>
  );
}

function PodiumCard({
  row,
  rankIndex,
}: {
  row: RankingRow;
  rankIndex: number;
}) {
  const labels = ["Campeao", "Vice", "Terceiro"];
  const orderClass = rankIndex === 0 ? "sm:order-2 sm:scale-105" : rankIndex === 1 ? "sm:order-1" : "sm:order-3";
  const toneClass =
    rankIndex === 0
      ? "border-yellow-400 bg-yellow-300"
      : "border-lime-950/10 bg-lime-50";

  return (
    <article className={`rounded-lg border-2 p-3 ${toneClass} ${orderClass}`}>
      <p className="text-xs font-black uppercase text-lime-900/60">
        {labels[rankIndex]}
      </p>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-black">{row.nickname}</p>
          <p className="mt-1 text-xs font-bold text-lime-900/65">
            {row.exact_score_hits} exatos - {paymentStatusLabel(row.payment_status)}
          </p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-white font-black">
          {positionLabel(row.position)}
        </div>
      </div>
      <p className="mt-4 text-3xl font-black leading-none">{row.total_points}</p>
      <p className="mt-1 text-xs font-black uppercase text-lime-900/60">pts</p>
    </article>
  );
}

function RankingItem({
  row,
  highlight = false,
}: {
  row: RankingRow;
  highlight?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-lg p-3 ${
        highlight ? "bg-yellow-300" : "bg-lime-50"
      }`}
    >
      <div className="grid h-10 w-10 place-items-center rounded-md bg-white font-black">
        {positionLabel(row.position)}
      </div>
      <div className="min-w-0">
        <p className="truncate font-black">{row.nickname}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-lime-900/60">
            {row.exact_score_hits} placares exatos
          </span>
          <StatusChip tone={paymentStatusTone(row.payment_status)}>
            {paymentStatusLabel(row.payment_status)}
          </StatusChip>
        </div>
      </div>
      <p className="text-xl font-black">{row.total_points}</p>
    </div>
  );
}
