import { WebGPUEngine, Scene, Camera, Vector3 } from '@babylonjs/core';
import { Inject } from '@/global/Decorators.ts';
import { SceneManager } from '@/managers/SceneManager.ts';
import { INJECT_TOKENS } from '@/entry/constants.ts';

/**
 * 坐标系信息接口
 */
export interface CoordinateSystemInfo {
	// 世界坐标系
	worldOrigin: Vector3;
	worldAxes: {
		x: Vector3;
		y: Vector3;
		z: Vector3;
	};

	// 摄像机信息
	camera: {
		position: Vector3;
		target: Vector3;
		rotation: Vector3;
		fov: number;
		near: number;
		far: number;
		mode: string;
	};
}

/**
 * 坐标系监控器配置
 */
export interface CanvasCoordinateMonitorConfig {
	precision?: number; // 小数点精度
}

/**
 * 坐标系监控器类
 * 用于监控Babylon.js的坐标系信息和摄像机位置
 */
export class CanvasCoordinateMonitor {
	@Inject(INJECT_TOKENS.CurrentScene)
	private scene!: Scene;

	@Inject(SceneManager)
	public readonly sceneManager!: SceneManager;

	private config: Required<CanvasCoordinateMonitorConfig>;
	private isRunning: boolean = false;

	constructor(config: CanvasCoordinateMonitorConfig = {}) {
		this.config = {
			precision: config.precision || 3,
		};
	}

	public updateScene() {
		this.scene = this.sceneManager.currentScene!;
	}

	/**
	 * 开始监控
	 */
	public start() {
		if (this.isRunning) return;
		this.isRunning = true;
	}

	/**
	 * 停止监控
	 */
	public stop() {
		if (!this.isRunning) return;
		this.isRunning = false;
	}

	/**
	 * 获取坐标系信息
	 */
	public getCoordinateSystemInfo(): CoordinateSystemInfo {
		if (!this.scene) {
			throw new Error('Scene not initialized');
		}

		// 获取活跃摄像机
		const activeCamera = this.scene.activeCamera;
		if (!activeCamera) {
			throw new Error('No active camera found');
		}

		// 世界坐标系信息
		const worldOrigin = Vector3.Zero();
		const worldAxes = {
			x: Vector3.Right(), // (1, 0, 0)
			y: Vector3.Up(), // (0, 1, 0)
			z: Vector3.Forward(), // (0, 0, 1)
		};

		// 摄像机信息
		const cameraInfo = {
			position: activeCamera.position.clone(),
			target: this.getCameraTarget(activeCamera),
			rotation: this.getCameraRotation(activeCamera),
			fov: this.getCameraFov(activeCamera),
			near: activeCamera.minZ,
			far: activeCamera.maxZ,
			mode: activeCamera.mode === Camera.PERSPECTIVE_CAMERA ? 'Perspective' : 'Orthographic',
		};

		return {
			worldOrigin,
			worldAxes,
			camera: cameraInfo,
		};
	}

	/**
	 * 获取摄像机目标点
	 */
	private getCameraTarget(camera: Camera): Vector3 {
		// 对于不同类型的摄像机，获取目标点的方式可能不同
		if ('getTarget' in camera && typeof camera.getTarget === 'function') {
			return (camera as any).getTarget();
		}

		// 如果没有目标点，计算摄像机前方的点
		const forward = camera.getForwardRay().direction.normalize();
		return camera.position.add(forward.scale(5)); // 缩短距离以便更好地显示
	}

	/**
	 * 获取摄像机旋转
	 */
	private getCameraRotation(camera: Camera): Vector3 {
		if ('rotation' in camera) {
			return (camera as any).rotation.clone();
		}

		return Vector3.Zero();
	}

	/**
	 * 获取摄像机视野角度
	 */
	private getCameraFov(camera: Camera): number {
		if ('fov' in camera) {
			return (camera as any).fov;
		}
		return 0;
	}

	/**
	 * 格式化Vector3为字符串
	 */
	public formatVector3(vector: Vector3): string {
		return `(${vector.x.toFixed(this.config.precision)}, ${vector.y.toFixed(this.config.precision)}, ${vector.z.toFixed(this.config.precision)})`;
	}

	/**
	 * 销毁监控器
	 */
	public destroy() {
		this.stop();
	}
}
