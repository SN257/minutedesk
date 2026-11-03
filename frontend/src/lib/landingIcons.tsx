import type { ReactNode } from 'react';
import { Icon } from '../shell/icons';

/** Icons that can be chosen for a module or trust card in Setup. */
export const LANDING_ICONS = ['meetings', 'tasks', 'worklog', 'reports', 'admin', 'bell', 'search', 'check', 'plus'] as const;
export const landingIcon = (name: string, size: number): ReactNode => ((Icon as Record<string, (s?: number) => ReactNode>)[name] ?? Icon.check)(size);
