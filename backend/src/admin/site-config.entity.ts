import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

// Singleton row: the editable content of the frontend (website text, menu, theme).
// `draft` is what the admin is editing, `published` is what everyone sees.
@Entity('site_config')
export class SiteConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'simple-json', nullable: true })
  draft?: Record<string, any> | null;

  @Column({ type: 'simple-json', nullable: true })
  published?: Record<string, any> | null;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
