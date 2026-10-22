// 화면 이동 중 보여줄 뼈대 (loading.tsx에서 사용)
export function LoadingScreen() {
  return (
    <div aria-busy="true" aria-label="불러오는 중" className="animate-pulse">
      <div className="h-14 border-b border-line" />
      <div className="m-4 h-28 rounded-2xl bg-background" />
      <div className="mx-4 grid grid-cols-2 gap-3">
        <div className="h-20 rounded-2xl bg-background" />
        <div className="h-20 rounded-2xl bg-background" />
      </div>
      <div className="m-4 flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-background" />
        ))}
      </div>
    </div>
  );
}
