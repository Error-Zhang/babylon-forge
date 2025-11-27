import { HavokPlugin, Scene, Vector3 } from '@babylonjs/core';
import { DemoSceneClass } from '@/global/DemoSceneClass.ts';
import { INJECT_TOKENS, SCENE_MAPPINGS } from '@/entry/constants.ts';
import { type Ref, useRef } from '@/core/reactivity';
import { diContainer } from '@/global/DIContainer.ts';
import type { InitConfig } from '@/core/WebGpuStarter.ts';
import type { SceneComponent } from '@/components/SceneComponent.ts';
import chrome from '@/utils/chrome.ts';

export class SceneManager {
	private sceneMap: Map<string, new () => DemoSceneClass> = new Map();
	private _currentScene?: Scene;
	public sceneComponent?: SceneComponent;

	private _isLoadingRef = useRef(false);
	private _isSceneCreatedRef = useRef(false);
	private _isSceneMountedRef = useRef(false);

	constructor(private config: InitConfig) {}

	get currentScene() {
		return this._currentScene;
	}

	public registerScene(key: string, sceneClass: { new (): DemoSceneClass }) {
		this.sceneMap.set(key, sceneClass);
		return this;
	}

	public registerDemoScenes(sceneMappings: Record<string, () => Promise<any>>) {
		// 注册所有预定义的场景
		Object.entries(sceneMappings).forEach(([key, importFn]) => {
			// 使用一个包装类来实现懒加载场景，以及后续拓展
			class SceneWrapper extends DemoSceneClass {
				async *create(config: InitConfig) {
					const SceneClass = await importFn();
					const instance = new SceneClass();
					const gen = instance.create(config);
					for await (const value of gen) {
						yield value;
					}
				}
			}

			this.registerScene(key, SceneWrapper);
		});
		return this;
	}

	public async loadScene(sceneKey: string) {
		if (this._isLoadingRef.value) {
			console.logWarn('Scene is already loading, please wait...');
			return;
		}

		try {
			if (!this.sceneMap.has(sceneKey)) {
				console.logError(`'${sceneKey}' is not registered`);
				return;
			}

			this.dispose();
			this._isLoadingRef.value = true;

			const importFn = SCENE_MAPPINGS[sceneKey as keyof typeof SCENE_MAPPINGS];
			if (!importFn) {
				console.logError(`No import function found for scene '${sceneKey}'`);
				return;
			}

			const SceneClass = await importFn();
			const sceneInstance = new SceneClass() as DemoSceneClass;

			const gen = sceneInstance.create(this.config);
			const { value: earlyScene } = await gen.next();

			this._currentScene = earlyScene as Scene;
			this._currentScene.metadata ??= {};
			this._currentScene.metadata.name = sceneKey;

			if (this.config.enablePhysics) {
				const havok = new HavokPlugin(true);
				const value = typeof this.config.enablePhysics === 'boolean' ? -9.8 : this.config.enablePhysics;
				this._currentScene.enablePhysics(new Vector3(0, value, 0), havok);
			}

			sceneInstance._attach(this._currentScene);

			diContainer.register(sceneKey, this._currentScene);
			diContainer.replace(INJECT_TOKENS.CurrentScene, this._currentScene);

			let result = await gen.next();
			while (!result.done) {
				result = await gen.next();
			}

			this._isSceneCreatedRef.value = true;
			chrome.urlQuery.set('scene', sceneKey);

			console.logSuccess(`'${sceneKey}' has created`);
			sceneInstance._runCreatedCallbacks();

			this.sceneComponent = sceneInstance;
			return this._currentScene;
		} catch (e) {
			console.logError(e);
		} finally {
			if (!this._currentScene) this._isLoadingRef.value = false;
			this._currentScene!.executeWhenReady(() => {
				console.logSuccess(`'${sceneKey}' has mounted.`);
				this.sceneComponent!._runMountedCallbacks();
				this._isLoadingRef.value = false;
				this._isSceneMountedRef.value = true;
			});
		}
	}

	public render() {
		this._currentScene?.render();
	}

	public getAvailableScenes(): string[] {
		return Array.from(this.sceneMap.keys());
	}

	public get isLoadingSceneRef(): Ref<boolean> {
		return this._isLoadingRef;
	}
	public get isSceneCreatedRef(): Ref<boolean> {
		return this._isSceneCreatedRef;
	}
	public get isSceneMounted(): Ref<boolean> {
		return this._isSceneMountedRef;
	}

	public dispose(): void {
		this.sceneComponent?.dispose();
		diContainer.remove(this._currentScene?.metadata?.name);
		this._isSceneCreatedRef.value = false;
		this._isSceneMountedRef.value = false;
	}
}
