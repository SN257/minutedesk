import { useT } from '../lib/siteConfig';
import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { softSpring } from '../lib/motion';
import { Icon } from '../shell/icons';

const ease = [0.22, 1, 0.36, 1] as const;

const MENU = [
  { icon: Icon.tasks, label: 'My tasks' },
  { icon: Icon.dashboard, label: 'Dashboard' },
  { icon: Icon.meetings, label: 'Meetings', active: true, badge: 3 },
  { icon: Icon.worklog, label: 'Work log' },
  { icon: Icon.reports, label: 'Insights' },
];
const TASKS = [
  { t: 'Circulate the revised calendar', who: 'AK', due: 'Today' },
  { t: 'Collect centre reports', who: 'MS', due: 'Mon' },
  { t: 'Update the reporting template', who: 'RP', due: '21 Nov' },
];
const TONES = ['#253745', '#9ba8ab', '#4a5c6a', '#dfe2e1'];

const Avatars = ({ names, ring = '#fff', size = 22 }: { names: string[]; ring?: string; size?: number }) => (
  <div className="flex -space-x-1.5">
    {names.map((n, i) => (
      <span key={n} className="rounded-full grid place-items-center font-semibold shrink-0" style={{ width: size, height: size, fontSize: size * 0.4, background: TONES[i % 4], color: i % 4 === 1 || i % 4 === 3 ? '#06141b' : '#fff', border: `2px solid ${ring}` }}>{n}</span>
    ))}
  </div>
);

/* ───────────── product window (illustrative content) ───────────── */

