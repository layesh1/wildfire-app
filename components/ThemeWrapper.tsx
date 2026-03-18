export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-50 light-theme">
      {children}
    </div>
  )
}
