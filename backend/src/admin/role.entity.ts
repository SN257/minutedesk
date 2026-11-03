import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Stored on User.role — must stay a simple slug since that column is a
  // plain string, not a foreign key (kept that way for backward compatibility).
  @Column({ type: 'varchar', unique: true })
  key: string;

  @Column({ type: 'varchar' })
  label: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // 'user' and 'super_admin' back real authorization checks in the codebase
  // (SuperAdminGuard) and can't be deleted or renamed away from their key.
  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
