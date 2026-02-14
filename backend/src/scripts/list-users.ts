import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';

async function listUsers() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false, // Disable logging for cleaner output
  });
  const usersService = app.get(UsersService);

  try {
    console.log('\n=== All Users ===\n');

    const users = await usersService.findAll();

    if (users.length === 0) {
      console.log('No users found.');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('\n❌ Error listing users:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

listUsers();
