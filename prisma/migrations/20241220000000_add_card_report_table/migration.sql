-- CreateTable
CREATE TABLE `card_reports` (
    `id` VARCHAR(191) NOT NULL,
    `cardExchangeId` VARCHAR(191) NOT NULL,
    `reporterIp` VARCHAR(45) NOT NULL,
    `reportType` ENUM('used', 'invalid') NOT NULL,
    `reportedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `card_reports_cardExchangeId_reporterIp_key`(`cardExchangeId`, `reporterIp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `card_reports` ADD CONSTRAINT `card_reports_cardExchangeId_fkey` FOREIGN KEY (`cardExchangeId`) REFERENCES `card_exchanges`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;