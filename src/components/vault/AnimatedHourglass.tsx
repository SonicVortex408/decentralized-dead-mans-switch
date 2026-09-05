// Purely decorative hourglass with sand animation + stack cards floating around.

export function AnimatedHourglass() {
  return (
    <div className="relative aspect-square w-full max-w-md">
      <div className="absolute inset-6 rounded-full border border-border/70" />
      <div className="absolute inset-12 rounded-full border border-dashed border-border/60" />

      <div className="absolute left-0 top-6 hidden w-52 rounded-lg border border-border bg-card p-3 shadow-sm sm:block">
        <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          Smart Contract
        </div>
        <pre className="mt-2 whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-foreground/80">
{`function release(
  uint256 id
) external {
  if (block.timestamp >=
    lastHeartbeat + interval)
  {
    released = true;
    emit Released(id,
      recipient, uri, hash);
  }
}`}
        </pre>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          RELEASED
        </div>
      </div>

      <div className="absolute right-0 top-4 hidden space-y-3 sm:block">
        <Chip title="Arweave" sub="Permanent Storage" />
        <Chip title="Encrypted Payload" />
        <Chip title="Recipient" sub="Decrypts Locally" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-64 w-40">
          <div className="absolute left-1/2 top-0 h-2.5 w-40 -translate-x-1/2 rounded bg-foreground/80" />
          <div className="absolute bottom-0 left-1/2 h-2.5 w-40 -translate-x-1/2 rounded bg-foreground/80" />
          <svg viewBox="0 0 160 240" className="absolute inset-0 text-primary">
            <defs>
              <linearGradient id="hgGlass" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="oklch(0.9 0.02 165)" stopOpacity="0.4" />
                <stop offset="1" stopColor="oklch(0.98 0.005 95)" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <path
              d="M20 10 H140 L90 118 Q80 122 70 118 Z"
              fill="url(#hgGlass)"
              stroke="currentColor"
              strokeOpacity="0.25"
            />
            <path
              d="M70 122 Q80 118 90 122 L140 230 H20 Z"
              fill="url(#hgGlass)"
              stroke="currentColor"
              strokeOpacity="0.25"
            />
            <path
              d="M40 40 H120 L88 108 Q80 112 72 108 Z"
              fill="oklch(0.7 0.08 155)"
              style={{ transformOrigin: "80px 40px", animation: "sand-drain 6s ease-in-out infinite" }}
            />
            <path
              d="M30 220 H130 L100 170 Q80 165 60 170 Z"
              fill="oklch(0.55 0.1 160)"
              style={{ transformOrigin: "80px 220px", animation: "sand-fill 6s ease-in-out infinite" }}
            />
            <rect
              x="79"
              y="118"
              width="2"
              height="50"
              fill="oklch(0.6 0.1 160)"
              style={{ animation: "sand-stream 6s linear infinite" }}
            />
          </svg>
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 rounded border border-border bg-card px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground shadow-sm">
            silence period expired
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sand-drain { 0%,100% { transform: scaleY(1);} 50% { transform: scaleY(0.15);} }
        @keyframes sand-fill  { 0%,100% { transform: scaleY(0.2);} 50% { transform: scaleY(1);} }
        @keyframes sand-stream{ 0% { opacity:0;} 10%,90% { opacity:1;} 100% { opacity:0;} }
      `}</style>
    </div>
  );
}

function Chip({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="w-44 rounded-md border border-border bg-card px-3 py-2 shadow-sm">
      <div className="text-xs font-medium text-foreground">{title}</div>
      {sub ? <div className="text-[10px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}
