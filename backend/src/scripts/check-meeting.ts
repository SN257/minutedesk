import { AppDataSource } from '../data-source';
import { Meeting } from '../meetings/meetings.entity';

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: ts-node src/scripts/check-meeting.ts <meeting-id>');
    process.exit(1);
  }

  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Meeting);
  const meeting = await repo.findOne({ where: { id } });
  if (!meeting) {
    console.log(`Meeting not found: ${id}`);
    process.exit(2);
  }

  console.log('Found meeting:', meeting);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
