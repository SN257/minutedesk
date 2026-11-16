import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { View, ViewProps } from '../../lib/nav';
import { navigatePath } from '../../lib/nav';
import { shortcut } from '../../lib/platform';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { spring } from '../../lib/motion';
import { formatLocalDate, getLocalDateString, getUserTimeZone } from '../../lib/date';
import { usePrefs, applyTheme, type Prefs } from '../../lib/prefs';
import { formatClock } from '../../lib/formats';
import { changeUserPassword, getMeetings, getTasks, logout, requestProfilePasswordOtp, updateUserProfile, updateUserTimezone, verifyProfilePasswordOtp } from '../../lib/api';
import { Icon } from '../../shell/icons';
import { Avatar, Badge, Button, Field, Input } from '../../ui';
import { ConfirmModal } from '../admin/shared';
import { Switch } from '../admin/setup/ListEditor';
import { downloadCsv } from '../reports/csv';

type Tab = 'profile' | 'appearance' | 'notifications' | 'regional' | 'security' | 'data';

const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/* ───────── Small building blocks ───────── */
/** A glass card with a heading and a plain sentence. */
const Panel = ({ title, desc, children, right }: { title: string; desc?: string; children: ReactNode; right?: ReactNode }) => (
  <section className="liquid rounded-[1.75rem] p-6 sm:p-7">
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="min-w-0">
        <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
        {desc && <p className="text-[15px] text-muted mt-1 max-w-xl">{desc}</p>}
      </div>
      {right}
    </div>
    {children}
  </section>
);

/** A big selectable tile. */
const Choice = ({ on, onClick, children, label, className = '' }: { on: boolean; onClick: () => void; children?: ReactNode; label: string; className?: string }) => (
  <button type="button" role="radio" aria-checked={on} onClick={onClick} className={`relative block w-full text-left rounded-[1.4rem] border-2 p-3 sm:p-4 transition-all ${on ? 'border-ink bg-white/70 shadow-card' : 'border-white/70 bg-white/40 hover:bg-white/60'} ${className}`}>
    {children}
    <span className="block text-[15px] font-extrabold mt-2">{label}</span>
    <span aria-hidden className={`absolute top-3 right-3 w-5 h-5 rounded-full grid place-items-center text-white transition-all ${on ? 'bg-ink scale-100' : 'bg-ink/10 scale-90'}`}>{on && <span className="scale-75">{Icon.check(14)}</span>}</span>
  </button>
);

