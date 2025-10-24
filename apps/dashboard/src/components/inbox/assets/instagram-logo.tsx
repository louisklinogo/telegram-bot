export const InstagramLogo = ({ size = 20, className }: { size?: number; className?: string }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="4"
        y="4"
        width="32"
        height="32"
        rx="8"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
      <circle cx="20" cy="20" r="7" stroke="currentColor" strokeWidth="3" fill="none" />
      <circle cx="30" cy="10" r="2" fill="currentColor" />
    </svg>
  );
};
