-- AlterTable: detail halaqoh
ALTER TABLE `Group` ADD COLUMN `level` VARCHAR(191) NULL,
    ADD COLUMN `location` VARCHAR(191) NULL,
    ADD COLUMN `schedule` VARCHAR(191) NULL;

-- CreateTable: satu user bisa ikut banyak halaqoh
CREATE TABLE `GroupMember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'mutarabbi',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GroupMember_userId_idx`(`userId`),
    UNIQUE INDEX `GroupMember_groupId_userId_key`(`groupId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GroupMember` ADD CONSTRAINT `GroupMember_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupMember` ADD CONSTRAINT `GroupMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Data: pindahkan anggota lama (User.groupId) ke GroupMember sebagai mutarabbi
INSERT INTO `GroupMember` (`groupId`, `userId`, `role`)
SELECT `groupId`, `id`, 'mutarabbi' FROM `User` WHERE `groupId` IS NOT NULL;

-- Data: admin setiap grup menjadi anggota dengan peran murabbi
INSERT INTO `GroupMember` (`groupId`, `userId`, `role`)
SELECT `id`, `adminId`, 'murabbi' FROM `Group`
ON DUPLICATE KEY UPDATE `role` = 'murabbi';

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_groupId_fkey`;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `groupId`;
