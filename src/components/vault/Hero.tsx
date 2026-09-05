import { Button } from "@/components/ui/button";
import { AnimatedHourglass } from "./AnimatedHourglass";
import { CheckCircle2, Eye, Lock, Clock, Users } from "lucide-react";

const bullets = [
  { icon: CheckCircle2, label: "No central operator" },
  { icon: Eye, label: "Public & verifiable rules" },
  { icon: Lock, label: "Tamper resistant" },
  { icon: Clock, label: "Outlives the owner" },
  { icon: Users, label: "Anyone can trigger release" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[1.05fr_1fr] md:py-28">
        <div className="flex flex-col justify-center">
          <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Live on Base Sepolia
          </p>
          <h1 className="font-serif text-5xl leading-[1.02] text-primary md:text-7xl">
            A Decentralized
            <br />
            <span className="italic">Dead Man's</span>
            <br />
            Switch.
          </h1>
          <div className="mt-6 h-px w-24 bg-primary/70" />
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Encrypt a secret, lock it behind a heartbeat, let the chain do the
            rest — the modern smart-contract stack for time-locked inheritance.
          </p>

          <ul className="mt-8 space-y-2 text-sm">
            {bullets.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-foreground/80">
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button
              size="lg"
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <a href="#auth">Create your vault</a>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-primary/30 text-primary hover:bg-primary/5">
              <a href="#how">See how it works</a>
            </Button>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <AnimatedHourglass />
        </div>
      </div>
    </section>
  );
}