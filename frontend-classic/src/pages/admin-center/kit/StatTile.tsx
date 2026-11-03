import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import GlassPanel from './GlassPanel';
import Sparkline from './Sparkline';
import AnimatedCounter from './AnimatedCounter';

interface StatTileProps {
  label: string;
  value: number;
  sub?: string;
  icon?: ReactNode;
  trend?: number[];
  to?: string;
  span?: 1 | 2;
  iconBg?: string;
}

const StatTile = ({ label, value, sub, icon, trend, to, span = 1, iconBg = 'bg-slate-900' }: StatTileProps) => {
  const content = (
    <GlassPanel hoverLift className={`p-5 h-full flex flex-col justify-between group ${span === 2 ? 'sm:col-span-2' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="text-3xl font-black text-slate-900 mt-2 tabular-nums">
            <AnimatedCounter value={value} />
          </p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        {icon && (
          <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center text-white flex-shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-105`}>
            {icon}
          </div>
        )}
      </div>
      {trend && trend.length > 1 && (
        <div className="mt-3 -mb-1 -ml-1">
          <Sparkline data={trend} color="#0f172a" width={span === 2 ? 220 : 100} height={28} />
        </div>
      )}
    </GlassPanel>
  );

  return to ? <Link to={to} className={span === 2 ? 'sm:col-span-2 block' : 'block'}>{content}</Link> : content;
};

export default StatTile;
