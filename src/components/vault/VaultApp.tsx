import { Header } from "./Header";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { StackStrip } from "./StackStrip";
import { Footer } from "./Footer";

export function VaultApp() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header landing />
      <main>
        <Hero />
        <StackStrip />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}
