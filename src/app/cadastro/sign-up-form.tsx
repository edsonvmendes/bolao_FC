"use client";

import { useState } from "react";
import { signUp } from "@/app/auth/actions";
import { inputClass, SubmitButton } from "@/components/ui/base";

function formatWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function SignUpForm() {
  const [phone, setPhone] = useState("");

  return (
    <form action={signUp} className="mt-5 grid gap-3">
      <label className="grid gap-1 text-sm font-black">
        Nome
        <input name="full_name" required className={inputClass} />
      </label>
      <label className="grid gap-1 text-sm font-black">
        Apelido
        <input name="nickname" required className={inputClass} />
      </label>
      <label className="grid gap-1 text-sm font-black">
        E-mail
        <input name="email" type="email" required className={inputClass} />
      </label>
      <label className="grid gap-1 text-sm font-black">
        Senha
        <input
          name="password"
          type="password"
          minLength={6}
          required
          className={inputClass}
        />
      </label>
      <label className="grid gap-1 text-sm font-black">
        WhatsApp
        <span className="text-xs font-semibold text-lime-900/60">
          Opcional, mas ajuda o admin a falar com voce no grupo.
        </span>
        <input
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          value={phone}
          onChange={(event) => setPhone(formatWhatsApp(event.target.value))}
          className={inputClass}
        />
      </label>
      <SubmitButton className="mt-2">Criar conta</SubmitButton>
      <p className="text-xs font-semibold leading-relaxed text-lime-900/60">
        Depois do cadastro, confirme seu e-mail para liberar o acesso com seguranca.
      </p>
    </form>
  );
}
