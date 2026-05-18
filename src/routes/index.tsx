import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sprout, Users, Banknote, ShieldCheck, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kijiji — Village Banking, simplified" },
      {
        name: "description",
        content:
          "A modern ledger for village savings groups. Track members, contributions, loans, and repayments with clarity and trust.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sprout className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold">Kijiji</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link to="/login">
            <Button>Get started</Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <section className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Built for savings groups
            </span>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] sm:text-6xl">
              The trusted ledger for your{" "}
              <span className="text-primary">village bank</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Kijiji helps treasurers run a transparent group: track members,
              record contributions, issue loans and follow repayments — all in
              one calm, careful interface.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/login">
                <Button size="lg" className="gap-2">
                  Open your ledger <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline">
                  See how it works
                </Button>
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/30 to-transparent blur-2xl" />
            <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Group balance
                  </p>
                  <p className="mt-1 font-display text-3xl font-semibold">
                    $12,480.00
                  </p>
                </div>
                <span className="rounded-full bg-accent/30 px-3 py-1 text-xs font-medium text-accent-foreground">
                  +8.2%
                </span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
                {[
                  { l: "Members", v: "24" },
                  { l: "Active loans", v: "7" },
                  { l: "On-time", v: "96%" },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="rounded-lg border border-border bg-background/60 p-3"
                  >
                    <p className="text-xs text-muted-foreground">{s.l}</p>
                    <p className="font-display text-lg font-semibold">{s.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2">
                {[
                  ["Amina O.", "Contribution", "+ $50.00"],
                  ["Joseph K.", "Loan repayment", "+ $120.00"],
                  ["Grace M.", "New loan", "− $300.00"],
                ].map(([n, t, a]) => (
                  <div
                    key={n}
                    className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted/60"
                  >
                    <div>
                      <p className="font-medium">{n}</p>
                      <p className="text-xs text-muted-foreground">{t}</p>
                    </div>
                    <span className="font-display tabular-nums">{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-28 grid gap-6 sm:grid-cols-3">
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
              i: ShieldCheck,
              t: "Private by default",
              d: "Your group's books are visible only to you.",
            },
          ].map(({ i: Icon, t, d }) => (
            <div
              key={t}
              className="rounded-xl border border-border bg-card p-6"
            >
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-display text-lg font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Kijiji village banking
      </footer>
    </div>
  );
}
