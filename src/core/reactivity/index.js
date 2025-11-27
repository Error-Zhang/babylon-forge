/**
 * 响应式原理详解
 * 核心思想：发布订阅模式 + 代理模式 = 代理订阅模式
 * 与传统发布订阅模式的区别：不使用固定key(即key隐藏)通过在访问变量的时候抓住变量的引用从而实现无感订阅
 * 难点：如何绑定回掉函数或者说副作用
 * 核心函数：track、trigger、effect
 * 解决方法：在调用track之前设置一个同步的全局变量(副作用函数)然后再调用track传入指定对象并将该对象与全局变量做一个band，band后立即重置
 * 问题：响应式系统能用一个全局 activeEffect，是因为 JS 是单线程 + 任务队列模型，这保证了 effect 的执行是同步且不会并发冲突
 * 使用方法(watch computed 基本原理)：先调用effect，effect会传入的函数fn，在effect内部会先设置全局变量然后调用fn，fn要求内部必须要访问响应式变量才能触发getter然后getter内部会调用track函数
 */
const SymbolReactive = Symbol('SymbolReactive');
const SymbolMapReactive = Symbol('SymbolMapReactive');
const SymbolReadonly = Symbol('SymbolReadonly');
const SymbolRef = Symbol('SymbolRef');

// 当前正在执行的effect
let activeEffect = null;
// 依赖映射表：target -> key -> Set<effect>
const targetMap = new WeakMap();

function effect(
	fn,
	options = {
		scheduler: null,
		stop: null,
		lazy: null,
	}
) {
	const effectFn = () => {
		try {
			activeEffect = effectFn;
			return fn();
		} finally {
			activeEffect = null;
		}
	};

	// 添加调度器支持
	effectFn.scheduler = options.scheduler;
	effectFn.stop = options.stop;

	// 如果不是懒执行，立即执行一次
	if (!options.lazy) {
		effectFn();
	}

	return effectFn;
}

// 依赖收集函数
function track(target, key) {
	if (!activeEffect) return;

	let depsMap = targetMap.get(target);
	if (!depsMap) {
		targetMap.set(target, (depsMap = new Map()));
	}

	let dep = depsMap.get(key);
	if (!dep) {
		depsMap.set(key, (dep = new Set()));
	}

	dep.add(activeEffect);
}

function trigger(target, key) {
	const depsMap = targetMap.get(target);
	if (!depsMap) return;

	const dep = depsMap.get(key);
	if (!dep) return;

	dep.forEach((effect) => {
		// 如果有调度器，使用调度器；否则直接执行
		if (effect.scheduler) {
			effect.scheduler();
		} else {
			effect();
		}
	});
}

export function useReactive(target) {
	return new Proxy(
		{ ...target, [SymbolReactive]: true },
		{
			get(target, key, receiver) {
				const result = Reflect.get(target, key, receiver);
				// 收集依赖
				track(target, key);
				return result;
			},

			set(target, key, value, receiver) {
				const oldValue = target[key];
				const result = Reflect.set(target, key, value, receiver);

				// 只有值真正改变时才触发更新
				if (oldValue !== value) {
					trigger(target, key);
				}

				return result;
			},
		}
	);
}

export function useReadonly(target) {
	return new Proxy(
		{ ...target, [SymbolReadonly]: true },
		{
			set() {
				console.warn('Set operation on readonly object is not allowed');
				return true;
			},
			deleteProperty() {
				console.warn('Delete operation on readonly object is not allowed');
				return true;
			},
		}
	);
}

export function useRef(value) {
	let _value = value;
	return {
		[SymbolRef]: true,
		get value() {
			track(this, 'value');
			return _value;
		},
		set value(newValue) {
			if (_value !== newValue) {
				_value = newValue;
				trigger(this, 'value');
			}
		},
	};
}

export function useComputed(getter) {
	let _value;
	let dirty = true;

	const computedRef = {
		[SymbolRef]: true,
		get value() {
			if (dirty) {
				_value = getter();
				dirty = false;
			}
			track(computedRef, 'value');
			return _value;
		},
		set value(_) {
			console.warn('computed is readonly');
		},
	};

	// 当依赖变化时，标记为dirty
	effect(() => {
		// 去订阅getter里面访问的属性在发生变化时同步改变dirty
		getter();
		dirty = true;
		// 这里的trigger和track是为了保持computed.value的响应式监听，如果外部不对computed.value进行监听的话是不会生效的
		trigger(computedRef, 'value');
	});

	return computedRef;
}

