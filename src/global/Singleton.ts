import type { ConstructorOf } from '@/misc/type-utils.ts';

export abstract class Singleton {
	private static instances = new Map<Function, SingleClass>();

	public static create<T extends SingleClass>(clazz: ConstructorOf<T>, ...args: ConstructorParameters<ConstructorOf<T>>): T {
		if (this.instances.has(clazz)) {
			console.warn(`Instance ${this.name} already exists`);
			return <T>this.instances.get(clazz);
		}
		const instance = Reflect.construct(clazz, args);
		this.instances.set(clazz, instance);
		return instance;
	}

	public static createPromise<T extends SingleClass>(clazz: ConstructorOf<T>, ...args: ConstructorParameters<ConstructorOf<T>>): Promise<T> {
		return Promise.resolve(this.create(clazz, ...args));
	}

	public static disposeAll() {
		this.instances.forEach((instance) => instance.dispose?.());
		this.instances.clear();
	}

	public static dispose<T extends SingleClass>(clazz: ConstructorOf<T>) {
		this.instances.get(clazz)?.dispose?.();
		this.instances.delete(clazz);
	}

	static getInstance<T extends SingleClass>(clazz: ConstructorOf<T>) {
		if (!this.instances.has(clazz)) {
			throw new Error('Singleton not initialized. Call create() first.');
		}
		return <T>this.instances.get(clazz);
	}
}

export abstract class SingleClass {
	public static get Instance() {
		return Singleton.getInstance(this);
	}

	public static getInstance<T extends SingleClass>() {
		return Singleton.getInstance(this) as T;
	}

	public abstract dispose(): void;
}
