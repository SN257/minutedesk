import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NotificationsService } from '../notifications/notifications.service';

async function triggerNotifications() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const notificationService = app.get(NotificationsService);

  console.log('Triggering daily notifications manually...');
  
  try {
    await notificationService.sendDailyNotifications();
    console.log('✅ Daily notifications sent successfully!');
  } catch (error) {
    console.error('❌ Error sending notifications:', error);
  }

  await app.close();
}

triggerNotifications();
