import { useState } from "react";
import { contractConfig, useContractConfig, isAddress, SUPPORTED_CHAINS } from "@/lib/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ContractSettings() {
  const cfg = useContractConfig();
  const [address, setAddress] = useState(cfg.address);
  const [chainId, setChainId] = useState(String(cfg.chainId));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs font-semibold uppercase tracking-widest text-primary">
        Deployed contract
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        The address of your DeadMansSwitch deployment. Every action below is a real
        transaction against it.
      </p>
      <div className="mt-4 space-y-3">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Contract address
          </Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value.trim())}
            placeholder="0x…"
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Network
          </Label>
          <select
            value={chainId}
            onChange={(e) => setChainId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {Object.entries(SUPPORTED_CHAINS).map(([id, c]) => (
              <option key={id} value={id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (!isAddress(address)) return toast.error("That is not a valid address");
            contractConfig.set({ address, chainId: Number(chainId) });
            toast.success("Contract saved");
          }}
        >
          Save contract
        </Button>
      </div>
    </div>
  );
}
