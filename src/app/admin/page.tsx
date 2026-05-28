import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { recalculatePool, setMatchResult, setPayment } from "@/app/admin/actions";
import {
  AlertMessage,
  MetricCard,
  Panel,
  StatusChip,
  SubmitButton,
} from "@/components/ui/base";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TeamRelation = {
  name_pt?: string;
};

type AdminMatchRow = {
  id: string;
  group_name: string | null;
  round_number: number | null;
  match_datetime: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  home: TeamRelation | TeamRelation[] | null;
  away: TeamRelation | TeamRelation[] | null;
};

type ParticipantRow = {
  id: string;
  nickname: string;
  payment_status: string;
  created_at: string;
};

type PoolRow = {
  id: string;
  name: string;
  entry_fee: number | string;
  prize_first_percent: number | string;
  prize_second_percent: number | string;
  prize_third_percent: number | string;
};

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function asNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; recalculated?: string }>;
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

  if (profile?.role !== "admin") redirect("/palpites");

  const { data: pool } = await supabase
    .from("pools")
    .select(
      "id, name, entry_fee, prize_first_percent, prize_second_percent, prize_third_percent",
    )
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<PoolRow>();

  const { data: participants } = pool
    ? await supabase
        .from("participants")
        .select("id, nickname, payment_status, created_at")
        .eq("pool_id", pool.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  const { data: matches } = pool
    ? await supabase
        .from("matches")
        .select(
          "id, group_name, round_number, match_datetime, home_score, away_score, status, home:teams!matches_home_team_id_fkey(name_pt), away:teams!matches_away_team_id_fkey(name_pt)",
        )
        .eq("pool_id", pool.id)
        .order("match_datetime", { ascending: true })
        .limit(48)
    : { data: [] };

  const participantRows = (participants ?? []) as ParticipantRow[];
  const matchRows = (matches ?? []) as AdminMatchRow[];
  const paidParticipants = participantRows.filter(
    (item) => item.payment_status === "paid",
  );
  const pendingParticipants = participantRows.filter(
    (item) => item.payment_status !== "paid",
  );
  const paid = paidParticipants.length;
  const pendingMatches = matchRows.filter((match) => match.status !== "finished");
  const finishedMatches = matchRows.filter((match) => match.status === "finished");
  const entryFee = asNumber(pool?.entry_fee);
  const totalCollected = paid * entryFee;
  const firstPrize = totalCollected * (asNumber(pool?.prize_first_percent) / 100);
  const secondPrize = totalCollected * (asNumber(pool?.prize_second_percent) / 100);
  const thirdPrize = totalCollected * (asNumber(pool?.prize_third_percent) / 100);

  return (
    <main className="football-field min-h-screen pb-28 text-lime-950">
      <div className="relative z-10 mx-auto grid w-full max-w-5xl gap-4 px-3 py-4">
        <header className="min-w-0 overflow-hidden rounded-lg border-2 border-lime-950 bg-yellow-300 p-4">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <Link href="/" className="block truncate text-xl font-black">
                Admin - Bolao da Resenha
              </Link>
              <p className="mt-1 text-sm font-bold text-lime-950/70">
                Setup, pagamentos, resultados e recalculo.
              </p>
            </div>
            <form action={signOut}>
              <button className="rounded-md bg-lime-950 px-3 py-2 text-xs font-black text-white">
                Sair
              </button>
            </form>
          </div>
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
            <Link className="rounded-md bg-lime-950 px-3 py-2 text-white" href="/admin">
              Admin
            </Link>
          </nav>
        </header>

        {params.error && (
          <AlertMessage tone="danger">
            Erro: {params.error}
          </AlertMessage>
        )}
        {params.recalculated && (
          <AlertMessage tone="success">
            Ranking recalculado.
          </AlertMessage>
        )}

        {!pool ? (
          <Panel title="Setup pendente">
            <p className="text-sm font-semibold text-lime-900/70">
              Rode a seed ou crie o primeiro bolao no banco para liberar o painel.
            </p>
          </Panel>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-4">
              <MetricCard label="Participantes" value={participants?.length ?? 0} />
              <MetricCard label="Pagos" value={paid} />
              <MetricCard
                label="Pendentes"
                value={pendingParticipants.length}
              />
              <MetricCard label="Arrecadado" value={currency(totalCollected)} />
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="1o lugar"
                value={currency(firstPrize)}
                detail={`${pool.prize_first_percent}% do arrecadado`}
              />
              <MetricCard
                label="2o lugar"
                value={currency(secondPrize)}
                detail={`${pool.prize_second_percent}% do arrecadado`}
              />
              <MetricCard
                label="3o lugar"
                value={currency(thirdPrize)}
                detail={`${pool.prize_third_percent}% do arrecadado`}
              />
            </section>

            <Panel title="Fila do admin">
              <div className="grid gap-2 sm:grid-cols-3">
                <QueueCard
                  label="Pagamentos pendentes"
                  value={pendingParticipants.length}
                  tone={pendingParticipants.length ? "warning" : "success"}
                />
                <QueueCard
                  label="Resultados a lancar"
                  value={pendingMatches.length}
                  tone={pendingMatches.length ? "warning" : "success"}
                />
                <QueueCard
                  label="Resultados lancados"
                  value={finishedMatches.length}
                  tone="success"
                />
              </div>
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Pagamentos pendentes">
                <div className="grid gap-2">
                  {pendingParticipants.length ? (
                    pendingParticipants.map((participant) => (
                      <PaymentRow key={participant.id} participant={participant} />
                    ))
                  ) : (
                    <p className="rounded-md bg-lime-50 p-3 text-sm font-bold text-lime-900/70">
                      Nenhum pagamento pendente.
                    </p>
                  )}
                </div>
                {paidParticipants.length > 0 && (
                  <details className="mt-3 rounded-md bg-lime-50 p-3">
                    <summary className="cursor-pointer text-sm font-black">
                      Ver participantes pagos ({paidParticipants.length})
                    </summary>
                    <div className="mt-3 grid gap-2">
                      {paidParticipants.map((participant) => (
                        <PaymentRow key={participant.id} participant={participant} />
                      ))}
                    </div>
                  </details>
                )}
              </Panel>

              <Panel title="Resultados a lancar">
                <div className="grid gap-2">
                  {pendingMatches.length ? (
                    pendingMatches.map((match) => (
                      <MatchResultForm key={match.id} match={match} />
                    ))
                  ) : (
                    <p className="rounded-md bg-lime-50 p-3 text-sm font-bold text-lime-900/70">
                      Nenhum resultado pendente nos jogos carregados.
                    </p>
                  )}
                </div>
                <form action={recalculatePool} className="mt-3">
                  <input type="hidden" name="pool_id" value={pool.id} />
                  <SubmitButton className="w-full">
                    Recalcular ranking
                  </SubmitButton>
                </form>
              </Panel>
            </div>

            <Panel title="Mensagens WhatsApp">
              <div className="grid gap-2 lg:grid-cols-3">
                <WhatsAppMessage
                  title="Lembrete de pagamento"
                  body={`Fala, pessoal! Temos ${pendingParticipants.length} pagamento(s) pendente(s) no ${pool.name}. Valor: ${currency(entryFee)}. Quem ja pagou e ainda nao foi confirmado, chama o admin.`}
                />
                <WhatsAppMessage
                  title="Ranking atualizado"
                  body={`Ranking do ${pool.name} atualizado. Ja temos ${finishedMatches.length} resultado(s) lancado(s). Acessem o app para conferir a tabela.`}
                />
                <WhatsAppMessage
                  title="Resumo da premiacao"
                  body={`Premiacao parcial do ${pool.name}: arrecadado ${currency(totalCollected)}. 1o ${currency(firstPrize)}, 2o ${currency(secondPrize)}, 3o ${currency(thirdPrize)}.`}
                />
              </div>
            </Panel>
          </>
        )}
      </div>
    </main>
  );
}

function QueueCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning";
}) {
  return (
    <div className="rounded-md bg-lime-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black">{label}</p>
        <StatusChip tone={tone}>{value}</StatusChip>
      </div>
    </div>
  );
}

function PaymentRow({ participant }: { participant: ParticipantRow }) {
  const paid = participant.payment_status === "paid";

  return (
    <form
      action={setPayment}
      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md bg-lime-50 p-3"
    >
      <input type="hidden" name="participant_id" value={participant.id} />
      <input type="hidden" name="paid" value={paid ? "false" : "true"} />
      <div className="min-w-0">
        <p className="truncate font-black">{participant.nickname}</p>
        <p className="text-xs font-bold text-lime-900/60">
          {paid ? "Pago" : "Pendente"}
        </p>
      </div>
      <button className="h-9 rounded-md bg-yellow-300 px-3 text-xs font-black">
        {paid ? "Marcar pendente" : "Marcar pago"}
      </button>
    </form>
  );
}

function MatchResultForm({ match }: { match: AdminMatchRow }) {
  const home = Array.isArray(match.home) ? match.home[0] : match.home;
  const away = Array.isArray(match.away) ? match.away[0] : match.away;

  return (
    <form
      action={setMatchResult}
      className="rounded-md border-2 border-lime-950/10 bg-lime-50 p-3"
    >
      <input type="hidden" name="match_id" value={match.id} />
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-black">
          {home?.name_pt} x {away?.name_pt}
        </p>
        <span className="shrink-0 text-xs font-bold text-lime-900/60">
          {match.group_name}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <input
          name="home_score"
          type="number"
          min={0}
          defaultValue={match.home_score ?? ""}
          required
          className="h-10 min-w-0 rounded-md border-2 border-lime-950/10 bg-white text-center font-black"
        />
        <input
          name="away_score"
          type="number"
          min={0}
          defaultValue={match.away_score ?? ""}
          required
          className="h-10 min-w-0 rounded-md border-2 border-lime-950/10 bg-white text-center font-black"
        />
        <button className="h-10 rounded-md bg-lime-700 px-3 text-xs font-black text-white">
          Salvar
        </button>
      </div>
    </form>
  );
}

function WhatsAppMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md bg-lime-50 p-3">
      <p className="text-sm font-black">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-lime-900/70">
        {body}
      </p>
    </div>
  );
}
