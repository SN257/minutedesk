import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'date', nullable: true })
  dueDate?: string;

  @Column({ type: 'bigint', default: '0' })
  order: string;

  @Column({ type: 'uuid' })
  listId: string;

  @Column({ type: 'simple-array', nullable: true })
  labels?: string[];

  @Column({ type: 'varchar', nullable: true })
  priority?: string; // low, medium, high, urgent

  @Column({ type: 'varchar', nullable: true })
  assignee?: string; // userId

  @Column({ type: 'varchar', nullable: true })
  coverColor?: string; // hex color for card cover

  @Column({ type: 'boolean', default: false })
  archived: boolean;

  @Column({ type: 'simple-json', nullable: true })
  checklist?: { id: string; text: string; done: boolean }[];

  @Column({ type: 'date', nullable: true })
  workLogDate?: string; // Track which work log date created this card

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

