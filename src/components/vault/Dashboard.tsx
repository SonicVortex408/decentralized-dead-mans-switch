import { useQuery } from "@tanstack/react-query";
import { fetchVault, pingVault, cancelVault } from "@/lib/vault-chain";
import { useContractConfig, isAddress, explorerTx } from "@/lib/contract";
import { shortAddr } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Countdown } from "./Countdown";
import { ContractSettings } from "./ContractSettings";
import { Activity, HeartPulse, Trash2, Copy, Loader2 } from "lucide-react";
import { useState } from "react";

export function Dashboard({ ownerAddress }: { ownerAddress: string }) {
  const cfg = useContractConfig();
  const [busy, setBusy] = useState<string | null>(null);

  const vaultQuery = useQuery({
    queryKey: ["vault", cfg.address, cfg.chainId, ownerAddress],
    queryFn: () => fetchVault(ownerAddress),
    enabled: isAddress(cfg.address) && isAddress(ownerAddress),
    refetchInterval: 10_000,
  });

  const vault = vaultQuery.data;

  if (!isAddress(cfg.address)) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-8">
          <h2 className="font-serif text-3xl text-primary">Point at your deployment</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste the address of your deployed DeadMansSwitch contract to load live state.
          </p>
        </div>
        <ContractSettings />
      </div>
    );
  }

  if (vaultQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Reading contract state…
      </div>
    );
  }

  if (vaultQuery.isError) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-destructive/40 bg-card p-8">
          <h2 className="font-serif text-3xl text-primary">Could not read the contract</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Check that MetaMask is on the right network and the address is correct.
          </p>
        </div>
        <ContractSettings />
      </div>
    );
  }

  if (!vault) return null;

  const deadline = vault.lastPingMs + vault.timeoutMs;
  const active = !vault.released && !vault.cancelled;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Vault
            </div>
            <h2 className="font-serif text-4xl text-primary">
              {vault.released ? "Released" : vault.cancelled ? "Cancelled" : "Armed"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              disabled={!active || busy !== null}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={async () => {
                setBusy("ping");
                try {
                  const receipt = await pingVault();
                  toast.success("Heartbeat confirmed", {
                    description: receipt?.hash ? shortAddr(receipt.hash) : undefined,
                    action: receipt?.hash
                      ? {
                          label: "View",
                          onClick: () =>
                            window.open(explorerTx(cfg.chainId, receipt.hash), "_blank"),
                        }
                      : undefined,
                  });
                  vaultQuery.refetch();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message.slice(0, 140) : "Ping failed");
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "ping" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <HeartPulse className="mr-2 h-4 w-4" />
              )}
              I am alive
            </Button>
            <Button
              size="lg"
              variant="outline"
              disabled={!active || busy !== null}
              onClick={async () => {
                if (!confirm("Disarm the switch and withdraw the deposit?")) return;
                setBusy("cancel");
                try {
                  await cancelVault();
                  toast("Vault cancelled, funds withdrawn");
                  vaultQuery.refetch();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message.slice(0, 140) : "Cancel failed");
                } finally {
                  setBusy(null);
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Cancel & withdraw
            </Button>
          </div>
        </div>

        <Countdown deadlineMs={deadline} released={vault.released} cancelled={vault.cancelled} />

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Locked balance" value={`${vault.amountEth} ETH`} sub="held by contract" />
          <StatCard
            label="Silence interval"
            value={`${Math.round(vault.timeoutMs / 60000)} min`}
            sub="timeout on-chain"
          />
          <StatCard label="Owner" value={shortAddr(ownerAddress)} mono />
          <StatCard label="Beneficiary" value={shortAddr(vault.beneficiary)} mono />
        </div>

        <IpfsCard hash={vault.cid} />
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">
              Chainlink Automation
            </div>
            <Badge variant="secondary" className="bg-success/10 text-success">
              {active ? "Watching" : "Idle"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono text-foreground">checkUpkeep()</span> is polled by the
            Automation network. When it returns true,{" "}
            <span className="font-mono text-foreground">performUpkeep()</span> calls{" "}
            <span className="font-mono text-foreground">releaseFunds()</span> and the deposit
            moves to the beneficiary.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5 animate-pulse text-success" />
            State refreshed every 10s
          </div>
        </div>

        <ContractSettings />
      </aside>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  mono,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-lg ${mono ? "font-mono" : "font-serif"} text-primary`}>
        {value}
      </div>
      {sub ? <div className="text-[10px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

function IpfsCard({ hash }: { hash: string }) {
  if (!hash) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-primary">
          Encrypted payload · IPFS
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(hash);
            toast.success("CID copied");
          }}
        >
          <Copy className="mr-1 h-3 w-3" /> Copy
        </Button>
      </div>
      <div className="mt-2 break-all rounded bg-secondary/60 p-3 font-mono text-xs text-foreground">
        ipfs://{hash}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Publicly readable ciphertext. Only the beneficiary's passphrase decrypts it.
      </p>
    </div>
  );
}