const SwitchRow = ({ icon, title, desc, on, onChange }: { icon: ReactNode; title: string; desc: string; on: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
    <span className="w-11 h-11 rounded-2xl bg-ink/[0.07] text-ink-2 grid place-items-center shrink-0">{icon}</span>
    <div className="min-w-0 flex-1"><p className="text-[15px] font-bold">{title}</p><p className="text-sm text-muted">{desc}</p></div>
    <Switch on={on} onChange={onChange} label={title} />
  </div>
);

/* ───────── Profile ───────── */
const ProfileSection = () => {
  const { user, can, isAdmin } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = name.trim() !== (user?.name || '') || email.trim() !== (user?.email || '');
  const valid = name.trim().length > 0 && /^\S+@\S+\.\S+$/.test(email.trim());
  const pages = isAdmin ? 'Every page, plus Admin' : (['today', 'meetings', 'tasks', 'worklog', 'reports'] as const).filter((p) => can(p)).length === 5 ? 'Every page' : (['today', 'meetings', 'tasks', 'worklog', 'reports'] as const).filter((p) => can(p)).join(', ') || 'Settings only';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!dirty || !valid) return;
    setSaving(true);
    try {
      await updateUserProfile({ name: name.trim(), email: email.trim() });
      setSaved(true);
      toast('Profile updated');
      // The auth context has no refresh, so reload to pick up the new details.
      setTimeout(() => window.location.reload(), 700);
    } catch (err) {
      toast(errMsg(err, "Couldn't update your profile."), 'error');
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-3 sm:gap-5 items-start">
      <div className="lg:col-span-3"><Panel title="Your details" desc="This is how you appear to your teammates.">
        <form onSubmit={submit} className="space-y-5">
          <Field label="Full name"><Input className="!py-3 !text-[15px] !rounded-2xl" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" /></Field>
          <Field label="Email" hint="We send sign-in codes and reminders here."><Input className="!py-3 !text-[15px] !rounded-2xl" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></Field>
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" className="!rounded-full" loading={saving} disabled={!dirty || !valid}>Save changes</Button>
            <AnimatePresence>
              {saved && <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-sm font-semibold text-good flex items-center gap-1.5">{Icon.check(16)} Saved</motion.span>}
            </AnimatePresence>
          </div>
        </form>
      </Panel></div>
      <div className="lg:col-span-2"><Panel title="Account">
        <dl className="space-y-4 text-[15px]">
          <div className="flex items-center justify-between gap-3"><dt className="text-muted">Role</dt><dd>{user?.role === 'super_admin' ? <Badge tone="dark">Super admin</Badge> : <Badge>Member</Badge>}</dd></div>
          <div className="flex items-start justify-between gap-3"><dt className="text-muted shrink-0">Access</dt><dd className="font-bold text-right">{pages}</dd></div>
          <div className="flex items-center justify-between gap-3"><dt className="text-muted">Sign-in email</dt><dd className="font-bold truncate">{user?.email}</dd></div>
        </dl>
      </Panel></div>
    </div>
  );
};

/* ───────── Appearance ───────── */
const THEME_PREVIEW: Record<string, string> = {
  light: 'linear-gradient(135deg,#f4f6f6,#d9dfe0)',
  dark: 'linear-gradient(135deg,#17293a,#06141b)',
  auto: 'linear-gradient(110deg,#f4f6f6 0 50%,#17293a 50% 100%)',
};

const PAGE_LABELS: { key: View; label: string; hint: string }[] = [
  { key: 'today', label: 'Dashboard', hint: 'Your day at a glance' },
  { key: 'meetings', label: 'Meetings', hint: 'Minutes and schedule' },
  { key: 'tasks', label: 'Tasks', hint: 'Lists and boards' },
  { key: 'worklog', label: 'Work log', hint: 'Daily wrap-up' },
  { key: 'reports', label: 'Insights', hint: 'Your numbers' },
];

const AppearanceSection = () => {
  const { prefs, update } = usePrefs();
  const { can } = useAuth();
  const a = prefs.appearance;
  const set = (p: Partial<Prefs['appearance']>) => update((x) => ({ ...x, appearance: { ...x.appearance, ...p } }));
  const theme = a.theme ?? (localStorage.getItem('md_theme') === 'dark' ? 'dark' : 'light');
  return (
    <div className="space-y-3 sm:space-y-5">
      <Panel title="Theme" desc="Light, dark, or follow your device.">
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3 sm:gap-4">
          {([['light', 'Light'], ['dark', 'Dark'], ['auto', 'Auto']] as const).map(([k, l]) => (
            <Choice key={k} on={theme === k} label={l} onClick={() => { set({ theme: k }); applyTheme(k); }}>
              <span className="block w-full h-16 sm:h-20 rounded-xl border border-black/10 relative overflow-hidden" style={{ background: THEME_PREVIEW[k] }}>
                <span className="absolute left-2 top-2 w-6 h-2 rounded-full bg-black/25" /><span className="absolute left-2 top-6 right-8 h-8 rounded-lg bg-white/50" />
              </span>
            </Choice>
          ))}
        </div>
      </Panel>

      <div className="grid md:grid-cols-2 gap-3 sm:gap-5">
        <Panel title="Text size" desc="Makes everything larger or smaller.">
          <div role="radiogroup" aria-label="Text size" className="grid grid-cols-3 gap-3">
            {([['sm', 'Compact', 'text-base'], ['md', 'Standard', 'text-xl'], ['lg', 'Large', 'text-3xl']] as const).map(([k, l, c]) => (
              <Choice key={k} on={(a.textSize ?? 'md') === k} label={l} onClick={() => set({ textSize: k })}><span className={`block font-extrabold leading-none h-9 ${c}`}>Aa</span></Choice>
            ))}
          </div>
        </Panel>
        <Panel title="Motion" desc="Turn animations down if they distract you.">
          <SwitchRow icon={Icon.today(20)} title="Reduce motion" desc="Fewer slides, springs and glows." on={!!a.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
        </Panel>
      </div>

      <Panel title="Open on" desc="The page you land on when you open the app.">
        <div role="radiogroup" aria-label="Start page" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {PAGE_LABELS.filter((p) => can(p.key as any)).map((p) => (
            <Choice key={p.key} on={(a.startPage && can(a.startPage as any) ? a.startPage : (PAGE_LABELS.find((x) => can(x.key as any))?.key ?? 'today')) === p.key} label={p.label} onClick={() => set({ startPage: p.key })}><span className="block text-xs text-muted">{p.hint}</span></Choice>
          ))}
        </div>
      </Panel>
    </div>
  );
};

/* ───────── Notifications ───────── */
/** Which page each reminder belongs to; announcements (no page) are for everyone. */
const NOTIFY_PAGE: Record<string, string | undefined> = { meeting_reminder: 'meetings', work_log_reminder: 'worklog', missed_work_log: 'worklog', due_date_alert: 'tasks', task_overdue: 'tasks', task_assigned: 'tasks' };
const NOTIFY: { key: string; title: string; desc: string; icon: ReactNode }[] = [
  { key: 'meeting_reminder', title: 'Meetings starting soon', desc: 'A nudge 15 minutes before a meeting begins.', icon: Icon.meetings(20) },
  { key: 'work_log_reminder', title: 'Daily work-log reminder', desc: 'A morning reminder to write your log.', icon: Icon.worklog(20) },
  { key: 'missed_work_log', title: 'Missed work log', desc: 'A note when a day passes without a log.', icon: Icon.bell(20) },
  { key: 'due_date_alert', title: 'Tasks due today', desc: 'A heads-up on the day something is due.', icon: Icon.tasks(20) },
  { key: 'task_overdue', title: 'Overdue tasks', desc: 'A reminder when something slips past its date.', icon: Icon.reports(20) },
  { key: 'task_assigned', title: 'Tasks assigned to you', desc: 'When someone gives you a card or task.', icon: Icon.plus(20) },
  { key: 'admin_broadcast', title: 'Announcements', desc: 'Messages from your administrators.', icon: Icon.admin(20) },
];

const NotificationsSection = () => {
  const { prefs, update } = usePrefs();
  const { can } = useAuth();
  // Only reminders for pages this person can open.
  const items = NOTIFY.filter((n) => { const pg = NOTIFY_PAGE[n.key]; return !pg || can(pg as any); });
  const hasReminders = items.some((n) => NOTIFY_PAGE[n.key]);
  const hour = prefs.reminderHour ?? 7;
  const hours = [5, 6, 7, 8, 9, 10, 11, 12];
  return (
    <div className="space-y-3 sm:space-y-5">
      <Panel title="What to tell me about" desc="Choose which events notify you in the app and by email.">
        <div className="divide-y divide-white/60">
          {items.map((n) => (
            <SwitchRow key={n.key} icon={n.icon} title={n.title} desc={n.desc} on={prefs.notify[n.key] !== false} onChange={(v) => update((p) => ({ ...p, notify: { ...p.notify, [n.key]: v } }))} />
          ))}
        </div>
      </Panel>
      <div className={`grid gap-3 sm:gap-5 ${hasReminders ? 'md:grid-cols-2' : ''}`}>
        <Panel title="Email" desc="Also send these to your inbox.">
          <SwitchRow icon={Icon.bell(20)} title="Email notifications" desc="Turn off to keep everything in the app." on={prefs.email !== false} onChange={(v) => update((p) => ({ ...p, email: v }))} />
        </Panel>
        {hasReminders && <Panel title="Daily reminder time" desc="When your morning reminders arrive, in your own timezone.">
          <div role="radiogroup" aria-label="Reminder time" className="flex flex-wrap gap-2">
            {hours.map((h) => (
              <button key={h} type="button" role="radio" aria-checked={hour === h} onClick={() => update((p) => ({ ...p, reminderHour: h }))} className={`px-4 py-2.5 rounded-full text-[15px] font-bold transition-colors ${hour === h ? 'bg-ink text-white' : 'bg-white/55 border border-white/70 text-muted hover:text-ink'}`}>{formatClock(`${h}:00`) || `${h}:00`}</button>
            ))}
          </div>
        </Panel>}
      </div>
    </div>
  );
};

/* ───────── Regional ───────── */
const RegionalSection = () => {
  const { prefs, update } = usePrefs();
  const toast = useToast();
  const tz = getUserTimeZone();
  const [now, setNow] = useState(new Date());
  const [syncing, setSyncing] = useState(false);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  const r = prefs.regional;
  const set = (p: Partial<Prefs['regional']>) => update((x) => ({ ...x, regional: { ...x.regional, ...p } }));
  const today = getLocalDateString();
  const ex = (loc: string | undefined) => new Date().toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' });
  const sync = async () => { setSyncing(true); try { await updateUserTimezone(tz); toast('Timezone synced to your account.'); } catch { toast("Couldn't sync your timezone.", 'error'); } finally { setSyncing(false); } };
  void today;
  return (
    <div className="space-y-3 sm:space-y-5">
      <Panel title="Timezone" desc="Detected from this device, so dates, reminders and your daily log line up with your day.">
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-2xl bg-white/50 border border-white/70 px-5 py-4 min-w-0">
            <p className="text-xl font-extrabold truncate">{tz.replace(/_/g, ' ')}</p>
            <p className="text-sm text-muted">It’s {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} for you.</p>
          </div>
          <Button variant="soft" className="!rounded-full" loading={syncing} onClick={sync}>Sync to my account</Button>
        </div>
      </Panel>
      <div className="grid md:grid-cols-2 gap-3 sm:gap-5">
        <Panel title="Time format">
          <div role="radiogroup" aria-label="Time format" className="grid grid-cols-2 gap-3">
            {([['24h', '24-hour', '15:30'], ['12h', '12-hour', '3:30 PM']] as const).map(([k, l, e]) => <Choice key={k} on={(r.timeFormat ?? '24h') === k} label={l} onClick={() => set({ timeFormat: k })}><span className="block text-2xl font-extrabold tabular-nums">{e}</span></Choice>)}
          </div>
        </Panel>
        <Panel title="Week starts on">
          <div role="radiogroup" aria-label="Week start" className="grid grid-cols-2 gap-3">
            {([[1, 'Monday', 'M T W T F S S'], [0, 'Sunday', 'S M T W T F S']] as const).map(([k, l, e]) => <Choice key={k} on={(r.weekStart ?? 0) === k} label={l} onClick={() => set({ weekStart: k })}><span className="block text-sm font-extrabold tracking-[0.2em] text-muted">{e}</span></Choice>)}
          </div>
        </Panel>
      </div>
      <Panel title="Date format" desc="The order dates are written in.">
        <div role="radiogroup" aria-label="Date format" className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([[undefined, 'Browser default', ex(undefined)], ['dmy', 'Day first', ex('en-GB')], ['mdy', 'Month first', ex('en-US')], ['ymd', 'Year first', ex('en-CA')]] as const).map(([k, l, e]) => <Choice key={l} on={r.dateFormat === k} label={l} onClick={() => set({ dateFormat: k })}><span className="block text-sm font-bold text-muted">{e}</span></Choice>)}
        </div>
        <p className="text-sm text-muted mt-4">Example: {formatLocalDate(getLocalDateString(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </Panel>
    </div>
  );
};

/* ───────── Security: 3-step password change ───────── */
const STEPS = [
  { label: 'Send code', icon: 'M4 6h16v12H4zM4 7l8 6 8-6' },
  { label: 'Verify', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4' },
  { label: 'New password', icon: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3' },
];

const Ico = ({ d, size = 22 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

const Stepper = ({ step }: { step: number }) => (
  <ol className="flex items-start w-full" aria-label="Progress">
    {STEPS.map((st, i) => {
      const done = step > i, active = step === i;
      return (
        <li key={st.label} className={`flex items-start ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
          <div className="flex flex-col items-center gap-2 w-24 shrink-0">
            <motion.span animate={{ scale: active ? 1.08 : 1 }} transition={spring} className={`w-12 h-12 rounded-2xl grid place-items-center transition-colors ${done || active ? 'bg-ink text-white' : 'bg-ink/[0.08] text-muted'}`}>
              {done ? Icon.check(20) : <Ico d={st.icon} size={20} />}
            </motion.span>
            <span className={`text-sm font-bold text-center ${active || done ? 'text-ink' : 'text-muted'}`}>{st.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <span className="flex-1 h-1 rounded-full bg-ink/10 mt-[1.35rem] -mx-3 overflow-hidden"><motion.span className="block h-full bg-ink rounded-full" initial={false} animate={{ width: done ? '100%' : '0%' }} transition={{ duration: 0.4 }} /></span>
          )}
        </li>
      );
    })}
  </ol>
);

/** Six boxes for the one-time code. One hidden input keeps paste and autofill working. */
const CodeBoxes = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <label className="relative block cursor-text">
    <span className="flex gap-2 sm:gap-3 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className={`w-11 h-14 sm:w-14 sm:h-16 rounded-2xl grid place-items-center text-2xl font-extrabold tabular-nums border-2 transition-colors ${value.length === i ? 'border-ink bg-white/80' : 'border-white/70 bg-white/55'}`}>{value[i] ?? ''}</span>
      ))}
    </span>
    <input value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label="Verification code" autoFocus className="absolute inset-0 opacity-0 cursor-text" />
  </label>
);

const strength = (pw: string) => {
  let n = 0;
  if (pw.length >= 6) n++;
  if (pw.length >= 10) n++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) n++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) n++;
  return n;
};

const PasswordCard = () => {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);

  const reset = () => { setStep(0); setFinished(false); setOtp(''); setToken(''); setPw(''); setPw2(''); setSentTo(''); };

  const send = async () => {
    setBusy(true);
    try {
      const r = await requestProfilePasswordOtp();
      setSentTo(r.email);
      setStep(1);
      toast('Code sent. Check your email.');
    } catch (e) { toast(errMsg(e, "Couldn't send the code."), 'error'); }
    finally { setBusy(false); }
  };

  const verify = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const r = await verifyProfilePasswordOtp(otp.trim());
      setToken(r.token);
      setStep(2);
      toast('Email verified');
    } catch (err) { toast(errMsg(err, "That code didn't work."), 'error'); }
    finally { setBusy(false); }
  };

  const change = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast('Use at least 6 characters.', 'error');
    if (pw !== pw2) return toast("Those passwords don't match.", 'error');
    setBusy(true);
    try {
      await changeUserPassword({ token, newPassword: pw });
      setFinished(true);
      setStep(3);
      toast('Password updated');
    } catch (err) { toast(errMsg(err, "Couldn't change your password."), 'error'); }
    finally { setBusy(false); }
  };

  const slide = { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 }, transition: { duration: 0.22 } };
  const hero = (d: string, tone = 'bg-ink text-white') => <span className={`w-16 h-16 rounded-[1.4rem] grid place-items-center mx-auto mb-4 ${tone}`}><Ico d={d} size={28} /></span>;
  const s = strength(pw);
  const bars = ['bg-bad', 'bg-warn', 'bg-warn', 'bg-good'];
  const label = ['Too short', 'Okay', 'Good', 'Strong'][Math.max(0, s - 1)];
  const input = 'w-full rounded-2xl bg-white/60 border border-white/70 px-4 py-3.5 text-[15px] outline-none focus:border-brand focus:ring-4 focus:ring-brand/10';

  return (
    <section className="liquid rounded-[1.75rem] p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="w-12 h-12 rounded-2xl bg-ink text-white grid place-items-center shrink-0"><Ico d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={22} /></span>
        <div><h3 className="text-xl font-extrabold tracking-tight">Change your password</h3><p className="text-[15px] text-muted mt-1">For your safety we confirm it’s you with a one-time code first.</p></div>
      </div>

      <div className="mt-7 max-w-xl"><Stepper step={step} /></div>

      <div className="mt-6 rounded-[1.5rem] bg-white/40 border border-white/70 p-6 sm:p-8 min-h-[16rem] grid place-items-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {finished ? (
            <motion.div key="done" {...slide} className="text-center">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} className="w-16 h-16 rounded-[1.4rem] bg-good text-white grid place-items-center mx-auto mb-4">{Icon.check(30)}</motion.span>
              <p className="text-xl font-extrabold">Password updated</p>
              <p className="text-[15px] text-muted mt-1">Use your new password next time you sign in.</p>
              <Button variant="soft" className="!rounded-full mt-5" onClick={reset}>Done</Button>
            </motion.div>
          ) : step === 0 ? (
            <motion.div key="s0" {...slide} className="text-center max-w-sm">
              {hero(STEPS[0].icon)}
              <p className="text-lg font-extrabold">Let’s confirm it’s you</p>
              <p className="text-[15px] text-muted mt-1 mb-5">We’ll email a 6-digit code to the address on your account.</p>
              <Button className="!rounded-full" loading={busy} onClick={send}>Email me a code</Button>
            </motion.div>
          ) : step === 1 ? (
            <motion.form key="s1" {...slide} onSubmit={verify} className="text-center w-full max-w-md">
              {hero(STEPS[1].icon)}
              <p className="text-lg font-extrabold">Enter the code</p>
              <p className="text-[15px] text-muted mt-1 mb-5">We sent it to <b className="text-ink">{sentTo || 'your email'}</b>.</p>
              <CodeBoxes value={otp} onChange={setOtp} />
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button type="submit" className="!rounded-full" loading={busy} disabled={otp.length < 6}>Verify</Button>
                <Button type="button" variant="ghost" className="!rounded-full" onClick={send} disabled={busy}>Send again</Button>
              </div>
            </motion.form>
          ) : (
            <motion.form key="s2" {...slide} onSubmit={change} className="w-full max-w-md space-y-4">
              <div className="text-center">{hero(STEPS[2].icon)}<p className="text-lg font-extrabold">Choose a new password</p></div>
              <label className="block"><span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted mb-2">New password</span>
                <span className="relative block"><input className={`${input} pr-16`} type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoFocus />
                  <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted hover:text-ink">{show ? 'Hide' : 'Show'}</button></span>
              </label>
              {pw && (
                <div>
                  <div className="flex gap-1.5">{[0, 1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < s ? bars[Math.max(0, s - 1)] : 'bg-ink/10'}`} />)}</div>
                  <p className="text-xs text-muted mt-1.5">{label} · at least 6 characters; longer and mixed is stronger.</p>
                </div>
              )}
              <label className="block"><span className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted mb-2">Confirm password</span>
                <input className={input} type={show ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
                {pw2 && pw !== pw2 && <span className="block text-xs text-bad mt-1.5">These don’t match yet.</span>}
              </label>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button type="submit" className="!rounded-full" loading={busy} disabled={!pw || !pw2}>Update password</Button>
                <Button type="button" variant="ghost" className="!rounded-full" onClick={reset} disabled={busy}>Start over</Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

/* ───────── Security ───────── */
const deviceInfo = () => {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'your device';
  return `${browser} on ${os}`;
};

const SecuritySection = () => {
  const { user } = useAuth();
  const [out, setOut] = useState(false);
  const checks = [
    ['Password changes need an email code', 'Nobody can change it without access to your inbox.'],
    ['Password reset by one-time code', 'Forgot it? A 6-digit code gets you back in.'],
    ['Your own data stays yours', 'Tasks, meetings and logs belong to your account.'],
  ];
  return (
    <div className="grid xl:grid-cols-5 gap-3 sm:gap-5 items-start">
      <div className="xl:col-span-3 min-w-0"><PasswordCard /></div>
      <div className="xl:col-span-2 space-y-3 sm:space-y-5 min-w-0">
        <Panel title="How your account is protected">
          <ul className="space-y-4">
            {checks.map(([t, d]) => (
              <li key={t} className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-xl bg-good/15 text-good grid place-items-center shrink-0 mt-0.5">{Icon.check(16)}</span>
                <div className="min-w-0"><p className="text-[15px] font-bold">{t}</p><p className="text-sm text-muted">{d}</p></div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="This device" desc="You are signed in here.">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={user?.name || user?.email} size={48} />
            <div className="min-w-0"><p className="text-[15px] font-bold truncate">{deviceInfo()}</p><p className="text-sm text-muted truncate">{user?.email}</p></div>
          </div>
          <Button variant="soft" className="!rounded-full mt-5" loading={out} onClick={() => { setOut(true); logout().then(() => navigatePath('/')).catch(() => setOut(false)); }}>{Icon.logout(16)} Sign out of this device</Button>
        </Panel>
      </div>
    </div>
  );
};

/* ───────── Data & shortcuts ───────── */
/** Shortcut keys are written for this device: ⌘ on a Mac, Ctrl on Windows and Linux. `page` limits a shortcut to people who can open that page. */
const SHORTCUTS: { keys: string; desc: string; page?: string }[] = [
  { keys: shortcut('K'), desc: 'Open the search and command palette: jump anywhere, create anything' },
  { keys: 'N', desc: 'New task (on the Tasks page)', page: 'tasks' },
  { keys: '/', desc: 'Search tasks (on the Tasks page)', page: 'tasks' },
  { keys: shortcut('S'), desc: 'Save your work log now (in the work-log editor)', page: 'worklog' },
  { keys: shortcut('Enter'), desc: 'Add a new agenda item below (in the meeting editor)', page: 'meetings' },
  { keys: 'Esc', desc: 'Close a pop-up or menu' },
];

const DataSection = () => {
  const toast = useToast();
  const { can } = useAuth();
  const canTasks = can('tasks');
  const canMeetings = can('meetings');
  const [busy, setBusy] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const today = getLocalDateString();

  const exportTasks = async () => {
    setBusy('tasks');
    try {
      const t = await getTasks();
      downloadCsv(`my_tasks_${today}.csv`, [['Title', 'Status', 'Due', 'Completed', 'Completed on'], ...t.map((x: any) => [x.title, x.status, x.dueDate, x.completed ? 'Yes' : 'No', x.completedAt])]);
      toast('Tasks exported');
    } catch { toast("Couldn't export your tasks.", 'error'); } finally { setBusy(null); }
  };
  const exportMeetings = async () => {
    setBusy('meetings');
    try {
      const m = await getMeetings();
      downloadCsv(`my_meetings_${today}.csv`, [['Date', 'Type', 'Center', 'Start', 'End', 'Place'], ...m.map((x: any) => [String(x.date ?? '').slice(0, 10), x.meetingType, x.center, x.startTime, x.endTime, x.place])]);
      toast('Meetings exported');
    } catch { toast("Couldn't export your meetings.", 'error'); } finally { setBusy(null); }
  };
  const clearLocal = () => {
    try { Object.keys(localStorage).filter((k) => k.startsWith('md2.') || k.startsWith('mdv2')).forEach((k) => { if (k !== 'md2.prefs') localStorage.removeItem(k); }); } catch { /* storage unavailable */ }
    setClearOpen(false);
    toast('Local drafts and view choices cleared.');
  };

  return (
    <div className="space-y-3 sm:space-y-5">
      <div className={`grid gap-3 sm:gap-5 ${canTasks || canMeetings ? 'md:grid-cols-2' : ''}`}>
        {(canTasks || canMeetings) && <Panel title="Export my data" desc="Download your own records as spreadsheets.">
          <div className="flex flex-wrap gap-2.5">
            {canTasks && <Button variant="soft" className="!rounded-full" loading={busy === 'tasks'} onClick={exportTasks}>Tasks (CSV)</Button>}
            {canMeetings && <Button variant="soft" className="!rounded-full" loading={busy === 'meetings'} onClick={exportMeetings}>Meetings (CSV)</Button>}
          </div>
        </Panel>}
        <Panel title="Clear local data" desc="Removes saved drafts and view choices stored on this device. Your account data is not touched.">
          <Button variant="soft" className="!rounded-full" onClick={() => setClearOpen(true)}>Clear this device</Button>
        </Panel>
      </div>
      <Panel title="Keyboard shortcuts">
        <ul className="divide-y divide-white/60">
          {SHORTCUTS.filter((x) => !x.page || can(x.page as any)).map(({ keys: k, desc: d }) => (
            <li key={k + d} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <span className="text-[15px]">{d}</span>
              <kbd className="shrink-0 rounded-xl bg-white/60 border border-white/80 px-3 py-1.5 text-sm font-bold font-mono">{k}</kbd>
            </li>
          ))}
        </ul>
      </Panel>
      <ConfirmModal open={clearOpen} title="Clear data on this device?" confirmLabel="Clear" onConfirm={clearLocal} onClose={() => setClearOpen(false)}>
        <p>Unsent meeting drafts, remembered boards and view choices on this device will be removed.</p>
        <p className="text-muted">Your tasks, meetings and logs on the server stay exactly as they are.</p>
      </ConfirmModal>
    </div>
  );
};

/* ───────── view ───────── */
const IC: Record<Tab, string> = {
  profile: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  appearance: 'M12 3a9 9 0 100 18 2 2 0 002-2c0-1-1-1.5-1-2.5S14 15 15 15h2a4 4 0 004-4 8 8 0 00-9-8zM7.5 11h.01M10 7.5h.01M15 8h.01',
  notifications: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  regional: 'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20',
  security: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  data: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
};
const TABS: { key: Tab; label: string; desc: string; title: string; sub: string }[] = [
  { key: 'profile', label: 'Profile', desc: 'Name, email, account', title: 'Profile', sub: 'Who you are in the workspace.' },
  { key: 'appearance', label: 'Appearance', desc: 'Theme, text size, motion', title: 'Appearance', sub: 'Make the app look and feel the way you like.' },
  { key: 'notifications', label: 'Notifications', desc: 'Reminders and email', title: 'Notifications', sub: 'Decide what is worth an interruption.' },
  { key: 'regional', label: 'Regional', desc: 'Timezone, dates, clock', title: 'Regional', sub: 'Time, dates and the start of your week.' },
  { key: 'security', label: 'Security', desc: 'Password and sessions', title: 'Security', sub: 'Keep your account safe.' },
  { key: 'data', label: 'Data & shortcuts', desc: 'Export, shortcuts, reset', title: 'Data & shortcuts', sub: 'Your records, and the quickest ways around.' },
];

const Settings = (_: ViewProps) => {
  const { user } = useAuth();
  const { saving } = usePrefs();
  const [tab, setTab] = useState<Tab>('profile');
  const cur = TABS.find((t) => t.key === tab)!;
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [tab]);
  const body = useMemo(() => ({
    profile: <ProfileSection />, appearance: <AppearanceSection />, notifications: <NotificationsSection />,
    regional: <RegionalSection />, security: <SecuritySection />, data: <DataSection />,
  }), []);
  return (
    <div className="flex flex-col gap-3 sm:gap-6 mt-0 md:-mt-3 md:h-[calc(100dvh-6.25rem)] md:min-h-[30rem]">
      {/* cover */}
      <div className="shrink-0 liquid rounded-[2rem] p-4 sm:p-7 flex items-center gap-3 sm:gap-6 overflow-hidden relative">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 w-64 h-64 rounded-full bg-brand/15 blur-3xl" />
        <span className="relative shrink-0 rounded-full ring-4 ring-white/70 shadow-card"><Avatar name={user?.name || user?.email} size={60} /></span>
        <div className="relative min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-wider text-brand">Settings</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight truncate">{user?.name || 'Your settings'}</h1>
          <p className="text-[15px] text-muted truncate">{user?.email}</p>
        </div>
        <span className="relative hidden sm:inline-flex text-sm font-bold text-muted items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${saving ? 'bg-warn animate-pulse' : 'bg-good'}`} />{saving ? 'Saving…' : 'All changes saved'}
        </span>
      </div>

      <div className="md:flex-1 md:min-h-0 grid md:grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-1 lg:grid-cols-[17.5rem_minmax(0,1fr)] gap-3 sm:gap-6">
        <nav className="liquid rounded-[1.75rem] p-2.5 lg:self-start lg:max-h-full lg:overflow-y-auto scroll-y" aria-label="Settings sections">
          <ul className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible [scrollbar-width:none]">
            {TABS.map((t) => {
              const on = tab === t.key;
              return (
                <li key={t.key} className="shrink-0 lg:shrink">
                  <button type="button" onClick={() => setTab(t.key)} aria-current={on ? 'page' : undefined} className={`relative w-full flex items-center gap-3 rounded-[1.25rem] px-2.5 py-2 lg:px-3.5 lg:py-3 text-left transition-colors ${on ? 'text-white' : 'text-ink hover:bg-white/50'}`}>
                    {on && <motion.span layoutId="settings-rail" transition={spring} className="absolute inset-0 rounded-[1.25rem] bg-ink" />}
                    <span className={`relative w-9 h-9 lg:w-10 lg:h-10 shrink-0 rounded-xl grid place-items-center ${on ? 'bg-white/15' : 'bg-ink/[0.07]'}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={IC[t.key]} /></svg>
                    </span>
                    <span className="relative min-w-0">
                      <span className="block text-[15px] font-extrabold leading-tight whitespace-nowrap">{t.label}</span>
                      <span className={`hidden lg:block text-xs mt-0.5 ${on ? 'text-white/65' : 'text-muted'}`}>{t.desc}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 md:min-h-0 flex flex-col gap-3 sm:gap-6">
          <div className="px-1 shrink-0">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{cur.title}</h2>
            <p className="text-base text-muted mt-1.5">{cur.sub}</p>
          </div>
          <div ref={scroller} className="md:flex-1 md:min-h-0 md:overflow-y-auto scroll-y md:pr-1 pb-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {body[tab]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
