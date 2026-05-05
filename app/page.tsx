import { AppLoadGate } from "@/components/brand/app-load-gate";
import { HomeShell } from "@/components/home-shell";

export default function Home() {
  return (
    <AppLoadGate>
      <HomeShell />
    </AppLoadGate>
  );
}
