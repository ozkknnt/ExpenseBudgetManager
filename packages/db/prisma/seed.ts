import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const events = [
  { event_code: '1Q', event_name: '1Q', event_order: 1 },
  { event_code: '2Q', event_name: '2Q', event_order: 2 },
  { event_code: '3Q', event_name: '3Q', event_order: 3 },
  { event_code: '4Q', event_name: '4Q', event_order: 4 },
  { event_code: '利計標準', event_name: '利計標準', event_order: 5 },
  { event_code: '利計中間', event_name: '利計中間', event_order: 6 },
  { event_code: '利計最終', event_name: '利計最終', event_order: 7 }
];

async function main() {
  await prisma.mst_event.createMany({
    data: events,
    skipDuplicates: true
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
