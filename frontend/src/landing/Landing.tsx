import { memo, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { AnimatePresence, motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { navigatePath } from '../lib/nav';
import { spring } from '../lib/motion';
import { Icon } from '../shell/icons';
import { useBranding } from '../lib/branding';
import { useSiteConfig, useT } from '../lib/siteConfig';
import { landingIcon } from '../lib/landingIcons';
import { SignInPage } from './SignInPage';
import { cardIn, groupIn } from './bits';
import { ArrowSwap } from './arrow';
import { Hero } from './hero';

/* ───────────────────────── Content ───────────────────────── */

interface Module { id: string; icon: ReactNode; name: string; tagline: string; text: string; points: string[] }
const icon = landingIcon;

/* ───────────────────────── Small pieces ───────────────────────── */

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-medium text-char/80">
    <span className="w-1.5 h-1.5 rounded-full bg-sun-deep" /> {children}
  </span>
);

const Heading = ({ eyebrow, title, em, sub }: { eyebrow: string; title: string; em?: string; sub?: string }) => (
  <div className="max-w-3xl">
    <Eyebrow>{eyebrow}</Eyebrow>
    <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extralight tracking-tight leading-[1.05]">{title}{em && <> <span className="font-light">{em}</span></>}</h2>
    {sub && <p className="mt-5 text-lg text-char/72 font-light leading-relaxed">{sub}</p>}
  </div>
);

type Tone = 'light' | 'dark';
const LIGHT_BG = 'linear-gradient(160deg,#eceeee 0%,#dfe2e1 45%,#ccd0cf 100%)';
const DARK_BG = 'linear-gradient(160deg,#17293a 0%,#0e202c 50%,#06141b 100%)';

const LIGHT_GLOW = 'radial-gradient(520px circle at 0% 0%, rgb(255 255 255 / 0.8), transparent 70%), radial-gradient(560px circle at 100% 100%, rgb(155 168 171 / 0.35), transparent 70%)';
const DARK_GLOW = 'radial-gradient(520px circle at 0% 0%, rgb(74 92 106 / 0.32), transparent 70%), radial-gradient(560px circle at 100% 100%, rgb(37 55 69 / 0.6), transparent 70%)';

const Section = ({ id, tone: toneProp, children, className = '', bg, wide }: { id: string; tone: Tone; children: ReactNode; className?: string; bg?: ReactNode; wide?: boolean }) => {
  const tone: Tone = toneProp;
  return (
  <section id={id} data-tone={tone} className={`relative px-5 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20 ${tone === 'light' ? 'theme-light' : 'text-char'} ${className}`} style={{ background: `${tone === 'light' ? LIGHT_GLOW : DARK_GLOW}, ${tone === 'light' ? LIGHT_BG : DARK_BG}` }}>
    {bg}
    <div className={`relative mx-auto ${wide ? 'max-w-none' : 'max-w-7xl'}`}>{children}</div>
  </section>
  );
};

/** A module card that sticks near the top while the next one slides over it, shrinking slightly as it gets covered. */
const StackCard = ({ m, i, n, progress }: { m: Module; i: number; n: number; progress: MotionValue<number> }) => {
  const dark = i % 2 === 1;
  const scale = useTransform(progress, [i / n, 1], [1, 1 - 0.035 * (n - 1 - i)]);
  // A card taller than the screen sticks by its bottom edge, so every line stays readable before the next card slides over it.
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(84 + i * 10);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const fit = () => { const base = window.innerWidth >= 1024 ? 100 + i * 14 : 84 + i * 10; setTop(Math.min(base, Math.round(window.innerHeight - el.offsetHeight - 16))); };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [i]);
  return (
    <div ref={ref} className="sticky mb-6 lg:mb-8 last:mb-0" style={{ top }}>
      <motion.article style={{ scale, transformOrigin: 'top center', background: dark ? 'linear-gradient(150deg,#17293a,#0e202c 55%,#06141b)' : 'linear-gradient(150deg,#ffffff,#f1f3f3)' }}
        className={`${dark ? 'glass-dark text-white' : 'theme-light text-char'} rounded-[1.75rem] sm:rounded-[2.5rem] border ${dark ? 'border-white/10' : 'border-[#06141b]/10'} shadow-[0_30px_70px_-34px_rgba(6,20,27,0.55)] p-5 sm:p-8 lg:p-12 grid lg:grid-cols-[0.8fr_1.2fr] gap-5 lg:gap-10`}>
        <div className="flex flex-col">
          <span className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl grid place-items-center bg-sun text-night">{m.icon}</span>
          <p className={`mt-4 sm:mt-6 text-sm font-medium ${dark ? 'text-sun' : 'text-char/62'}`}>{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</p>
          <h3 className="mt-1 sm:mt-2 text-2xl sm:text-4xl lg:text-5xl font-light tracking-tight">{m.name}</h3>
          <p className={`mt-1 sm:mt-2 text-base sm:text-lg font-light ${dark ? 'text-white/60' : 'text-char/72'}`}>{m.tagline}</p>
          <p className={`mt-3 sm:mt-5 text-[14.5px] sm:text-base font-light leading-relaxed ${dark ? 'text-white/75' : 'text-char/70'}`}>{m.text}</p>
        </div>
        <ul className="grid gap-2 sm:gap-2.5 content-start">
          {m.points.map((p, pi) => (
            <li key={p} className={`${pi >= 3 ? 'max-lg:hidden' : ''} flex gap-3 sm:gap-4 rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 text-[14px] sm:text-[15px] font-light leading-relaxed ${dark ? 'bg-white/8' : 'bg-[#06141b]/[0.045]'}`}>
              <span className="mt-1 w-5 h-5 rounded-full bg-sun text-night grid place-items-center shrink-0 text-[11px]">✓</span>{p}
            </li>
          ))}
        </ul>
      </motion.article>
    </div>
  );
};

/* ───────────────────────── Page ───────────────────────── */

const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });


