-- Add hold + Stripe session fields to SchedulingBooking
ALTER TABLE `SchedulingBooking`
  ADD COLUMN `expiresAt` DATETIME(3) NULL,
  ADD COLUMN `stripeSessionId` VARCHAR(191) NULL;

-- Enforce one booking/hold per slot
CREATE UNIQUE INDEX `SchedulingBooking_availabilityId_startTime_key`
  ON `SchedulingBooking`(`availabilityId`, `startTime`);

-- Map Stripe session to booking (optional unique; allows multiple NULLs in MySQL)
CREATE UNIQUE INDEX `SchedulingBooking_stripeSessionId_key`
  ON `SchedulingBooking`(`stripeSessionId`);

