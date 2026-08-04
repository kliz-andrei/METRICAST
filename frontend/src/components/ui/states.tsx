import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react'; import { cn } from '../../lib/utils';
export const LoadingSpinner = () => <LoaderCircle className="size-5 animate-spin text-emerald-800" />;
export const LoadingSkeleton = ({ className }: { className?: string }) => <div className={cn('animate-pulse rounded-md bg-slate-200 dark:bg-slate-800', className)} />;
export const EmptyState = ({ title = 'Nothing to display' }: { title?: string }) => <div className="flex min-h-52 flex-col items-center justify-center gap-2 text-slate-500"><Inbox className="size-8" /><p>{title}</p></div>;
export const ErrorState = ({ message = 'Something went wrong.' }: { message?: string }) => <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="size-5" />{message}</div>;
