// 1.8px 선 굵기의 선형 아이콘 (시안 SVG 그대로). 장식용이라 기본으로 스크린 리더에서 숨긴다.
const PATHS = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" strokeLinejoin="round" />,
  results: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 9v11" />
    </>
  ),
  chart: <path d="M5 20v-8M12 20V5M19 20v-5" />,
  ball: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.2h.01M13.6 7.6h.01M12.6 11.2h.01" strokeWidth="2.6" />
    </>
  ),
  trophy: (
    <path
      d="M8 21h8M12 16v5M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"
      strokeLinejoin="round"
    />
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  chevronRight: <path d="m9 6 6 6-6 6" strokeLinejoin="round" />,
  chevronLeft: <path d="m15 6-6 6 6 6" strokeLinejoin="round" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinejoin="round" />,
  swap: <path d="M4 8h13l-3-3M20 16H7l3 3" strokeLinejoin="round" />,
  plus: <path d="M12 5v14M5 12h14" />,
  pencil: <path d="M4 20h4L19 9l-4-4L4 16z" strokeLinejoin="round" />,
  shuffle: <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" strokeLinejoin="round" />,
  repeat: <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5" strokeLinejoin="round" />,
  wallet: (
    <>
      <rect x="2" y="6" width="20" height="13" rx="2" />
      <circle cx="12" cy="12.5" r="2.5" />
      <path d="M6 9.5v.01M18 15.5v.01" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </>
  ),
  sheet: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 9h16M4 15h16M10 3v18" />
    </>
  ),
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinejoin="round" />,
  logout: <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10" strokeLinejoin="round" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 24,
  strokeWidth = 1.8,
  className,
  label,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** 있으면 스크린 리더가 읽는다 */
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={`shrink-0 ${className ?? ""}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {PATHS[name]}
    </svg>
  );
}
