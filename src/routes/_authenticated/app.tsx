import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/vault/Header";
import { Footer } from "@/components/vault/Footer";
import { SetupForm } from "@/components/vault/SetupForm";
import { Dashboard } from "@/components/vault/Dashboard";
import { BeneficiaryPanel } from "@/components/vault/BeneficiaryPanel";
import { WalletBar } from "@/components/vault/WalletBar";
import { ContractSettings } from "@/components/vault/ContractSettings";
import { useAuth, addRole, type AppRole } from "@/lib/auth";
import { useWallet } from "@/lib/wallet";
import { useContractConfig, isAddress } from "@/lib/contract";
import { fetchVault } from "@/lib/vault-chain";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Your vault — Silence dead man's switch" },
      {
        name: "description",
        content:
          "Arm a vault, send heartbeats, and watch the on-chain countdown — or claim a released payload as a beneficiary.",
      },
      { property: "og:title", content: "Your vault — Silence" },
      {
        property: "og:description",
        content: "Owner and beneficiary controls for your Silence smart-contract vault.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  const auth = useAuth();
  const w = useWallet();
  const cfg = useContractConfig();
  const [view, setView] = useState<AppRole>("owner");

  useEffect(() => {
    if (auth.roles.length > 0 && !auth.roles.includes("owner")) setView("beneficiary");
  }, [auth.roles]);

  const existing = useQuery({
    queryKey: ["vault", cfg.address, cfg.chainId, w.address],
    queryFn: () => fetchVault(w.address!),
    enabled: view === "owner" && Boolean(w.address) && isAddress(cfg.address),
    refetchInterval: 15_000,
  });

  const hasVault = Boolean(existing.data && !existing.data.cancelled);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header email={auth.profile?.email ?? auth.user?.email} />
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Signed in as
            </div>
            <h1 className="font-serif text-3xl text-primary">
              {auth.profile?.display_name ?? auth.user?.email ?? "…"}
            </h1>
          </div>
          <div className="flex rounded-full border border-border bg-secondary/50 p-1 text-xs">
            {(["owner", "beneficiary"] as const).map((r) => (
              <button
                key={r}
                onClick={async () => {
                  setView(r);
                  if (auth.user && !auth.roles.includes(r)) {
                    await addRole(auth.user.id, r);
                    await auth.refresh();
                  }
                }}
                className={`rounded-full px-4 py-1.5 capitalize transition-colors ${
                  view === r
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {auth.user ? (
          <WalletBar
            userId={auth.user.id}
            linkedAddress={auth.profile?.wallet_address ?? null}
            onLinked={auth.refresh}
          />
        ) : null}

        {view === "owner" ? (
          !w.address ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Connect MetaMask above to create or manage your vault.
            </div>
          ) : !isAddress(cfg.address) ? (
            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <div className="rounded-xl border border-border bg-card p-8">
                <h2 className="font-serif text-3xl text-primary">
                  Point at your deployment
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Paste the address of your deployed DeadMansSwitch contract to start.
                </p>
              </div>
              <ContractSettings />
            </div>
          ) : existing.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading contract state…
            </div>
          ) : hasVault ? (
            <Dashboard ownerAddress={w.address} />
          ) : (
            <SetupForm
              userId={auth.user!.id}
              ownerAddress={w.address}
              onCreated={() => existing.refetch()}
            />
          )
        ) : (
          <BeneficiaryPanel />
        )}
      </main>
      <Footer />
    </div>
  );
}
