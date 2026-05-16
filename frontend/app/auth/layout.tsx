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
<div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-pink-50 via-pink-100 to-white p-12 flex-col justify-between text-slate-950 dark:bg-slate-950 dark:text-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Link href="/">
          <Image src="/logo.png" alt="BeautyFlow Logo" width={128} height={128} className="object-contain" />
        </Link>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight tracking-tight dark:text-white">
            Simplifique a gestao do seu salao de beleza
          </h1>
          <p className="text-lg text-pink-700 leading-relaxed max-w-xl dark:text-pink-200">
            Agende, gerencie clientes e profissionais, controle estoque e aumente seu faturamento com nossa plataforma completa.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="rounded-3xl bg-pink-50 border border-pink-200 p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
              <p className="text-3xl font-bold text-pink-700">500+</p>
              <p className="text-sm text-pink-600 dark:text-pink-200">Saloes ativos</p>
            </div>
            <div className="rounded-3xl bg-pink-50 border border-pink-200 p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
              <p className="text-3xl font-bold text-pink-700">50k+</p>
              <p className="text-sm text-pink-600 dark:text-pink-200">Agendamentos/mes</p>
            </div>
            <div className="rounded-3xl bg-pink-50 border border-pink-200 p-5 shadow-sm dark:bg-slate-900 dark:border-slate-700">
              <p className="text-3xl font-bold text-pink-700">98%</p>
              <p className="text-sm text-pink-600 dark:text-pink-200">Satisfacao</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-pink-600">
          © 2024 BeautyFlow. Todos os direitos reservados.
        </p>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 bg-pink-50 dark:bg-slate-900">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <Link href="/" className="flex lg:hidden items-center gap-3 mb-4 justify-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden bg-white shadow-sm border border-pink-200 dark:bg-slate-900">
              <Image src="/logo.png" alt="BeautyFlow Logo" width={64} height={64} className="object-contain" />
            </div>
          </Link>

          <div className="rounded-[2rem] border border-pink-200 bg-white p-6 backdrop-blur-xl shadow-lg shadow-pink-500/10 dark:border-slate-800 dark:bg-slate-950">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
