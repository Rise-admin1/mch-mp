-- CreateTable
CREATE TABLE `ExpoRegistration` (
    `id` VARCHAR(191) NOT NULL,
    `groupName` VARCHAR(191) NOT NULL,
    `designation` VARCHAR(191) NOT NULL,
    `groupLeaderName` VARCHAR(191) NOT NULL,
    `yourName` VARCHAR(191) NOT NULL,
    `idNumber` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
