import type { Scene } from '@babylonjs/core';

type Callback = () => void;
type CallbackWithDelta = (dt: number) => void;

export abstract class SceneComponent {
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

	/** 生命周期：组件被实例化后（注册回调） */
	onCreated = (cb: Callback) => {
		this.#createdCbs.push(cb);
	};

	/** 生命周期：组件加入 Scene 后 */
	onMounted = (cb: Callback) => {
		this.#mountedCbs.push(cb);
	};

	/** 每帧更新前 */
	onBeforeUpdate = (cb: CallbackWithDelta) => {
		this.#beforeUpdateCbs.push(cb);
	};

	/** 每帧更新后 */
	onAfterUpdate = (cb: CallbackWithDelta) => {
		this.#afterUpdateCbs.push(cb);
	};

	/** 组件销毁前 */
	onDisposed = (cb: Callback) => {
		this.#disposedCbs.push(cb);
	};

	/** SceneManager 调用 */
	_runCreatedCallbacks() {
		for (const cb of this.#createdCbs) cb();
	}

	/** SceneManager 调用 */
	_runMountedCallbacks() {
		for (const cb of this.#mountedCbs) cb();
	}

	/** SceneManager 调用 */
	_attach = (scene: Scene) => {
		this._scene = scene;
		const dt = this.scene!.getEngine().getDeltaTime() / 1000;
		this.#attach_update(dt);
	};

	#attach_update = (dt: number) => {
		if (!this.scene) throw new Error('SceneComponent: scene is not attached');
		for (const cb of this.#beforeUpdateCbs) {
			this.scene.onBeforeRenderObservable.add(() => {
				cb(dt);
			});
		}
		for (const cb of this.#afterUpdateCbs) {
			this.scene.onAfterRenderObservable.add(() => {
				cb(dt);
			});
		}
	};

	dispose() {
		for (const cb of this.#disposedCbs) cb();

		// 清理所有回调（避免内存泄漏）
		this.#createdCbs.length = 0;
		this.#mountedCbs.length = 0;
		this.#beforeUpdateCbs.length = 0;
		this.#afterUpdateCbs.length = 0;
		this.#disposedCbs.length = 0;
	}
}
