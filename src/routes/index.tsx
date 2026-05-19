import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Sprout,
  Users,
  Banknote,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  HandCoins,
  Gift,
  CheckCircle2,
  Quote,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kijiji — Village banking, simplified" },
      {
        name: "description",
        content:
          "A calm, modern ledger for village savings groups. Track members, contributions, loans and share-outs with clarity and trust.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[360px] w-[360px] rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:radial-gradient(var(--color-foreground)_1px,transparent_1px)] [background-size:22px_22px]" />
      </div>

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sprout className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">Kijiji</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#trust" className="hover:text-foreground transition-colors">Trust</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/login">
            <Button size="sm" className="gap-1.5">Get started <ArrowRight className="h-3.5 w-3.5" /></Button>
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-14 px-6 pt-10 pb-24 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              Built for savings groups
            </span>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-[68px]">
              The trusted ledger for your{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-primary">village bank</span>
                <span aria-hidden className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded-sm bg-accent/50" />
              </span>
              .
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Kijiji helps treasurers run a transparent group — track members,
              record contributions, issue loans and follow repayments through
              one calm, careful interface.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/login">
                <Button size="lg" className="gap-2 shadow-sm">
                  Open your ledger <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#how">
                <Button size="lg" variant="outline" className="gap-2">
                  See how it works
                </Button>
              </a>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6">
              {[
                { k: "Groups", v: "120+" },
                { k: "Tracked", v: "$1.4M" },
                { k: "Uptime", v: "99.9%" },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">{s.k}</dt>
                  <dd className="mt-1 font-display text-xl font-semibold tabular-nums">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Mock dashboard */}
          <div className="relative">
            <div aria-hidden className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary/15 via-accent/30 to-transparent blur-2xl" />
            <div className="relative rounded-2xl border border-border bg-card/95 p-6 shadow-[0_30px_60px_-30px_rgba(0,40,20,0.25)] backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Group balance</p>
                  <p className="mt-1 font-display text-[34px] font-semibold tabular-nums">$12,480.00</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/30 px-2.5 py-1 text-xs font-medium text-accent-foreground">
                  <ArrowUpRight className="h-3 w-3" /> 8.2%
                </span>
              </div>

              {/* Sparkline */}
              <div className="mt-4 h-20 w-full">
                <svg viewBox="0 0 320 80" className="h-full w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,60 C30,52 50,58 75,46 C100,34 120,40 145,32 C170,24 190,30 215,22 C240,14 265,20 290,12 L320,8 L320,80 L0,80 Z"
                    fill="url(#spark)"
                  />
                  <path
                    d="M0,60 C30,52 50,58 75,46 C100,34 120,40 145,32 C170,24 190,30 215,22 C240,14 265,20 290,12 L320,8"
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                {[
                  { l: "Members", v: "24" },
                  { l: "Active loans", v: "7" },
                  { l: "On-time", v: "96%" },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border border-border bg-background/60 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.l}</p>
                    <p className="mt-1 font-display text-lg font-semibold tabular-nums">{s.v}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-1">
                <p className="px-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Recent activity</p>
                {[
                  { n: "Amina O.", t: "Contribution", a: "+ $50.00", up: true },
                  { n: "Joseph K.", t: "Loan repayment", a: "+ $120.00", up: true },
                  { n: "Grace M.", t: "New loan", a: "− $300.00", up: false },
                ].map((r) => (
                  <div
                    key={r.n}
                    className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-secondary-foreground font-display text-xs font-semibold">
                        {r.n.split(" ").map((p) => p[0]).join("")}
                      </span>
                      <div>
                        <p className="font-medium leading-tight">{r.n}</p>
                        <p className="text-xs text-muted-foreground">{r.t}</p>
                      </div>
                    </div>
                    <span className={`font-display tabular-nums ${r.up ? "text-primary" : "text-foreground"}`}>{r.a}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating chip */}
            <div className="absolute -bottom-5 -left-4 hidden rounded-xl border border-border bg-card px-3 py-2 shadow-md sm:flex sm:items-center sm:gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="text-xs">
                <span className="font-semibold">Week closed</span>{" "}
                <span className="text-muted-foreground">— all reconciled</span>
              </span>
            </div>
          </div>
        </section>

        {/* Trust band */}
        <section id="trust" className="border-y border-border bg-card/40">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span>Trusted by groups across</span>
            {["Nairobi", "Kampala", "Dar es Salaam", "Kigali", "Arusha"].map((c) => (
              <span key={c} className="font-display text-sm font-semibold tracking-tight text-foreground/70">
                {c}
              </span>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">How it works</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              From first contribution to final share-out.
            </h2>
            <p className="mt-3 text-muted-foreground">
              A predictable cycle that respects how savings groups actually run — without spreadsheets going missing.
            </p>
          </div>

          <ol className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                n: "01",
                i: Users,
                t: "Onboard your members",
                d: "Add the roster with phone numbers and join dates. Invite members to their own portal.",
              },
              {
                n: "02",
                i: Receipt,
                t: "Record contributions & loans",
                d: "Log every shilling. Approve loan applications. Penalties accrue automatically when overdue.",
              },
              {
                n: "03",
                i: Gift,
                t: "Share-out at cycle end",
                d: "Distribute the pot proportionally to each member's savings. Everyone sees the math.",
              },
            ].map(({ n, i: Icon, t, d }) => (
              <li
                key={n}
                className="group relative rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-xs font-semibold tracking-widest text-muted-foreground">{n}</span>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-6 font-display text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                i: Users,
                t: "Members",
                d: "A clean roster with phone numbers and join dates.",
              },
              {
                i: Banknote,
                t: "Savings & loans",
                d: "Record every contribution, loan and repayment with notes.",
              },
              {
                i: TrendingUp,
                t: "Live overview",
                d: "Group balance, active loans and on-time rate at a glance.",
              },
              {
                i: ShieldCheck,
                t: "Private by default",
                d: "Your group's books are visible only to you and members.",
              },
            ].map(({ i: Icon, t, d }) => (
              <div
                key={t}
                className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-display text-base font-semibold">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonial */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <figure className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-primary/80 p-10 text-primary-foreground sm:p-14">
            <Quote className="absolute right-8 top-8 h-24 w-24 opacity-10" />
            <blockquote className="max-w-3xl font-display text-2xl font-medium leading-snug sm:text-3xl">
              "Our chama used to lose hours to reconciliation every Saturday.
              With Kijiji, the ledger closes itself — and every member sees the
              same numbers."
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3 text-sm">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-foreground/15 font-display text-sm font-semibold">
                EW
              </span>
              <div>
                <p className="font-semibold">Esther W.</p>
                <p className="opacity-80">Treasurer · Mwangaza Savings Group, Nairobi</p>
              </div>
            </figcaption>
          </figure>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-28">
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-border bg-card p-10 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Ready to open your ledger?
              </h2>
              <p className="mt-2 max-w-lg text-muted-foreground">
                Set up your group in minutes. No spreadsheets, no missing receipts.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/login">
                <Button size="lg" className="gap-2">
                  <HandCoins className="h-4 w-4" /> Start free
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline">Sign in</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground">
              <Sprout className="h-3.5 w-3.5" />
            </span>
            <span className="font-display text-sm font-semibold text-foreground">Kijiji</span>
            <span>· village banking, simplified</span>
          </div>
          <p>© {new Date().getFullYear()} Kijiji. Built with care.</p>
        </div>
      </footer>
    </div>
  );
}
