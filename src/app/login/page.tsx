import { LoginForm } from "./login-form";
import { SignalMark } from "@/components/brand";
import { Waveform } from "@/components/waveform";
import { AuroraBackground } from "@/components/aurora-background";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from = "/" } = await searchParams;

  return (
    <main className="grid min-h-[100dvh] items-start justify-items-center px-5 py-10 sm:place-items-center">
      <AuroraBackground />
      <div className="grid w-full max-w-5xl overflow-hidden rounded-panel lg:grid-cols-[1.05fr_0.95fr] glass rise">
        {/* Instrument / story side */}
        <section className="relative flex min-w-0 flex-col justify-between gap-8 p-6 sm:gap-10 sm:p-9 lg:p-12">
          <div className="flex min-w-0 items-center gap-2.5">
            <SignalMark size={22} live />
            <span className="min-w-0 font-display text-[18px] font-semibold tracking-tight text-ink">
              GlaciaNav
              <span className="hidden font-mono text-[12px] font-normal text-faint sm:inline">
                {" "}
                / notes
              </span>
            </span>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
              Field station · voice capture
            </p>
            <h1
              aria-label="Speak once. Own the record."
              className="mt-4 pb-1 font-display text-[34px] font-normal leading-[1.02] tracking-[-0.01em] text-ink min-[420px]:text-[40px] sm:text-[46px] lg:text-[52px]"
            >
              <span aria-hidden>
                Speak once.
                <br />
                Own the{" "}
                <span className="italic text-accent-deep">record</span>.
              </span>
            </h1>
            <p className="mt-5 max-w-[16rem] text-[14px] leading-relaxed text-muted sm:max-w-sm sm:text-[15px]">
              Capture a conversation and watch it resolve — transcript, summary,
              and every action traceable to the exact moment it was said.
            </p>
          </div>

          <div className="max-w-[16rem] rounded-card border border-hairline bg-bg p-3 sm:max-w-none sm:p-4">
            <Waveform bars={48} height={44} />
          </div>
        </section>

        {/* Sign-in side */}
        <section className="flex min-w-0 flex-col justify-center border-t border-hairline bg-bg-2/60 p-6 sm:p-9 lg:border-l lg:border-t-0 lg:p-12">
          <h2 className="font-display text-[26px] font-normal tracking-tight text-ink">
            Sign in
          </h2>
          <p className="mt-1.5 mb-8 text-sm text-muted">
            Enter your workspace.
          </p>
          <LoginForm from={from} />
        </section>
      </div>
    </main>
  );
}
