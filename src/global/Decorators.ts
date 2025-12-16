import { diContainer, type DIToken } from '@/global/DIContainer.ts';
import { ENV_CONFIG } from '@/configs';

/**
 * 若直接注入token发生错误，请改为传入惰性函数 () => token
 * @param token
 * @constructor
 */
export function Inject<T>(token: DIToken<T>): any {
	return function () {
		return () => diContainer.get(token);
	};
}

export function LogReturn(
	options?: {
		prefix?: string;
		color?: string;
		wrapperFn?: Function; // 节流/防抖函数
		wait?: number;
	},
	on: boolean = ENV_CONFIG.DEBUG
) {
	const { prefix = 'LogReturn:', color = '#3f51b5', wrapperFn, wait = 1000 } = options ?? {};

	return function (orgFn: Function, context: ClassMethodDecoratorContext | ClassGetterDecoratorContext) {
		const logFn = on
			? function (value: any) {
					console.logCustom({ prefix: `[${prefix}${context.name.toString()}]`, color }, value);
				}
			: () => {};

		const throttledLog = wrapperFn ? wrapperFn(logFn, wait) : logFn;

		return function (this: any, ...args: any[]) {
			const value = orgFn.apply(this, args);
			throttledLog(value);
			return value;
		};
	};
}

export function Sealed() {
	return function (orgFn: Function, context: ClassMethodDecoratorContext) {
		// 如果在子类重写，会在运行时抛出错误
		return function (this: any, ...args: any[]) {
			const cls = this.constructor;
			const methodName = context.name.toString();
			// 在第一次调用时检查是否被重写
			if (cls.prototype.hasOwnProperty(methodName)) {
				console.logError(`Method ${methodName} is final and cannot be overridden.`);
			}

			return orgFn.apply(this, args);
		};
	};
}

export { FieldMonitor } from './FieldMonitorDecorator';
