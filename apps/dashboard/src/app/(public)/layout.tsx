export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // No auth check - these are public routes
  return <>{children}</>;
}
