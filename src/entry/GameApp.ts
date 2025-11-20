import { type InitConfig, WebGPUApplication } from '../core/WebGpuStarter.ts';
import { SceneManager } from '../managers/SceneManager.ts';
import { SCENE_MAPPINGS } from '@/entry/constants.ts';

class GameApp extends WebGPUApplication {
	public sceneManager!: SceneManager;

	protected override async onInitialize(scene: string, config: InitConfig): Promise<void> {
		this.sceneManager = new SceneManager(config).registerDemoScenes(SCENE_MAPPINGS);
		await this.sceneManager.loadScene(scene);
	}

	protected override onRender(dt: number) {
		this.sceneManager.render();
	}

	public dispose() {
		this.sceneManager.dispose();
	}
}

export default GameApp;
