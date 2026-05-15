import Link from 'next/link'
import Image from 'next/image'
import {
  Calendar,
  Users,
  BarChart3,
  Smartphone,
  Shield,
  ArrowRight,
  Check,
  Star,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const features = [
  {
    icon: Calendar,
    title: 'Agendamento Online',
    description: 'Seus clientes agendam 24/7 pela internet. Reduza ligações e no-shows.',
  },
  {
    icon: Users,
    title: 'Gestão de Clientes',
    description: 'Histórico completo, preferências e comunicação automatizada.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Inteligentes',
    description: 'Acompanhe faturamento, serviços mais vendidos e desempenho da equipe.',
  },
  {
    icon: Smartphone,
    title: 'Controle de Estoque',
    description: 'Gerencie produtos com alertas de estoque baixo e margem de lucro.',
  },
  {
    icon: Shield,
    title: 'Multi-tenant Seguro',
    description: 'Cada salão tem seus dados isolados com segurança de nível empresarial.',
  },
  {
    icon: Star,
    title: 'Suporte Dedicado',
    description: 'Equipe pronta para ajudar você a tirar o máximo do sistema.',
  },
]

const testimonials = [
  {
    name: 'Maria Santos',
    role: 'Salão Bella Donna',
    content: 'Desde que comecei a usar o BeautyFlow, meu faturamento aumentou 40%. Os clientes adoram poder agendar online!',
  },
  {
    name: 'Carlos Oliveira',
    role: 'Barbearia Premium',
    content: 'O controle de estoque me salvou! Nunca mais deixei de vender por falta de produto.',
  },
  {
    name: 'Ana Júlia',
    role: 'Studio de Beleza AJ',
    content: 'Interface simples e intuitiva. Minha equipe aprendeu a usar em minutos.',
  },
]

const plans = [
  {
    name: 'Plano Único',
    price: '49,90',
    description: 'Tudo incluso para seu salão',
    features: ['Profissionais ilimitados', 'Agendamentos ilimitados', 'Página de agendamento', 'Suporte dedicado'],
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 text-slate-950 backdrop-blur supports-[backdrop-filter]:bg-white/70 sticky top-0 z-50 dark:border-slate-800 dark:bg-slate-950/95 dark:text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/">
              <Image src="/logo.png" alt="BeautyFlow Logo" width={40} height={40} className="object-contain shadow-lg shadow-fuchsia-500/20" />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                Recursos
              </a>
              <a href="#pricing" className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                Preços
              </a>
              <a href="#testimonials" className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                Depoimentos
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                <Link href="/auth/login">Entrar</Link>
              </Button>
              <Button asChild className="bg-fuchsia-600 text-white hover:bg-fuchsia-500">
                <Link href="/auth/signup">Começar grátis</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-32 bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,207,232,0.12),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(250,204,211,0.08),_transparent_24%)] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-4 bg-pink-100 text-pink-700 border border-pink-200 dark:bg-slate-800 dark:text-white dark:border-slate-700/70">
              Trial gratuito de 3 horas
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-950 dark:text-white">
              Gestão completa para seu{' '}
              <span className="text-pink-600 dark:text-pink-300">salão de beleza</span>
            </h1>
            <p className="mt-6 text-lg text-slate-700 dark:text-slate-300 max-w-2xl mx-auto">
              Agende, gerencie clientes e profissionais, controle estoque e aumente seu faturamento com a plataforma mais completa do mercado.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="!bg-pink-500 !text-white hover:!bg-pink-400 shadow-lg shadow-pink-500/25 ring-2 ring-pink-500/40 focus-visible:ring-pink-400/60 gap-2 w-full sm:w-auto">
                <Link href="/auth/signup">
                  Começar trial grátis
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto border-slate-300 text-slate-950 hover:border-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-white">
                <Link href="#features">Ver recursos</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              Sem cartão de crédito. Sem compromisso.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-32 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-950 dark:text-white">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Recursos pensados para simplificar sua rotina e fazer seu salão crescer.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border border-slate-200 bg-white shadow-lg shadow-slate-200/40 transition duration-300 hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-fuchsia-600/10 flex items-center justify-center mb-4 dark:bg-slate-800">
                    <feature.icon className="w-6 h-6 text-fuchsia-600 dark:text-pink-300" />
                  </div>
                  <CardTitle className="text-slate-950 dark:text-white">{feature.title}</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400 text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 lg:py-24 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-950 dark:text-white">
              Plano único, sem complicação
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Tudo o que seu salão precisa em um só plano: agendamentos, profissionais, gestão e suporte.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {plans.map((plan) => (
              <Card key={plan.name} className="mx-auto rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.15)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)]">
                <CardHeader className="text-center px-10 pt-10">
                  <CardTitle className="text-slate-950 dark:text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">{plan.description}</CardDescription>
                  <div className="pt-6">
                    <span className="text-5xl font-extrabold text-slate-950 dark:text-white">R$ {plan.price}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">/mês</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 px-10 pb-10">
                  <ul className="space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                        <Check className="mt-1 w-5 h-5 text-fuchsia-500 dark:text-pink-300 shrink-0" />
                        <span className="text-sm sm:text-base leading-6">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full py-4 bg-fuchsia-600 text-white hover:bg-fuchsia-500">
                    <Link href="/auth/signup">Começar agora</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 lg:py-32 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-950 dark:text-white">
              O que nossos clientes dizem
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Mais de 500 salões já confiam no BeautyFlow.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="border border-slate-200 bg-white shadow-lg shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 mb-4 dark:text-slate-300">
                    {'"'}{testimonial.content}{'"'}
                  </p>
                  <div>
                    <p className="font-medium text-slate-950 dark:text-white">{testimonial.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-32 bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Pronto para transformar seu salão?
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Comece seu trial gratuito agora e veja a diferença em minutos.
          </p>
          <div className="mt-10">
            <Button asChild size="lg" className="!bg-pink-500 !text-white hover:!bg-pink-400 shadow-lg shadow-pink-500/25 ring-2 ring-pink-500/40 focus-visible:ring-pink-400/60 gap-2">
              <Link href="/auth/signup">
                Começar grátis por 3 horas
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="BeautyFlow Logo" width={32} height={32} className="object-contain" />
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
              <a href="#" className="hover:text-slate-950 dark:hover:text-white transition-colors">Termos</a>
              <a href="#" className="hover:text-slate-950 dark:hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-slate-950 dark:hover:text-white transition-colors">Contato</a>
            </div>
            <p className="text-sm">
              © 2024 BeautyFlow. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
