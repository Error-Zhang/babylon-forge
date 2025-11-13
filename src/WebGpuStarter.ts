import { type EngineCapabilities, Scene, WebGPUEngine } from '@babylonjs/core';

/**
 * WebGPU引擎配置选项
 */
interface WebGPUEngineOptions {
	/** 抗锯齿 (默认: false) */
	antialias?: boolean;
	/** 适应设备像素比 (默认: true) */
	adaptToDeviceRatio?: boolean;
	/** 电源偏好 (默认: 'high-performance') */
	powerPreference?: 'high-performance' | 'low-power';
	/** 强制使用回退适配器 (默认: false) */
	forceFallbackAdapter?: boolean;
	/** 多重采样数量 (默认: 4) */
	sampleCount?: 1 | 4;
	/** 启用GPU调试 (默认: false) */
	enableGPUDebug?: boolean;
	/** 需要的WebGPU特性 */
	requiredFeatures?: GPUFeatureName[];
	/** 需要的WebGPU限制 */
	requiredLimits?: Record<string, number>;
	/** 最大帧率限制 */
	maxFPS?: number;
	/** 初始化完成回调 */
	onInitialized?: (engine: WebGPUEngine, info: WebGPUEngineInfo) => void;
	/** 错误回调 */
	onError?: (error: Error) => void;
}

/**
 * WebGPU引擎信息
 */
interface WebGPUEngineInfo {
	type: 'WebGPU';
	version: number;
	description: string;
	capabilities: EngineCapabilities;
	adapter: {
		vendor: string;
		architecture: string;
		device: string;
		description: string;
	};
	device: {
		label: string;
		features: GPUFeatureName[];
		limits: Record<string, number>;
	};
	canvas: {
		width: number;
		height: number;
		devicePixelRatio: number;
	};
}

/**
 * WebGPU特性支持检查结果
 */
interface WebGPUFeatureSupport {
	supported: boolean;
	reason?: string;
	supportedFeatures?: GPUFeatureName[];
	unsupportedFeatures?: GPUFeatureName[];
	adapterInfo?: GPUAdapterInfo;
}

/**
 * WebGPU设备限制信息
 */
interface WebGPUDeviceLimits {
	limits: Record<string, number>;
	features: GPUFeatureName[];
}

/**
 * 场景配置选项
 */
interface WebGPUSceneOptions {
	/** 使用右手坐标系 (默认: false) */
	useRightHandedSystem?: boolean;
	/** 启用物理引擎 (默认: false) */
	enablePhysics?: boolean;
	/** 启用计算着色器 (默认: true) */
	enableComputeShaders?: boolean;
	/** 为WebGPU优化 (默认: true) */
	optimizeForWebGPU?: boolean;
}

/**
 * 专用WebGPU引擎创建器
 * 仅支持WebGPU，不提供WebGL回退
 */
class WebGPUEngineCreator {
	/**
	 * 创建WebGPU引擎
	 */
	static async createEngine(canvasOrId: HTMLCanvasElement | string, config: WebGPUEngineOptions = {}): Promise<WebGPUEngine> {
		// 检查WebGPU支持
		await this._validateWebGPUSupport();

		// 获取画布
		const canvas = this._getCanvas(canvasOrId);
		if (!canvas) {
			throw new Error('Canvas element not found');
		}

		try {
			// 创建WebGPU引擎
			const engine = await this._createWebGPUEngine(canvas, config);

			// 设置引擎优化
			this._optimizeEngine(engine, config);

			// 执行回调
			const engineInfo = this._getEngineInfo(engine);
			config.onInitialized?.(engine, engineInfo);

			return engine;
		} catch (error) {
			const err = error as Error;
			config.onError?.(err);
			throw new Error(`WebGPU engine creation failed: ${err.message}`);
		}
	}

	/**
	 * 验证WebGPU支持
	 */
	private static async _validateWebGPUSupport(): Promise<void> {
		// 1. 检查基础WebGPU支持
		if (!navigator.gpu) {
			throw new Error('WebGPU not supported: navigator.gpu is not available');
		}

		// 2. 检查Babylon.js WebGPU引擎是否可用
		if (!WebGPUEngine) {
			throw new Error('Babylon.js WebGPU engine not available');
		}

		// 3. 必须先调用 IsSupportedAsync
		const isSupported = await WebGPUEngine.IsSupportedAsync;
		if (!isSupported) {
			throw new Error('WebGPU not supported by Babylon.js in this environment');
		}
	}

