export abstract class Singleton {
	private static instances = new Map<Function, SingleClass>();

	public static create<T extends SingleClass, C extends new (...args: any[]) => T>(clazz: C, ...args: ConstructorParameters<C>): T {
		if (this.instances.has(clazz)) {
			return <T>this.instances.get(clazz);
		}
		const instance = Reflect.construct(clazz, args);
		this.instances.set(clazz, instance);
		return instance;
	}

	public static disposeAll() {
		this.instances.forEach((instance) => instance.dispose?.());
		this.instances.clear();
	}

	public static dispose<T extends SingleClass>(clazz: new (...args: any[]) => T) {
		this.instances.get(clazz)?.dispose?.();
		this.instances.delete(clazz);
	}

	protected static getInstance<T extends SingleClass>(clazz: new (...args: any[]) => T) {
		if (!this.instances.has(clazz)) {
			throw new Error('Singleton not initialized. Call create() first.');
		}
		return <T>this.instances.get(clazz);
	}
}

export class SingleClass extends Singleton {
	/**
	 * @deprecated
	 * 请使用getInstance作为替代
	 */
	public static get Instance(): SingleClass {
		return this.getInstance();
	}

	public static dispose() {
		super.dispose(this);
	}

	public static getInstance<T extends SingleClass>() {
		return <T>super.getInstance(this);
	}

	public dispose?() {}
}
