-- 初始化模板分类数据
-- 使用方法：在MySQL中执行此SQL文件

-- 创建一级分类：英雄
INSERT INTO template_categories (id, name, parentId, displayOrder, isActive, createdAt, updatedAt) 
VALUES ('hero-category', '英雄', NULL, 1, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name), displayOrder = VALUES(displayOrder);

-- 创建一级分类：队友沟通
INSERT INTO template_categories (id, name, parentId, displayOrder, isActive, createdAt, updatedAt) 
VALUES ('communication-category', '队友沟通', NULL, 2, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name), displayOrder = VALUES(displayOrder);

-- 创建一级分类：未分类
INSERT INTO template_categories (id, name, parentId, displayOrder, isActive, createdAt, updatedAt) 
VALUES ('uncategorized', '未分类', NULL, 999, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name), displayOrder = VALUES(displayOrder);
-- 创建英雄二级分类
INSERT INTO template_categories (id, name, parentId, displayOrder, isActive, createdAt, updatedAt) VALUES
('hero-freya', '弗蕾娅', 'hero-category', 1, 1, NOW(), NOW()),
('hero-ashe', '艾什', 'hero-category', 2, 1, NOW(), NOW()),
('hero-ana', '安娜', 'hero-category', 3, 1, NOW(), NOW()),
('hero-orisa', '奥丽莎', 'hero-category', 4, 1, NOW(), NOW()),
('hero-baptiste', '巴蒂斯特', 'hero-category', 5, 1, NOW(), NOW()),
('hero-hanzo', '半藏', 'hero-category', 6, 1, NOW(), NOW()),
('hero-bastion', '堡垒', 'hero-category', 7, 1, NOW(), NOW()),
('hero-brigitte', '布丽吉塔', 'hero-category', 8, 1, NOW(), NOW()),
('hero-zarya', '查莉娅', 'hero-category', 9, 1, NOW(), NOW()),
('hero-zenyatta', '禅雅塔', 'hero-category', 10, 1, NOW(), NOW()),
('hero-dva', 'D.VA', 'hero-category', 11, 1, NOW(), NOW()),
('hero-pharah', '法老之鹰', 'hero-category', 12, 1, NOW(), NOW()),
('hero-widowmaker', '黑百合', 'hero-category', 13, 1, NOW(), NOW()),
('hero-sombra', '黑影', 'hero-category', 14, 1, NOW(), NOW()),
('hero-hazard', '骇灾', 'hero-category', 15, 1, NOW(), NOW()),
('hero-echo', '回声', 'hero-category', 16, 1, NOW(), NOW()),
('hero-cassidy', '卡西迪', 'hero-category', 17, 1, NOW(), NOW()),
('hero-junkrat', '狂鼠', 'hero-category', 18, 1, NOW(), NOW()),
('hero-ramattra', '拉玛刹', 'hero-category', 19, 1, NOW(), NOW()),
('hero-reinhardt', '莱因哈特', 'hero-category', 20, 1, NOW(), NOW()),
('hero-tracer', '猎空', 'hero-category', 21, 1, NOW(), NOW()),
('hero-lucio', '卢西奥', 'hero-category', 22, 1, NOW(), NOW()),
('hero-roadhog', '路霸', 'hero-category', 23, 1, NOW(), NOW()),
('hero-mauga', '毛加', 'hero-category', 24, 1, NOW(), NOW()),
('hero-mei', '美', 'hero-category', 25, 1, NOW(), NOW()),
('hero-doomfist', '末日铁拳', 'hero-category', 26, 1, NOW(), NOW()),
('hero-moira', '莫伊拉', 'hero-category', 27, 1, NOW(), NOW()),
('hero-wrecking-ball', '破坏球', 'hero-category', 28, 1, NOW(), NOW()),
('hero-lifeweaver', '生命之梭', 'hero-category', 29, 1, NOW(), NOW()),
('hero-soldier76', '士兵：76', 'hero-category', 30, 1, NOW(), NOW()),
('hero-reaper', '死神', 'hero-category', 31, 1, NOW(), NOW()),
('hero-sojourn', '索杰恩', 'hero-category', 32, 1, NOW(), NOW()),
('hero-venture', '探奇', 'hero-category', 33, 1, NOW(), NOW()),
('hero-mercy', '天使', 'hero-category', 34, 1, NOW(), NOW()),
('hero-torbjorn', '托比昂', 'hero-category', 35, 1, NOW(), NOW()),
('hero-winston', '温斯顿', 'hero-category', 36, 1, NOW(), NOW()),
('hero-kiriko', '雾子', 'hero-category', 37, 1, NOW(), NOW()),
('hero-sigma', '西格玛', 'hero-category', 38, 1, NOW(), NOW()),
('hero-illari', '伊拉锐', 'hero-category', 39, 1, NOW(), NOW()),
('hero-genji', '源氏', 'hero-category', 40, 1, NOW(), NOW()),
('hero-junker-queen', '渣客女王', 'hero-category', 41, 1, NOW(), NOW()),
('hero-symmetra', '秩序之光', 'hero-category', 42, 1, NOW(), NOW()),
('hero-juno', '朱诺', 'hero-category', 43, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  name = VALUES(name), 
  parentId = VALUES(parentId), 
  displayOrder = VALUES(displayOrder);

-- 创建队友沟通二级分类
INSERT INTO template_categories (id, name, parentId, displayOrder, isActive, createdAt, updatedAt) VALUES
('comm-game-start', '对局开始', 'communication-category', 1, 1, NOW(), NOW()),
('comm-game-end', '对局结束', 'communication-category', 2, 1, NOW(), NOW()),
('comm-other', '其他', 'communication-category', 3, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  name = VALUES(name), 
  parentId = VALUES(parentId), 
  displayOrder = VALUES(displayOrder);

-- 将现有的没有分类的模板设置为"未分类"
UPDATE user_templates 
SET categoryId = 'uncategorized' 
WHERE categoryId IS NULL;