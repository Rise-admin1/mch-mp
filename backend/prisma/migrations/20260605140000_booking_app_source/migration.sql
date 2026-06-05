-- Add appSource to SchedulingBooking to distinguish phd-success vs rise bookings
ALTER TABLE `SchedulingBooking` ADD COLUMN `appSource` VARCHAR(191) NOT NULL DEFAULT 'phd-success';
