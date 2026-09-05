import { useWallet, wallet, shortAddr } from "@/lib/wallet";
import { useContractConfig, SUPPORTED_CHAINS } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { linkWallet } from "@/lib/auth";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

export function WalletBar({
  userId,
  linkedAddress,
  onLinked,
}: {
  userId: string;
  linkedAddress: string | null;
  onLinked: () => void;
}) {
  const w = useWallet();
  const cfg = useContractConfig();
  const wrongChain = w.address && w.chainId !== null && w.chainId !== cfg.chainId;
  const needsLink =
    w.address && (!linkedAddress || linkedAddress.toLowerCase() !== w.address.toLowerCase());

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Wallet className="h-4 w-4" />
        </span>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            MetaMask
          </div>
          <div className="font-mono text-sm text-foreground">
            {w.address ? shortAddr(w.address) : "not connected"}
          </div>
        </div>
        {w.chainId ? (
          <Badge variant="secondary" className={wrongChain ? "bg-destructive/10 text-destructive" : ""}>
            {SUPPORTED_CHAINS[w.chainId]?.name ?? `Chain ${w.chainId}`}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {!w.address ? (
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() =>
              wallet.connect().catch((e: Error) => toast.error(e.message))
            }
            disabled={w.connecting}
          >
            Connect MetaMask
          </Button>
        ) : null}
        {wrongChain ? (
          <Button size="sm" variant="outline" onClick={() => wallet.switchChain(cfg.chainId)}>
            Switch to {SUPPORTED_CHAINS[cfg.chainId]?.name ?? cfg.chainId}
          </Button>
        ) : null}
        {needsLink ? (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await linkWallet(userId, w.address!);
                onLinked();
                toast.success("Wallet linked to your account");
              } catch {
                toast.error("Could not link this wallet");
              }
            }}
          >
            Link to account
          </Button>
        ) : null}
      </div>
    </div>
  );
}
