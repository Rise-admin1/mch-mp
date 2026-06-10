-- AlterTable
ALTER TABLE `VaultUser` ADD COLUMN `expiresAt` DATETIME(3) NULL,
    ADD COLUMN `role` ENUM('ADMIN', 'GUEST') NOT NULL DEFAULT 'ADMIN';

-- CreateTable
CREATE TABLE `VaultUserDocument` (
    `id` VARCHAR(191) NOT NULL,
    `vaultUserId` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `VaultUserDocument_vaultUserId_idx`(`vaultUserId`),
    INDEX `VaultUserDocument_documentId_idx`(`documentId`),
    UNIQUE INDEX `VaultUserDocument_vaultUserId_documentId_key`(`vaultUserId`, `documentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VaultUserDocument` ADD CONSTRAINT `VaultUserDocument_vaultUserId_fkey` FOREIGN KEY (`vaultUserId`) REFERENCES `VaultUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VaultUserDocument` ADD CONSTRAINT `VaultUserDocument_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `VaultDocument`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
