-- AlterTable
ALTER TABLE `SamiaDonation` ADD COLUMN `paystackReference` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `SamiaDonation_paystackReference_key` ON `SamiaDonation`(`paystackReference`);

-- CreateIndex
CREATE INDEX `SamiaDonation_paystackReference_idx` ON `SamiaDonation`(`paystackReference`);
