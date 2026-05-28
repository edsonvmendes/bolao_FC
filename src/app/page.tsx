import Link from "next/link";
import Image from "next/image";
import { signOut } from "@/app/auth/actions";
import { joinPool } from "@/app/palpites/actions";
import {
  ActionLink,
  Panel,
  ProgressBar,
  StatusChip,
  SubmitButton,
} from "@/components/ui/base";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  nickname: string | null;
  role: string | null;
};

type Pool = {
  id: string;
  name: string;
};

type Participant = {
  id: string;
  nickname: string;
  payment_status: string;
};

type RankingRow = {
  participant_id: string;
  position: number;
  total_points: number;
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="football-field min-h-screen text-lime-950">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-3 py-5 sm:px-6">
        {children}
      </div>
    </main>
  );
}

function paymentLabel(status?: string) {
  if (status === "paid") return "Pagamento confirmado";
  if (status === "pending") return "Pagamento pendente";
  return "Pagamento nao registrado";
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Shell>
        <div className="grid w-full gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
          <header className="overflow-hidden rounded-lg border-2 border-yellow-300/45 bg-lime-950/92 p-5 text-white shadow-sm backdrop-blur">
            <div className="mx-auto mb-3 w-full max-w-[280px] sm:mx-0 sm:max-w-[320px]">
              <Image
                src="/logo-resenha-2026-v2.png"
                alt="Bolao da Resenha Copa 2026"
                width={1024}
                height={1024}
                priority
                className="h-auto w-full drop-shadow-[0_12px_26px_rgba(0,0,0,0.35)]"
              />
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-5xl">
              Bolao da Resenha Copa 2026
            </h1>
            <p className="mt-4 max-w-2xl text-base font-bold text-white/78">
              Palpite os jogos, acompanhe o ranking e deixe a resenha organizada
              sem planilha perdida no WhatsApp.
            </p>
            <div className="mt-6 grid gap-2 sm:flex">
              <ActionLink href="/entrar" variant="accent">
                Entrar
              </ActionLink>
              <ActionLink href="/cadastro" variant="secondary">
                Criar conta
              </ActionLink>
            </div>
          </header>

          <Panel>
            <h2 className="text-xl font-black">Como funciona</h2>
            <div className="mt-4 grid gap-3">
              {[
                ["1", "Admin configura jogos e pagamentos"],
                ["2", "Participante preenche todos os palpites"],
                ["3", "Resultados oficiais alimentam o ranking"],
              ].map(([number, text]) => (
                <div
                  key={number}
                  className="grid grid-cols-[40px_1fr] items-center gap-3 rounded-md bg-lime-50 p-3"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-white text-lg font-black">
                    {number}
                  </span>
                  <p className="text-sm font-black leading-snug">{text}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </Shell>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nickname, role")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  const { data: pool } = await supabase
    .from("pools")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<Pool>();

  const { data: participant } = pool
    ? await supabase
        .from("participants")
        .select("id, nickname, payment_status")
        .eq("pool_id", pool.id)
        .eq("user_id", user.id)
        .maybeSingle<Participant>()
    : { data: null };

  const [{ count: matchesCount }, { count: finishedCount }, predictionsResult] =
    await Promise.all([
      pool
        ? supabase
            .from("matches")
            .select("id", { count: "exact", head: true })
            .eq("pool_id", pool.id)
            .eq("phase", "group_stage")
        : Promise.resolve({ count: 0 }),
      pool
        ? supabase
            .from("matches")
            .select("id", { count: "exact", head: true })
            .eq("pool_id", pool.id)
            .eq("status", "finished")
        : Promise.resolve({ count: 0 }),
      participant
        ? supabase
            .from("predictions")
            .select("id", { count: "exact", head: true })
            .eq("participant_id", participant.id)
        : Promise.resolve({ count: 0 }),
    ]);

  const predictionsCount = predictionsResult.count ?? 0;
  const totalMatches = matchesCount ?? 0;
  const progress =
    totalMatches > 0 ? Math.round((predictionsCount / totalMatches) * 100) : 0;

  const { data: rankingRow } = participant
    ? await supabase
        .from("ranking_view")
        .select("participant_id, position, total_points")
        .eq("participant_id", participant.id)
        .maybeSingle<RankingRow>()
    : { data: null };

  const nickname =
    participant?.nickname || profile?.nickname || user.email?.split("@")[0] || "jogador";
  const predictionsComplete = totalMatches > 0 && predictionsCount >= totalMatches;
  const primaryHref = !participant
    ? null
    : predictionsComplete
      ? "/ranking"
      : "/palpites";
  const primaryLabel = !participant
    ? "Entrar no bolao"
    : predictionsComplete
      ? "Ver ranking"
      : "Continuar palpites";

  return (
    <Shell>
      <div className="grid w-full gap-4">
        <header className="min-w-0 overflow-hidden rounded-lg border-2 border-yellow-300/45 bg-lime-950/92 p-4 text-white shadow-sm backdrop-blur sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Image
                src="/logo-resenha-2026-v2.png"
                alt="Bolao da Resenha Copa 2026"
                width={1024}
                height={1024}
                className="h-16 w-16 shrink-0 rounded-md object-contain sm:h-20 sm:w-20"
              />
              <div className="min-w-0">
                <p className="text-sm font-black uppercase text-yellow-300/80">
                  {pool?.name ?? "Bolao"}
                </p>
                <h1 className="mt-1 text-3xl font-black leading-tight sm:text-4xl">
                  Oi, {nickname}.
                </h1>
                <p className="mt-2 max-w-2xl text-sm font-bold text-white/70 sm:text-base">
                  Esta e sua central. Ela mostra somente o que existe de verdade
                  no bolao e qual e o proximo passo.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/palpites"
                className="rounded-md bg-white px-3 py-2 text-xs font-black text-lime-950"
              >
                Palpites
              </Link>
              <Link
                href="/ranking"
                className="rounded-md bg-white px-3 py-2 text-xs font-black text-lime-950"
              >
                Ranking
              </Link>
              {profile?.role === "admin" && (
                <Link
                  href="/admin"
                  className="rounded-md bg-yellow-300 px-3 py-2 text-xs font-black text-lime-950"
                >
                  Admin
                </Link>
              )}
              <form action={signOut}>
                <button className="rounded-md bg-white px-3 py-2 text-xs font-black text-lime-950">
                  Sair
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <Panel className="border-lime-950/20">
            <StatusChip tone="inverse">
              {!participant
                ? "Primeiro acesso"
                : predictionsComplete
                  ? "Palpites completos"
                  : "Palpites em aberto"}
            </StatusChip>
            <h2 className="mt-4 text-3xl font-black leading-tight">
              {!pool
                ? "O bolao ainda precisa ser configurado."
                : !participant
                  ? "Entre no bolao para liberar seus palpites."
                  : predictionsComplete
                    ? "Agora e acompanhar os resultados."
                    : "Preencha os jogos da primeira fase."}
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-bold text-lime-900/70">
              {!pool
                ? "Quando o administrador cadastrar o bolao, a entrada dos participantes aparece aqui."
                : !participant
                  ? "Depois de entrar, voce consegue registrar os palpites dos 72 jogos da fase de grupos."
                  : predictionsComplete
                    ? "Seus palpites estao salvos. Quando o admin lancar resultados, o ranking passa a ser a tela principal."
                    : "A prioridade do MVP e essa: registrar todos os palpites sem depender de planilha."}
            </p>

            <div className="mt-6">
              {!participant && pool ? (
                <form action={joinPool}>
                  <input type="hidden" name="pool_id" value={pool.id} />
                  <SubmitButton className="h-12 w-full px-5 sm:w-auto">
                    {primaryLabel}
                  </SubmitButton>
                </form>
              ) : primaryHref ? (
                <ActionLink href={primaryHref} className="sm:inline-grid sm:w-auto">
                  {primaryLabel}
                </ActionLink>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-xl font-black">Seu status</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-md bg-lime-50 p-3">
                <p className="text-xs font-black uppercase text-lime-900/60">
                  Pagamento
                </p>
                <p className="mt-1 text-lg font-black">
                  {paymentLabel(participant?.payment_status)}
                </p>
              </div>
              <ProgressBar
                label="Palpites"
                value={progress}
                detail={`${predictionsCount} de ${totalMatches} jogos preenchidos.`}
              />
              <div className="rounded-md bg-lime-50 p-3">
                <p className="text-xs font-black uppercase text-lime-900/60">
                  Ranking
                </p>
                <p className="mt-1 text-lg font-black">
                  {rankingRow
                    ? `${rankingRow.position}o lugar - ${rankingRow.total_points} pts`
                    : "Ainda sem ranking"}
                </p>
              </div>
              <div className="rounded-md bg-lime-50 p-3">
                <p className="text-xs font-black uppercase text-lime-900/60">
                  Resultados oficiais
                </p>
                <p className="mt-1 text-lg font-black">
                  {finishedCount ?? 0} jogos lancados
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </Shell>
  );
}
