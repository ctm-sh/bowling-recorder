import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="text-5xl" aria-hidden>
        🎳
      </span>
      <h1 className="text-xl font-bold">거터예요!</h1>
      <p className="text-sm text-muted">찾는 페이지가 없거나 삭제됐어요.</p>
      <Link href="/" className="mt-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white">
        처음으로
      </Link>
    </main>
  );
}
