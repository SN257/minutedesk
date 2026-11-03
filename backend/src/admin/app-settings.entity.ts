import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

// Singleton row (site-wide branding/config), always read/written as the first row.
@Entity('app_settings')
export class AppSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', default: 'MinuteDesk' })
  siteName: string;

  @Column({ type: 'varchar', nullable: true })
  logoUrl?: string;

  @Column({ type: 'varchar', nullable: true })
  faviconUrl?: string;

  @Column({ type: 'varchar', default: '#1e293b' })
  primaryColor: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
