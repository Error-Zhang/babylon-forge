import { DemoSceneClass } from '@/global/DemoSceneClass.ts';
import { Scene, MeshBuilder, Vector3, HemisphericLight, FreeCamera, Color4, SceneLoader } from '@babylonjs/core';
import type { InitConfig } from '@/core/WebGpuStarter.ts';
import '@babylonjs/loaders';
/**
 * 测试 SceneComponent 生命周期的演示类
 * 继承自 DemoSceneClass，用于演示组件的各个生命周期阶段
 */
class ComponentDemoScene extends DemoSceneClass {
	private frameCount = 0;

	/**
	 * 设置生命周期回调函数
	 */
	private setupLifecycleCallbacks() {
		// 组件创建后的回调
		this.addCreatedHook(() => {
			console.log('✅ ComponentDemoScene: onCreated 回调触发');
		});

		// 组件挂载后的回调
		this.addMountedHook(() => {
			console.log('🚀 ComponentDemoScene: onMounted 回调触发');
		});

		// 每帧更新前的回调
		this.addBeforeUpdateHook((deltaTime: number) => {
			this.frameCount++;
			if (this.frameCount % 60 === 0) {
				// 每60帧输出一次日志
				console.log(`⏰ TestSceneComponentDemo: onBeforeUpdate - Frame ${this.frameCount}, DeltaTime: ${deltaTime.toFixed(3)}s`);
			}
		});

		// 每帧更新后的回调
		this.addAfterUpdateHook((deltaTime: number) => {
			if (this.frameCount % 60 === 0) {
				// 每60帧输出一次日志
				console.log(`🔄 TestSceneComponentDemo: onAfterUpdate - Frame ${this.frameCount}`);
			}
		});

		// 组件销毁前的回调
		this.addDisposedHook(() => {
			console.log('🗑️ ComponentDemoScene: onDisposed 回调触发');
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

		const box = MeshBuilder.CreateBox('box', { size: 1 }, scene);

		// 注册生命周期回调
		this.setupLifecycleCallbacks();
	}

	addCreatedHook(cb: any) {
		super.addCreatedHook(cb);
		console.log('该方法执行的时候会报错');
	}

	onCreated = () => {
		console.log('onCreated');
	};
}
export default ComponentDemoScene;