/** Owns the scroll-tracking state so a section change re-renders only the header, not the whole page. */
const SiteHeader = memo(({ root, user, onEnter }: { root: RefObject<HTMLDivElement | null>; user: boolean; onEnter: () => void }) => {
  const brand = useBranding();
  const NAV = useSiteConfig().cfg.landing.nav.filter((n) => !n.hidden);
  const [active, setActive] = useState('top');
  const [menu, setMenu] = useState(false);
  // Header contrasts with whatever section is currently under it.
  const [under, setUnder] = useState<Tone>('light');
  const jump = (id: string) => { setMenu(false); scrollToSection(id); };

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { root: root.current, rootMargin: '-30% 0px -60% 0px' },
    );
    NAV.forEach((n) => { const el = document.getElementById(n.id); if (el) obs.observe(el); });
    // The header contrasts with whichever section sits under its centre line.
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = [...document.querySelectorAll<HTMLElement>('[data-tone]')].find((n) => { const r = n.getBoundingClientRect(); return r.top <= 32 && r.bottom > 32; });
      if (el) setUnder(el.dataset.tone as Tone);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    document.addEventListener('scroll', onScroll, true);
    measure();
    return () => { obs.disconnect(); document.removeEventListener('scroll', onScroll, true); if (raf) cancelAnimationFrame(raf); };
  }, [root]);

  const lightUnder = under === 'dark'; // opposite of the section beneath: dark glass over light sections, light glass over dark ones
  const shell = lightUnder
    ? 'bg-[rgba(255,255,255,0.97)] border-[rgba(6,20,27,0.08)] text-[#06141b] shadow-[0_24px_40px_-20px_rgba(6,20,27,0.35)]'
    : 'bg-[rgba(6,20,27,0.97)] border-[rgba(255,255,255,0.08)] text-[#e8ecec] shadow-[0_24px_40px_-20px_rgba(6,20,27,0.6)]';
  const navIdle = lightUnder ? 'text-[#34495a] hover:text-[#06141b]' : 'text-[#b4c0c3] hover:text-[#ffffff]';
  const navOn = lightUnder ? 'text-[#ffffff] font-semibold' : 'text-[#06141b] font-semibold';
  const pill = lightUnder ? 'bg-[#06141b]' : 'bg-[#e4e9e9]';
  const cta = lightUnder ? 'bg-[#06141b] text-[#ffffff]' : 'bg-[#ccd0cf] text-[#06141b]';
  return (
  <header className="sticky top-0 z-40 h-0 overflow-visible">
    {/* full-width frosted bar: the page shows through, softly blurred */}
    <div className={`w-full h-16 border-b backdrop-blur-lg transition-colors duration-500 ${lightUnder ? 'bg-[rgba(255,255,255,0.9)] border-[rgba(6,20,27,0.08)] text-[#06141b]' : 'bg-[rgba(6,20,27,0.95)] border-[rgba(255,255,255,0.08)] text-[#e8ecec]'}`}>
      <div className="max-w-[1500px] mx-auto h-full px-4 sm:px-8 lg:px-12 flex items-center gap-2 sm:gap-4">
        <button onClick={() => jump('top')} aria-label={`${brand.siteName} home`} className="flex items-center gap-2.5 min-w-0">
          <span className={`w-9 h-9 shrink-0 rounded-xl grid place-items-center overflow-hidden text-[15px] font-semibold transition-colors duration-500 ${lightUnder ? 'bg-[#06141b] text-[#ffffff]' : 'bg-[#ccd0cf] text-[#06141b]'}`}>
            {brand.logoUrl ? <img src={brand.logoUrl} alt="" className="w-full h-full object-cover" /> : brand.siteName.charAt(0).toUpperCase()}
          </span>
          <span className="text-[18px] font-medium tracking-tight truncate">{brand.siteName}</span>
        </button>
        <nav className="hidden xl:flex items-center gap-1 mx-auto" aria-label="Sections">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => jump(n.id)} className={`relative px-4 py-2 rounded-full text-[13.5px] font-medium transition-all duration-300 hover:-translate-y-px ${active === n.id ? navOn : navIdle}`}>
              {active === n.id && <motion.span layoutId="landing-nav" transition={spring} className={`absolute inset-0 rounded-full ${pill}`} />}
              <span className="relative">{n.label}</span>
            </button>
          ))}
        </nav>
        <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.96 }} onClick={onEnter} className={`btn-shine group ml-auto xl:ml-0 inline-flex items-center gap-2 rounded-full px-4 sm:px-5 py-2.5 text-[13.5px] font-semibold whitespace-nowrap transition-[colors,box-shadow] duration-300 hover:shadow-[0_10px_24px_-10px_rgba(6,20,27,0.5)] ${cta}`}>
          {user ? <><span className="sm:hidden">Open</span><span className="hidden sm:inline">Open workspace</span></> : 'Sign in'} <ArrowSwap size={14} />
        </motion.button>
        <button onClick={() => setMenu((m) => !m)} aria-label="Menu" aria-expanded={menu} className={`xl:hidden shrink-0 rounded-full w-11 h-11 grid place-items-center border transition-colors duration-300 ${lightUnder ? 'border-[rgba(6,20,27,0.14)] text-[#06141b] hover:bg-[rgba(6,20,27,0.07)]' : 'border-[rgba(255,255,255,0.22)] text-[#ffffff] hover:bg-[rgba(255,255,255,0.12)]'}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d={menu ? 'M6 6l12 12' : 'M4 7h16'} style={{ transition: 'd 0.25s' }} />
            <path d="M4 12h16" style={{ opacity: menu ? 0 : 1, transition: 'opacity 0.2s' }} />
            <path d={menu ? 'M18 6L6 18' : 'M4 17h16'} style={{ transition: 'd 0.25s' }} />
          </svg>
        </button>
      </div>
    </div>
    <AnimatePresence>
      {menu && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={`xl:hidden w-full border-b backdrop-blur-2xl px-4 sm:px-8 py-2 ${shell}`}>
          {NAV.map((n) => <button key={n.id} onClick={() => jump(n.id)} className={`block w-full text-left px-4 py-3 rounded-2xl text-sm font-medium ${active === n.id ? `${pill} ${navOn}` : navIdle}`}>{n.label}</button>)}
        </motion.div>
      )}
    </AnimatePresence>
  </header>
  );
});


export const Landing = () => {
  const brand = useBranding();
  const t = useT();
  const { cfg } = useSiteConfig();
  const { problems: PROBLEMS, steps: STEPS, audiences: AUDIENCES, trust: TRUST, values: VALUES, faq: FAQ } = cfg.landing;
  const MODULES: Module[] = cfg.landing.modules.map((m) => ({ ...m, icon: icon(m.icon, 28) }));
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [faq, setFaq] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: stackProgress } = useScroll({ container: root, target: listRef, offset: ['start start', 'end end'] });
  // The page scrolls inside this element, so in-view triggers must observe it, not the window.
  const vp = { root, once: true, margin: '-60px' } as const;

  const jump = scrollToSection;
  const enter = () => (user ? navigatePath('/app') : setOpen(true));

  return (
    <div ref={root} className="landing-root h-full scroll-y font-display text-char relative" style={{ background: '#06141b' }}>
      {/* While the sign-in page is open the landing page is not painted at all, so it can't slow it down. */}
      <div style={{ visibility: open ? 'hidden' : 'visible' }}>
      <SiteHeader root={root} user={!!user} onEnter={enter} />

      <main className="relative">
        {/* ───── Hero ───── */}
        <Section id="top" tone="light" wide className="!p-0 md:min-h-[100svh] md:[&>div]:h-full">
          <Hero signedIn={!!user} onStart={enter} onLearn={() => jump('software')} />
        </Section>

        {/* ───── About the software ───── */}
        <Section id="software" tone="dark">
          <div className="grid lg:grid-cols-2 gap-14">
            <div>
              <Heading eyebrow={t('software.eyebrow')} title={t('software.title')} em={t('software.em')} sub={t('software.sub')} />
              <p className="mt-6 text-char/78 font-light leading-relaxed text-lg">
                {t('software.body')}
              </p>
            </div>
            <motion.div variants={groupIn} initial="hidden" whileInView="show" viewport={vp} className="grid gap-4">
              {PROBLEMS.map((p, i) => (
                <motion.div key={p.h} variants={cardIn} className="glass rounded-[2rem] p-7 flex gap-5">
                  <span className="text-4xl font-extralight text-char/25 leading-none">0{i + 1}</span>
                  <div><h3 className="text-2xl font-light">{p.h}</h3><p className="mt-1.5 text-char/78 font-light leading-relaxed">{p.t}</p></div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </Section>

        {/* ───── Modules ───── */}
        <Section id="modules" tone="light">
          <Heading eyebrow={t('modules.eyebrow')} title={t('modules.title')} em={t('modules.em')} sub={t('modules.sub')} />
          <div ref={listRef} className="mt-10">
            {MODULES.map((m, i) => <StackCard key={m.id} m={m} i={i} n={MODULES.length} progress={stackProgress} />)}
          </div>
        </Section>

        {/* ───── How it works ───── */}
        <Section id="how" tone="dark">
          <Heading eyebrow={t('how.eyebrow')} title={t('how.title')} em={t('how.em')} />
          <div className="relative mt-10">
            <div className="hidden lg:block absolute top-8 left-[6%] right-[6%] border-t-2 border-dotted border-char/25" />
            <motion.div variants={groupIn} initial="hidden" whileInView="show" viewport={vp} className="grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
              {STEPS.map((s, i) => (
                <motion.div key={s.n} variants={cardIn} whileHover={{ y: -6 }} className="relative pl-14 pb-7 last:pb-0 sm:pl-0 sm:pb-0">
                  {/* phone timeline: a rail joining the numbered nodes */}
                  {i < STEPS.length - 1 && <span aria-hidden className="sm:hidden absolute left-[21px] top-11 bottom-0 w-px bg-gradient-to-b from-[#9ba8ab]/60 to-[#9ba8ab]/10" />}
                  <span className="absolute left-0 top-0 sm:relative z-10 w-11 h-11 sm:w-16 sm:h-16 rounded-full bg-night border border-[#9ba8ab]/50 sm:border-white/15 text-sun grid place-items-center text-[15px] sm:text-xl font-medium sm:font-light shadow-[0_0_0_5px_rgba(155,168,171,0.1)] sm:shadow-none">{s.n}</span>
                  <div className="sm:glass sm:rounded-[2rem] sm:p-7 sm:mt-5 sm:min-h-[190px] pt-1.5 sm:pt-7">
                    <h3 className="text-xl sm:text-3xl font-medium sm:font-light">{s.title}</h3>
                    <p className="mt-1.5 sm:mt-2 text-[15px] sm:text-base text-char/75 sm:text-char/78 font-light leading-relaxed">{s.text}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </Section>

        {/* ───── Who it is for ───── */}
        <Section id="audience" tone="light">
          <Heading eyebrow={t('audience.eyebrow')} title={t('audience.title')} em={t('audience.em')} />
          <motion.div variants={groupIn} initial="hidden" whileInView="show" viewport={vp} className="mt-12 grid md:grid-cols-2 gap-5">
            {AUDIENCES.map((a) => (
              <motion.div key={a.who} variants={cardIn} whileHover={{ y: -5 }} className="glass rounded-[2rem] p-8">
                <h3 className="text-3xl font-light">{a.who}</h3>
                <p className="mt-3 text-char/78 font-light leading-relaxed text-lg">{a.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </Section>

        {/* ───── Trust ───── */}
        <Section id="security" tone="dark">
          <Heading eyebrow={t('trust.eyebrow')} title={t('trust.title')} em={t('trust.em')} sub={t('trust.sub')} />
          <motion.div variants={groupIn} initial="hidden" whileInView="show" viewport={vp} className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TRUST.map((t) => (
              <motion.div key={t.title} variants={cardIn} whileHover={{ y: -5 }} className="glass rounded-[2rem] p-7">
                <span className="w-12 h-12 rounded-2xl bg-night border border-white/15 text-sun grid place-items-center">{icon(t.icon, 22)}</span>
                <h3 className="mt-5 text-2xl font-light">{t.title}</h3>
                <p className="mt-2 text-char/78 font-light leading-relaxed">{t.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </Section>

        {/* ───── Company ───── */}
        <Section id="company" tone="light">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-14">
            <div>
              <Heading eyebrow={t('company.eyebrow')} title={t('company.title')} em={t('company.em')} />
              <p className="mt-6 text-char/78 font-light leading-relaxed text-lg">
                {t('company.p1')}
              </p>
              <p className="mt-4 text-char/78 font-light leading-relaxed text-lg">
                {t('company.p2')}
              </p>
              <div className="glass-dark rounded-[2rem] p-8 mt-8 text-white">
                <p className="text-sun text-sm font-medium">{t('company.missionLabel')}</p>
                <p className="mt-3 text-3xl font-extralight leading-snug">{t('company.mission')}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-char/62 mb-4">{t('company.believe')}</p>
              <motion.div variants={groupIn} initial="hidden" whileInView="show" viewport={vp} className="grid sm:grid-cols-2 gap-4">
                {VALUES.map((v) => (
                  <motion.div key={v.h} variants={cardIn} whileHover={{ y: -5 }} className="glass rounded-[2rem] p-7">
                    <span className="block w-10 h-1.5 rounded-full bg-sun-deep mb-5" />
                    <h3 className="text-2xl font-light">{v.h}</h3>
                    <p className="mt-2 text-char/78 font-light leading-relaxed">{v.t}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </Section>

        {/* ───── FAQ ───── */}
        <Section id="faq" tone="dark">
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-14">
            <Heading eyebrow={t('faq.eyebrow')} title={t('faq.title')} em={t('faq.em')} sub={t('faq.sub')} />
            <div className="glass rounded-[2rem] px-7">
              {FAQ.map((f, i) => (
                <div key={f.q} className="border-b border-dotted border-char/25 last:border-0">
                  <button onClick={() => setFaq(faq === i ? -1 : i)} className="group w-full flex items-center justify-between gap-4 py-5 text-left transition-colors hover:text-char">
                    <span className="text-xl font-light">{f.q}</span>
                    <motion.span animate={{ rotate: faq === i ? 45 : 0 }} className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.10)] border border-[rgba(255,255,255,0.2)] text-[#e8ecec] grid place-items-center shrink-0 transition-colors duration-300 group-hover:bg-[#e5c36b] group-hover:border-[#e5c36b] group-hover:text-[#06141b]">{Icon.plus(16)}</motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {faq === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <p className="pb-5 text-char/78 font-light leading-relaxed">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ───── CTA ───── */}
        <Section id="start" tone="light">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={vp} transition={spring} className="glass-dark relative overflow-hidden rounded-[3rem] p-10 sm:p-20 text-white text-center">
            <div className="relative">
              <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extralight tracking-tight leading-[1.05]">{t('cta.pre')} <span className="text-sun font-light">{t('cta.em')}</span> {t('cta.post')}</h2>
              <p className="mt-5 text-white/60 font-light text-xl">{t('cta.sub')}</p>
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={enter} className="btn-shine group mt-10 rounded-full bg-sun text-night font-medium px-10 py-4 inline-flex items-center gap-2 transition-shadow duration-300 hover:shadow-[0_18px_40px_-12px_rgba(229,195,107,0.6)]">
                {user ? 'Open workspace' : 'Sign in'} <ArrowSwap size={18} />
              </motion.button>
            </div>
          </motion.div>
        </Section>
      </main>

      {/* ───── Footer ───── */}
      <footer data-tone="dark" className="relative px-5 sm:px-10 lg:px-16 py-14 text-char" style={{ background: DARK_BG }}>
        <div className="max-w-7xl mx-auto glass rounded-[2.5rem] p-8 sm:p-12 grid sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-10 text-sm">
          <div>
            <p className="text-3xl font-light tracking-tight">{brand.siteName}</p>
            <p className="text-char/72 font-light mt-3 max-w-xs leading-relaxed">{t('footer.tagline')}</p>
          </div>
          <div className="space-y-2.5"><p className="font-medium">The software</p>
            {[['software', 'Overview'], ['modules', 'Modules'], ['how', 'How it works'], ['audience', 'Who it’s for']].map(([id, l]) => <button key={id} onClick={() => jump(id)} className="block text-char/72 hover:text-char transition-all duration-200 hover:translate-x-1">{l}</button>)}</div>
          <div className="space-y-2.5"><p className="font-medium">Company</p>
            {[['company', 'About us'], ['security', 'Trust & reliability'], ['faq', 'FAQ']].map(([id, l]) => <button key={id} onClick={() => jump(id)} className="block text-char/72 hover:text-char transition-all duration-200 hover:translate-x-1">{l}</button>)}</div>
          <div className="space-y-2.5"><p className="font-medium">Account</p>
            <button onClick={enter} className="block text-char/72 hover:text-char transition-all duration-200 hover:translate-x-1">{user ? 'Open workspace' : 'Sign in'}</button>
            <p className="text-char/62 font-light leading-relaxed">{t('footer.account')}</p></div>
          <p className="sm:col-span-2 lg:col-span-4 text-xs text-char/55 pt-6 border-t border-char/10">© {new Date().getFullYear()} {brand.siteName}. {t('footer.rights')}</p>
        </div>
      </footer>

      </div>

      {/* ───── Glass sign-in ───── */}
      <AnimatePresence>
        {open && (
          <motion.div key="signin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <SignInPage onClose={() => setOpen(false)} onSuccess={() => { setOpen(false); navigatePath('/app'); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
