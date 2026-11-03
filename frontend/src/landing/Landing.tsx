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

const Section = ({ id, tone, children, className = '', bg, wide }: { id: string; tone: Tone; children: ReactNode; className?: string; bg?: ReactNode; wide?: boolean }) => (
  <section id={id} data-tone={tone} className={`relative px-5 sm:px-10 lg:px-16 py-20 sm:py-28 ${tone === 'light' ? 'theme-light' : 'text-char'} ${className}`} style={{ background: `${tone === 'light' ? LIGHT_GLOW : DARK_GLOW}, ${tone === 'light' ? LIGHT_BG : DARK_BG}` }}>
    {bg}
    <div className={`relative mx-auto ${wide ? 'max-w-none' : 'max-w-7xl'}`}>{children}</div>
  </section>
);

/** A module card that sticks near the top while the next one slides over it, shrinking slightly as it gets covered. */
const StackCard = ({ m, i, n, progress }: { m: Module; i: number; n: number; progress: MotionValue<number> }) => {
  const dark = i % 2 === 1;
  const scale = useTransform(progress, [i / n, 1], [1, 1 - 0.035 * (n - 1 - i)]);
  return (
    <div className="lg:sticky mb-6 lg:mb-8 last:mb-0" style={{ top: `calc(6.25rem + ${i * 0.9}rem)` }}>
      <motion.article style={{ scale, transformOrigin: 'top center', background: dark ? 'linear-gradient(150deg,#17293a,#0e202c 55%,#06141b)' : 'linear-gradient(150deg,#ffffff,#f1f3f3)' }}
        className={`${dark ? 'glass-dark text-white' : 'text-char'} rounded-[2rem] sm:rounded-[2.5rem] border ${dark ? 'border-white/10' : 'border-[#06141b]/10'} shadow-[0_30px_70px_-34px_rgba(6,20,27,0.55)] p-7 sm:p-10 lg:p-12 grid lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-10`}>
        <div className="flex flex-col">
          <span className="w-14 h-14 rounded-3xl grid place-items-center bg-sun text-night">{m.icon}</span>
          <p className={`mt-6 text-sm font-medium ${dark ? 'text-sun' : 'text-char/62'}`}>{String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</p>
          <h3 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight">{m.name}</h3>
          <p className={`mt-2 text-lg font-light ${dark ? 'text-white/60' : 'text-char/72'}`}>{m.tagline}</p>
          <p className={`mt-5 font-light leading-relaxed ${dark ? 'text-white/75' : 'text-char/70'}`}>{m.text}</p>
        </div>
        <ul className="grid gap-2.5 content-start">
          {m.points.map((p) => (
            <li key={p} className={`flex gap-4 rounded-2xl px-5 py-3 text-[15px] font-light leading-relaxed ${dark ? 'bg-white/8' : 'bg-[#06141b]/[0.045]'}`}>
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

const FADE = (stops: string) => ({ WebkitMaskImage: `linear-gradient(to bottom, ${stops})`, maskImage: `linear-gradient(to bottom, ${stops})` });

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
    const toneObs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setUnder((e.target as HTMLElement).dataset.tone as Tone)),
      { root: root.current, rootMargin: '0px 0px -92% 0px' },
    );
    document.querySelectorAll('[data-tone]').forEach((el) => toneObs.observe(el));
    return () => { obs.disconnect(); toneObs.disconnect(); };
  }, [root]);

  return (
  <header className="sticky top-0 z-40 h-0 overflow-visible">
    {/* Progressive blur: content scrolling up under the header melts into blur instead of staying sharp above the bar. */}
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[7.5rem]">
      <div className="absolute inset-0 backdrop-blur-md" style={FADE('#000 0%, #000 30%, transparent 100%')} />
      <div className={`absolute inset-0 transition-colors duration-500 ${under === 'light' ? 'bg-gradient-to-b from-[#dfe2e1]/80 via-[#dfe2e1]/35 to-transparent' : 'bg-gradient-to-b from-[#06141b]/80 via-[#06141b]/35 to-transparent'}`} />
    </div>
    <div className="relative px-3 sm:px-6 pt-3">
      <div className={`rounded-full pl-6 pr-2 py-2 flex items-center gap-3 max-w-[1500px] mx-auto border shadow-[0_14px_40px_-16px_rgba(0,0,0,0.45)] transition-colors duration-500 ${under === 'light' ? 'bg-[#06141b]/90 border-white/10 text-[#ccd0cf]' : 'bg-[#ccd0cf]/90 border-white/60 text-[#06141b]'}`}>
        <button onClick={() => jump('top')} className="text-2xl font-light tracking-tight whitespace-nowrap">{brand.siteName}</button>
        <nav className="hidden xl:flex mx-auto gap-0.5">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => jump(n.id)} className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-500 ${active === n.id ? (under === 'light' ? 'text-[#06141b]' : 'text-[#ccd0cf]') : (under === 'light' ? 'text-[#9ba8ab] hover:text-[#ccd0cf]' : 'text-[#4a5c6a] hover:text-[#06141b]')}`}>
              {active === n.id && <motion.span layoutId="landing-nav" transition={spring} className={`absolute inset-0 rounded-full transition-colors duration-500 ${under === 'light' ? 'bg-[#ccd0cf]' : 'bg-[#06141b]'}`} />}
              <span className="relative">{n.label}</span>
            </button>
          ))}
        </nav>
        <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.95 }} onClick={onEnter} className={`ml-auto xl:ml-0 rounded-full px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-500 ${under === 'light' ? 'bg-[#ccd0cf] text-[#06141b]' : 'bg-[#06141b] text-[#ccd0cf]'}`}>
          {user ? 'Open workspace' : 'Sign in'}
        </motion.button>
        <button onClick={() => setMenu((m) => !m)} aria-label="Menu" className={`xl:hidden rounded-full w-11 h-11 grid place-items-center text-lg border transition-colors duration-500 ${under === 'light' ? 'border-white/15' : 'border-[#06141b]/20'}`}>{menu ? '✕' : '☰'}</button>
      </div>
      <AnimatePresence>
        {menu && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={`xl:hidden rounded-3xl mt-2 p-3 max-w-[1500px] mx-auto border ${under === 'light' ? 'bg-[#06141b]/95 border-white/10 text-[#ccd0cf]' : 'bg-[#ccd0cf]/95 border-white/60 text-[#06141b]'}`}>
            {NAV.map((n) => <button key={n.id} onClick={() => jump(n.id)} className="block w-full text-left px-4 py-3 rounded-2xl text-sm font-medium hover:bg-white/10">{n.label}</button>)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
    <div ref={root} className="h-full scroll-y font-display text-char relative" style={{ background: '#06141b' }}>
      <SiteHeader root={root} user={!!user} onEnter={enter} />

      <main className="relative">
        {/* ───── Hero ───── */}
        <Section id="top" tone="light" wide className="!p-0 md:h-[100svh] md:min-h-[38rem] md:[&>div]:h-full">
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
          <div ref={listRef} className="mt-14">
            {MODULES.map((m, i) => <StackCard key={m.id} m={m} i={i} n={MODULES.length} progress={stackProgress} />)}
          </div>
        </Section>

        {/* ───── How it works ───── */}
        <Section id="how" tone="dark">
          <Heading eyebrow={t('how.eyebrow')} title={t('how.title')} em={t('how.em')} />
          <div className="relative mt-16">
            <div className="hidden lg:block absolute top-8 left-[6%] right-[6%] border-t-2 border-dotted border-char/25" />
            <motion.div variants={groupIn} initial="hidden" whileInView="show" viewport={vp} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {STEPS.map((s) => (
                <motion.div key={s.n} variants={cardIn} whileHover={{ y: -6 }} className="relative">
                  <span className="relative z-10 w-16 h-16 rounded-full bg-night border border-white/15 text-sun grid place-items-center text-xl font-light">{s.n}</span>
                  <div className="glass rounded-[2rem] p-7 mt-5 min-h-[190px]">
                    <h3 className="text-3xl font-light">{s.title}</h3>
                    <p className="mt-2 text-char/78 font-light leading-relaxed">{s.text}</p>
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
                  <button onClick={() => setFaq(faq === i ? -1 : i)} className="w-full flex items-center justify-between gap-4 py-5 text-left">
                    <span className="text-xl font-light">{f.q}</span>
                    <motion.span animate={{ rotate: faq === i ? 45 : 0 }} className="w-8 h-8 rounded-full bg-white/70 grid place-items-center shrink-0">{Icon.plus(16)}</motion.span>
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
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={enter} className="mt-10 rounded-full bg-sun text-night font-medium px-10 py-4 inline-flex items-center gap-2">
                {user ? 'Open workspace' : 'Sign in'} {Icon.arrow(18)}
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
            {[['software', 'Overview'], ['modules', 'Modules'], ['how', 'How it works'], ['audience', 'Who it’s for']].map(([id, l]) => <button key={id} onClick={() => jump(id)} className="block text-char/72 hover:text-char">{l}</button>)}</div>
          <div className="space-y-2.5"><p className="font-medium">Company</p>
            {[['company', 'About us'], ['security', 'Trust & reliability'], ['faq', 'FAQ']].map(([id, l]) => <button key={id} onClick={() => jump(id)} className="block text-char/72 hover:text-char">{l}</button>)}</div>
          <div className="space-y-2.5"><p className="font-medium">Account</p>
            <button onClick={enter} className="block text-char/72 hover:text-char">{user ? 'Open workspace' : 'Sign in'}</button>
            <p className="text-char/62 font-light leading-relaxed">{t('footer.account')}</p></div>
          <p className="sm:col-span-2 lg:col-span-4 text-xs text-char/55 pt-6 border-t border-char/10">© {new Date().getFullYear()} {brand.siteName}. {t('footer.rights')}</p>
        </div>
      </footer>

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
