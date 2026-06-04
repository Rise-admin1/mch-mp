-- CreateTable
CREATE TABLE `SchedulingInvite` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `usedAt` DATETIME(3) NULL,
    `bookingId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SchedulingInvite_bookingId_key`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SchedulingInvite` ADD CONSTRAINT `SchedulingInvite_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `SchedulingBooking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
