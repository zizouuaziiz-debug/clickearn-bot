import Surveys from "@/views/Surveys";
import RequireAuth from "@/components/RequireAuth";

export default function Page() {
  return <RequireAuth><Surveys /></RequireAuth>;
}
