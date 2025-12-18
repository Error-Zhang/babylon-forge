import type { IDisposable, Scene } from '@babylonjs/core';
import { Sealed } from '@/global/Decorators.ts';

type Callback = () => void;
type CallbackWithDelta = (dt: number) => void;

export abstract class SceneComponent implements IDisposable {
	private _scene?: Scene;

	public get scene() {
		return this._scene;
	}

	// 各生命周期的回调列表
	#createdCbs: Callback[] = [];
	#mountedCbs: Callback[] = [];
	#beforeUpdateCbs: CallbackWithDelta[] = [];
	#afterUpdateCbs: CallbackWithDelta[] = [];
	#disposedCbs: Callback[] = [];

	onCreated?: () => void;
	onMounted?: () => void;
	onBeforeUpdate?: () => void;
	onAfterUpdate?: () => void;
	onDisposed?: () => void;

	/** 生命周期：组件被实例化后 */
	@Sealed
	addCreatedHook(cb: Callback) {
		this.#createdCbs.push(cb);
	}

	/** 生命周期：组件资源全部加载完成后 */
	@Sealed
	addMountedHook(cb: Callback) {
		this.#mountedCbs.push(cb);
	}

	/** 每帧更新前 */
	@Sealed
	addBeforeUpdateHook(cb: CallbackWithDelta) {
		this.#beforeUpdateCbs.push(cb);
	}

	/** 每帧更新后 */
	@Sealed
	addAfterUpdateHook(cb: CallbackWithDelta) {
		this.#afterUpdateCbs.push(cb);
	}

	/** 组件销毁前 */
	@Sealed
	addDisposedHook(cb: Callback) {
		this.#disposedCbs.push(cb);
	}

	/** @internal */
	@Sealed
	_runCreatedCallbacks() {
		this.onCreated?.();
		for (const cb of this.#createdCbs) cb();
	}

	/** @internal */
	@Sealed
	_runMountedCallbacks() {
		this.onMounted?.();
		for (const cb of this.#mountedCbs) cb();
	}

	#runBeforeUpdateCallbacks(dt: number) {
		this.onBeforeUpdate?.();
		for (const cb of this.#beforeUpdateCbs) cb(dt);
	}

	#runAfterUpdateCallbacks(dt: number) {
		this.onAfterUpdate?.();
		for (const cb of this.#afterUpdateCbs) cb(dt);
	}

	/** @internal */
	@Sealed
	_attach(scene: Scene) {
		this._scene = scene;
		const dt = this.scene!.getEngine().getDeltaTime() / 1000;
		this.#attach_update(dt);
	}

	#attach_update = (dt: number) => {
		if (!this.scene) throw new Error('SceneComponent: scene is not attached');
		this.scene.onBeforeRenderObservable.add(() => {
			this.#runBeforeUpdateCallbacks(dt);
		});
		this.scene.onAfterRenderObservable.add(() => {
			this.#runAfterUpdateCallbacks(dt);
		});
	};

	dispose() {
		this.onDisposed?.();
		for (const cb of this.#disposedCbs) cb();

		// 清理所有回调（避免内存泄漏）
		this.#createdCbs.length = 0;
		this.#mountedCbs.length = 0;
		this.#beforeUpdateCbs.length = 0;
		this.#afterUpdateCbs.length = 0;
		this.#disposedCbs.length = 0;
	}
}
