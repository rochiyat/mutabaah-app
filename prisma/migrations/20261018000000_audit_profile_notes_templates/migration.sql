-- AlterTable
ALTER TABLE `User` ADD COLUMN `bio` TEXT NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actorId` INTEGER NULL,
    `action` VARCHAR(191) NOT NULL,
    `summary` VARCHAR(191) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `path` VARCHAR(500) NOT NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` INTEGER NULL,
    `metadata` JSON NULL,
    `ip` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_actorId_idx`(`actorId`),
    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MurabbiNote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupId` INTEGER NOT NULL,
    `memberId` INTEGER NOT NULL,
    `authorId` INTEGER NULL,
    `date` DATE NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'catatan',
    `content` TEXT NOT NULL,
    `visibility` VARCHAR(191) NOT NULL DEFAULT 'private',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MurabbiNote_groupId_memberId_date_idx`(`groupId`, `memberId`, `date`),
    INDEX `MurabbiNote_memberId_idx`(`memberId`),
    INDEX `MurabbiNote_authorId_idx`(`authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityTemplate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `items` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ActivityTemplate_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MurabbiNote` ADD CONSTRAINT `MurabbiNote_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MurabbiNote` ADD CONSTRAINT `MurabbiNote_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MurabbiNote` ADD CONSTRAINT `MurabbiNote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityTemplate` ADD CONSTRAINT `ActivityTemplate_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Template bawaan
INSERT INTO `ActivityTemplate` (`name`, `description`, `items`, `isActive`, `createdById`, `createdAt`, `updatedAt`) VALUES
('Mutaba''ah Yaumiyah Dasar', 'Paket amalan harian untuk halaqoh pemula.', JSON_ARRAY(
  JSON_OBJECT('name', 'Sholat Fardhu Berjamaah', 'category', 'Sholat', 'target', 5, 'unit', 'waktu', 'isRequired', true),
  JSON_OBJECT('name', 'Tilawah Al-Qur''an', 'category', 'Al-Qur''an', 'target', 1, 'unit', 'juz', 'isRequired', true),
  JSON_OBJECT('name', 'Dzikir Al-Ma''tsurat', 'category', 'Dzikir', 'target', 2, 'unit', 'kali', 'isRequired', true),
  JSON_OBJECT('name', 'Sholat Dhuha', 'category', 'Sholat', 'target', 2, 'unit', 'rakaat', 'isRequired', false),
  JSON_OBJECT('name', 'Sholat Tahajud', 'category', 'Sholat', 'target', 1, 'unit', 'kali', 'isRequired', false)
), true, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
('Mutaba''ah Pekanan Madya', 'Paket amalan untuk halaqoh jenjang madya.', JSON_ARRAY(
  JSON_OBJECT('name', 'Tilawah Al-Qur''an', 'category', 'Al-Qur''an', 'target', 1, 'unit', 'juz', 'isRequired', true),
  JSON_OBJECT('name', 'Hafalan Al-Qur''an', 'category', 'Al-Qur''an', 'target', 1, 'unit', 'halaman', 'isRequired', true),
  JSON_OBJECT('name', 'Qiyamul Lail', 'category', 'Sholat', 'target', 1, 'unit', 'kali', 'isRequired', true),
  JSON_OBJECT('name', 'Saum Sunnah', 'category', 'Puasa', 'target', 1, 'unit', 'hari', 'isRequired', false),
  JSON_OBJECT('name', 'Membaca Buku Islami', 'category', 'Ilmu', 'target', 10, 'unit', 'halaman', 'isRequired', false),
  JSON_OBJECT('name', 'Olahraga', 'category', 'Jasadiyah', 'target', 1, 'unit', 'kali', 'isRequired', false)
), true, NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
