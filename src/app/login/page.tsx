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
        {/* Story side */}
        <section className="relative flex min-w-0 flex-col justify-between gap-8 p-6 sm:gap-10 sm:p-9 lg:p-12">
          <div className="flex min-w-0 items-center gap-2.5">
            <SignalMark size={22} live />
            <span className="min-w-0 font-display text-[17px] font-bold tracking-tight text-ink">
              GlaciaNav
              <span className="hidden font-mono text-[13px] font-normal text-faint sm:inline">
                {" "}
                / notes
              </span>
            </span>
          </div>

          <div>
            <p className="font-mono text-[11px] text-faint">Voice capture</p>
            <h1
              aria-label="Talk it through. Get it back as clear notes."
              className="mt-4 font-display text-[27px] font-bold leading-[1.12] tracking-tight text-ink min-[420px]:text-[34px] sm:text-[40px] sm:leading-[1.02] lg:text-[46px]"
            >
              <span className="sm:hidden">
                Talk it
                <br />
                through.
                <br />
                Get it back
                <br />
                <span className="text-accent-deep">as clear notes</span>.
              </span>
              <span className="hidden sm:inline">
                Talk it through.{" "}
                <br />
                Get it back as{" "}
                <span className="text-accent-deep">clear notes</span>.
              </span>
            </h1>
            <p className="mt-5 max-w-[15.5rem] text-[14px] leading-relaxed text-muted sm:max-w-sm sm:text-[15px]">
              Record or upload a conversation. It returns transcribed, summarized,
              and ready to question, then exports wherever your team already works.
            </p>
          </div>

          <div className="max-w-[15.5rem] rounded-card border border-hairline bg-bg p-3 sm:max-w-none sm:p-4">
            <Waveform bars={48} height={44} />
          </div>
        </section>

        {/* Sign-in side */}
        <section className="flex min-w-0 flex-col justify-center border-t border-hairline bg-bg/55 p-6 sm:p-9 lg:border-l lg:border-t-0 lg:p-12">
          <h2 className="font-display text-[24px] font-bold tracking-tight text-ink">
            Sign in
          </h2>
          <p className="mt-1.5 mb-8 text-sm text-muted">
            Sign in to your workspace.
          </p>
          <LoginForm from={from} />
        </section>
      </div>
    </main>
  );
}
