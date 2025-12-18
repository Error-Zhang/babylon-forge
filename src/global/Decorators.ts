import { diContainer, type DIToken } from '@/global/DIContainer.ts';
import { ENV_CONFIG } from '@/configs';

/**
 * 若直接注入token发生错误，说明存在隐式循环引用，请优先处理循环引用，若实在无法解决则改为传入惰性函数 () => token
 * @param token
 * @constructor
 */
export function Inject<T>(token: DIToken<T>) {
	return function <This, Args extends any[]>(_: undefined, context: ClassFieldDecoratorContext<This>) {
		return function (this: This, ...args: Args) {
			return diContainer.get<T>(token);
		};
	};
}

/**
 * 打印函数返回值
 * @param options
 * @param on
 * @constructor
 */
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

	return function <This, Args extends any[]>(orgFn: Function, context: ClassMethodDecoratorContext<This> | ClassGetterDecoratorContext<This>) {
		const logFn = on
			? function (value: any) {
					console.logCustom({ prefix: `[${prefix}${context.name.toString()}]`, color }, value);
				}
			: () => {};

		const log = wrapperFn ? wrapperFn(logFn, wait) : logFn;

		return function (this: This, ...args: Args) {
			const value = orgFn.apply(this, args);
			log(value);
			return value;
		};
	};
}

/**
 * 被该装饰器修饰的函数禁止被重写
 * @constructor
 */
export function Sealed(value: Function, context: ClassMethodDecoratorContext) {
	return function (this: any, ...args: any[]) {
		const name = context.name.toString();
		if (Object.getPrototypeOf(this).hasOwnProperty(name)) {
			throw new Error(`Method ${name} is sealed`);
		}

		return value.apply(this, args);
	};
}

export { FieldMonitor } from './FieldMonitorDecorator';
