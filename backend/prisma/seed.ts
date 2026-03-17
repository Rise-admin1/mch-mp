// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.schedulingAvailability.createMany({
    data: [
      { dayOfWeek: 3, startTime: "10:00", endTime: "14:00" },
      { dayOfWeek: 4, startTime: "10:00", endTime: "14:00" },
      { dayOfWeek: 5, startTime: "08:00", endTime: "13:00" }
    ],
    skipDuplicates: true
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });