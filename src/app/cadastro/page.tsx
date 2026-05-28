import { SignUpForm } from "@/app/cadastro/sign-up-form";
import { AuthCard } from "@/components/ui/auth-card";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthCard
      title="Criar conta"
      description="Use seus dados reais para o admin controlar pagamento e ranking."
      error={
        params.error
          ? `Nao foi possivel criar a conta: ${decodeURIComponent(params.error)}.`
          : undefined
      }
      footerPrompt="Ja tem conta?"
      footerHref="/entrar"
      footerLabel="Entrar"
    >
      <SignUpForm />
    </AuthCard>
  );
}
