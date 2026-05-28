function cleanEnv(value: string | undefined) {
  return (value ?? "").replace(/\uFEFF/g, "").trim();
}

export function getSupabaseUrl() {
  return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabasePublishableKey() {
  return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabaseServiceRoleKey() {
  return cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSiteUrl() {
  return cleanEnv(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL);
}
