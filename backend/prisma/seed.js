"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient({});
async function main() {
    // Create admin user
    const passwordHash = await bcrypt_1.default.hash('admin123', 10);
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
    const stockPath = path_1.default.join(__dirname, '../../stock.json');
    if (fs_1.default.existsSync(stockPath)) {
        const rawData = fs_1.default.readFileSync(stockPath, 'utf8');
        const stockData = JSON.parse(rawData);
        for (const [category, items] of Object.entries(stockData)) {
            for (const item of items) {
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
    }
    else {
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
