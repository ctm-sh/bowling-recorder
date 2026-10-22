"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { LoginForm } from "./admin/login/LoginForm";

/** 첫 화면의 운영진 카드: 누르면 비밀번호 입력이 펼쳐진다 */
export function AdminEntry() {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`overflow-hidden rounded-[18px] border-2 bg-surface ${open ? "border-accent" : "border-transparent"}`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-4 p-5 text-left"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-foreground text-white">
          <Icon name="lock" size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="text-[19px] font-bold">운영진</span>
          <span className="text-sm leading-[1.4] text-muted">정모 진행, 점수 입력, 티어 관리</span>
        </span>
        <Icon
          name="chevronRight"
          size={16}
          strokeWidth={2.4}
          className={`text-[#c7c7cc] transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5">
          <LoginForm />
        </div>
      )}
    </div>
  );
}
