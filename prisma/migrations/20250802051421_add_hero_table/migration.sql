-- CreateTable
CREATE TABLE `card_exchanges` (
    `id` VARCHAR(191) NOT NULL,
    `shareToken` VARCHAR(191) NOT NULL,
    `actionType` VARCHAR(191) NOT NULL,
    `actionInitiatorAccount` VARCHAR(191) NOT NULL,
    `actionInitiatorCardId` INTEGER NOT NULL,
    `actionAcceptCardId` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `creatorIp` VARCHAR(191) NOT NULL,
    `originalUrl` TEXT NOT NULL,
    `lastCheckedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `card_exchanges_shareToken_key`(`shareToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teammate_match_records` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `region` VARCHAR(191) NOT NULL,
    `playerCount` INTEGER NOT NULL,
    `playerTags` TEXT NOT NULL,
    `matchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `heroes` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `englishName` VARCHAR(191) NOT NULL,
    `avatar` VARCHAR(191) NULL,
    `extensions` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `heroes_englishName_key`(`englishName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
