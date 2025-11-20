/**
 * Reactivity.js TypeScript declarations
 * 响应式系统类型定义
 */

// 符号定义
declare const SymbolReactive: unique symbol;
declare const SymbolMapReactive: unique symbol;
declare const SymbolReadonly: unique symbol;
declare const SymbolRef: unique symbol;

// Effect 相关类型
interface EffectOptions {
	scheduler?: () => void;
	stop?: () => void;
	lazy?: boolean;
}

interface EffectFunction {
	(): any;
	scheduler?: () => void;
	stop?: () => void;
}

/**
 * 创建响应式副作用函数
 * @param fn 副作用函数
 * @param options 配置选项
 */
declare function effect(fn: () => any, options?: EffectOptions): EffectFunction;

/**
 * 依赖收集函数
 * @param target 目标对象
 * @param key 属性键
 */
declare function track(target: object, key: string | number | symbol);

/**
 * 触发更新函数
 * @param target 目标对象
 * @param key 属性键
 */
declare function trigger(target: object, key: string | number | symbol);

// 响应式对象类型
type Reactive<T extends object = object> = {
	[SymbolReactive]: true;
} & {
	[K in keyof T]: T[K];
};

/**
 * 创建响应式对象
 * @param target 源对象
 * @returns 响应式代理对象
 */
declare function useReactive<T extends object>(target: T): Reactive<T>;

/**
 * 创建只读对象
 * @param target 源对象
 * @returns 只读代理对象
 */
declare function useReadonly<T extends object>(target: T): Readonly<T>;

// Ref 对象类型
interface Ref<T = any> {
	[SymbolRef]: true;
	value: T;
}

/**
 * 创建 ref 对象
 * @param value 初始值
 * @returns ref 对象
 */
declare function useRef<T>(value: T): Ref<T>;

// 计算属性类型
interface ComputedRef<T = any> {
	[SymbolRef]: true;
	readonly value: T;
}

/**
 * 创建计算属性
 * @param getter 计算函数
 * @returns 计算属性对象
 */
declare function useComputed<T>(getter: () => T): ComputedRef<T>;

// Watch 相关类型
type WatchSource<T = any> = Ref<T> | ComputedRef<T> | (() => T);

interface WatchOptions {
	immediate?: boolean;
	once?: boolean;
}

/**
 * 监听数据变化
 * @param source 监听源
 * @param callback 回调函数
 * @param options 配置选项
 * @returns 停止监听函数
 */
declare function useWatch<T>(
	source: WatchSource<T> | WatchSource<T>[] | object,
	callback: (newValue: T, oldValue: T) => any,
	options?: WatchOptions
): () => void;

// 响应式 Map 类型
interface ReactiveMap<K = any, V = any> {
	[SymbolMapReactive]: true;

	readonly size: number;

	get(key: K): V | undefined;
	set(key: K, value: V): this;
	delete(key: K): boolean;
	clear();
	has(key: K): boolean;

	keys(): IterableIterator<K>;
	values(): IterableIterator<V>;
	entries(): IterableIterator<[K, V]>;
	forEach(callback: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any);

	watch(keys: K | K[], callback: (newValue: V, oldValue: V) => any, options?: WatchOptions): () => void;
	watchSize(callback: (newSize: number, oldSize: number) => any, options?: WatchOptions): () => void;

	toObject(): Record<string, V>;
	toObjectReactive(): Record<string, V> & ReactiveTarget;
}

/**
 * 创建响应式 Map
 * @param entries 初始条目
 * @returns 响应式 Map 对象
 */
declare function useMapReactive<K, V>(entries?: Iterable<readonly [K, V]>): ReactiveMap<K, V>;

// 工具类型
type MaybeRef<T = any> = T | Ref<T>;
type MaybeComputedRef<T = any> = T | Ref<T> | ComputedRef<T>;

// 响应式转换
type ToRef<T> = T extends Ref<infer U> ? Ref<U> : Ref<T>;
type ToRefs<T = any> = {
	[K in keyof T]: ToRef<T[K]>;
};

// 深度响应式
type DeepReadonly<T> = {
	readonly [P in keyof T]: DeepReadonly<T[P]>;
};

type DeepNonNullable<T> = {
	[P in keyof T]: NonNullable<DeepNonNullable<T[P]>>;
};

// 导出所有函数
export {
	effect,
	track,
	trigger,
	useReactive,
	useReadonly,
	useRef,
	useComputed,
	useWatch,
	useMapReactive,

	// 类型导出
	type EffectOptions,
	type EffectFunction,
	type Reactive,
	type Readonly,
	type Ref,
	type ComputedRef,
	type WatchSource,
	type WatchOptions,
	type ReactiveMap,
	type MaybeRef,
	type MaybeComputedRef,
	type ToRef,
	type ToRefs,
	type DeepReadonly,
	type DeepNonNullable,
	type ToReactive,
};
