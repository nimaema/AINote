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
    <main className="grid min-h-[100dvh] lg:grid-cols-2">
      {/* Ambient side — an iridescent calm, the intelligence layer at rest. */}
      <section
        className="relative hidden overflow-hidden lg:block"
        style={{
          background:
            "linear-gradient(135deg, #e8f5ef 0%, #e9edf7 46%, #f2eef7 100%)",
        }}
        aria-hidden
      >
        <div
          className="absolute -left-24 top-8 h-[26rem] w-[26rem] rounded-full opacity-70 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(118,215,182,0.55), transparent 70%)" }}
        />
        <div
          className="absolute right-[-6rem] top-1/3 h-[24rem] w-[24rem] rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(150,161,224,0.42), transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-4rem] left-1/4 h-[22rem] w-[22rem] rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(199,238,222,0.75), transparent 70%)" }}
        />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 720 900"
          preserveAspectRatio="xMidYMid slice"
        >
          <g fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.4">
            <path d="M-40 300 C 160 220, 320 380, 520 300 S 820 200, 980 280" />
            <path d="M-40 360 C 170 280, 340 440, 540 360 S 830 260, 980 340" />
            <path d="M-40 560 C 180 640, 360 500, 560 600 S 830 700, 980 620" />
          </g>
        </svg>

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-2.5">
            <SignalMark size={22} live />
            <span className="font-display text-[22px] leading-none text-ink">Glacianav</span>
          </div>

          <div className="max-w-md">
            <h2 className="font-display text-[38px] leading-[1.08] text-ink xl:text-[46px]">
              Speak once.
              <br />
              Understand everything.
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ink-soft/80">
              Record a conversation and watch it become notes you can trust.
              Every claim stays traceable to the moment it was said.
            </p>
          </div>

          <div className="max-w-sm rounded-card border border-white/50 bg-white/35 p-4 backdrop-blur-sm">
            <Waveform bars={52} height={40} />
          </div>
        </div>
      </section>

      {/* Sign-in side */}
      <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-sm">
          {/* Mobile wordmark (ambient panel is hidden below lg) */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <SignalMark size={20} />
            <span className="font-display text-[20px] leading-none text-ink">Glacianav</span>
          </div>

          <h1 className="font-display text-[34px] leading-none text-ink">Sign in</h1>
          <p className="mb-8 mt-2 text-[14px] text-muted">
            Welcome back to your workspace.
          </p>

          <LoginForm from={from} />
        </div>
      </section>
    </main>
  );
}
