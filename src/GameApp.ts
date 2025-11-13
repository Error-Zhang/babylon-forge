// 基础使用示例
import { ArcRotateCamera, HemisphericLight, Mesh, MeshBuilder, type Scene, Vector3 } from '@babylonjs/core';
import { WebGPUApplication } from './WebGpuStarter.ts';
import { EnvConfig } from './configs';
import { BabylonPerformanceMonitor, BabylonPerformancePanel } from './Performance.ts';

class GameApp extends WebGPUApplication {
	private scene!: Scene;
	private camera!: ArcRotateCamera;
	private sphere!: Mesh;
	private performancePanel?: BabylonPerformancePanel;

	constructor(canvasId: string) {
		super(canvasId, EnvConfig.DEBUG ? 'debug' : 'high');
	}

	private usePerformancePanel() {
		const performanceMonitor = new BabylonPerformanceMonitor(this.engine, this.scene);
		// 创建性能监控面板
		this.performancePanel = new BabylonPerformancePanel(performanceMonitor);
		// 开始性能监控
		this.performancePanel.start();
	}

	protected async onInitialize(): Promise<void> {
		// 创建场景
		this.scene = this.sceneManager.createScene('main');

		// 创建相机
		this.camera = new ArcRotateCamera('camera', 0, 0, 10, Vector3.Zero(), this.scene);
		this.camera.attachControl(this.canvas);

		// 创建灯光
		const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);

		// 创建网格
		this.sphere = MeshBuilder.CreateSphere('sphere', { diameter: 2 }, this.scene);

		if (EnvConfig.DEBUG) this.usePerformancePanel();
	}

	protected onRender(): void {
		this.sphere.rotation.y += 0.01;
		this.scene.render();
	}

	/**
	 * 销毁游戏应用
	 */
	public dispose(): void {
		this.performancePanel?.destroy();
		// 调用父类销毁方法
		super.dispose();
	}
}

export default GameApp;
