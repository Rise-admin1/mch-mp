-- CreateTable
CREATE TABLE `SchedulingSessionCredit` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `appSource` VARCHAR(191) NOT NULL DEFAULT 'phd-success',
    `totalSessions` INTEGER NOT NULL,
    `usedSessions` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `inviteId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SchedulingSessionCredit_inviteId_key`(`inviteId`),
    UNIQUE INDEX `SchedulingSessionCredit_email_appSource_key`(`email`, `appSource`),
    INDEX `SchedulingSessionCredit_email_appSource_idx`(`email`, `appSource`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SchedulingSessionCreditUsage` (
    `id` VARCHAR(191) NOT NULL,
    `creditId` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SchedulingSessionCreditUsage_bookingId_key`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SchedulingSessionCredit` ADD CONSTRAINT `SchedulingSessionCredit_inviteId_fkey` FOREIGN KEY (`inviteId`) REFERENCES `SchedulingInvite`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SchedulingSessionCreditUsage` ADD CONSTRAINT `SchedulingSessionCreditUsage_creditId_fkey` FOREIGN KEY (`creditId`) REFERENCES `SchedulingSessionCredit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SchedulingSessionCreditUsage` ADD CONSTRAINT `SchedulingSessionCreditUsage_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `SchedulingBooking`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
