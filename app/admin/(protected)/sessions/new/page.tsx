import { StepBar } from "@/components/Flow";
import { NavBar } from "@/components/PageHeader";
import { db } from "@/lib/db/client";
import { todayKST } from "@/lib/db/sessions";
import { NewSessionForm } from "./NewSessionForm";

export default async function NewSessionPage() {
  const { data, error } = await db().from("settings").select("default_fee").eq("id", 1).single();
  if (error) throw error;

  return (
    <>
      <NavBar title="새 정모" back="/admin/sessions" backLabel="취소" backText />
      <StepBar current="참석" />
      <NewSessionForm today={todayKST()} defaultFee={data.default_fee} />
    </>
  );
}
