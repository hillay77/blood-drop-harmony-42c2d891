import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Droplets, Snowflake, Radio, ShieldCheck, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nakandulo — National Blood Shortage Forecasting Network" },
      { name: "description", content: "Centralized blood supply tracking, predictive shortage forecasting, cold-chain monitoring, and rare-phenotype SMS alerts." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Droplets, title: "Live Inventory", desc: "Track units by ABO/Rh, phenotype, volume, and expiry across every hub." },
  { icon: TrendingDown, title: "Shortage Forecasts", desc: "30-day consumption trend with projected days remaining per blood group." },
  { icon: Snowflake, title: "Cold-Chain Monitoring", desc: "Continuous storage temperature readings with depletion-risk alerts." },
  { icon: Activity, title: "Emergency Dispatch", desc: "FEFO matching and haversine routing between hospitals and donor hubs." },
  { icon: Radio, title: "Rare-Phenotype SMS", desc: "Automated Twilio alerts to opted-in donors when rare matches are needed." },
  
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Droplets className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">Nakandulo</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/auth"><Button>Get started</Button></Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              National Blood Supply Network
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Predict shortages before they happen.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              A centralized engine for blood-bank operations — live inventory, cold-chain telemetry, predictive depletion thresholds, emergency dispatch routing, and rare-phenotype SMS donor matching.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/auth"><Button size="lg">Open dashboard</Button></Link>
              <a href="#features"><Button size="lg" variant="outline">Learn more</Button></a>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-border bg-card/40 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold text-foreground">Built for high-availability operations</h2>
              <p className="mt-3 text-muted-foreground">Every module is wired into a single source of truth — secured by row-level policies and auditable end-to-end.</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-primary p-10 text-center text-primary-foreground">
              <h2 className="font-display text-3xl font-bold">Become a rare-phenotype donor</h2>
              <p className="mt-3 text-primary-foreground/80">Opt in to SMS alerts and help us save lives when rare matches are needed.</p>
              <div className="mt-6"><Link to="/auth"><Button size="lg" variant="secondary">Join the registry</Button></Link></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/60">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Nakandulo · National Blood Shortage Forecasting Network
        </div>
      </footer>
    </div>
  );
}