const Dashboard = () => {
  const [done, setDone] = useState([true, false, false]);
  const count = done.filter(Boolean).length;
  const [tab, setTab] = useState<'Active' | 'Completed'>('Active');
  const rows = TASKS.map((t, i) => ({ ...t, i })).filter((r) => (tab === 'Active' ? !done[r.i] : done[r.i]));

  return (
    <div className="flex h-full bg-white text-[#06141b] text-left font-sans">
      {/* sidebar */}
      <aside className="hidden md:flex w-48 lg:w-56 xl:w-64 shrink-0 flex-col p-4 border-r border-[#06141b]/[0.07] bg-[#fafbfb]">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-[#253745] text-[#ccd0cf] text-xs font-semibold grid place-items-center">SN</span>
          <div className="leading-tight"><p className="text-[13px] font-semibold">Siddhant</p><p className="text-[10px] text-[#4a5c6a]">Super admin</p></div>
        </div>
        <p className="mt-6 mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b7c86]">Menu</p>
        <nav className="space-y-0.5">
          {MENU.map((m) => (
            <div key={m.label} className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] ${m.active ? 'bg-white ring-1 ring-[#06141b]/[0.06] font-medium text-[#06141b]' : 'text-[#4a5c6a]'}`}>
              {m.active && <span className="absolute -left-4 top-1.5 bottom-1.5 w-[3px] rounded-r bg-[#253745]" />}
              {m.icon(14)}<span className="flex-1">{m.label}</span>
              {m.badge && <span className="text-[10px] font-semibold rounded-md bg-[#253745] text-white px-1.5">{m.badge}</span>}
            </div>
          ))}
        </nav>
      </aside>

      {/* main */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 xl:p-8 flex flex-col">
        <div className="flex items-center justify-between gap-4">
          <p className="text-base sm:text-lg xl:text-xl font-semibold tracking-tight">Good morning, Siddhant!</p>
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-[#4a5c6a] shrink-0">
            {count} of {TASKS.length} tasks completed
            <span className="w-24 h-1.5 rounded-full bg-[#06141b]/10 overflow-hidden"><motion.span className="block h-full bg-[#253745] rounded-full" animate={{ width: `${(count / TASKS.length) * 100}%` }} transition={softSpring} /></span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 text-white min-h-[7.5rem] xl:min-h-[9rem] flex flex-col" style={{ background: 'linear-gradient(145deg,#4a5c6a,#253745 60%,#11212d)' }}>
            <span className="w-7 h-7 rounded-full bg-white/20 grid place-items-center">{Icon.meetings(14)}</span>
            <p className="mt-auto text-[13px] sm:text-sm font-medium leading-snug">Weekly operations review</p>
            <div className="mt-2"><Avatars names={['AK', 'MS', 'RP']} ring="#2d3f4e" /></div>
          </div>
          <div className="rounded-2xl p-4 text-[#06141b] min-h-[7.5rem] xl:min-h-[9rem] flex flex-col" style={{ background: 'linear-gradient(145deg,#dfe2e1,#9ba8ab)' }}>
            <span className="w-7 h-7 rounded-full bg-white/50 grid place-items-center">{Icon.tasks(14)}</span>
            <p className="mt-auto text-[13px] sm:text-sm font-medium leading-snug">Centre reports due Monday</p>
            <div className="mt-2"><Avatars names={['JD', 'MS']} ring="#b9c2c4" /></div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-[13px] font-semibold">Monthly tasks</p>
          <span className="hidden sm:inline rounded-full bg-[#253745] text-white text-[11px] font-medium px-3 py-1">+ New</span>
        </div>
        <div className="mt-2 flex gap-5 text-[12px] border-b border-[#06141b]/[0.08]">
          {(['Active', 'Completed'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`pb-2 -mb-px transition-colors ${tab === t ? 'border-b-2 border-[#253745] font-medium text-[#253745]' : 'text-[#4a5c6a]'}`}>{t} tasks</button>
          ))}
        </div>
        <div className="mt-2 divide-y divide-[#06141b]/[0.06] flex-1">
          {rows.length === 0 && <p className="py-4 text-xs text-[#4a5c6a]">Nothing here yet.</p>}
          {rows.map((r) => (
            <button key={r.t} onClick={() => setDone((d) => d.map((v, j) => (j === r.i ? !v : v)))} className="w-full flex items-center gap-3 py-2.5 text-[12.5px] text-left hover:bg-[#06141b]/[0.02] transition-colors">
              <motion.span animate={{ backgroundColor: done[r.i] ? '#253745' : '#ffffff', borderColor: done[r.i] ? '#253745' : '#9ba8ab' }} className="w-4 h-4 rounded-[5px] border grid place-items-center shrink-0 text-white">{done[r.i] && Icon.check(10)}</motion.span>
              <span className="flex-1 truncate">{r.t}</span>
              <span className="text-[11px] text-[#4a5c6a]">{r.due}</span>
              <Avatars names={[r.who]} size={22} />
            </button>
          ))}
        </div>
      </main>

      {/* schedule */}
      <aside className="hidden lg:flex w-64 xl:w-80 shrink-0 flex-col gap-4 p-5 xl:p-6 border-l border-[#06141b]/[0.07]">
        <p className="text-[13px] font-semibold">Today’s schedule</p>
        <div>
          <p className="text-[10px] text-[#8a3b3b]">30 minute call · 10:30</p>
          <p className="text-[13px] font-medium">Centre heads sync</p>
        </div>
        <div className="rounded-xl p-3.5 text-[#06141b]" style={{ background: 'linear-gradient(135deg,#9fe0c9,#6fcbae)' }}>
          <p className="text-[11px] font-medium">Weekly operations review</p>
          <div className="mt-2 flex items-center justify-between"><Avatars names={['AK', 'MS', 'RP']} ring="#86d4b9" /><span className="text-xs font-semibold tabular-nums">28:35</span></div>
        </div>
        <div className="border-t border-[#06141b]/[0.07] pt-4">
          <p className="text-[13px] font-medium">Reporting template</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-[#4a5c6a]">
            <div><p>Completed</p><p className="mt-0.5 text-xl font-semibold text-[#06141b] tabular-nums">12</p></div>
            <div><p>In progress</p><p className="mt-0.5 text-xl font-semibold text-[#06141b] tabular-nums">4</p></div>
            <div><p>Team</p><div className="mt-1.5"><Avatars names={['AK', 'MS']} size={20} /></div></div>
          </div>
        </div>
      </aside>
    </div>
  );
};

/* ───────────── hero ───────────── */

const Rise = ({ children, delay, className = '' }: { children: ReactNode; delay: number; className?: string }) => (
  <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.7, ease }} className={className}>{children}</motion.div>
);

/** Centred, light hero: soft glow circle, glass pill, bold two-line headline, two buttons, and a dashboard window rising from the bottom edge. */
export const Hero = ({ onStart, onLearn, signedIn }: { onStart: () => void; onLearn: () => void; signedIn: boolean }) => {
  const t = useT();
  return (
  <div className="relative h-full min-h-[100svh] overflow-hidden text-[#06141b]">
    {/* one soft light background: pale gradient + a large glow circle with a faint outline ring */}
    <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#fbfcfc 0%,#f1f3f3 60%,#e8ebeb 100%)' }} />
    <div aria-hidden className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 w-[min(130vw,70rem)] aspect-square rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(110 134 150 / 0.34), rgb(155 168 171 / 0.16) 55%, transparent 72%)' }} />
    <div aria-hidden className="absolute left-1/2 top-[34%] -translate-x-1/2 -translate-y-1/2 w-[min(110vw,56rem)] aspect-square rounded-full border border-[#4a5c6a]/15" />

    <div className="relative h-full min-h-[100svh] flex flex-col items-center text-center px-4 sm:px-8 pt-28 md:pt-[clamp(5.5rem,10.5vh,7rem)]">
      <Rise delay={0.1}>
        <button onClick={onLearn} className="group inline-flex items-center gap-2.5 rounded-full pl-1.5 pr-4 py-1.5 text-[13px] font-sans text-[#253745] bg-white/70 border border-white shadow-[0_6px_20px_-8px_rgba(6,20,27,0.25)]">
          <span className="rounded-full bg-[#253745] text-white text-[11px] font-semibold px-2.5 py-0.5">New</span>
          Paste agendas straight from Word
          <span className="transition-transform group-hover:translate-x-0.5">{Icon.arrow(13)}</span>
        </button>
      </Rise>

      <Rise delay={0.2}>
        <h1 className="mt-5 md:mt-[clamp(0.9rem,2.6vh,1.75rem)] font-semibold tracking-[-0.03em] leading-[1.06] text-[2.4rem] sm:text-6xl md:text-[clamp(2.2rem,min(7.2vh,6.4vw),6rem)] text-[#0b1a24]">
          {t('hero.title1')}{' '}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg,#253745,#5f7a8c)' }}>{t('hero.title2')}</span>
          <br />{t('hero.title3')}
        </h1>
      </Rise>

      <Rise delay={0.32}>
        <p className="mt-4 md:mt-[clamp(0.6rem,2vh,1.5rem)] max-w-3xl text-[15px] sm:text-lg md:text-[clamp(0.95rem,min(2.15vh,1.7vw),1.4rem)] leading-relaxed text-[#4a5c6a] font-sans">
          {t('hero.sub')}
        </p>
      </Rise>

      <Rise delay={0.42} className="mt-6 md:mt-[clamp(0.9rem,3vh,2rem)] flex flex-wrap justify-center gap-3 font-sans">
        <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} onClick={onStart} className="rounded-full bg-[#253745] text-white text-[15px] md:text-[clamp(0.95rem,1.9vh,1.1rem)] font-medium px-8 md:px-[clamp(2rem,3vw,3rem)] py-3.5 md:py-[clamp(0.7rem,1.9vh,1.1rem)] shadow-[0_14px_28px_-12px_rgba(37,55,69,0.75)]">
          {signedIn ? 'Open workspace' : 'Get Started'}
        </motion.button>
        <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} onClick={onLearn}
          className="rounded-full text-[15px] md:text-[clamp(0.95rem,1.9vh,1.1rem)] font-medium px-8 md:px-[clamp(2rem,3vw,3rem)] py-3.5 md:py-[clamp(0.7rem,1.9vh,1.1rem)] text-[#253745] border border-transparent"
          style={{ background: 'linear-gradient(#fff,#fff) padding-box, linear-gradient(90deg,#9ba8ab,#4a5c6a) border-box' }}>
          See how it works
        </motion.button>
      </Rise>

      {/* window: taller than its frame, so the bottom is cropped by the hero edge */}
      <motion.div initial={{ opacity: 0, y: 70 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 1, ease }}
        className="relative w-full max-w-[min(94vw,1500px)] mt-8 md:mt-[clamp(1rem,3vh,2.25rem)] flex-1 min-h-[19rem] sm:min-h-[24rem] md:min-h-[9rem] rounded-t-[1.5rem] p-1.5 sm:p-2 pb-0 overflow-hidden bg-white/60 border border-b-0 border-white shadow-[0_-20px_70px_-30px_rgba(37,55,69,0.45)]">
        <div className="absolute inset-x-1.5 sm:inset-x-2 top-1.5 sm:top-2 h-[34rem] rounded-t-[1.1rem] overflow-hidden border border-b-0 border-[#06141b]/10 bg-white">
          <div className="flex items-center gap-1.5 px-4 h-8 border-b border-[#06141b]/[0.06] bg-[#fafbfb]">
            <span className="w-2 h-2 rounded-full bg-[#e5a39d]" /><span className="w-2 h-2 rounded-full bg-[#e8cd8a]" /><span className="w-2 h-2 rounded-full bg-[#a9d6b5]" />
          </div>
          <div className="h-[calc(100%-2rem)]"><Dashboard /></div>
        </div>
      </motion.div>
    </div>
  </div>  );
};
