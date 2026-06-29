import RequireAuth from "@/components/RequireAuth";
import Lootably from "@/views/Lootably";
export default function LootablyPage() {
  return <RequireAuth><Lootably /></RequireAuth>;
}
