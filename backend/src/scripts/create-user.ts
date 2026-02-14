import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import * as readline from 'readline';

async function createUser() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  };

  try {
    console.log('\n=== Create New User ===\n');

    const email = await question('Enter email: ');
    const password = await question('Enter password: ');
    const name = await question('Enter name (optional): ');

    // Validate inputs
    if (!email || !password) {
      console.error('\n❌ Email and password are required!');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('\n❌ Password must be at least 6 characters long!');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await usersService.findByEmail(email);
    if (existingUser) {
      console.error('\n❌ User with this email already exists!');
      process.exit(1);
    }

    // Create user (password will be hashed automatically)
    const user = await usersService.create(email, password, name || undefined);

    console.log('\n✅ User created successfully!');
    console.log('\nUser Details:');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name || 'N/A'}`);
    console.log(`Created At: ${user.createdAt}`);
    console.log('\n');
  } catch (error) {
    console.error('\n❌ Error creating user:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await app.close();
  }
}

createUser();
