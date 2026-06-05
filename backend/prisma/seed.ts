// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_VAULT_USERNAME = "vault";
const DEFAULT_VAULT_PASSWORD = "Vault@RISE2027";

async function main() {
  await prisma.schedulingAvailability.createMany({
    data: [
      { dayOfWeek: 3, startTime: "10:00", endTime: "14:00" },
      { dayOfWeek: 4, startTime: "10:00", endTime: "14:00" },
      { dayOfWeek: 5, startTime: "08:00", endTime: "13:00" }
    ],
    skipDuplicates: true
  });

  await prisma.vaultUser.upsert({
    where: { username: DEFAULT_VAULT_USERNAME },
    update: {
      password: DEFAULT_VAULT_PASSWORD,
    },
    create: {
      username: DEFAULT_VAULT_USERNAME,
      password: DEFAULT_VAULT_PASSWORD,
    },
  });

  console.log(`Vault user seeded: username="${DEFAULT_VAULT_USERNAME}"`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
