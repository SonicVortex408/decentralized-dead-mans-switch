const items = [
  "Solidity",
  "Base",
  "Foundry",
  "Arweave",
  "Viem",
  "Wagmi",
  "Rainbow",
  "WalletCt",
  "Safe",
];

export function StackStrip() {
  return (
    <section id="stack" className="border-b border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-9">
          {items.map((name) => (
            <div
              key={name}
              className="flex flex-col items-center gap-1 rounded-md border border-border bg-card px-2 py-3 text-center"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 font-mono text-[10px] text-primary">
                {name.slice(0, 2)}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
