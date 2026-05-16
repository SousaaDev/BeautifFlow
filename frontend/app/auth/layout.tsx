import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-950 dark:bg-slate-800 dark:text-white">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-rose-100 via-pink-100 to-white p-12 flex-col justify-between text-slate-950 dark:bg-slate-950 dark:text-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex items-center justify-center w-32 h-32 rounded-3xl overflow-hidden shadow-lg">
            <Image src="/logo.png" alt="BeautyFlow Logo" width={128} height={128} className="object-contain" />
          </div>
        </Link>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight tracking-tight dark:text-white">
            Simplifique a gestao do seu salao de beleza
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-xl dark:text-slate-300">
            Agende, gerencie clientes e profissionais, controle estoque e aumente seu faturamento com nossa plataforma completa.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="rounded-3xl bg-slate-100 p-5 dark:bg-slate-900">
              <p className="text-3xl font-bold dark:text-white">500+</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Saloes ativos</p>
            </div>
            <div className="rounded-3xl bg-slate-100 p-5 dark:bg-slate-900">
              <p className="text-3xl font-bold dark:text-white">50k+</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Agendamentos/mes</p>
            </div>
            <div className="rounded-3xl bg-slate-100 p-5 dark:bg-slate-900">
              <p className="text-3xl font-bold dark:text-white">98%</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Satisfacao</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500">
          © 2024 BeautyFlow. Todos os direitos reservados.
        </p>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-800">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <Link href="/" className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="flex items-center justify-center w-24 h-24 rounded-3xl overflow-hidden">
              <Image src="/logo.png" alt="BeautyFlow Logo" width={96} height={96} className="object-contain" />
            </div>
          </Link>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
