-- CreateTable
CREATE TABLE `SamiaDonation` (
    `id` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'KES',
    `status` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `merchantRequestID` VARCHAR(191) NULL,
    `checkoutRequestID` VARCHAR(191) NULL,
    `mpesaReceiptNumber` VARCHAR(191) NULL,
    `resultCode` INTEGER NULL,
    `resultDesc` VARCHAR(191) NULL,
    `stripePaymentIntentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SamiaDonation_stripePaymentIntentId_key`(`stripePaymentIntentId`),
    INDEX `SamiaDonation_checkoutRequestID_idx`(`checkoutRequestID`),
    INDEX `SamiaDonation_stripePaymentIntentId_idx`(`stripePaymentIntentId`),
    INDEX `SamiaDonation_status_idx`(`status`),
    INDEX `SamiaDonation_method_idx`(`method`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
