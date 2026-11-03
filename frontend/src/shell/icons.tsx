const P = ({ d, size = 20 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
export const Icon = {
  today: (s?: number) => <P size={s} d="M12 3v2m0 14v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M3 12h2m14 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z" />,
  // four tiles: the dashboard
  dashboard: (s?: number) => <P size={s} d="M4 4h6.5v7.5H4zM13.5 4H20v4.5h-6.5zM13.5 11.5H20V20h-6.5zM4 14.5h6.5V20H4z" />,
  // pie chart: an overview of the parts
  overview: (s?: number) => <P size={s} d="M12 3v9h9M12 3a9 9 0 109 9" />,
  meetings: (s?: number) => <P size={s} d="M8 2v4m8-4v4M3 9h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />,
  tasks: (s?: number) => <P size={s} d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9" />,
  worklog: (s?: number) => <P size={s} d="M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  reports: (s?: number) => <P size={s} d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
  admin: (s?: number) => <P size={s} d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3zm-3 9l2 2 4-4" />,
  settings: (s?: number) => <P size={s} d="M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 00-2-1.2L14.5 3h-4l-.4 2.6a7.5 7.5 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 000 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 002 1.2l.4 2.6h4l.4-2.6a7.5 7.5 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />,
  bell: (s?: number) => <P size={s} d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9m4.3 13a2 2 0 003.4 0" />,
  search: (s?: number) => <P size={s} d="M21 21l-4.3-4.3M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />,
  plus: (s?: number) => <P size={s} d="M12 5v14M5 12h14" />,
  logout: (s?: number) => <P size={s} d="M16 17l5-5-5-5m5 5H9m4 8H5a2 2 0 01-2-2V6a2 2 0 012-2h8" />,
  arrow: (s?: number) => <P size={s} d="M5 12h14m-6-6l6 6-6 6" />,
  check: (s?: number) => <P size={s} d="M5 13l4 4L19 7" />,
};
