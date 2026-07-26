import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const user = await prisma.user.upsert({
    where: { googleId: 'seed-google-id' },
    update: {},
    create: {
      email: 'test@dogumgunu.dev',
      name: 'Test Kullanıcı',
      googleId: 'seed-google-id',
    },
  });

  const friends = [
    { name: 'Ayşe Yılmaz', birthDate: new Date('1995-03-14') },
    { name: 'Mehmet Demir', birthDate: new Date('1990-07-02') },
    { name: 'Zeynep Kaya', birthDate: new Date('1998-11-29') },
  ];

  for (const friend of friends) {
    await prisma.friend.upsert({
      where: {
        id: `seed-${friend.name}`,
      },
      update: {},
      create: {
        id: `seed-${friend.name}`,
        userId: user.id,
        name: friend.name,
        birthDate: friend.birthDate,
      },
    });
  }

  console.log(`Seed tamamlandı: ${user.email} + ${friends.length} arkadaş.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
