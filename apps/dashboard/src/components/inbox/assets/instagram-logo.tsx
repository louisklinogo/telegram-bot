export const InstagramLogo = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    className={className}
    fill="none"
    height={size}
    viewBox="0 0 40 40"
    width={size}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      fill="none"
      height="32"
      rx="8"
      stroke="currentColor"
      strokeWidth="3"
      width="32"
      x="4"
      y="4"
    />
    <circle cx="20" cy="20" fill="none" r="7" stroke="currentColor" strokeWidth="3" />
    <circle cx="30" cy="10" fill="currentColor" r="2" />
  </svg>
);
