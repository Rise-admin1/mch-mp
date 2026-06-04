-- AlterTable
ALTER TABLE `SchedulingBooking` ADD COLUMN `notes` TEXT NULL;

-- CreateTable
CREATE TABLE `SchedulingBookingAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NULL,
    `uploadToken` VARCHAR(191) NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `storagePath` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SchedulingBookingAttachment_uploadToken_key`(`uploadToken`),
    INDEX `SchedulingBookingAttachment_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SchedulingBookingAttachment` ADD CONSTRAINT `SchedulingBookingAttachment_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `SchedulingBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
