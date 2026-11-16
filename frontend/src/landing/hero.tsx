import { useT } from '../lib/siteConfig';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { Icon } from '../shell/icons';
import { ArrowSwap } from './arrow';

const ease = [0.22, 1, 0.36, 1] as const;

/** The hero is always a light stage in the web theme's colours. Fixed values, so the app's tokens never interfere. */
const PAL = {
  light: {
    base: 'linear-gradient(170deg,#fbfcfc 0%,#eff3f4 55%,#e3e9eb 100%)',
    glows: ['rgba(74,92,106,0.30)', 'rgba(155,168,171,0.34)', 'rgba(37,55,69,0.18)'],
    glass: 'bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(244,247,248,0.93))] border border-[rgba(255,255,255,0.95)] shadow-[0_30px_60px_-30px_rgba(37,55,69,0.45),inset_0_1px_0_rgba(255,255,255,1)]',
    root: 'text-[#06141b]', h1: 'text-[#0b1a24]', word: 'linear-gradient(95deg,#06141b 0%,#253745 55%,#4a5c6a 100%)', sub: 'text-[#4a5c6a]',
    chip: 'text-[#253745] bg-[rgba(255,255,255,0.75)] border border-[rgba(255,255,255,1)] shadow-[0_8px_24px_-12px_rgba(37,55,69,0.4)] hover:bg-[#ffffff]',
    primary: 'text-[#ffffff] bg-[#06141b] shadow-[0_18px_36px_-14px_rgba(6,20,27,0.6)]', primaryIcon: 'bg-[rgba(255,255,255,0.16)]',
    ghost: 'text-[#253745] bg-[rgba(255,255,255,0.7)] border border-[rgba(6,20,27,0.14)] hover:bg-[#ffffff]',
    proof: 'text-[#4a5c6a]', check: 'bg-[rgba(37,55,69,0.12)] text-[#253745]',
    title: 'text-[#06141b]', muted: 'text-[#4a5c6a]', soft: 'text-[#6b7c86]', num: 'bg-[rgba(6,20,27,0.07)] text-[#253745]',
    tile: 'bg-[rgba(6,20,27,0.045)] border border-[rgba(6,20,27,0.07)]', ring: 'ring-[rgba(255,255,255,0.9)]', idle: 'rgba(6,20,27,0.09)',
    mint: '#253745', blue: '#4a5c6a', amber: '#6b7c86', mintBg: 'bg-[rgba(37,55,69,0.12)]', blueBg: 'bg-[rgba(74,92,106,0.14)]', amberBg: 'bg-[rgba(155,168,171,0.28)] text-[#253745]',
    line: ['#4a5c6a', '#9ba8ab'],
  },
} as const;
type Pal = (typeof PAL)['light'];
const PalCtx = createContext<Pal>(PAL.light);
const usePal = () => useContext(PalCtx);

const Rise = ({ children, delay, className = '' }: { children: ReactNode; delay: number; className?: string }) => (
  <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.75, ease }} className={className}>{children}</motion.div>
);

const Dot = ({ c }: { c: string }) => <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />;

const Who = ({ n, bg }: { n: string; bg: string }) => (
  <span className={`w-6 h-6 rounded-full grid place-items-center text-[9px] font-bold text-[#06141b] ring-2 shrink-0 ${usePal().ring}`} style={{ background: bg }}>{n}</span>
);

