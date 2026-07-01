import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getIntegration } from "@/lib/integrations";
import { googleConfigured } from "@/lib/google";
import { AppHeader } from "@/components/app-header";
import { IntegrationsPanel } from "@/components/settings/integrations-panel";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { connected, error } = await searchParams;
  const [g, t] = await Promise.all([
    getIntegration(session.user.id, "google"),
    getIntegration(session.user.id, "teams"),
  ]);

  return (
    <div className="min-h-[100dvh]">
      <AppHeader user={session.user} />
      <main className="mx-auto max-w-2xl px-4 pb-28 md:pb-20 pt-10 sm:px-6">
        <h1 className="font-display text-[26px] font-bold tracking-tight text-ink">
          Integrations
        </h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          Connect where your notes should go. These apply to your account only.
        </p>

        {connected === "google" && (
          <Banner ok>Google connected. You can now export notes to Docs.</Banner>
        )}
        {error === "google_oauth" && (
          <Banner>Google connection didn&apos;t complete. Please try again.</Banner>
        )}
        {error === "google_not_configured" && (
          <Banner>Google export isn&apos;t configured on this server yet.</Banner>
        )}

        <IntegrationsPanel
          google={{
            configured: googleConfigured(),
            connected: !!g?.accessToken,
            email: g?.accountLabel,
          }}
          teams={{ connected: !!t?.config?.webhookUrl }}
        />
      </main>
    </div>
  );
}

function Banner({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <div
      className={`mb-5 rounded-input px-4 py-3 text-[13px] ${
        ok
          ? "bg-[rgba(14,164,114,0.1)] text-ok"
          : "bg-[rgba(229,72,77,0.1)] text-err"
      }`}
    >
      {children}
    </div>
  );
}
