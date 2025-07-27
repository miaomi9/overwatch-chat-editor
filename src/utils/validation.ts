import { z } from 'zod';

/**
 * 通用字符串验证规则
 */
const createStringSchema = (maxLength: number, fieldName: string) => {
  return z
    .string()
    .min(1, `${fieldName}不能为空`)
    .max(maxLength, `${fieldName}不能超过${maxLength}个字符`)
    .trim()
    // 防止XSS攻击的基本过滤
    .refine(
      (val) => !/<script[^>]*>.*?<\/script>/gi.test(val),
      '输入内容包含不安全的脚本标签'
    )
    // 防止SQL注入的基本过滤
    .refine(
      (val) => !/('|(\-\-)|(;)|(\|)|(\*)|(%))/g.test(val),
      '输入内容包含不安全的字符'
    );
};

/**
 * Overwatch代码验证（允许更多字符，因为是代码内容）
 */
const createOverwatchCodeSchema = (maxLength: number) => {
  return z
    .string()
    .min(1, 'Overwatch代码不能为空')
    .max(maxLength, `Overwatch代码不能超过${maxLength}个字符`)
    .trim()
    // 只防止明显的XSS攻击
    .refine(
      (val) => !/<script[^>]*>.*?<\/script>/gi.test(val),
      'Overwatch代码包含不安全的脚本标签'
    );
};

/**
 * 用户模板上传验证模式
 */
export const userTemplateSchema = z.object({
  name: createStringSchema(30, '模板名称'),
  description: createStringSchema(100, '模板描述'),
  overwatchCode: createOverwatchCodeSchema(300),
});

/**
 * 管理员模板验证模式
 */
export const adminTemplateSchema = z.object({
  name: createStringSchema(100, '模板名称'),
  description: createStringSchema(500, '模板描述'),
  elements: z.array(
    z.object({
      type: z.enum(['text', 'coloredText', 'gradientText']),
      content: createStringSchema(1000, '元素内容'),
      color: z.string().optional(),
      startColor: z.string().optional(),
      endColor: z.string().optional(),
    })
  ),
});

/**
 * 验证函数类型
 */
export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  errors?: string[];
};

/**
 * 通用验证函数
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map((issue) => issue.message),
      };
    }
    return {
      success: false,
      errors: ['验证失败'],
    };
  }
}

/**
 * 清理HTML标签（防止XSS）
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

/**
 * 清理SQL特殊字符（额外防护）
 */
export function sanitizeSql(input: string): string {
  return input
    .replace(/['"\-\-;\|\*%]/g, '')
    .trim();
}

/**
 * 验证IP地址格式
 */
export function isValidIp(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * 检查是否为可疑的用户代理
 */
export function isSuspiciousUserAgent(userAgent: string): boolean {
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}