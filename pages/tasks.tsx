import Tasks from "@/views/Tasks";
import RequireAuth from "@/components/RequireAuth";

export default function Page() {
  return <RequireAuth><Tasks /></RequireAuth>;
}
