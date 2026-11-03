import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'varchar', nullable: true })
  userEmail?: string;

  @Column({ type: 'varchar' })
  method: string;

  @Column({ type: 'varchar' })
  path: string;

  @Column({ type: 'int', nullable: true })
  statusCode?: number;

  @Column({ type: 'int', nullable: true })
  durationMs?: number;

  @Column({ type: 'varchar', nullable: true })
  ip?: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
