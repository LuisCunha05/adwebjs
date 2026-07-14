import { AppSidebar } from './_components/app-sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 pl-56">
        <div className="min-h-screen p-6 transition-all duration-200">{children}</div>
      </main>
    </div>
  )
}
