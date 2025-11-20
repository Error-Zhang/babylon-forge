import { type EngineMode, type InitConfig, WebGPUApplication } from '../core/WebGpuStarter.ts';
import { SceneManager } from '../managers/SceneManager.ts';
import { SCENE_MAPPINGS } from '@/entry/constants.ts';

class GameApp extends WebGPUApplication {
	public readonly sceneManager!: SceneManager;

	get scene() {
		return this.sceneManager.currentScene;
	}

	constructor(canvasId: string, engineMode: EngineMode) {
		super(canvasId, engineMode);
		this.sceneManager = new SceneManager().registerDemoScenes(SCENE_MAPPINGS);
	}

	protected override async onInitialize(scene: string, config: InitConfig): Promise<void> {
		const urlParams = new URLSearchParams(window.location.search);
		const sceneType = scene || urlParams.get('scene') || '';
		if (!sceneType) {
			throw new Error(`No scene specified`);
		}
		await this.switchScene(sceneType);
	}

	protected override onRender(dt: number) {
		this.sceneManager.render();
	}

	public dispose() {
		this.sceneManager.dispose();
	}

	public async switchScene(sceneKey: string): Promise<boolean> {
		if (this.sceneManager.isLoadingSceneRef.value) {
			console.warn('Scene is already loading, cannot switch now');
			return false;
		}

		const success = await this.sceneManager.loadScene(sceneKey);

		if (success) {
			const url = new URL(window.location.href);
			url.searchParams.set('scene', sceneKey);
			window.history.replaceState({}, '', url);
			console.logLoading(`Switching to scene '${sceneKey}'`);
		}

		return success;
	}
}

export default GameApp;
