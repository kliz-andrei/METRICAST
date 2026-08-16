import {
  Bell,
  CalendarDays,
  Database,
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  ReceiptText,
  Settings,
  Sun,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/auth-context';
import { useTheme } from '../contexts/theme-context';
import { cn } from '../lib/utils';

const menu: Array<{ label: string; path: string; icon: LucideIcon }> = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Customer Analytics', path: '/customers', icon: Users },
  { label: 'Product Analytics', path: '/products', icon: Package },
  { label: 'Operational Efficiency', path: '/operations', icon: Gauge },
  { label: 'Sales Forecast', path: '/forecast', icon: TrendingUp },
  { label: 'Reports', path: '/reports', icon: FileText },
  { label: 'Data Management', path: '/data', icon: Database },
  { label: 'Transactions', path: '/transactions', icon: ReceiptText },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const title = menu.find((item) => item.path === location.pathname)?.label ?? 'METRICAST';
  const showHeaderDateRange = !['/', '/customers'].includes(location.pathname);

  const sidebar = (
    <aside className="flex h-full w-72 flex-col bg-emerald-950 p-5 text-emerald-50">
      <div className="mb-8 flex items-center gap-3">
        <img src="/utb-logo.png" className="size-10 rounded-full bg-white object-contain" />
        <div><p className="text-xs text-amber-300">UNDER THE BALETE</p><p className="font-semibold">METRICAST</p></div>
      </div>
      <nav className="space-y-1" aria-label="Primary navigation">
        {menu.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({ isActive }) => cn('flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-emerald-950', isActive && 'bg-amber-400 font-semibold text-emerald-950 hover:bg-amber-400 focus:ring-amber-100')}>
            <Icon className="size-5 shrink-0" strokeWidth={1.9} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-white/10 pt-4">
        <button onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-emerald-950">
          <LogOut className="size-5" strokeWidth={1.9} aria-hidden="true" />Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className={cn('fixed inset-y-0 left-0 z-40 -translate-x-full transition lg:translate-x-0', open && 'translate-x-0')}>{sidebar}</div>
      {open ? <button aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/40 lg:hidden" /> : null}
      <main className="relative isolate overflow-hidden lg:pl-72">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_85%_0%,rgba(212,167,44,0.09),transparent_40%),radial-gradient(circle_at_15%_5%,rgba(4,120,87,0.05),transparent_35%)] dark:bg-[radial-gradient(circle_at_85%_0%,rgba(212,167,44,0.05),transparent_40%),radial-gradient(circle_at_15%_5%,rgba(4,120,87,0.08),transparent_35%)]" />
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:gap-3">
          <Button variant="ghost" className="lg:hidden" onClick={() => setOpen(true)}><Menu className="size-5" /></Button>
          <NavLink to="/" aria-label="METRICAST Dashboard" className="group relative flex w-28 shrink-0 flex-col font-bold tracking-[0.08em] transition hover:opacity-80 sm:w-36">
            <span className="text-[0.78rem] leading-none sm:text-base"><span className="text-slate-700 dark:text-slate-100">METRI</span><span className="text-emerald-700 dark:text-emerald-400">CAST</span></span>
            <span className="mt-1 h-0.5 w-14 bg-amber-400 sm:w-18" aria-hidden="true" />
          </NavLink>
          <div className="min-w-0 flex-1"><p className="truncate text-xs text-slate-500">METRICAST / {title}</p><h1 className="truncate text-base font-semibold">{title}</h1></div>
          {showHeaderDateRange ? <Button variant="outline" className="hidden gap-2 sm:flex"><CalendarDays className="size-4" />Date range</Button> : null}
          <Button variant="ghost" aria-label="Toggle theme" onClick={toggle}>{theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}</Button>
          <Button variant="ghost" aria-label="Notifications"><Bell className="size-5" /></Button>
          <div className="hidden text-right sm:block"><p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p><p className="text-xs text-slate-500">{user?.role}</p></div>
        </header>
        <div className="mx-auto max-w-7xl p-4 sm:p-6"><Outlet /><footer className="mt-12 border-t border-slate-200 py-5 text-xs text-slate-500 dark:border-slate-800">© {new Date().getFullYear()} Under the Balete Restaurant</footer></div>
      </main>
    </div>
  );
}
