import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

async function createUser() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('\n❌ Usage: npm run user:create:direct <email> <password> [name]\n');
    console.error('Example: npm run user:create:direct admin@example.com password123 "Admin User"\n');
    process.exit(1);
  }

  const [email, password, name] = args;

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false, // Disable logging for cleaner output
  });
  const usersService = app.get(UsersService);

  try {
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
    await app.close();
  }
}

createUser();