/** One floating glass card; `depth` decides how far it drifts when the pointer moves. */
const Card = ({ children, className, depth, mx, my, float = 6, delay = 0 }: { children: ReactNode; className: string; depth: number; mx: MotionValue<number>; my: MotionValue<number>; float?: number; delay?: number }) => {
  const p = usePal();
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return (
    <motion.div style={{ x, y }} className={`absolute ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.94 }}
        animate={{ opacity: 1, y: [0, -float, 0], scale: 1 }}
        transition={{ opacity: { delay: 0.5 + delay, duration: 0.7 }, scale: { delay: 0.5 + delay, duration: 0.7, ease }, y: { delay: 0.5 + delay, duration: 5 + delay * 3, repeat: Infinity, ease: 'easeInOut' } }}
        className={`${p.glass} rounded-[1.6rem] text-left font-sans will-change-transform`}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

/** Agenda → minutes → task: the whole product idea as three glass cards joined by animated lines. */
const FlowScene = () => {
  const p = usePal();
  const mx = useSpring(useMotionValue(0), { stiffness: 90, damping: 18 });
  const my = useSpring(useMotionValue(0), { stiffness: 90, damping: 18 });
  const [done, setDone] = useState(false);
  // The scene is designed at 544px; on narrow screens it is scaled down as a whole so the cards never collide.
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setFit(Math.min(1, el.clientWidth / 544)));
    ro.observe(el); setFit(Math.min(1, el.clientWidth / 544));
    return () => ro.disconnect();
  }, []);
  useEffect(() => { const t = setInterval(() => setDone((d) => !d), 2600); return () => clearInterval(t); }, []);
  const move = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const reset = () => { mx.set(0); my.set(0); };
  const px = (n: number) => n * 14;
  const label = 'text-[11px] font-bold tracking-[0.16em] uppercase';

  return (
    <div ref={box} className="relative w-full max-w-[34rem] mx-auto" style={{ height: 544 * fit }} onMouseMove={move} onMouseLeave={reset}>
    <div className="absolute left-0 top-0 w-[544px] h-[544px] origin-top-left" style={{ transform: `scale(${fit})` }}>
      <svg aria-hidden viewBox="0 0 544 544" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="hl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={p.line[0]} stopOpacity="0.9" /><stop offset="1" stopColor={p.line[1]} stopOpacity="0.9" /></linearGradient>
        </defs>
        <motion.path d="M150 150 C 230 160, 230 215, 275 250" fill="none" stroke="url(#hl)" strokeWidth="2" strokeDasharray="6 8" animate={{ strokeDashoffset: [0, -28] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }} />
        <motion.path d="M355 380 C 400 400, 400 420, 410 440" fill="none" stroke="url(#hl)" strokeWidth="2" strokeDasharray="6 8" animate={{ strokeDashoffset: [0, -28] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }} />
      </svg>

      <Card mx={mx} my={my} depth={px(0.9)} className="left-0 top-0 w-[15.5rem]" float={7}>
        <div className="p-5">
          <div className="flex items-center gap-2.5" style={{ color: p.mint }}><span className={`w-8 h-8 rounded-xl grid place-items-center ${p.mintBg}`}>{Icon.meetings(16)}</span><span className={label}>Agenda</span></div>
          <p className={`mt-3 text-[15px] font-semibold leading-snug ${p.title}`}>Weekly operations review</p>
          <ul className={`mt-3 space-y-2 text-[12.5px] ${p.muted}`}>
            {['Action points from last week', 'Centre reports', 'Calendar for Q4'].map((t, i) => (
              <li key={t} className="flex items-center gap-2.5"><span className={`w-5 h-5 rounded-md text-[10px] font-bold grid place-items-center ${p.num}`}>{i + 1}</span>{t}</li>
            ))}
          </ul>
        </div>
      </Card>

      <Card mx={mx} my={my} depth={px(1.5)} className="left-[20%] top-[31%] w-[20rem] z-10" float={5} delay={0.25}>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5" style={{ color: p.blue }}><span className={`w-8 h-8 rounded-xl grid place-items-center ${p.blueBg}`}>{Icon.worklog(16)}</span><span className={label}>Minutes</span></div>
            <span className={`text-[11px] ${p.soft}`}>Today · 10:30</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {[
              ['Decision', p.mint, 'Circulate the revised calendar', 'AK', '#ccd0cf'],
              ['Info', p.blue, 'Centre reports are due Monday', 'MS', '#9ba8ab'],
              ['Lesson', p.amber, 'Share templates one week earlier', 'RP', '#b4c0c3'],
            ].map(([k, c, t, w, bg]) => (
              <div key={t} className={`flex items-center gap-3 rounded-2xl px-3.5 py-2.5 ${p.tile}`}>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: c }}><Dot c={c} />{k}</p>
                  <p className={`text-[13px] truncate mt-0.5 ${p.title}`}>{t}</p>
                </div>
                <Who n={w} bg={bg} />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card mx={mx} my={my} depth={px(2.1)} className="right-0 bottom-3 w-[16.5rem] z-20" float={9} delay={0.5}>
        <div className="p-4 flex items-center gap-3.5">
          <motion.span animate={{ backgroundColor: done ? '#253745' : p.idle }} transition={{ duration: 0.4 }} className="w-9 h-9 rounded-xl grid place-items-center text-[#ffffff] shrink-0">
            <motion.span animate={{ scale: done ? 1 : 0.2, opacity: done ? 1 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>{Icon.check(18)}</motion.span>
          </motion.span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: p.mint }}>{done ? 'Done' : 'Task created'}</p>
            <p className={`text-[14px] font-semibold leading-snug truncate ${p.title}`}>Circulate the calendar</p>
            <p className={`text-[11px] mt-0.5 ${p.soft}`}>Owner AK · due Monday</p>
          </div>
        </div>
      </Card>

      <Card mx={mx} my={my} depth={px(2.6)} className="right-[6%] top-0 z-20" float={8} delay={0.8}>
        <div className="px-4 py-3 flex items-center gap-2.5">
          <span className={`w-7 h-7 rounded-lg grid place-items-center ${p.amberBg}`}>{Icon.bell(14)}</span>
          <span className={`text-[12px] font-semibold ${p.title}`}>Reminder · 7:00 AM</span>
        </div>
      </Card>
    </div>
    </div>
  );
};

/** Light hero; the header above it is dark glass. */
export const Hero = ({ onStart, onLearn, signedIn }: { onStart: () => void; onLearn: () => void; signedIn: boolean }) => {
  const t = useT();
  const p = PAL.light;
  const proof = [t('hero.proof1'), t('hero.proof2'), t('hero.proof3')];
  return (
    <PalCtx.Provider value={p}>
      <div className={`relative h-full md:min-h-[100svh] overflow-hidden ${p.root}`}>
        {/* stage: base colour and three softly drifting glows */}
        <div aria-hidden className="absolute inset-0" style={{ background: p.base }} />
        <motion.div aria-hidden className="absolute -left-[10%] bottom-[-10%] w-[min(60vw,46rem)] aspect-square rounded-full will-change-transform" style={{ background: `radial-gradient(closest-side, ${p.glows[0]}, transparent 72%)` }} animate={{ x: [0, 40, 0], y: [0, -30, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div aria-hidden className="absolute right-[-8%] top-[-12%] w-[min(60vw,44rem)] aspect-square rounded-full will-change-transform" style={{ background: `radial-gradient(closest-side, ${p.glows[1]}, transparent 72%)` }} animate={{ x: [0, -36, 0], y: [0, 36, 0] }} transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div aria-hidden className="absolute right-[22%] bottom-[8%] w-[min(40vw,30rem)] aspect-square rounded-full will-change-transform" style={{ background: `radial-gradient(closest-side, ${p.glows[2]}, transparent 72%)` }} animate={{ x: [0, 24, 0], y: [0, 24, 0] }} transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }} />

        <div className="relative max-w-[1400px] mx-auto md:min-h-[100svh] grid lg:grid-cols-[1.05fr_1fr] items-center gap-6 lg:gap-8 px-5 sm:px-10 pt-24 sm:pt-28 pb-8 lg:pb-8">
          <div className="text-left">
            <Rise delay={0.1}>
              <button onClick={onLearn} className={`group inline-flex items-center gap-2.5 rounded-full pl-1.5 pr-4 py-1.5 text-[13px] font-sans transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-14px_rgba(37,55,69,0.5)] ${p.chip}`}>
                <span className="rounded-full text-[#06141b] text-[11px] font-bold px-2.5 py-0.5" style={{ background: 'linear-gradient(135deg,#ccd0cf,#9ba8ab)' }}>New</span>
                Paste agendas straight from Word
                <ArrowSwap size={13} />
              </button>
            </Rise>

            <Rise delay={0.2}>
              <h1 className={`mt-6 font-semibold tracking-[-0.035em] leading-[1.02] text-balance text-[2.6rem] sm:text-[3.6rem] lg:text-[clamp(3rem,5.4vw,5.1rem)] ${p.h1}`}>
                {t('hero.title1')}{' '}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: p.word }}>{t('hero.title2')}</span>
                <br />{t('hero.title3')}
              </h1>
            </Rise>

            <Rise delay={0.32}>
              <p className={`mt-6 max-w-xl text-[16px] sm:text-lg leading-relaxed font-sans text-pretty ${p.sub}`}>{t('hero.sub')}</p>
            </Rise>

            <Rise delay={0.42} className="mt-8 flex flex-wrap items-center gap-3 font-sans">
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={onStart} className={`btn-shine group inline-flex items-center gap-2.5 rounded-full text-[15px] font-semibold pl-7 pr-5 py-3.5 ${p.primary}`}>
                {signedIn ? 'Open workspace' : 'Get started'}
                <span className={`w-7 h-7 rounded-full grid place-items-center transition-transform duration-300 group-hover:rotate-[-45deg] ${p.primaryIcon}`}>{Icon.arrow(14)}</span>
              </motion.button>
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={onLearn} className={`group inline-flex items-center gap-2.5 rounded-full text-[15px] font-medium px-7 py-3.5 transition-all duration-300 hover:shadow-[0_16px_32px_-16px_rgba(37,55,69,0.5)] hover:border-[rgba(6,20,27,0.3)] ${p.ghost}`}>
                See how it works <ArrowSwap size={15} />
              </motion.button>
            </Rise>

            <Rise delay={0.52} className={`mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-[13px] ${p.proof}`}>
              {proof.map((x) => (
                <span key={x} className="inline-flex items-center gap-2"><span className={`w-5 h-5 rounded-full grid place-items-center ${p.check}`}>{Icon.check(12)}</span>{x}</span>
              ))}
            </Rise>
          </div>

          <div className="hidden md:block"><FlowScene /></div>
        </div>
      </div>
    </PalCtx.Provider>
  );
};
