import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('scheduled_meetings')
export class ScheduledMeeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'start_time' })
  startTime: string;

  @Column({ name: 'end_time' })
  endTime: string;

  @Column({ type: 'int' })
  duration: number;

  @Column({ name: 'meeting_type', nullable: true })
  meetingType: string;

  @Column({ nullable: true })
  center: string;

  @Column({ type: 'int', default: 3 })
  participants: number;

  @Column({ type: 'jsonb', nullable: true })
  agenda: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
