import { LoginForm } from "./login-form";
import { SignalMark } from "@/components/brand";
import { Waveform } from "@/components/waveform";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from = "/" } = await searchParams;

  return (
    <main className="grid min-h-[100dvh] place-items-center px-5 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-panel lg:grid-cols-[1.05fr_0.95fr] glass rise">
        {/* Story side */}
        <section className="relative flex flex-col justify-between gap-10 p-9 lg:p-12">
          <div className="flex items-center gap-2.5">
            <SignalMark size={22} live />
            <span className="font-display text-[17px] font-bold tracking-tight text-ink">
              GlaciaNav
              <span className="font-mono text-[13px] font-normal text-faint"> / notes</span>
            </span>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent-deep">
              Voice, transcribed
            </p>
            <h1 className="mt-4 font-display text-[40px] font-bold leading-[1.02] tracking-tight text-ink lg:text-[46px]">
              Talk it through.
              <br />
              Get it back as{" "}
              <span className="accent-gradient">clear notes</span>.
            </h1>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-muted">
              Record or upload a conversation. It returns transcribed, summarized,
              and ready to question, then exports wherever your team already works.
            </p>
          </div>

          <div className="rounded-card border border-hairline bg-white/40 p-4">
            <Waveform bars={48} height={44} />
          </div>
        </section>

        {/* Sign-in side */}
        <section className="flex flex-col justify-center border-t border-hairline bg-white/45 p-9 lg:border-l lg:border-t-0 lg:p-12">
          <h2 className="font-display text-[24px] font-bold tracking-tight text-ink">
            Sign in
          </h2>
          <p className="mt-1.5 mb-8 text-sm text-muted">
            Enter your credentials to open the console.
          </p>
          <LoginForm from={from} />
        </section>
      </div>
    </main>
  );
}
