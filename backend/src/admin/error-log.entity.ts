import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('error_logs')
export class ErrorLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  source: 'backend' | 'frontend';

  @Column({ type: 'varchar' })
  message: string;

  @Column({ type: 'text', nullable: true })
  stack?: string;

  @Column({ type: 'varchar', nullable: true })
  path?: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'varchar', nullable: true })
  userEmail?: string;

  @Column({ type: 'int', nullable: true })
  statusCode?: number;

  @Index()
  @Column({ type: 'varchar', default: 'open' })
  status: 'open' | 'in_progress' | 'resolved';

  @Column({ type: 'simple-json', nullable: true })
  meta?: any;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;
}
