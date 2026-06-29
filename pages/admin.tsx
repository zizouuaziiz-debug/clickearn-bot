import Admin from "@/views/Admin";
import RequireAuth from "@/components/RequireAuth";

export default function Page() {
  return <RequireAuth redirectTo="/admin-login"><Admin /></RequireAuth>;
}
