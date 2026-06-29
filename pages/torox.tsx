import RequireAuth from "@/components/RequireAuth";
import Torox from "@/views/Torox";
export default function ToroxPage() {
  return <RequireAuth><Torox /></RequireAuth>;
}
