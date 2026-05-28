import { signIn } from "@/app/auth/actions";
import { AuthCard } from "@/components/ui/auth-card";
import { inputClass, SubmitButton } from "@/components/ui/base";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthCard
      title="Entrar no bolao"
      description="Acesse para preencher palpites e acompanhar sua pontuacao."
      error={
        params.error
          ? `Nao foi possivel entrar: ${decodeURIComponent(params.error)}.`
          : undefined
      }
      footerPrompt="Ainda nao participa?"
      footerHref="/cadastro"
      footerLabel="Criar conta"
    >
      <form action={signIn} className="mt-5 grid gap-3">
        <label className="grid gap-1 text-sm font-black">
          E-mail
          <input name="email" type="email" required className={inputClass} />
        </label>
        <label className="grid gap-1 text-sm font-black">
          Senha
          <input name="password" type="password" required className={inputClass} />
        </label>
        <SubmitButton className="mt-2">Entrar</SubmitButton>
      </form>
    </AuthCard>
  );
}
