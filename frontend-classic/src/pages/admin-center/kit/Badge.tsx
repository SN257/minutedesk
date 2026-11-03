const VARIANTS: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-slate-100 text-slate-700 border-slate-300',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  navy: 'bg-slate-900 text-white border-slate-900',
};

const Badge = ({ children, variant = 'neutral' }: { children: React.ReactNode; variant?: keyof typeof VARIANTS }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${VARIANTS[variant]}`}>
    {children}
  </span>
);

export default Badge;
