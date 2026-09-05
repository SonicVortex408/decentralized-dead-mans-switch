import { useEffect, useState } from "react";

function formatDuration(ms: number) {
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, total: 0 };
  const total = Math.floor(ms / 1000);
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
    total,
  };
}

export function Countdown({
  deadlineMs,
  released,
  cancelled,
}: {
  deadlineMs: number;
  released: boolean;
  cancelled: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const remaining = deadlineMs - now;
  const parts = formatDuration(remaining);
  const expired = remaining <= 0;

  const status = cancelled
    ? { text: "Switch cancelled by owner", tone: "warn" }
    : released
      ? { text: "Silence expired — payload released", tone: "danger" }
      : expired
        ? { text: "Awaiting release()…", tone: "danger" }
        : { text: "Alive — heartbeat active", tone: "ok" };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Time until release
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            status.tone === "ok"
              ? "bg-success/10 text-success"
              : status.tone === "warn"
                ? "bg-warning/10 text-warning"
                : "bg-destructive/10 text-destructive"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status.tone === "ok"
                ? "bg-success animate-pulse"
                : status.tone === "warn"
                  ? "bg-warning"
                  : "bg-destructive"
            }`}
          />
          {status.text}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-2 text-center font-serif">
        {[
          { v: parts.d, l: "days" },
          { v: parts.h, l: "hours" },
          { v: parts.m, l: "mins" },
          { v: parts.s, l: "secs" },
        ].map((p) => (
          <div key={p.l} className="rounded-lg border border-border bg-background/60 py-4">
            <div className="text-4xl leading-none text-primary tabular-nums">
              {String(p.v).padStart(2, "0")}
            </div>
            <div className="mt-1 font-sans text-[10px] uppercase tracking-widest text-muted-foreground">
              {p.l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
