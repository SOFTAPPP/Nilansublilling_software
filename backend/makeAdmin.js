require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.log("==========================================");
    console.log("❌ Missing Username or Password");
    console.log("Usage: node makeAdmin.js <username> <password>");
    console.log("Example: node makeAdmin.js admin mySecret123");
    console.log("==========================================");
    process.exit(1);
  }

  try {
    // Hash the password for security
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Upsert so if they run it again with the same username, it just updates the password
    const admin = await prisma.admin.upsert({
      where: { username },
      update: { passwordHash },
      create: {
        username,
        passwordHash
      }
    });

    console.log("\n==========================================");
    console.log(`✅ Success! Admin account configured.`);
    console.log(`Username: ${admin.username}`);
    console.log(`Password: (Securely Hashed & Saved)`);
    console.log("You can now log in to the application.");
    console.log("==========================================\n");
  } catch (error) {
    console.error("\n❌ Error creating admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
