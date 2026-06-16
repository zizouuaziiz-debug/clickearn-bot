import Wallet from "@/views/Wallet";
import RequireAuth from "@/components/RequireAuth";

export default function Page() {
  return <RequireAuth><Wallet /></RequireAuth>;
}
