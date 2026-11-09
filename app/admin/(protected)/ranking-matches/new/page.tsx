import { NavBar } from "@/components/PageHeader";
import { todayKST } from "@/lib/db/sessions";
import { NewMatchForm } from "./NewMatchForm";

export default function NewRankingMatchPage() {
  return (
    <>
      <NavBar title="새 랭킹전" back="/admin/ranking-matches" backLabel="취소" backText />
      <NewMatchForm today={todayKST()} />
    </>
  );
}
