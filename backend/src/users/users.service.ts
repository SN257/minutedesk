import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email: email.trim() })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'email', 'name', 'createdAt', 'updatedAt'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(email: string, password: string, name?: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      name,
    });
    return this.usersRepository.save(user);
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async updateProfile(
    id: string,
    data: { name?: string; email?: string },
  ): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;

    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;

    return this.usersRepository.save(user);
  }

  async updateTimezone(id: string, timezone: string): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;

    user.timezone = timezone;
    return this.usersRepository.save(user);
  }

  async setPassword(id: string, newPassword: string): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;

    user.password = await bcrypt.hash(newPassword, 10);
    return this.usersRepository.save(user);
  }

  // ─── Admin methods ───────────────────────────────────────────────────────────

  async adminFindAll(): Promise<Omit<User, 'password'>[]> {
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map(({ password, ...rest }) => rest as Omit<User, 'password'>);
  }

  async adminCreateUser(
    email: string,
    password: string,
    name?: string,
    role: string = 'user',
  ): Promise<Omit<User, 'password'>> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({ email, password: hashedPassword, name, role });
    const saved = await this.usersRepository.save(user);
    const { password: _pw, ...rest } = saved;
    return rest as Omit<User, 'password'>;
  }

  async adminUpdateUser(
    id: string,
    data: { name?: string; email?: string; role?: string },
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.findById(id);
    if (!user) return null;

    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email;
    if (data.role !== undefined) user.role = data.role;

    const saved = await this.usersRepository.save(user);
    const { password, ...rest } = saved;
    return rest as Omit<User, 'password'>;
  }

  async adminDeleteUser(id: string): Promise<boolean> {
    const result = await this.usersRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
