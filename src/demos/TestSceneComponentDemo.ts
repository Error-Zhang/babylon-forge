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
			this.createTestMesh();
			console.log('✅ TestSceneComponentDemo: onCreated 回调触发');
			console.log('   - Scene 已绑定:', !!this.scene);
			console.log('   - Engine 已注入:', !!this.engine);
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

			// 旋转立方体
			if (this.cube) {
				this.cube.rotation.y += this.rotationSpeed * deltaTime;
				this.cube.rotation.x += this.rotationSpeed * deltaTime * 0.5;
			}
		});

		// 每帧更新后的回调
		this.onAfterUpdate((deltaTime: number) => {
			if (this.frameCount % 120 === 0) {
				// 每120帧输出一次日志
				console.log(`🔄 TestSceneComponentDemo: onAfterUpdate - Frame ${this.frameCount}`);

				// 改变材质颜色
				if (this.material) {
					const time = Date.now() * 0.001;
					this.material.diffuseColor = new Color3(
						Math.sin(time) * 0.5 + 0.5,
						Math.cos(time) * 0.5 + 0.5,
						Math.sin(time + Math.PI) * 0.5 + 0.5
					);
				}
			}
		});

		// 组件销毁前的回调
		this.onDisposed(() => {
			console.log('🗑️ TestSceneComponentDemo: onDisposed 回调触发');
			this.cleanup();
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

		// 注册生命周期回调
		this.setupLifecycleCallbacks();
	}

	/**
	 * 创建测试用的网格对象
	 */
	private createTestMesh() {
		if (!this.scene) {
			console.error('❌ TestSceneComponentDemo: Scene 未初始化，无法创建网格');
			return;
		}

		console.log('🎨 TestSceneComponentDemo: 开始创建测试立方体');

		// 创建立方体
		this.cube = MeshBuilder.CreateBox('testCube', { size: 2 }, this.scene);
		this.cube.position = new Vector3(0, 1, 0);

		// 创建材质
		this.material = new StandardMaterial('testMaterial', this.scene);
		this.material.diffuseColor = new Color3(0.5, 0.8, 1.0);
		this.material.specularColor = new Color3(1, 1, 1);

		// 应用材质
		this.cube.material = this.material;

		console.log('✨ TestSceneComponentDemo: 测试立方体创建完成');
	}

	/**
	 * 清理资源
	 */
	private cleanup() {
		console.log('🧹 TestSceneComponentDemo: 开始清理资源');

		if (this.cube) {
			this.cube.dispose();
			this.cube = undefined;
			console.log('   - 立方体已销毁');
		}

		if (this.material) {
			this.material.dispose();
			this.material = undefined;
			console.log('   - 材质已销毁');
		}

		console.log('✅ TestSceneComponentDemo: 资源清理完成');
	}

	/**
	 * 获取组件状态信息
	 */
	public getStatus() {
		return {
			hasScene: !!this.scene,
			hasEngine: !!this.engine,
			hasCube: !!this.cube,
			hasMaterial: !!this.material,
			frameCount: this.frameCount,
			rotationSpeed: this.rotationSpeed,
		};
	}

	/**
	 * 设置旋转速度
	 */
	public setRotationSpeed(speed: number) {
		this.rotationSpeed = speed;
		console.log(`🎛️ TestSceneComponentDemo: 旋转速度设置为 ${speed}`);
	}

	/**
	 * 重置立方体位置和旋转
	 */
	public resetCube() {
		if (this.cube) {
			this.cube.position = new Vector3(0, 1, 0);
			this.cube.rotation = Vector3.Zero();
			console.log('🔄 TestSceneComponentDemo: 立方体位置和旋转已重置');
		}
	}

	/**
	 * 演示生命周期控制
	 */
	public demonstrateLifecycle() {
		console.log('\n🎭 开始演示生命周期控制...');

		// 显示当前状态
		console.log('📊 当前状态:', this.getStatus());

		// 设置不同的旋转速度
		setTimeout(() => {
			this.setRotationSpeed(2);
		}, 3000);

		setTimeout(() => {
			this.setRotationSpeed(0.5);
		}, 6000);

		// 重置立方体
		setTimeout(() => {
			this.resetCube();
		}, 9000);

		// 再次显示状态
		setTimeout(() => {
			console.log('📊 9秒后状态:', this.getStatus());
		}, 9500);
	}
}
export default TestSceneComponentDemo;
