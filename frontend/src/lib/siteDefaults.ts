/* Built-in website content. Setup can override any of it; whatever is not overridden falls back to this. */
export interface Problem { h: string; t: string }
export interface ModuleItem { id: string; icon: string; name: string; tagline: string; text: string; points: string[] }
export interface StepItem { n: string; title: string; text: string }
export interface AudienceItem { who: string; text: string }
export interface TrustItem { icon: string; title: string; text: string }
export interface ValueItem { h: string; t: string }
export interface FaqItem { q: string; a: string }
export interface NavLink { id: string; label: string; hidden?: boolean }

export const D_NAV: NavLink[] = [
  { id: 'top', label: 'Home' },
  { id: 'software', label: 'The software' },
  { id: 'modules', label: 'Modules' },
  { id: 'how', label: 'How it works' },
  { id: 'security', label: 'Trust' },
  { id: 'company', label: 'Our company' },
  { id: 'faq', label: 'FAQ' },
];

export const D_PROBLEMS: Problem[] = [
  { h: 'Minutes live in documents', t: 'Decisions get written down once and then forgotten in a shared folder nobody reopens.' },
  { h: 'Follow-ups depend on memory', t: 'Action points are copied into chats and spreadsheets by hand — and quietly dropped.' },
  { h: 'Daily reporting is a chore', t: 'Status updates are chased by message, so the people who report well are the ones who get nagged.' },
];


export const D_MODULES: ModuleItem[] = [
  {
    id: 'meetings', icon: 'meetings', name: 'Meetings & minutes', tagline: 'From agenda to approved minutes',
    text: 'A guided four-step editor walks you through the basics, the agenda, the minutes and a final review, saving your draft as you go so nothing is lost if the tab closes.',
    points: [
      'Paste a whole agenda from Word — each numbered item becomes one point and its bullet sub-points stay together, exactly as written',
      'Agenda items are always editable, reorderable and removable, even when the meeting came from a schedule',
      'Record information, decisions and lessons, with an owner and a deadline for each',
      'Turn any decision into a task with one click',
      'Schedule meetings on a calendar, then start the minutes straight from the schedule',
      'Print-ready minutes and copy-as-text for sharing',
    ],
  },
  {
    id: 'tasks', icon: 'tasks', name: 'Tasks & boards', tagline: 'Everything you owe, in one list',
    text: 'Personal tasks and the cards assigned to you appear together, grouped by what needs attention first. Switch to a board when you want to see the whole flow of work.',
    points: [
      'Quick-add with natural due dates such as #tomorrow, #fri or #2w',
      'Overdue, today, upcoming and done groups with tick-to-complete',
      'Drag-and-drop kanban boards with lists, priorities, labels and cover colours',
      'Checklists with progress, assignees, comments and duplicate-card',
      'Every card can be moved without dragging, so it works on touch screens',
    ],
  },
  {
    id: 'worklog', icon: 'worklog', name: 'Daily work log', tagline: 'A calm end-of-day habit',
    text: 'Write what you did today and what is planned for tomorrow. Mark leave or a holiday with a switch. Your entry saves automatically while you type.',
    points: [
      'A swipeable date strip showing which days are logged',
      'Leave and holiday are first-class — they never break your streak',
      'A month heat-calendar of logged, missed, leave and holiday days',
      'A gentle prompt when yesterday’s log is still missing',
      'Daily reminders arrive at the right hour in your own timezone',
    ],
  },
  {
    id: 'insights', icon: 'reports', name: 'Insights', tagline: 'Understand your own rhythm',
    text: 'Clear, animated summaries of how many meetings you attended, how much work you finished and how consistently you log your day, for any period you choose.',
    points: [
      'Task completion and on-time delivery, with early, on-time and late breakdowns',
      'Meetings by type, centre and month, with follow-ups surfaced',
      'Work-log compliance, current and longest streaks',
      'Seven-day, thirty-day, ninety-day and yearly ranges, with CSV export',
    ],
  },
  {
    id: 'admin', icon: 'admin', name: 'Admin workspace', tagline: 'Run the whole organisation from the browser',
    text: 'Administrators manage people and structure and keep an eye on health — without ever logging in to a server.',
    points: [
      'People, roles and centres you can edit at any time',
      'A performance view that compares everyone and drills into one person’s timeline',
      'Activity log and an error-ticket inbox with a simple status workflow',
      'Backups, system health and announcements to every user',
      'Site name, logo and accent colour changeable from a form',
    ],
  },
];


