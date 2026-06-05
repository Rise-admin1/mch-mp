-- AlterTable
ALTER TABLE `VaultUser` CHANGE `passwordHash` `password` VARCHAR(191) NOT NULL;
