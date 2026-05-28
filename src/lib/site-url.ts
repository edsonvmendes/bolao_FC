import { headers } from "next/headers";
import { getSiteUrl } from "@/lib/supabase/env";

export async function getRequestSiteUrl() {
  const configuredUrl = getSiteUrl();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") || "http";

  return host ? `${protocol}://${host}` : "http://127.0.0.1:3000";
}
