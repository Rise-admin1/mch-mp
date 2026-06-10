-- CreateTable
CREATE TABLE `VaultSession` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `vaultUserId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `VaultSession_token_key`(`token`),
    INDEX `VaultSession_token_idx`(`token`),
    INDEX `VaultSession_expiresAt_idx`(`expiresAt`),
    INDEX `VaultSession_vaultUserId_idx`(`vaultUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VaultSession` ADD CONSTRAINT `VaultSession_vaultUserId_fkey` FOREIGN KEY (`vaultUserId`) REFERENCES `VaultUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
