import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { TEAM_NAME } from "@/lib/brand";
import { BowlingGame } from "./BowlingGame";

export const metadata: Metadata = { title: "미니게임" };

export default function GamePage() {
  return (
    <div>
      <PageHeader back="/home" backLabel="홈" eyebrow={`${TEAM_NAME} 볼링`} title="미니게임" />
      <BowlingGame />
    </div>
  );
}
