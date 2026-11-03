import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('broadcasts')
export class Broadcast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  body?: string;

  @Column({ type: 'varchar' })
  audience: 'all' | 'user' | 'super_admin';

  @Column({ type: 'int', default: 0 })
  recipientCount: number;

  @Column({ type: 'varchar', nullable: true })
  sentByEmail?: string;

  @CreateDateColumn()
  createdAt: Date;
}