	/**
	 * 获取画布元素
	 */
	private static _getCanvas(canvasOrId: HTMLCanvasElement | string): HTMLCanvasElement | null {
		if (typeof canvasOrId === 'string') {
			return (document.getElementById(canvasOrId) as HTMLCanvasElement) || (document.querySelector(canvasOrId) as HTMLCanvasElement);
		}
		return canvasOrId instanceof HTMLCanvasElement ? canvasOrId : null;
	}

	/**
	 * 创建WebGPU引擎
	 */
	private static async _createWebGPUEngine(canvas: HTMLCanvasElement, config: WebGPUEngineOptions): Promise<WebGPUEngine> {
		const engine = new WebGPUEngine(canvas, config);

		// 设置最大帧率
		engine.maxFPS = config.maxFPS;

		// 启用调试模式
		if (config.enableGPUDebug) {
			(engine as any).enableOfflineSupport = false;
			(engine as any)._debugMode = true;
		}

		await engine.initAsync();

		console.log('WebGPU engine initialized successfully');
		return engine;
	}

	/**
	 * 优化引擎设置
	 */
	private static _optimizeEngine(engine: WebGPUEngine, config: WebGPUEngineOptions): void {
		// WebGPU特定优化
		engine.setHardwareScalingLevel(config.adaptToDeviceRatio ? 1 / window.devicePixelRatio : 1);

		// 启用WebGPU特有的优化
		const engineAny = engine as any;
		if (engineAny.setRenderPassDescriptor) {
			// 设置渲染通道优化
			engineAny.setRenderPassDescriptor({
				colorAttachments: [
					{
						clearValue: { r: 0, g: 0, b: 0, a: 1 },
						loadOp: 'clear',
						storeOp: 'store',
					},
				],
			});
		}
	}

	/**
	 * 获取引擎详细信息
	 */
	private static _getEngineInfo(engine: WebGPUEngine): WebGPUEngineInfo {
		const device = engine._device;
		const adapter = device.adapterInfo;
		return {
			type: 'WebGPU',
			version: engine.version,
			description: engine.description,
			capabilities: engine.getCaps(),
			adapter: {
				vendor: adapter.vendor || 'Unknown',
				architecture: adapter.architecture || 'Unknown',
				device: adapter.device || 'Unknown',
				description: adapter.description || 'Unknown',
			},
			device: {
				label: device.label || 'WebGPU Device',
				features: Array.from(device.features || []) as GPUFeatureName[],
				limits: device.limits,
			},
			canvas: {
				width: engine.getRenderWidth(),
				height: engine.getRenderHeight(),
				devicePixelRatio: window.devicePixelRatio,
			},
		};
	}

	/**
	 * 创建高性能配置的引擎
	 */
	static async createHighPerformanceEngine(canvasOrId: HTMLCanvasElement | string): Promise<WebGPUEngine> {
		return this.createEngine(canvasOrId, {
			antialias: true,
			adaptToDeviceRatio: true,
			powerPreference: 'high-performance',
			sampleCount: 4,
			onInitialized: (engine: WebGPUEngine, info: WebGPUEngineInfo) => {
				console.log('High-performance WebGPU engine ready');
				console.log('Engine info:', info);
			},
		});
	}

	/**
	 * 创建开发调试配置的引擎
	 */
	static async createDebugEngine(canvasOrId: HTMLCanvasElement | string): Promise<WebGPUEngine> {
		return this.createEngine(canvasOrId, {
			antialias: true,
			adaptToDeviceRatio: false,
			powerPreference: 'high-performance',
			sampleCount: 1,
			enableGPUDebug: true,
			maxFPS: 60,
			onInitialized: (engine: WebGPUEngine, info: WebGPUEngineInfo) => {
				console.log('Debug WebGPU engine ready');
				console.log('Engine info:', info);
			},
			onError: (error: Error) => {
				console.error('Debug engine creation failed:', error);
			},
		});
	}
}

/**
 * WebGPU场景管理器
 * 专门用于WebGPU场景的创建和管理
 */
class WebGPUSceneManager {
	private engine: WebGPUEngine;
	private scenes: Map<string, Scene>;

	constructor(engine: WebGPUEngine) {
		this.engine = engine;
		this.scenes = new Map();
	}

	/**
	 * 创建优化的WebGPU场景
	 */
	createScene(name: string, options: WebGPUSceneOptions = {}): Scene {
		const defaultOptions: Required<WebGPUSceneOptions> = {
			useRightHandedSystem: false,
			enablePhysics: false,
			enableComputeShaders: true,
			optimizeForWebGPU: true,
		};

		const config = { ...defaultOptions, ...options };
		const scene = new Scene(this.engine);

		// WebGPU特定优化
		if (config.optimizeForWebGPU) {
			this._optimizeSceneForWebGPU(scene);
		}

		// 启用计算着色器支持
		if (config.enableComputeShaders) {
			(scene as any)._computeShaderSupported = true;
		}

		this.scenes.set(name, scene);

		return scene;
	}

