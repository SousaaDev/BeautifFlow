import { Scissors } from 'lucide-react'

export default function PublicBookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
            <Scissors className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-foreground">BeautyFlow</span>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="border-t py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          Agendamento online por{' '}
          <a href="/" className="font-medium text-primary hover:underline">
            BeautyFlow
          </a>
        </div>
      </footer>
    </div>
  )
}
