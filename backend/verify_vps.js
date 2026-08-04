const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.product.count();
  console.log('Product count in VPS DB:', count);
  const admins = await prisma.admin.findMany();
  console.log('Admins:', admins.map(a => a.username));
  const sample = await prisma.product.findFirst();
  console.log('Sample product:', sample?.name, '- Price:', sample?.price);
}
main().finally(() => prisma.$disconnect());
