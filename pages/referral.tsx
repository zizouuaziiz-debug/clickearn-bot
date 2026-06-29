import Referral from "@/views/Referral";
import RequireAuth from "@/components/RequireAuth";

export default function Page() {
  return <RequireAuth><Referral /></RequireAuth>;
}
