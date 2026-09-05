export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-secondary/30">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-serif text-lg text-primary">Silence</span> ·
          simulated demo · no funds are ever at risk
        </div>
        <div className="font-mono">Contract: 0x7F3e…A21c · Base Sepolia</div>
      </div>
    </footer>
  );
}
