import Dashboard from "@/views/Dashboard";
import RequireAuth from "@/components/RequireAuth";

export default function Page() {
  return <RequireAuth><Dashboard /></RequireAuth>;
}
