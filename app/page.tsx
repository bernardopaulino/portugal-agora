import { Dashboard } from "@/components/dashboard";
import { getState } from "@/lib/state/get-state";

export default async function Home() {
  const state = await getState();
  return <Dashboard initial={state} />;
}
