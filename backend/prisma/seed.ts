import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient({});

async function main() {
  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
    },
  });
  console.log({ admin });

  // Migrate stock.json
  const stockPath = path.join(__dirname, '../../stock.json');
  if (fs.existsSync(stockPath)) {
    const rawData = fs.readFileSync(stockPath, 'utf8');
    const stockData = JSON.parse(rawData);

    for (const [category, items] of Object.entries(stockData)) {
      for (const item of (items as any[])) {
        let name = item.name;
        if (!name && item.level !== undefined) {
          name = `${category.toUpperCase()} Level ${item.level}`;
        }
        
        await prisma.product.create({
          data: {
            name: name || 'Unknown Product',
            category: category.replace(/_/g, ' ').toUpperCase(),
            price: item.price,
            stock: 100, // Initial stock
          }
        });
      }
    }
    console.log('Migrated stock.json to PostgreSQL Products table.');
  } else {
    console.log('stock.json not found, skipping migration.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
