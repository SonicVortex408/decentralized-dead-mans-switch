import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { HourglassIcon } from "./icons";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function Header({
  email,
  landing = false,
}: {
  email?: string | null;
  landing?: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <HourglassIcon className="h-6 w-6 text-primary" />
          <span className="font-serif text-2xl leading-none text-primary">Silence</span>
        </Link>

        {landing ? (
          <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#stack" className="hover:text-foreground">Stack</a>
            <a
              href="https://docs.chain.link/chainlink-automation"
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              Automation
            </a>
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          {email ? (
            <>
              <span className="hidden text-xs text-muted-foreground sm:inline">{email}</span>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Log in</Link>
              </Button>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                asChild
              >
                <Link to="/auth">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
