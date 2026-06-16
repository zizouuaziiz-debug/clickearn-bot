import Offers from "@/views/Offers";
import RequireAuth from "@/components/RequireAuth";

export default function Page() {
  return <RequireAuth><Offers /></RequireAuth>;
}
