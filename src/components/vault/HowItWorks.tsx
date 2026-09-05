import { FileEdit, Activity, Clock, Users, Unlock } from "lucide-react";

const steps = [
  { icon: FileEdit, title: "REGISTER", detail: "Commit encrypted payload & rules" },
  { icon: Activity, title: "HEARTBEAT", detail: "Owner sends periodic pings" },
  { icon: Clock, title: "SILENCE", detail: "No heartbeat within interval" },
  { icon: Users, title: "ANYONE CALLS", detail: "release() after interval expires" },
  { icon: Unlock, title: "RELEASED", detail: "Payload available, recipient decrypts" },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="font-serif text-4xl text-primary">The lifecycle</h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Five deterministic states. All timing lives on-chain via{" "}
          <span className="font-mono text-foreground">block.timestamp</span> —
          never in a browser timer.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-5">
          {steps.map(({ icon: Icon, title, detail }, i) => (
            <div key={title} className="relative rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-xs font-semibold tracking-wider text-primary">{title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
              {i < steps.length - 1 && (
                <div className="absolute right-[-14px] top-1/2 hidden h-px w-6 -translate-y-1/2 border-t border-dashed border-border md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
