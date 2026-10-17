export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`brand-mark ${className}`}
      viewBox="0 0 160 88"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M79 44C61 21 52 12 35 12C19 12 9 26 9 44s10 32 26 32c17 0 29-17 45-34s29-30 45-30c16 0 26 14 26 32s-10 32-26 32c-14 0-24-11-34-23"
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="M99 61l28-30m-19 2 22-7-5 23"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinejoin="round"
      />
    </svg>
  );
}
