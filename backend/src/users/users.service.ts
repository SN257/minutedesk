import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

/** Pages that can be switched on or off per person. */
export const PAGE_KEYS = ['today', 'meetings', 'tasks', 'worklog', 'reports'] as const;

/** null (or anything that is not a list) means "everything"; a list is cleaned down to known pages. */
export const sanitizePages = (v: unknown): string[] | null =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && (PAGE_KEYS as readonly string[]).includes(x)))] : null;

export const ADMIN_TABS = ['overview', 'people', 'performance', 'logs', 'system', 'setup'] as const;
/** Only roles between "user" and "super_admin" can be given admin-panel sections; everyone else gets none. */
export const sanitizeAdminTabs = (role: string | undefined, v: unknown): string[] | null =>
  role && role !== 'user' && role !== 'super_admin' && Array.isArray(v)
    ? [...new Set(v.filter((x): x is string => typeof x === 'string' && (ADMIN_TABS as readonly string[]).includes(x)))]
    : null;

const bool = (v: unknown) => (typeof v === 'boolean' ? v : undefined);
const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined => (allowed.includes(v as T) ? (v as T) : undefined);
const NOTIFY_KEYS = ['meeting_reminder', 'due_date_alert', 'work_log_reminder', 'task_overdue', 'missed_work_log', 'task_assigned', 'admin_broadcast'] as const;

/** Keeps only known settings, with sane values. Anything unknown or malformed is dropped. */
export const sanitizePreferences = (raw: unknown): Record<string, any> => {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
  const out: Record<string, any> = {};
  const a = r.appearance ?? {};
  const appearance = {
    theme: pick(a.theme, ['light', 'dark', 'auto'] as const),
    textSize: pick(a.textSize, ['sm', 'md', 'lg'] as const),
    reduceMotion: bool(a.reduceMotion),
    startPage: pick(a.startPage, [...PAGE_KEYS] as const),
  };
  const g = r.regional ?? {};
  const regional = {
    timeFormat: pick(g.timeFormat, ['12h', '24h'] as const),
    dateFormat: pick(g.dateFormat, ['dmy', 'mdy', 'ymd'] as const),
    weekStart: g.weekStart === 0 || g.weekStart === 1 ? g.weekStart : undefined,
  };
  const n = r.notify ?? {};
  const notify: Record<string, boolean> = {};
  NOTIFY_KEYS.forEach((k) => { const b = bool(n[k]); if (b !== undefined) notify[k] = b; });
  const clean = (o: Record<string, any>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
  out.appearance = clean(appearance);
  out.regional = clean(regional);
  out.notify = notify;
  const email = bool(r.email); if (email !== undefined) out.email = email;
  if (Number.isInteger(r.reminderHour) && r.reminderHour >= 0 && r.reminderHour <= 23) out.reminderHour = r.reminderHour;
  return out;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'email', 'name', 'createdAt', 'updatedAt'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(email: string, password: string, name?: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      name,
    });
    return this.usersRepository.save(user);
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async updateProfile(
    id: string,
    data: { name?: string; email?: string },
  ): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;

    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;

    return this.usersRepository.save(user);
  }

  async updatePreferences(id: string, prefs: unknown): Promise<Record<string, any> | null> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) return null;
    user.preferences = sanitizePreferences(prefs);
    await this.usersRepository.save(user);
    return user.preferences;
  }

  async updateTimezone(id: string, timezone: string): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;

    user.timezone = timezone;
    return this.usersRepository.save(user);
  }

  async setPassword(id: string, newPassword: string): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;

    user.password = await bcrypt.hash(newPassword, 10);
    return this.usersRepository.save(user);
  }

  // ─── Admin methods ───────────────────────────────────────────────────────────

  async adminFindAll(): Promise<Omit<User, 'password'>[]> {
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map(({ password, ...rest }) => rest as Omit<User, 'password'>);
  }

  async adminCreateUser(
    email: string,
    password: string,
    name?: string,
    role: string = 'user',
    allowedPages?: string[] | null,
    adminTabs?: string[] | null,
  ): Promise<Omit<User, 'password'>> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({ email, password: hashedPassword, name, role, allowedPages: sanitizePages(allowedPages), adminTabs: sanitizeAdminTabs(role, adminTabs) });
    const saved = await this.usersRepository.save(user);
    const { password: _pw, ...rest } = saved;
    return rest as Omit<User, 'password'>;
  }

  async adminUpdateUser(
    id: string,
    data: { name?: string; email?: string; role?: string; allowedPages?: string[] | null; adminTabs?: string[] | null },
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.findById(id);
    if (!user) return null;

    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    if (data.role !== undefined) user.role = data.role;
    if (data.allowedPages !== undefined) user.allowedPages = sanitizePages(data.allowedPages);
    // keep the admin sections in step with the role: a role change can never leave stale access behind
    user.adminTabs = sanitizeAdminTabs(user.role, data.adminTabs !== undefined ? data.adminTabs : user.adminTabs);

    const saved = await this.usersRepository.save(user);
    const { password, ...rest } = saved;
    return rest as Omit<User, 'password'>;
  }

  async adminDeleteUser(id: string): Promise<boolean> {
    const result = await this.usersRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
