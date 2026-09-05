import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWallet, wallet, shortAddr } from "@/lib/wallet";
import { fetchVault, releaseVault } from "@/lib/vault-chain";
import { fetchEncryptedPayload } from "@/lib/pinata.functions";
import { contractConfig, isAddress } from "@/lib/contract";
import { decryptSecret } from "@/lib/crypto-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Unlock, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VaultRow {
  id: string;
  owner_address: string;
  beneficiary_address: string;
  contract_address: string;
  chain_id: number;
  ipfs_cid: string;
  timeout_seconds: number;
}

export function BeneficiaryPanel() {
  const w = useWallet();

  const rows = useQuery({
    queryKey: ["beneficiary-vaults", w.address],
    enabled: Boolean(w.address),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vaults")
        .select("id, owner_address, beneficiary_address, contract_address, chain_id, ipfs_cid, timeout_seconds")
        .ilike("beneficiary_address", w.address!);
      if (error) throw error;
      return (data ?? []) as VaultRow[];
    },
  });

  if (!w.address) {
    return (
      <EmptyState
        icon={<Lock className="h-6 w-6" />}
        title="Connect your wallet"
        body="Connect the MetaMask account you gave the owner to see vaults addressed to you."
        action={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => wallet.connect().catch((e: Error) => toast.error(e.message))}
          >
            Connect MetaMask
          </Button>
        }
      />
    );
  }

  if (rows.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Looking for vaults…
      </div>
    );
  }

  if (!rows.data || rows.data.length === 0) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-6 w-6" />}
        title="No vault points at this wallet"
        body={`Nothing is addressed to ${shortAddr(w.address)} yet. Ask the owner to use this exact address.`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {rows.data.map((row) => (
        <VaultCard key={row.id} row={row} />
      ))}
    </div>
  );
}

function VaultCard({ row }: { row: VaultRow }) {
  const [passphrase, setPassphrase] = useState("");
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const chain = useQuery({
    queryKey: ["chain-vault", row.contract_address, row.owner_address],
    queryFn: async () => {
      contractConfig.set({ address: row.contract_address, chainId: row.chain_id });
      return fetchVault(row.owner_address);
    },
    enabled: isAddress(row.contract_address),
    refetchInterval: 10_000,
  });

const state = chain.data;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Tick every second to update 'now' asynchronously
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const due = state ? now >= state.lastPingMs + state.timeoutMs : false;

  async function claim() {
    setBusy(true);
    try {
      await releaseVault(row.owner_address);
      toast.success("Release executed — funds sent to you");
      chain.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message.slice(0, 140) : "Release failed");
    } finally {
      setBusy(false);
    }
  }

  async function tryDecrypt() {
    setBusy(true);
    try {
      const payload = await fetchEncryptedPayload({ cid: row.ipfs_cid });
      const pt = await decryptSecret(payload, passphrase);
      setPlaintext(pt);
      toast.success("Decrypted locally");
    } catch {
      toast.error("Wrong passphrase, or the payload could not be read.");
    } finally {
      setBusy(false);
    }
  }

  if (state && !state.released) {
    return (
      <EmptyState
        icon={<Lock className="h-6 w-6" />}
        title={due ? "Owner has gone silent" : "Vault is still sealed"}
        body={
          due
            ? "The silence interval has elapsed. Trigger the release yourself if Chainlink Automation hasn't already."
            : `The owner from ${shortAddr(row.owner_address)} is still sending heartbeats. You'll be able to decrypt once the switch fires.`
        }
        action={
          due ? (
            <Button
              onClick={claim}
              disabled={busy}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Trigger release
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-success/10 text-success">
          <Unlock className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-serif text-3xl text-primary">Payload released</h2>
          <p className="text-xs text-muted-foreground">
            IPFS <span className="font-mono text-foreground">ipfs://{row.ipfs_cid}</span>
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Passphrase from the owner
        </Label>
        <div className="flex gap-2">
          <Input
            value={passphrase}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassphrase(e.target.value)}
            placeholder="paste the passphrase"
            className="font-mono"
          />
          <Button
            onClick={tryDecrypt}
            disabled={busy || passphrase.length === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Decrypt
          </Button>
        </div>

        {plaintext ? (
          <div className="rounded-lg border border-success/30 bg-success/5 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-success">
              Recovered secret
            </div>
            <pre className="mt-2 whitespace-pre-wrap wrap-break-word font-mono text-sm text-foreground">
              {plaintext}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h2 className="mt-4 font-serif text-2xl text-primary">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}