export const D_STEPS: StepItem[] = [
  { n: '01', title: 'Plan', text: 'Schedule the meeting and prepare the agenda — or paste one you already have.' },
  { n: '02', title: 'Record', text: 'Capture information, decisions and lessons as the meeting happens, with owners and deadlines.' },
  { n: '03', title: 'Act', text: 'Decisions become tasks on the right person’s list, with reminders at the right hour.' },
  { n: '04', title: 'Reflect', text: 'Daily logs and insights show what finished early, on time or late — so the next meeting starts informed.' },
];


export const D_AUDIENCES: AudienceItem[] = [
  { who: 'Committees & councils', text: 'Regular meetings with formal minutes, agendas and follow-ups that must be traceable from one meeting to the next.' },
  { who: 'Teams & departments', text: 'Weekly syncs, one-to-ones and project reviews where action points need a clear owner and date.' },
  { who: 'Multi-centre organisations', text: 'Many locations, one shared structure — centres and roles are managed centrally and appear everywhere instantly.' },
  { who: 'Administrators', text: 'People who keep everything running and want visibility, backups and health checks without technical work.' },
];


export const D_TRUST: TrustItem[] = [
  { icon: 'admin', title: 'Role-based access', text: 'Administrative tools are available only to administrator accounts. Everyone else sees their own work.' },
  { icon: 'worklog', title: 'Nightly backups', text: 'A full export runs automatically every night and is emailed to administrators, with recent copies kept for download.' },
  { icon: 'bell', title: 'Timezone-aware', text: 'Dates, due dates and reminders follow each person’s own timezone — not the server’s.' },
  { icon: 'search', title: 'Transparent operations', text: 'Administrators can see an activity log and an error inbox, so problems are found without digging through servers.' },
  { icon: 'check', title: 'Safe account recovery', text: 'Forgotten passwords are reset with a one-time six-digit code sent to your email address.' },
  { icon: 'plus', title: 'Works on every screen', text: 'A responsive layout with touch-friendly alternatives to drag and drop, from phones to widescreen monitors.' },
];


export const D_VALUES: ValueItem[] = [
  { h: 'Clarity over clutter', t: 'Every screen should answer one question. If it needs a manual, we simplify it.' },
  { h: 'Follow-through matters', t: 'A good meeting is measured by what happens afterwards, so we connect decisions to the work.' },
  { h: 'Respect people’s time', t: 'Thirty seconds for a daily log. One click for a task. No busywork dressed up as process.' },
  { h: 'Calm by design', t: 'Gentle motion, soft colour and honest empty states — software that is pleasant to open every day.' },
];


export const D_FAQ: FaqItem[] = [
  { q: 'Do I need to install anything?', a: 'No. Minutedesk runs in your browser on desktop, tablet and phone. Sign in with the account your administrator created for you.' },
  { q: 'Can I paste an agenda from Word?', a: 'Yes. Paste the whole list — each numbered item becomes one agenda point and its bullet sub-points stay inside it, line breaks and markers preserved.' },
  { q: 'What happens to action points from a meeting?', a: 'Each decision or lesson can become a task with an owner and a deadline, so nothing lives only in the minutes.' },
  { q: 'How do daily reminders work?', a: 'Reminders are sent at the same local hour for every person, based on the timezone detected in their browser.' },
  { q: 'Who can see my meetings and tasks?', a: 'They belong to your account. Administrators see usage summaries and activity to support the organisation.' },
  { q: 'Can administrators change roles and centres without a developer?', a: 'Yes. Centres and roles are lists managed in the admin workspace and appear in every form straight away.' },
  { q: 'I forgot my password.', a: 'Choose “Forgot password?” on the sign-in screen. We email a six-digit code so you can set a new password in under a minute.' },
  { q: 'How do I get an account?', a: 'Accounts are created by your organisation’s administrator. Ask them to add you, then sign in.' },
];


