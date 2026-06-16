import VIP from "@/views/VIP";
import RequireAuth from "@/components/RequireAuth";

export default function Page() {
  return <RequireAuth><VIP /></RequireAuth>;
}
