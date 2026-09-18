import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  Activity,
  ArrowRight,
  ChartNoAxesColumn,
  CircleAlert,
  LockKeyhole,
  Mail,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/auth-context';

const schema = z.object({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(1, 'Password is required.'),
});

type FormValues = z.infer<typeof schema>;

const features = [
  { label: 'Sales Performance', description: 'Track performance and identify trends', icon: ChartNoAxesColumn, tone: 'text-amber-300' },
  { label: 'Customer Insights', description: 'Understand your guests better', icon: UsersRound, tone: 'text-emerald-300' },
  { label: 'Operational Efficiency', description: 'Monitor daily operations', icon: Activity, tone: 'text-emerald-300' },
  { label: 'Sales Forecasting', description: 'Plan ahead with data-driven predictions', icon: TrendingUp, tone: 'text-amber-300' },
] as const;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const submit = async (values: FormValues) => {
    try {
      setError('');
      await login(values.email, values.password);
      navigate((location.state as { from?: string })?.from ?? '/', { replace: true });
    } catch {
      setError('Invalid email or password.');
    }
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#faf9f5] lg:h-screen lg:min-h-0 lg:overflow-hidden">
      <div className="grid min-h-screen w-full lg:h-screen lg:grid-cols-[48fr_52fr]">
        <section className="relative min-h-[25rem] overflow-hidden bg-[#043c32] text-white lg:h-screen lg:min-h-0">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_8%_90%,rgba(5,150,105,.34),transparent_40%),radial-gradient(circle_at_88%_8%,rgba(245,158,11,.16),transparent_32%)]" />
          <div aria-hidden="true" className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:44px_44px]" />

          <div className="relative z-10 mx-auto flex min-h-[25rem] w-full max-w-[34rem] flex-col px-7 py-8 sm:px-10 lg:h-full lg:min-h-0 lg:px-12 lg:py-8 xl:px-16 xl:py-10">
            <div className="flex items-center gap-3">
              <div className="grid size-[4.75rem] shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-white p-1.5 shadow-lg">
                <img src="/utb-logo.png" alt="Under the Balete Restaurant" className="h-auto w-full max-w-[220px] object-contain" />
              </div>
              <div>
                <p className="font-serif text-xl leading-none tracking-wide text-white sm:text-2xl">UNDER THE BALETE</p>
                <p className="mt-1 text-xs font-medium tracking-[0.34em] text-emerald-50/80">RESTAURANT</p>
              </div>
            </div>

            <div className="mt-9 lg:mt-8 xl:mt-12">
              <span aria-hidden="true" className="block h-0.5 w-20 bg-amber-300" />
              <p className="mt-6 text-5xl font-bold leading-none tracking-[0.08em] text-white sm:text-6xl">METRI<span className="text-emerald-300">CAST</span></p>
              <h1 className="mt-3 text-2xl font-medium tracking-tight text-emerald-50 sm:text-3xl">Restaurant Intelligence &amp; Analytics</h1>
              <span aria-hidden="true" className="mt-5 block h-0.5 w-20 bg-amber-300" />
              <p className="mt-5 max-w-md text-base leading-7 text-emerald-50/90 sm:text-lg">Transform restaurant data into actionable insights for sales, customers, operations, and forecasting.</p>

              <div className="mt-7 grid grid-cols-2 gap-3 lg:mt-6 xl:mt-8">
                {features.map(({ label, description, icon: Icon, tone }) => (
                  <div key={label} className="min-h-24 rounded-xl border border-white/10 bg-slate-950/25 p-3 backdrop-blur-[1px] xl:min-h-28 xl:p-4">
                    <Icon className={`size-6 xl:size-7 ${tone}`} aria-hidden="true" />
                    <p className="mt-2 text-sm font-semibold text-white xl:mt-3">{label}</p>
                    <p className="mt-1 text-xs leading-4 text-emerald-50/70 xl:leading-5">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 hidden items-center gap-6 lg:flex xl:mt-auto">
              <span aria-hidden="true" className="h-0.5 w-20 bg-amber-300" />
              <p className="text-xs font-semibold tracking-[0.3em] text-emerald-50/60">GOOD FOOD. BETTER DECISIONS.</p>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-[32rem] overflow-hidden bg-[#faf9f5] px-6 py-8 text-slate-900 sm:px-10 lg:h-screen lg:min-h-0 lg:px-12 lg:py-8 xl:px-24 xl:py-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-12 size-56 rounded-full border-[28px] border-emerald-900/[0.045]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full border-[34px] border-amber-500/[0.055]" />

          <div className="relative z-10 flex w-full flex-1 items-center justify-center">
            <form onSubmit={handleSubmit(submit)} className="w-full max-w-[460px]">
              <div className="mb-9">
                <p className="text-sm font-bold tracking-wide text-amber-500">METRICAST</p>
                <h2 className="mt-3 text-4xl font-semibold tracking-tight text-emerald-950">Welcome back</h2>
                <p className="mt-3 text-lg text-slate-500">Sign in to your METRICAST workspace.</p>
              </div>

              {error ? (
                <div role="alert" className="mb-6 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden="true" />
                  <div><p className="font-semibold">Unable to sign in</p><p className="mt-0.5 text-rose-700/80">Please check your email and password and try again.</p></div>
                </div>
              ) : null}

              <label className="mb-6 block text-base font-semibold text-slate-800">
                Email
                <span className="relative mt-2.5 block">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input {...register('email')} type="email" aria-invalid={Boolean(errors.email)} className="h-14 w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" autoComplete="email" placeholder="you@example.com" />
                </span>
                {errors.email ? <span className="mt-1.5 block text-xs text-rose-600">{errors.email.message}</span> : null}
              </label>

              <label className="mb-8 block text-base font-semibold text-slate-800">
                Password
                <span className="relative mt-2.5 block">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  <input {...register('password')} type="password" aria-invalid={Boolean(errors.password)} className="h-14 w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" autoComplete="current-password" placeholder="Enter your password" />
                </span>
                {errors.password ? <span className="mt-1.5 block text-xs text-rose-600">{errors.password.message}</span> : null}
              </label>

              <Button type="submit" disabled={isSubmitting} className="h-14 w-full rounded-xl bg-emerald-800 text-base hover:bg-emerald-700 focus:ring-emerald-600">
                {isSubmitting ? 'Signing in…' : <><span>Sign in</span><ArrowRight className="ml-1.5 size-5" aria-hidden="true" /></>}
              </Button>
            </form>
          </div>

          <footer className="absolute inset-x-6 bottom-8 z-10 flex items-center gap-4 text-xs text-slate-400 sm:inset-x-10 lg:inset-x-12 lg:bottom-8 xl:inset-x-24 xl:bottom-10">
            <span aria-hidden="true" className="h-px flex-1 bg-slate-300" />
            <span className="whitespace-nowrap">© 2026 Under the Balete Restaurant</span>
            <span aria-hidden="true" className="h-px flex-1 bg-slate-300" />
          </footer>
        </section>
      </div>
    </main>
  );
}