export function useWatch(source, callback, options = { immediate: null, once: null }) {
	let getter;

	if (typeof source === 'function') {
		// 函数形式：() => reactive.prop 或 () => ref.value
		getter = source;
	} else if (Array.isArray(source)) {
		// 数组形式：[ref1, ref2] 或 [() => obj.prop1, () => obj.prop2]
		getter = () =>
			source.map((item) => {
				if (typeof item === 'function') {
					// 函数：() => reactive.prop
					return item();
				} else if (item && typeof item === 'object' && SymbolRef in item) {
					// ref 对象
					return item.value;
				} else {
					throw new Error('source error');
				}
			});
	} else if (source && typeof source === 'object' && SymbolRef in source) {
		// 单个 ref 对象
		getter = () => source.value;
	} else {
		throw new Error('source error');
	}

	let oldValue;
	let cleanup;
	let stop;

	// 判断值是否发生变化
	const hasChanged = (newValue, oldValue) => {
		// 数组情况下的比较
		if (Array.isArray(newValue) && Array.isArray(oldValue)) {
			if (newValue.length !== oldValue.length) return true;
			return newValue.some((val, index) => val !== oldValue[index]);
		}

		return newValue !== oldValue;
	};

	// 调度器 - 当依赖变化时执行
	const job = () => {
		if (stop) return;
		// 获取新值
		const newValue = effectFn();

		// 调用回调
		if (hasChanged(newValue, oldValue)) {
			cleanup = callback(newValue, oldValue);
			oldValue = Array.isArray(newValue) ? [...newValue] : newValue;
			if (options.once) stop = true;
		}
	};

	// 创建 effect，使用调度器
	const effectFn = effect(getter, {
		lazy: true, // 懒执行
		scheduler: job, // 使用调度器
	});

	// 处理 immediate 选项
	if (options.immediate) {
		job();
	} else {
		const initialValue = effectFn();
		oldValue = Array.isArray(initialValue) ? [...initialValue] : initialValue;
	}

	// 返回停止函数
	return () => {
		cleanup?.();
		stop = true;
	};
}

export function useMapReactive(entries) {
	const map = new Map(entries);

	// 创建一个响应式对象作为依赖收集的载体
	const reactiveTarget = {};

	const reactiveMap = {
		[SymbolMapReactive]: true,

		get size() {
			track(reactiveTarget, 'size');
			return map.size;
		},

		get(key) {
			track(reactiveTarget, key);
			return map.get(key);
		},

		set(key, value) {
			const hadKey = map.has(key);
			const oldValue = map.get(key);
			map.set(key, value);

			// 如果是新增 key 或值发生变化，触发更新
			if (!hadKey || oldValue !== value) {
				trigger(reactiveTarget, key);
				trigger(reactiveTarget, 'size');
			}

			return this; // 返回 this 以支持链式调用
		},

		delete(key) {
			const hadKey = map.has(key);
			const result = map.delete(key);

			if (hadKey) {
				trigger(reactiveTarget, key);
				trigger(reactiveTarget, 'size');
			}

			return result;
		},

		clear() {
			const hadEntries = map.size > 0;
			const oldKeys = Array.from(map.keys());

			map.clear();

			if (hadEntries) {
				// 触发所有旧 key 的更新
				oldKeys.forEach((key) => trigger(reactiveTarget, key));
				trigger(reactiveTarget, 'size');
			}
		},

		has(key) {
			track(reactiveTarget, key);
			return map.has(key);
		},

		keys() {
			return map.keys();
		},

		values() {
			return map.values();
		},

		entries() {
			return map.entries();
		},

		forEach(callback, thisArg) {
			return map.forEach(callback, thisArg);
		},

		watch(keys, callback, options = {}) {
			if (Array.isArray(keys)) {
				return useWatch(() => keys.map((key) => reactiveMap.get(key)), callback, options);
			}
			// 监听特定 key 的变化
			return useWatch(() => reactiveMap.get(keys), callback, options);
		},

		watchSize(callback, options = {}) {
			return useWatch(() => reactiveMap.size, callback, options);
		},

		toObjectReactive() {
			return useReactive(this.toObject());
		},

		toObject() {
			const obj = {};
			for (const [key, value] of map) {
				obj[key] = value;
			}
			return obj;
		},
	};

	return reactiveMap;
}
