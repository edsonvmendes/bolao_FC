"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRequestSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.replace(/\uFEFF/g, "").trim() : "";
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = getString(formData, "email");
  const password = getString(formData, "password");
  const fullName = getString(formData, "full_name");
  const nickname = getString(formData, "nickname");
  const phone = getString(formData, "phone");

  if (!email || !password || !fullName || !nickname) {
    redirect("/cadastro?error=missing_fields");
  }

  const callbackUrl = new URL("/auth/callback", await getRequestSiteUrl());
  callbackUrl.searchParams.set("next", "/palpites");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      data: {
        full_name: fullName,
        nickname,
        phone,
      },
    },
  });

  if (error) {
    redirect(`/cadastro?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/palpites");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = getString(formData, "email");
  const password = getString(formData, "password");

  if (!email || !password) {
    redirect("/entrar?error=missing_fields");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/entrar?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/palpites");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/entrar");
}
