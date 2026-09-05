import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HourglassIcon } from "@/components/vault/icons";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Silence dead man's switch" },
      {
        name: "description",
        content:
          "Create an owner or beneficiary account to arm, monitor, and claim time-locked Silence vaults.",
      },
      { property: "og:title", content: "Sign in — Silence dead man's switch" },
      {
        property: "og:description",
        content: "Owner and beneficiary accounts for the Silence smart-contract vault.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Role = "owner" | "beneficiary";

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("owner");
  const [sentConfirmation, setSentConfirmation] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/app" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { display_name: displayName || email.split("@")[0], role },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!data.session) {
      setSentConfirmation(true);
      return;
    }
    toast.success("Account created");
    navigate({ to: "/app" });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return toast.error("Google sign-in failed");
    if (result.redirected) return;
    navigate({ to: "/app" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <HourglassIcon className="h-6 w-6 text-primary" />
            <span className="font-serif text-2xl leading-none text-primary">Silence</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-14">
        <h1 className="font-serif text-4xl text-primary">Your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Accounts hold your profile, alerts and linked wallet. Every value transfer
          still happens through the smart contract with MetaMask.
        </p>

        {sentConfirmation ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-6 text-sm">
            <p className="font-medium text-primary">Check your email</p>
            <p className="mt-2 text-muted-foreground">
              We sent a confirmation link to {email}. Open it to activate your account,
              then sign in.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => setSentConfirmation(false)}>
              Back
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="signin" className="mt-8">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Log in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4 rounded-xl border border-border bg-card p-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Log in
                </Button>
                <GoogleButton onClick={google} />
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4 rounded-xl border border-border bg-card p-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Display name</Label>
                  <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ada" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password2">Password</Label>
                  <Input id="password2" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>I am signing up as</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["owner", "beneficiary"] as const).map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setRole(r)}
                        className={`rounded-lg border p-3 text-left text-sm capitalize transition-colors ${
                          role === r
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className="block font-medium">{r}</span>
                        <span className="text-xs text-muted-foreground">
                          {r === "owner" ? "Create and arm vaults" : "Claim released vaults"}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You can add the other role later from your dashboard.
                  </p>
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Create account
                </Button>
                <GoogleButton onClick={google} />
              </form>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" className="w-full" onClick={onClick}>
      Continue with Google
    </Button>
  );
}
