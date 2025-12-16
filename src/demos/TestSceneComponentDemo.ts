import { DemoSceneClass } from '@/global/DemoSceneClass.ts';
import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, HemisphericLight, FreeCamera, Color4, SceneLoader } from '@babylonjs/core';
import type { InitConfig } from '@/core/WebGpuStarter.ts';
import '@babylonjs/loaders';
/**
 * 测试 SceneComponent 生命周期的演示类
 * 继承自 DemoSceneClass，用于演示组件的各个生命周期阶段
 */
class TestSceneComponentDemo extends DemoSceneClass {
	private cube?: any;
	private material?: StandardMaterial;
	private rotationSpeed = 1;
	private frameCount = 0;

	/**
	 * 设置生命周期回调函数
	 */
	private setupLifecycleCallbacks() {
		// 组件创建后的回调
		this.onCreated(() => {
			console.log('✅ TestSceneComponentDemo: onCreated 回调触发');
		});

		// 组件挂载后的回调
		this.onMounted(() => {
			console.log('🚀 TestSceneComponentDemo: onMounted 回调触发');
		});

		// 每帧更新前的回调
		this.onBeforeUpdate((deltaTime: number) => {
			this.frameCount++;
			if (this.frameCount % 60 === 0) {
				// 每60帧输出一次日志
				console.log(`⏰ TestSceneComponentDemo: onBeforeUpdate - Frame ${this.frameCount}, DeltaTime: ${deltaTime.toFixed(3)}s`);
			}
		});

		// 每帧更新后的回调
		this.onAfterUpdate((deltaTime: number) => {
			if (this.frameCount % 60 === 0) {
				// 每60帧输出一次日志
				console.log(`🔄 TestSceneComponentDemo: onAfterUpdate - Frame ${this.frameCount}`);
			}
		});

		// 组件销毁前的回调
		this.onDisposed(() => {
			console.log('🗑️ TestSceneComponentDemo: onDisposed 回调触发');
		});
	}

	/**
	 * 创建场景的异步生成器方法
	 * 这是 DemoSceneClass 要求实现的抽象方法
	 */
	async *create(config: InitConfig): AsyncGenerator<Scene> {
		// 创建场景
		const scene = new Scene(this.engine);
		// 返回场景
		yield scene;
		scene.clearColor = new Color4(0.2, 0.2, 0.3);

		// 设置相机
		const camera = new FreeCamera('camera', new Vector3(0, 5, -10), scene);
		camera.setTarget(Vector3.Zero());

		// 添加光源
		const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
		light.intensity = 0.7;

		// const box = MeshBuilder.CreateBox('box', { size: 1 }, scene);

		// 注册生命周期回调
		this.setupLifecycleCallbacks();
	}
}
export default TestSceneComponentDemo;
