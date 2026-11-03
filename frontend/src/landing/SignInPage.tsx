import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { useT } from '../lib/siteConfig';
import { Icon } from '../shell/icons';
import { requestForgotPasswordOtp, resetForgotPassword, verifyForgotPasswordOtp } from '../lib/api';

type Mode = 'signin' | 'forgot' | 'otp' | 'reset' | 'done';

const ease = [0.77, 0, 0.175, 1] as const;
const serif = { fontFamily: "'Instrument Serif', Georgia, serif" } as const;
const ACCENT = '#9ba8ab';
const INK = '#06141b';

// The dark panel sits on the right for sign-in and sweeps to the left for the reset steps.
const CLIP = {
  right: 'polygon(46% 0%, 100% 0%, 100% 100%, 60% 100%)',
  left: 'polygon(0% 0%, 54% 0%, 40% 100%, 0% 100%)',
};
const CLIP_EDGE = {
  right: 'polygon(45.7% 0%, 100% 0%, 100% 100%, 59.7% 100%)',
  left: 'polygon(0% 0%, 54.3% 0%, 40.3% 100%, 0% 100%)',
};

const useWide = () => {
  const q = '(min-width: 768px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setWide(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return wide;
};

/* ───────── icons ───────── */
const Svg = ({ children }: { children: ReactNode }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const UserIcon = () => <Svg><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4" /></Svg>;
const MailIcon = () => <Svg><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="m4.5 7.5 7.5 6 7.5-6" /></Svg>;
const KeyIcon = () => <Svg><circle cx="8" cy="15" r="3.5" /><path d="m10.5 12.5 8-8M15.5 7.5l2 2M13 10l2 2" /></Svg>;
const EyeIcon = ({ off }: { off?: boolean }) => (
  <Svg><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" />{off && <path d="m4 4 16 16" />}</Svg>
);

/* ───────── underlined floating-label field ───────── */
const UnderField = ({ label, value, onChange, type = 'text', icon, trailing, ...rest }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; icon?: ReactNode; trailing?: ReactNode;
  autoFocus?: boolean; required?: boolean; minLength?: number; maxLength?: number; inputMode?: 'numeric'; autoComplete?: string; center?: boolean;
}) => {
  const [focus, setFocus] = useState(false);
  const lifted = focus || value.length > 0;
  const { center, ...input } = rest;
  return (
    <label className="relative block">
      <span className={`absolute left-0 pointer-events-none transition-all duration-200 ${lifted ? 'top-0 text-[12px] font-medium' : 'top-[1.35rem] text-[1.02rem]'}`} style={{ color: focus ? '#253745' : lifted ? '#4a5c6a' : '#6b7c86' }}>{label}</span>
      <input
        {...input} type={type} value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        className={`w-full bg-transparent outline-none pt-5 pb-2.5 pr-9 text-[1.02rem] text-[#06141b] border-b-[1.5px] border-[#b9c2c4] ${center ? 'tracking-[0.5em] font-mono text-lg' : ''}`}
      />
      <span className="absolute left-0 right-0 bottom-0 h-[2px] origin-left bg-[#253745] transition-transform duration-300" style={{ transform: `scaleX(${focus ? 1 : 0})` }} />
      <span className="absolute right-0 bottom-3 text-[#6b7c86]">{trailing ?? icon}</span>
    </label>
  );
};

/* ───────── decorative cluster for the dark panel (illustrative content) ───────── */
const glassCard = {
  background: 'linear-gradient(145deg, rgb(255 255 255 / 0.18), rgb(255 255 255 / 0.06))',
  border: '1px solid rgb(255 255 255 / 0.22)',
  boxShadow: '0 24px 50px -22px rgba(0,0,0,0.7), inset 0 1px 0 rgb(255 255 255 / 0.25)',
} as const;

const Bob = ({ amp, dur, className, children }: { amp: number; dur: number; className: string; children: ReactNode }) => (
  <motion.div className={`absolute ${className}`} animate={{ y: [0, -amp, 0] }} transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}>{children}</motion.div>
);

