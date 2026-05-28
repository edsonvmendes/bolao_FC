import Link from "next/link";
import { AlertMessage } from "@/components/ui/base";

export function AuthCard({
  title,
  description,
  error,
  children,
  footerPrompt,
  footerHref,
  footerLabel,
}: {
  title: string;
  description: string;
  error?: string;
  children: React.ReactNode;
  footerPrompt: string;
  footerHref: string;
  footerLabel: string;
}) {
  return (
    <main className="football-field grid min-h-screen place-items-center px-4 py-10 text-lime-950">
      <section className="relative z-10 w-full max-w-md rounded-lg border-2 border-lime-950 bg-white/95 p-5 shadow-sm">
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-1 text-sm font-semibold text-lime-900/70">
          {description}
        </p>
        {error && (
          <div className="mt-3">
            <AlertMessage tone="danger">{error}</AlertMessage>
          </div>
        )}
        {children}
        <p className="mt-4 text-sm font-semibold text-lime-900/70">
          {footerPrompt}{" "}
          <Link className="font-black text-lime-800 underline" href={footerHref}>
            {footerLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
