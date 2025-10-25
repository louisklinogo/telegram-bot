"use client";

interface BubbleMenuButtonProps {
  action: () => void;
  isActive: boolean;
  children: React.ReactNode;
  className?: string;
}

export function BubbleMenuButton({ action, isActive, children, className }: BubbleMenuButtonProps) {
  return (
    <button
      className={`px-2.5 py-1.5 font-mono text-[11px] transition-colors ${className} ${
        isActive ? "bg-white text-primary dark:bg-stone-900" : "bg-transparent hover:bg-muted"
      }`}
      onClick={action}
      type="button"
    >
      {children}
    </button>
  );
}
