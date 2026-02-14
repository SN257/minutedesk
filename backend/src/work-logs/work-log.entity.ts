
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('work_logs')
@Index(['userId', 'date'], { unique: true })
export class WorkLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'date' })
    date: string; // YYYY-MM-DD

    @Column({ type: 'text', nullable: true })
    todayWork: string;

    @Column({ type: 'boolean', default: false })
    todayOnLeave: boolean;

    @Column({ type: 'boolean', default: false })
    todayHoliday: boolean;

    @Column({ type: 'text', nullable: true })
    tomorrowWork: string;

    @Column({ type: 'boolean', default: false })
    tomorrowOnLeave: boolean;

    @Column({ type: 'boolean', default: false })
    tomorrowHoliday: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
