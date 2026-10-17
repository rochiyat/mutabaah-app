-- Satu user bisa punya beberapa role; 'user' (anggota biasa) tidak lagi disimpan
ALTER TABLE `User` ADD COLUMN `roles` JSON NULL;

UPDATE `User` SET `roles` = IF(`role` = 'user', JSON_ARRAY(), JSON_ARRAY(`role`));

ALTER TABLE `User` MODIFY `roles` JSON NOT NULL;

-- DropIndex
DROP INDEX `User_role_idx` ON `User`;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `role`;
