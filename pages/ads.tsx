import AdsWall from "@/views/AdsWall";
import RequireAuth from "@/components/RequireAuth";

export default function Page() {
  return <RequireAuth><AdsWall /></RequireAuth>;
}
