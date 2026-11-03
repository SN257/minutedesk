import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'varchar', default: 'user' })
  role: string;

  // IANA timezone name (e.g. "America/New_York"), auto-detected from the user's browser.
  @Column({ type: 'varchar', nullable: true })
  timezone?: string;

  // Pages this person may open. null = everything (the default). Super admins always have everything.
  // Values: today, meetings, tasks, worklog, reports.
  @Column({ type: 'simple-json', nullable: true })
  allowedPages?: string[] | null;

  // Admin-panel sections a non-super-admin may open (overview, people, performance, logs, system, setup).
  // Only meaningful for roles other than "user" and "super_admin"; super admins always have everything.
  @Column({ type: 'simple-json', nullable: true })
  adminTabs?: string[] | null;

  // Personal settings: appearance, regional formats, reminder and notification choices. See sanitizePreferences.
  @Column({ type: 'simple-json', nullable: true })
  preferences?: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
