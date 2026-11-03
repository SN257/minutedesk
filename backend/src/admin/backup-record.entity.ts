import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('backup_records')
export class BackupRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  filename: string;

  @Column({ type: 'bigint', default: '0' })
  sizeBytes: string;

  @Column({ type: 'varchar', default: 'success' })
  status: 'success' | 'failed';

  @Column({ type: 'text', nullable: true })
  error?: string;

  @Column({ type: 'boolean', default: false })
  emailed: boolean;

  @Column({ type: 'boolean', default: false })
  manual: boolean;

  @Column({ type: 'simple-json', nullable: true })
  tableCounts?: Record<string, number>;

  @CreateDateColumn()
  createdAt: Date;
}