const PanelVisual = ({ reset }: { reset: boolean }) => (
  <div className="relative mt-12 h-[17rem] w-full max-w-[25rem] [@media(max-height:780px)]:hidden" aria-hidden>
    {/* faint rings */}
    <div className="absolute -left-10 -top-6 w-[22rem] h-[22rem] rounded-full border border-[#ffffff]/[0.07]" />
    <div className="absolute left-6 top-2 w-[15rem] h-[15rem] rounded-full border border-[#ffffff]/[0.07]" />

    <AnimatePresence mode="wait" initial={false}>
      {!reset ? (
        <motion.div key="a" className="absolute inset-0" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
          <div className="absolute left-0 top-0 w-[16.5rem] rounded-2xl p-4 text-[#ffffff]" style={glassCard}>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium">Weekly operations review</p>
              <span className="text-[10px] font-medium rounded-full bg-[#7fe0c3]/20 text-[#9ff0d6] px-2 py-0.5">Approved</span>
            </div>
            <div className="mt-3 space-y-1.5">
              {['Review of last month’s actions', 'Centre reports'].map((a, i) => (
                <div key={a} className="flex items-center gap-2.5 rounded-lg bg-[#ffffff]/10 px-2.5 py-1.5 text-[11.5px] text-[#ccd0cf]">
                  <span className="w-4 h-4 rounded-full bg-[#ffffff]/15 grid place-items-center text-[9px]">{i + 1}</span>{a}
                </div>
              ))}
            </div>
          </div>

          <Bob amp={6} dur={5.5} className="right-0 top-[7.25rem]">
            <div className="w-[14rem] rounded-2xl p-4 text-[#ffffff] rotate-[3deg]" style={glassCard}>
              <div className="flex items-center justify-between text-[12px]"><span className="font-medium">My tasks</span><span className="text-[#ccd0cf]/80">2 of 3 done</span></div>
              <div className="mt-2.5 h-1.5 rounded-full bg-[#ffffff]/15 overflow-hidden"><div className="h-full w-2/3 rounded-full bg-[#ccd0cf]" /></div>
              <div className="mt-3 flex items-center gap-2 text-[11.5px] text-[#ccd0cf]"><span className="w-3.5 h-3.5 rounded-full bg-[#ccd0cf] text-[#06141b] grid place-items-center">{Icon.check(8)}</span><span className="line-through opacity-70">Circulate the calendar</span></div>
            </div>
          </Bob>

          <Bob amp={5} dur={4.5} className="left-4 bottom-0">
            <div className="flex items-center gap-2.5 rounded-full pl-2 pr-4 py-2 text-[#06141b] bg-[#ccd0cf] shadow-[0_18px_34px_-14px_rgba(0,0,0,0.7)]">
              <span className="w-6 h-6 rounded-full bg-[#06141b] text-[#ccd0cf] grid place-items-center">{Icon.tasks(12)}</span>
              <span className="text-[12.5px] font-semibold">3 tasks created</span>
            </div>
          </Bob>
        </motion.div>
      ) : (
        <motion.div key="b" className="absolute inset-0" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
          <div className="absolute left-0 top-0 w-[17rem] rounded-2xl p-4 text-[#ffffff]" style={glassCard}>
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-[#ccd0cf] text-[#06141b] grid place-items-center"><MailIcon /></span>
              <div><p className="text-[13px] font-medium">Check your inbox</p><p className="text-[11px] text-[#ccd0cf]/70">A six-digit code is on its way</p></div>
            </div>
            <div className="mt-4 flex gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="flex-1 h-9 rounded-lg bg-[#ffffff]/10 border border-[#ffffff]/15 grid place-items-center text-sm text-[#ccd0cf]/60">•</span>)}
            </div>
          </div>
          <Bob amp={6} dur={5} className="right-0 top-[6.25rem]">
            <div className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-[#ffffff] rotate-[3deg]" style={glassCard}>
              <span className="w-8 h-8 rounded-full bg-[#ccd0cf] text-[#06141b] grid place-items-center"><KeyIcon /></span>
              <span className="text-[12.5px] font-medium">Choose a new password</span>
            </div>
          </Bob>
          <Bob amp={5} dur={4.2} className="left-4 bottom-0">
            <div className="flex items-center gap-2.5 rounded-full pl-2 pr-4 py-2 text-[#06141b] bg-[#ccd0cf] shadow-[0_18px_34px_-14px_rgba(0,0,0,0.7)]">
              <span className="w-6 h-6 rounded-full bg-[#06141b] text-[#ccd0cf] grid place-items-center">{Icon.check(12)}</span>
              <span className="text-[12.5px] font-semibold">Almost there</span>
            </div>
          </Bob>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

/* ───────── page ───────── */
export const SignInPage = ({ onSuccess, onClose }: { onSuccess: () => void; onClose?: () => void }) => {
  const t = useT();
  const { login } = useAuth();
  const wide = useWide();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!onClose) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const side: 'right' | 'left' = mode === 'signin' ? 'right' : 'left';

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e: any) { setError(e?.message || 'Something went wrong'); } finally { setBusy(false); }
  };
  const go = (m: Mode) => { setMode(m); setError(''); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') run(async () => { await login(email, password); onSuccess(); });
    if (mode === 'forgot') run(async () => { await requestForgotPasswordOtp(email); setMode('otp'); });
    if (mode === 'otp') run(async () => { const r = await verifyForgotPasswordOtp(email, otp); setToken(r.token); setPassword(''); setMode('reset'); });
    if (mode === 'reset') run(async () => { await resetForgotPassword({ token, newPassword: password }); setMode('done'); });
  };

  const heading: Record<Mode, string> = { signin: 'Sign in', forgot: 'Reset password', otp: 'Check your inbox', reset: 'New password', done: 'All set' };
  const sub: Record<Mode, string> = {
    signin: '', forgot: 'Enter your email and we’ll send a 6-digit code.', otp: `We sent a code to ${email || 'your email'}.`,
    reset: 'Use 8 characters or more.', done: 'Your password was updated. You can sign in now.',
  };
  const cta: Record<Mode, string> = { signin: 'Sign in', forgot: 'Send code', otp: 'Verify code', reset: 'Update password', done: 'Back to sign in' };

  const message = mode === 'signin'
    ? { top: 'Welcome', em: 'back.', text: 'Your meetings, your tasks and your daily log are exactly where you left them.' }
    : { top: 'Reset your', em: 'password.', text: 'We’ll email a six-digit code, then you choose a new password and carry on.' };

  const form = (
    <form onSubmit={submit} className="w-full max-w-[26rem]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={mode} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28 }}>
          <h2 className="text-[1.75rem] font-semibold tracking-tight text-[#06141b]">{heading[mode]}</h2>
          <span className="block mt-2 h-[3px] w-14 rounded-full bg-[#253745]" />
          {sub[mode] && <p className="mt-4 text-[15px] text-[#4a5c6a] leading-relaxed">{sub[mode]}</p>}

          <div className="mt-6 space-y-5">
            {(mode === 'signin' || mode === 'forgot') && (
              <UnderField label={mode === 'signin' ? 'Email address' : 'Email address'} type="email" value={email} onChange={setEmail} icon={mode === 'signin' ? <UserIcon /> : <MailIcon />} autoFocus required autoComplete="email" />
            )}
            {mode === 'signin' && (
              <UnderField label="Password" type={show ? 'text' : 'password'} value={password} onChange={setPassword} required autoComplete="current-password"
                trailing={<button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="hover:text-[#06141b] transition-colors"><EyeIcon off={show} /></button>} />
            )}
            {mode === 'otp' && <UnderField label="6-digit code" value={otp} onChange={(v) => setOtp(v.replace(/\D/g, ''))} icon={<KeyIcon />} autoFocus required maxLength={6} inputMode="numeric" center />}
            {mode === 'reset' && (
              <UnderField label="New password" type={show ? 'text' : 'password'} value={password} onChange={setPassword} autoFocus required minLength={8}
                trailing={<button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="hover:text-[#06141b] transition-colors"><EyeIcon off={show} /></button>} />
            )}
          </div>

          {mode === 'signin' && (
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => go('forgot')} className="text-sm font-medium text-[#06141b] border-b-2 border-[#9ba8ab] hover:border-[#253745] transition-colors">Forgot password?</button>
            </div>
          )}

          {error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-sm text-[#b3394a]">{error}</motion.p>}

          <motion.button
            type={mode === 'done' ? 'button' : 'submit'} onClick={mode === 'done' ? () => { setPassword(''); go('signin'); } : undefined}
            whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} disabled={busy}
            className="mt-7 w-full rounded-full py-4 text-[1.02rem] font-semibold text-[#ffffff] disabled:opacity-70"
            style={{ background: 'linear-gradient(180deg,#2c4252,#11212d)', boxShadow: '0 18px 30px -14px rgba(17,33,45,0.75), inset 0 1px 0 rgb(255 255 255 / 0.12)' }}>
            {busy ? 'Please wait…' : cta[mode]}
          </motion.button>

          <p className="mt-5 text-[15px] text-[#4a5c6a]">
            {mode === 'signin'
              ? <>{t('signin.newTo')} <span className="font-semibold text-[#06141b] border-b-2 border-[#9ba8ab]">{t('signin.ask')}</span></>
              : mode !== 'done' && <>Remembered it? <button type="button" onClick={() => go('signin')} className="font-semibold text-[#06141b] border-b-2 border-[#9ba8ab] hover:border-[#253745] transition-colors">Sign in</button></>}
          </p>
        </motion.div>
      </AnimatePresence>
    </form>
  );

  const panelText = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={mode === 'signin' ? 'a' : 'b'} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
        <p className="text-[12px] font-semibold tracking-[0.35em] text-[#ccd0cf]/80">MINUTEDESK</p>
        <h1 className="mt-5 text-[#ffffff] text-5xl lg:text-[3.4rem] leading-[1.02]" style={serif}>
          {message.top}<br /><em className="text-[#ccd0cf]">{message.em}</em>
        </h1>
        <p className="mt-6 max-w-[22rem] text-[1.02rem] leading-relaxed text-[#ccd0cf]/70">{message.text}</p>
      </motion.div>
    </AnimatePresence>
  );

  const panelBg = 'radial-gradient(60% 50% at 85% 10%, rgb(74 92 106 / 0.55), transparent 70%), linear-gradient(135deg,#1b2f40 0%,#0e202c 50%,#06141b 100%)';

  return (
    <div className="fixed inset-0 z-[150] overflow-auto font-sans" style={{ background: 'linear-gradient(135deg,#fbfcfc,#eef0f0)', color: INK }}>
      {onClose && (
        <button onClick={onClose} className={`absolute top-5 z-30 text-sm font-medium transition-colors ${wide ? (side === 'right' ? 'left-7 text-[#4a5c6a] hover:text-[#06141b]' : 'right-7 text-[#4a5c6a] hover:text-[#06141b]') : 'right-5 text-[#ffffff]/80 hover:text-[#ffffff]'}`}>
          {wide ? '← Back to site' : 'Close ✕'}
        </button>
      )}

      {wide ? (
        <div className="relative h-full min-h-[36rem] overflow-hidden">
          {/* form side */}
          <motion.div className="absolute top-0 bottom-0 w-[40%] flex items-center justify-center" initial={false} animate={{ left: side === 'right' ? '4%' : '56%' }} transition={{ duration: 0.9, ease }}>
            {form}
          </motion.div>

          {/* accent edge + dark panel */}
          <motion.div aria-hidden className="absolute inset-0" style={{ background: ACCENT }} initial={false} animate={{ clipPath: CLIP_EDGE[side] }} transition={{ duration: 0.9, ease }} />
          <motion.div className="absolute inset-0" style={{ background: panelBg }} initial={false} animate={{ clipPath: CLIP[side] }} transition={{ duration: 0.9, ease }}>
            <motion.div className="absolute inset-y-0 w-[34%] flex flex-col justify-center" initial={false} animate={{ left: side === 'right' ? '60%' : '7%' }} transition={{ duration: 0.9, ease }}>
              {panelText}
              <PanelVisual reset={side === 'left'} />
            </motion.div>
          </motion.div>
        </div>
      ) : (
        <div className="min-h-full flex flex-col">
          <div className="px-7 pt-16 pb-14" style={{ background: panelBg }}>{panelText}</div>
          <div className="flex-1 -mt-6 rounded-t-[1.75rem] px-7 pt-9 pb-10 flex justify-center" style={{ background: 'linear-gradient(135deg,#fbfcfc,#eef0f0)' }}>{form}</div>
        </div>
      )}
    </div>
  );
};
