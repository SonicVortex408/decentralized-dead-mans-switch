import { useState } from "react";
import { encryptSecret } from "@/lib/crypto-utils";
import { pinEncryptedPayload } from "@/lib/pinata.functions";
import { registerVault } from "@/lib/vault-chain";
import { useContractConfig, isAddress } from "@/lib/contract";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, Upload, Shield, Loader2 } from "lucide-react";
import { parseEther } from "ethers";

export function SetupForm({
  userId,
  ownerAddress,
  onCreated,
}: {
  userId: string;
  ownerAddress: string;
  onCreated: () => void;
}) {
  const cfg = useContractConfig();
  const [secret, setSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [timeoutMin, setTimeoutMin] = useState(5);
  const [deposit, setDeposit] = useState(0.01);
  const [step, setStep] = useState<string | null>(null);

  const canSubmit =
    secret.length > 0 &&
    passphrase.length >= 6 &&
    isAddress(beneficiary) &&
    beneficiary.toLowerCase() !== ownerAddress.toLowerCase() &&
    timeoutMin >= 1 &&
    deposit >= 0 &&
    isAddress(cfg.address);

  async function submit() {
    if (!canSubmit) return;
    try {
      setStep("Encrypting locally…");
      const encrypted = await encryptSecret(secret, passphrase);

      setStep("Pinning ciphertext to IPFS…");
      const { cid } = await pinEncryptedPayload({
        payload: encrypted, 
        name: `silence-${ownerAddress.slice(0, 8)}`,
      });
      setStep("Confirm the transaction in MetaMask…");
      const receipt = await registerVault({
        beneficiary,
        timeoutSeconds: Math.round(timeoutMin * 60),
        cid,
        depositEth: deposit,
      });

      setStep("Saving vault record…");
      await supabase.from("vaults").insert({
        owner_id: userId,
        owner_address: ownerAddress,
        beneficiary_address: beneficiary,
        contract_address: cfg.address,
        chain_id: cfg.chainId,
        ipfs_cid: cid,
        timeout_seconds: Math.round(timeoutMin * 60),
        deposit_wei: parseEther(String(deposit)).toString(),
        tx_hash: receipt?.hash ?? null,
        status: "armed",
      });

      toast.success("Vault armed on-chain");
      setSecret("");
      setPassphrase("");
      onCreated();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong";
      console.error(e);
      toast.error(message.slice(0, 160));
    } finally {
      setStep(null);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1.15fr_1fr]">
      <div>
        <h2 className="font-serif text-4xl text-primary">Create your vault</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The secret is encrypted in your browser with AES-256-GCM. Only the ciphertext
          is pinned to IPFS and only its CID is written on-chain.
        </p>

        <div className="mt-8 space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
          <Field label="The secret payload" hint="A seed phrase, letter, or anything textual.">
            <Textarea
              rows={4}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="type once, encrypt forever…"
              className="font-mono text-sm"
            />
          </Field>

          <Field
            label="Recipient passphrase"
            hint="Min 6 chars. Share it with the beneficiary through a secure channel."
          >
            <Input
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="a phrase only they know"
              className="font-mono"
            />
          </Field>

          <Field label="Beneficiary wallet" hint="The address that receives the ETH and the payload.">
            <Input
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value.trim())}
              placeholder="0x…"
              className="font-mono"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Silence interval (minutes)" hint="Missing a heartbeat this long releases the vault.">
              <Input
                type="number"
                min={1}
                value={timeoutMin}
                onChange={(e) => setTimeoutMin(Number(e.target.value))}
              />
            </Field>
            <Field label="Deposit (ETH)" hint="Locked in the contract until release or cancel.">
              <Input
                type="number"
                min={0}
                step={0.001}
                value={deposit}
                onChange={(e) => setDeposit(Number(e.target.value))}
              />
            </Field>
          </div>

          <Button
            size="lg"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!canSubmit || step !== null}
            onClick={submit}
          >
            {step ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {step ?? "Encrypt, pin & arm the switch"}
          </Button>
          {!isAddress(cfg.address) ? (
            <p className="text-xs text-destructive">
              Set your deployed contract address first.
            </p>
          ) : null}
        </div>
      </div>

      <aside className="space-y-4">
        <Note icon={<KeyRound className="h-4 w-4" />} title="Client-side encryption">
          Plaintext never leaves this tab. The passphrase is never stored or transmitted.
        </Note>
        <Note icon={<Upload className="h-4 w-4" />} title="Server-side pinning">
          The ciphertext is pinned via our backend so the Pinata key stays secret.
        </Note>
        <Note icon={<Shield className="h-4 w-4" />} title="On-chain enforcement">
          Release is decided by block timestamps and executed by Chainlink Automation —
          no server can hold it back.
        </Note>
      </aside>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Note({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-widest">{title}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{children}</p>
    </div>
  );
}
