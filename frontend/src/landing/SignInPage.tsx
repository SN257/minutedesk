import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { useT } from '../lib/siteConfig';
import { useBranding } from '../lib/branding';
import { Icon } from '../shell/icons';
import { requestForgotPasswordOtp, resetForgotPassword, verifyForgotPasswordOtp } from '../lib/api';
import { ArrowSwap } from './arrow';

type Mode = 'signin' | 'forgot' | 'otp' | 'reset' | 'done';

const ease = [0.22, 1, 0.36, 1] as const;
const INK = '#06141b';

const useWide = () => {
  const q = '(min-width: 900px)';
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
const LockIcon = () => <Svg><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></Svg>;
const EyeIcon = ({ off }: { off?: boolean }) => (
  <Svg><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" />{off && <path d="m4 4 16 16" />}</Svg>
);

/* ───────── boxed field with a floating label ───────── */
const Field = ({ label, value, onChange, type = 'text', icon, trailing, center, ...rest }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; icon: ReactNode; trailing?: ReactNode;
  autoFocus?: boolean; required?: boolean; minLength?: number; maxLength?: number; inputMode?: 'numeric'; autoComplete?: string; center?: boolean;
}) => {
  const [focus, setFocus] = useState(false);
  const lifted = focus || value.length > 0;
  return (
    <label className={`group relative flex items-center h-[3.7rem] rounded-2xl border bg-[rgba(255,255,255,0.6)] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_16px_-10px_rgba(6,20,27,0.25)] transition-all duration-300 ${focus ? 'border-[#253745] shadow-[0_0_0_4px_rgba(37,55,69,0.14)]' : 'border-[rgba(6,20,27,0.12)] hover:border-[rgba(6,20,27,0.3)]'}`}>
      <span className={`pl-4 transition-colors duration-300 ${focus ? 'text-[#253745]' : 'text-[#6b7c86]'}`}>{icon}</span>
      <span className="relative flex-1 h-full">
        <span className={`absolute left-3 pointer-events-none transition-all duration-200 ${lifted ? 'top-2 text-[11px] font-semibold tracking-wide' : 'top-[1.1rem] text-[15px]'}`} style={{ color: focus ? '#253745' : '#6b7c86' }}>{label}</span>
        <input
          {...rest} type={type} value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          className={`w-full h-full bg-transparent outline-none pl-3 pr-2 pt-5 text-[15.5px] text-[#06141b] ${center ? 'tracking-[0.5em] font-mono text-lg' : ''}`}
        />
      </span>
      {trailing && <span className="pr-3 text-[#6b7c86]">{trailing}</span>}
    </label>
  );
};

