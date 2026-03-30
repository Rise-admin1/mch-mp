/*
  Warnings:

  - You are about to drop the column `email` on the `UserVolunteer` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `UserVolunteer` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `UserVolunteer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `UserVolunteer` DROP COLUMN `email`,
    DROP COLUMN `firstName`,
    DROP COLUMN `lastName`;
