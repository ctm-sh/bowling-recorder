// 화면 이동 중 보여줄 뼈대 (loading.tsx에서 사용)
export function LoadingScreen() {
  return (
    <div aria-busy="true" aria-label="불러오는 중" className="animate-pulse px-5 pt-8">
      <div className="h-4 w-24 rounded bg-fill" />
      <div className="mt-2 h-9 w-40 rounded-lg bg-fill" />
      <div className="mt-5 h-36 rounded-2xl bg-surface" />
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="h-20 rounded-2xl bg-surface" />
        <div className="h-20 rounded-2xl bg-surface" />
      </div>
      <div className="mt-3 h-56 rounded-2xl bg-surface" />
    </div>
  );
}
