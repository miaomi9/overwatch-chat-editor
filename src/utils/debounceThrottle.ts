import { debounce, throttle } from 'lodash';

/**
 * 通用防抖函数
 * @param func 要防抖的函数
 * @param wait 等待时间（毫秒）
 * @param options 选项
 * @returns 防抖后的函数
 */
export const createDebounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300,
  options?: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
  }
): T & { cancel(): void; flush(): ReturnType<T> } => {
  return debounce(func, wait, options) as T & { cancel(): void; flush(): ReturnType<T> };
};

/**
 * 通用节流函数
 * @param func 要节流的函数
 * @param wait 等待时间（毫秒）
 * @param options 选项
 * @returns 节流后的函数
 */
export const createThrottle = <T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300,
  options?: {
    leading?: boolean;
    trailing?: boolean;
  }
): T & { cancel(): void; flush(): ReturnType<T> } => {
  return throttle(func, wait, options) as T & { cancel(): void; flush(): ReturnType<T> };
};

/**
 * 表单提交防抖 - 专门用于表单提交
 */
export const createSubmitDebounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number = 1000
) => {
  return createDebounce(func, wait, { leading: true, trailing: false });
};

/**
 * API调用节流 - 专门用于API调用
 */
export const createApiThrottle = <T extends (...args: any[]) => any>(
  func: T,
  wait: number = 500
) => {
  return createThrottle(func, wait, { leading: true, trailing: false });
};