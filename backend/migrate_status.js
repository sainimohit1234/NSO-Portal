"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const result = await prisma.store.updateMany({
        where: {
            status: 'INCOMPLETE_INFORMATION',
        },
        data: {
            status: 'PENDING_APPROVAL',
        },
    });
    console.log(`Migrated ${result.count} stores from INCOMPLETE_INFORMATION to PENDING_APPROVAL`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=migrate_status.js.map