	/**
	 * 为WebGPU优化场景
	 */
	private _optimizeSceneForWebGPU(scene: Scene): void {
		// 启用WebGPU特有的渲染优化
		scene.getEngine().setHardwareScalingLevel(1);

		// 设置WebGPU友好的渲染设置
		scene.autoClear = true;
		scene.autoClearDepthAndStencil = true;

		// 启用实例化渲染
		scene.registerBeforeRender(() => {
			// TODO:WebGPU特定的每帧优化
		});
	}

	/**
	 * 获取场景
	 */
	getScene(name: string): Scene | undefined {
		return this.scenes.get(name);
	}

	/**
	 * 销毁场景
	 */
	disposeScene(name: string): void {
		const scene = this.scenes.get(name);
		if (scene) {
			scene.dispose();
			this.scenes.delete(name);
		}
	}

	/**
	 * 销毁所有场景
	 */
	disposeAll(): void {
		for (const [name, scene] of this.scenes) {
			scene.dispose();
		}
		this.scenes.clear();
	}

	/**
	 * 获取所有场景名称
	 */
	getSceneNames(): string[] {
		return Array.from(this.scenes.keys());
	}

	/**
	 * 获取场景数量
	 */
	getSceneCount(): number {
		return this.scenes.size;
	}
}

/**
 * WebGPU应用程序基类
 */
abstract class WebGPUApplication {
	protected engine!: WebGPUEngine;
	protected sceneManager!: WebGPUSceneManager;
	protected canvas!: HTMLCanvasElement;

	constructor(
		protected canvasId: string,
		private engineType: 'debug' | 'high' | 'custom',
		private options?: WebGPUEngineOptions
	) {}

	private async createEngine() {
		switch (this.engineType) {
			case 'debug':
				return WebGPUEngineCreator.createDebugEngine(this.canvasId);
			case 'high':
				return WebGPUEngineCreator.createHighPerformanceEngine(this.canvasId);
			case 'custom':
				return WebGPUEngineCreator.createEngine(this.canvasId, this.options);
		}
	}

	/**
	 * 初始化应用程序
	 */
	async initialize(): Promise<void> {
		try {
			// 创建引擎
			this.engine = await this.createEngine();

			// 创建场景管理器
			this.sceneManager = new WebGPUSceneManager(this.engine);

			// 获取画布
			this.canvas = this.engine.getRenderingCanvas() as HTMLCanvasElement;

			// 设置窗口大小变化处理
			window.addEventListener('resize', () => {
				this.engine.resize();
			});

			// 调用子类初始化方法
			await this.onInitialize();

			// 启动渲染循环
			this.startRenderLoop();

			this.onEngineInitialized();
		} catch (error) {
			console.error('WebGPU应用程序初始化失败:', error);
			this.onInitializationError?.(error as Error);
			throw error;
		}
	}

	/**
	 * 启动渲染循环
	 */
	protected startRenderLoop(): void {
		this.engine.runRenderLoop(() => {
			this.onRender();
		});
	}

	/**
	 * 销毁应用程序
	 */
	dispose(): void {
		this.sceneManager?.disposeAll();
		this.engine?.dispose();
		window.removeEventListener('resize', this.onResize);
	}

	/**
	 * 窗口大小变化处理
	 */
	protected onResize = (): void => {
		this.engine?.resize();
	};

	// 抽象方法 - 子类必须实现
	protected abstract onInitialize(): Promise<void>;

	protected abstract onRender(): void;

	// 可选的钩子方法
	protected onEngineInitialized(): void {}

	protected onInitializationError(error: Error): void {
		document.querySelector('#app')!.innerHTML = `
      <div style="text-align: center; margin-top: 50px;">
        <h2>WebGPU不支持</h2>
        <p>请使用支持WebGPU的现代浏览器 (Chrome 113+, Edge 113+)</p>
        <p>错误信息: ${error.message}</p>
      </div>
    `;
	}
}

export {
	WebGPUEngineCreator,
	WebGPUSceneManager,
	WebGPUApplication,
	type WebGPUEngineOptions,
	type WebGPUEngineInfo,
	type WebGPUFeatureSupport,
	type WebGPUDeviceLimits,
	type WebGPUSceneOptions,
};