/* ───────── page ───────── */
export const SignInPage = ({ onSuccess, onClose }: { onSuccess: () => void; onClose?: () => void }) => {
  const t = useT();
  const brand = useBranding();
  const { login } = useAuth();
  const wide = useWide();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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

  const reset = mode !== 'signin';

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); } catch (e: any) { setError(e?.message || 'Something went wrong'); } finally { setBusy(false); }
  };
  const go = (m: Mode) => { setMode(m); setError(''); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') run(async () => { await login(email, password); onSuccess(); });
    if (mode === 'forgot') run(async () => { await requestForgotPasswordOtp(email); setMode('otp'); });
    if (mode === 'otp') run(async () => { const r = await verifyForgotPasswordOtp(email, otp); setToken(r.token); setPassword(''); setConfirm(''); setMode('reset'); });
    if (mode === 'reset' && password !== confirm) { setError('The two passwords don’t match.'); return; }
    if (mode === 'reset') run(async () => { await resetForgotPassword({ token, newPassword: password }); setMode('done'); });
  };

  const heading: Record<Mode, string> = { signin: 'Sign in', forgot: 'Reset password', otp: 'Check your inbox', reset: 'New password', done: 'All set' };
  const sub: Record<Mode, string> = {
    signin: 'Pick up right where you left off.', forgot: 'Enter your email and we’ll send a 6-digit code.', otp: `We sent a code to ${email || 'your email'}.`,
    reset: 'Use 8 characters or more, and type it twice.', done: 'Your password was updated. You can sign in now.',
  };
  const cta: Record<Mode, string> = { signin: 'Sign in', forgot: 'Send code', otp: 'Verify code', reset: 'Update password', done: 'Back to sign in' };

  const message = mode === 'signin'
    ? { top: 'Welcome', em: 'back.', text: 'Your meetings, your tasks and your daily log are exactly where you left them.' }
    : { top: 'Reset your', em: 'password.', text: 'We’ll email a six-digit code, then you choose a new password and carry on.' };

  const eye = (
    <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="grid place-items-center w-8 h-8 rounded-full hover:bg-[rgba(6,20,27,0.06)] hover:text-[#06141b] transition-colors"><EyeIcon off={show} /></button>
  );

  const stagger = (i: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.08 + i * 0.07, duration: 0.5, ease } });

  const form = (
    <form onSubmit={submit} className="w-full max-w-[25rem]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={mode} exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}>
          <motion.div {...stagger(0)} className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl grid place-items-center overflow-hidden text-[17px] font-semibold text-[#ffffff]" style={{ background: 'linear-gradient(145deg,#253745,#06141b)' }}>
              {brand.logoUrl ? <img src={brand.logoUrl} alt="" className="w-full h-full object-cover" /> : brand.siteName.charAt(0).toUpperCase()}
            </span>
            <span className="text-[15px] font-semibold text-[#06141b] truncate">{brand.siteName}</span>
          </motion.div>
          <motion.h2 {...stagger(1)} className="mt-8 text-[2.1rem] leading-tight font-semibold tracking-[-0.025em] text-[#06141b]">{heading[mode]}</motion.h2>
          <motion.p {...stagger(2)} className="mt-2 text-[15px] text-[#4a5c6a] leading-relaxed break-words">{sub[mode]}</motion.p>

          <div className="mt-7 space-y-3.5">
            {(mode === 'signin' || mode === 'forgot') && (
              <motion.div {...stagger(3)}><Field label="Email address" type="email" value={email} onChange={setEmail} icon={mode === 'signin' ? <UserIcon /> : <MailIcon />} autoFocus required autoComplete="email" /></motion.div>
            )}
            {mode === 'signin' && (
              <motion.div {...stagger(4)}><Field label="Password" type={show ? 'text' : 'password'} value={password} onChange={setPassword} icon={<LockIcon />} required autoComplete="current-password" trailing={eye} /></motion.div>
            )}
            {mode === 'otp' && <motion.div {...stagger(3)}><Field label="6-digit code" value={otp} onChange={(v) => setOtp(v.replace(/\D/g, ''))} icon={<KeyIcon />} autoFocus required maxLength={6} inputMode="numeric" center /></motion.div>}
            {mode === 'reset' && (
              <motion.div {...stagger(3)}><Field label="New password" type={show ? 'text' : 'password'} value={password} onChange={setPassword} icon={<LockIcon />} autoFocus required minLength={8} trailing={eye} /></motion.div>
            )}
            {mode === 'reset' && (
              <motion.div {...stagger(4)}><Field label="Confirm new password" type={show ? 'text' : 'password'} value={confirm} onChange={setConfirm} icon={<LockIcon />} required minLength={8} autoComplete="new-password" />{confirm.length > 0 && confirm !== password && <p role="alert" className="mt-2 text-[13px] font-medium text-[#b3394a]">The two passwords don’t match.</p>}</motion.div>
            )}
          </div>

          {mode === 'signin' && (
            <motion.div {...stagger(5)} className="mt-4 flex justify-end">
              <button type="button" onClick={() => go('forgot')} className="text-sm font-medium text-[#253745] hover:text-[#06141b] transition-colors">Forgot password?</button>
            </motion.div>
          )}

          {error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl bg-[#fbe9ec] px-4 py-3 text-sm text-[#b3394a] break-words">{error}</motion.p>}

          <motion.div {...stagger(6)}>
            <motion.button
              type={mode === 'done' ? 'button' : 'submit'} onClick={mode === 'done' ? () => { setPassword(''); setConfirm(''); go('signin'); } : undefined}
              whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} disabled={busy || (mode === 'reset' && (!password || password !== confirm))}
              className="btn-shine group mt-6 w-full inline-flex items-center justify-center gap-2.5 rounded-2xl h-14 text-[16px] font-semibold text-[#ffffff] disabled:opacity-70 transition-shadow duration-300 hover:shadow-[0_22px_40px_-14px_rgba(37,55,69,0.55)]"
              style={{ background: 'linear-gradient(180deg,rgba(53,78,94,0.96),rgba(6,20,27,0.97))', border: '1px solid rgba(255,255,255,0.18)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -8px 16px -10px rgba(255,255,255,0.12), 0 18px 32px -16px rgba(6,20,27,0.7)' }}>
              {busy ? 'Please wait…' : <>{cta[mode]} <ArrowSwap size={17} /></>}
            </motion.button>

            <p className="mt-6 text-[15px] text-[#4a5c6a] text-center">
              {mode === 'signin'
                ? <>{t('signin.newTo')} <span className="font-semibold text-[#06141b]">{t('signin.ask')}</span></>
                : mode !== 'done' && <>Remembered it? <button type="button" onClick={() => go('signin')} className="font-semibold text-[#253745] hover:text-[#06141b] transition-colors">Sign in</button></>}
            </p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </form>
  );

  const FEATURES = [
    { icon: Icon.meetings(18), title: 'Meetings & minutes', text: 'Agendas, decisions and lessons recorded in one place.' },
    { icon: Icon.tasks(18), title: 'Follow-up tasks', text: 'Every action point gets an owner and a due date.' },
    { icon: Icon.worklog(18), title: 'Daily work log', text: 'Quick daily updates that roll up into clear reports.' },
  ];
  const STEPS = [['forgot', 'Enter your email'], ['otp', 'Enter the 6-digit code'], ['reset', 'Choose a new password']] as const;
  const stepIdx = Math.max(STEPS.findIndex(([m]) => m === mode), mode === 'done' ? 3 : 0);

  const stage = (
    <div className="max-w-[32rem]">
      <h1 className="text-[#ffffff] font-semibold tracking-[-0.03em] leading-[1.05] text-[2.5rem] lg:text-[clamp(2.6rem,4.2vw,3.8rem)]">
        {message.top}<br /><span className="text-[#9ba8ab]">{message.em}</span>
      </h1>
      <p className="mt-5 text-[1.02rem] leading-relaxed text-[#a9b9be]">{message.text}</p>

      <ul className="mt-9 space-y-3">
        {(reset ? STEPS.map(([, label], i) => ({ key: label, icon: i < stepIdx ? Icon.check(18) : <span className="text-[13px] font-semibold">{i + 1}</span>, title: label, text: '', on: i === stepIdx, done: i < stepIdx })) : FEATURES.map((f) => ({ key: f.title, icon: f.icon, title: f.title, text: f.text, on: false, done: false }))).map((f) => (
          <li key={f.key} className={`flex items-center gap-4 rounded-[1.4rem] border px-4 py-3.5 transition-colors duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(255,255,255,0.06),0_18px_40px_-24px_rgba(0,0,0,0.7)] backdrop-blur-md ${f.on ? 'border-[rgba(255,255,255,0.45)] bg-[linear-gradient(145deg,rgba(255,255,255,0.28),rgba(255,255,255,0.08))]' : 'border-[rgba(255,255,255,0.2)] bg-[linear-gradient(145deg,rgba(255,255,255,0.15),rgba(255,255,255,0.04))]'}`}>
            <span className={`w-10 h-10 shrink-0 rounded-full grid place-items-center border border-[rgba(255,255,255,0.3)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ${f.on || f.done ? 'bg-[rgba(255,255,255,0.85)] text-[#06141b]' : 'bg-[rgba(255,255,255,0.12)] text-[#e8ecec]'}`}>{f.icon}</span>
            <span className="min-w-0">
              <span className="block text-[15px] font-medium text-[#f4f7f7]">{f.title}</span>
              {f.text && <span className="block mt-0.5 text-[13.5px] leading-snug text-[#9ba8ab]">{f.text}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  const stageBg = 'radial-gradient(55% 50% at 12% 8%, rgb(110 130 145 / 0.45), transparent 70%), radial-gradient(45% 45% at 78% 88%, rgb(155 168 171 / 0.35), transparent 70%), radial-gradient(40% 40% at 92% 12%, rgb(74 92 106 / 0.6), transparent 70%), linear-gradient(160deg,#1b2f40 0%,#0e202c 50%,#06141b 100%)';

  return (
    <div className="fixed inset-0 z-[150] overflow-auto font-sans" style={{ background: stageBg, color: INK }}>
      {onClose && (
        <button onClick={onClose} className="absolute top-5 left-5 sm:left-8 z-30 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-[#e8ecec] bg-[linear-gradient(145deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05))] border border-[rgba(255,255,255,0.25)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md hover:bg-[rgba(255,255,255,0.22)] transition-colors">
          <span className="inline-block rotate-180"><ArrowSwap size={14} /></span> {wide ? 'Back to site' : 'Back'}
        </button>
      )}

      {wide ? (
        <div className="relative h-full min-h-[40rem] flex">
          <div className="flex-1 min-w-0 flex flex-col justify-center pl-[6vw] pr-10 py-24">{stage}</div>
          <div className="relative w-[min(40%,36rem)] min-w-[26rem] shrink-0 flex items-center justify-center px-10 rounded-l-[2.75rem] overflow-y-auto"
            style={{ background: 'linear-gradient(160deg,rgba(255,255,255,0.95),rgba(238,243,245,0.88))', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderLeft: '1px solid rgba(255,255,255,0.75)', borderTop: '1px solid rgba(255,255,255,0.75)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), -30px 0 60px -30px rgba(0,0,0,0.5)' }}>
            <div className="py-10 w-full flex justify-center">{form}</div>
          </div>
        </div>
      ) : (
        <div className="relative min-h-full flex flex-col">
          <div className="px-6 pt-20 pb-12">
            <h1 className="text-[#ffffff] font-semibold tracking-[-0.03em] leading-[1.05] text-[2.4rem]">{message.top} <span className="text-[#9ba8ab]">{message.em}</span></h1>
            <p className="mt-4 text-[1rem] leading-relaxed text-[#a9b9be]">{message.text}</p>
          </div>
          <div className="flex-1 rounded-t-[2rem] px-6 pt-9 pb-10 flex justify-center" style={{ background: 'linear-gradient(160deg,rgba(255,255,255,0.95),rgba(238,243,245,0.9))', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)' }}>{form}</div>
        </div>
      )}
    </div>
  );
};
