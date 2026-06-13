import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ nullable: true })
  center?: string;

  @Column({ nullable: true })
  personName?: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true })
  day?: string;

  @Column()
  startTime: string;

  @Column()
  endTime: string;

  @Column({ nullable: true })
  place?: string;

  @Column({ type: 'text', nullable: true })
  attendance?: string;

  @Column({ nullable: true })
  presentSantName?: string;

  @Column()
  meetingType: string;

  @Column({ nullable: true })
  scheduledMeetingId?: string;

  @Column({ type: 'jsonb', nullable: true })
  agenda?: string[];

  @Column({ type: 'jsonb' })
  notes: {
    id: string;
    title?: string;
    points: { id: string; text: string; category?: string; assignee?: string; deadline?: string; taskId?: string }[];
    important: boolean;
    followUp: boolean;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
