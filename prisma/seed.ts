import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as crypto from 'crypto';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const merchant = await prisma.merchant.upsert({
    where: { email: 'test@meridian.dev' },
    update: {},
    create: {
      name: 'Meridian Test Merchant',
      email: 'test@meridian.dev',
    },
  });

  console.log('Merchant:', merchant);

  const rawKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
  const hashedKey = crypto
    .createHash('sha256')
    .update(rawKey)
    .digest('hex');

  await prisma.apiKey.create({
    data: {
      merchantId: merchant.id,
      name: 'dev-key',
      hashedKey,
    },
  });

  console.log('\n--- Save this API key (shown only once) ---');
  console.log(`Authorization: Bearer ${rawKey}`);
  console.log('-------------------------------------------\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
