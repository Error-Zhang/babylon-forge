import { type EngineCapabilities, WebGPUEngine } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { diContainer } from '@/global/DIContainer.ts';

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

class WebGPUEngineCreator {
	static async createEngine(canvasOrId: HTMLCanvasElement | string, config: WebGPUEngineOptions = {}): Promise<WebGPUEngine> {
		await this._validateWebGPUSupport();

		const canvas = this._getCanvas(canvasOrId);
		if (!canvas) {
			throw new Error('Canvas element not found');
		}

		try {
			const engine = await this._createWebGPUEngine(canvas, config);

			this._optimizeEngine(engine, config);

			const engineInfo = this._getEngineInfo(engine);
			config.onInitialized?.(engine, engineInfo);

			return engine;
		} catch (error) {
			const err = error as Error;
			config.onError?.(err);
			throw new Error(`WebGPU engine creation failed: ${err.message}`);
		}
	}

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

	private static _getCanvas(canvasOrId: HTMLCanvasElement | string): HTMLCanvasElement | null {
		if (typeof canvasOrId === 'string') {
			return (document.getElementById(canvasOrId) as HTMLCanvasElement) || (document.querySelector(canvasOrId) as HTMLCanvasElement);
		}
		return canvasOrId instanceof HTMLCanvasElement ? canvasOrId : null;
	}

	private static async _createWebGPUEngine(canvas: HTMLCanvasElement, config: WebGPUEngineOptions): Promise<WebGPUEngine> {
		const engine = new WebGPUEngine(canvas, config);

		engine.maxFPS = config.maxFPS;

		if (config.enableGPUDebug) {
			(engine as any).enableOfflineSupport = false;
			(engine as any)._debugMode = true;
		}

		await engine.initAsync();

		console.logSuccess('WebGPU engine initialized successfully');
		return engine;
	}

	private static _optimizeEngine(engine: WebGPUEngine, config: WebGPUEngineOptions) {
		engine.setHardwareScalingLevel(config.adaptToDeviceRatio ? 1 / window.devicePixelRatio : 1);

		const engineAny = engine as any;
		if (engineAny.setRenderPassDescriptor) {
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

	static async createHighPerformanceEngine(canvasOrId: HTMLCanvasElement | string): Promise<WebGPUEngine> {
		return this.createEngine(canvasOrId, {
			antialias: true,
			adaptToDeviceRatio: true,
			powerPreference: 'high-performance',
			sampleCount: 4,
			onInitialized: (engine: WebGPUEngine, info: WebGPUEngineInfo) => {
				console.logInfo('High-performance WebGPU Engine info:', info);
			},
		});
	}

	static async createDebugEngine(canvasOrId: HTMLCanvasElement | string): Promise<WebGPUEngine> {
		return this.createEngine(canvasOrId, {
			antialias: true,
			adaptToDeviceRatio: false,
			powerPreference: 'high-performance',
			sampleCount: 1,
			enableGPUDebug: true,
			maxFPS: 60,
			onInitialized: (engine: WebGPUEngine, info: WebGPUEngineInfo) => {
				console.logInfo('Debug WebGPU Engine info:', info);
			},
			onError: (error: Error) => {
				console.logError('Debug engine creation failed:', error);
			},
		});
	}
}

export type EngineMode = 'debug' | 'high' | 'custom';
export type InitConfig = { enablePhysics?: boolean | number };
abstract class WebGPUApplication {
	public engine!: WebGPUEngine;
	protected canvas!: HTMLCanvasElement;

	constructor(
		protected canvasId: string,
		private engineMode: EngineMode,
		private options?: WebGPUEngineOptions
	) {}

	private switchEngine() {
		switch (this.engineMode) {
			case 'debug':
				return WebGPUEngineCreator.createDebugEngine(this.canvasId);
			case 'high':
				return WebGPUEngineCreator.createHighPerformanceEngine(this.canvasId);
			case 'custom':
				return WebGPUEngineCreator.createEngine(this.canvasId, this.options);
		}
	}

	async initialize(scene: string, config?: InitConfig): Promise<void> {
		try {
			this.engine = await this.switchEngine();
			diContainer.register(WebGPUEngine, this.engine);

			this.canvas = this.engine.getRenderingCanvas() as HTMLCanvasElement;

			window.addEventListener('resize', () => {
				this.engine.resize();
			});

			if (config?.enablePhysics) await this.initPhysics();
			await this.onInitialize(scene, config);

			this.startRenderLoop();

			this.onEngineInitialized();
		} catch (error) {
			this.onInitializationError?.(error as Error);
			console.logError(error);
			throw new Error('WebGPU应用程序初始化失败:' + error);
		}
	}

	async initPhysics() {
		window.HK = await HavokPhysics({
			locateFile: (path) => `./havok/${path}`,
		});
	}

	private _renderLoops = new Set<(dt: number) => void>();

	public addRenderLoop(cb: (dt: number) => void) {
		this._renderLoops.add(cb);
	}

	protected startRenderLoop() {
		this.engine.runRenderLoop(() => {
			let dt = this.engine.getDeltaTime() / 1000;
			this.onRender(dt);
			this._renderLoops.forEach((renderLoop) => renderLoop(dt));
		});
	}

	destroy() {
		this.engine?.dispose();
		window.removeEventListener('resize', this.onResize);
	}

	protected onResize = () => {
		this.engine?.resize();
	};

	protected abstract onInitialize(scene: string, config?: InitConfig): Promise<void>;

	protected abstract onRender(dt: number): void;

	protected onEngineInitialized() {}

	protected onInitializationError(error: Error) {
		document.querySelector('#app')!.innerHTML = `
      <div style="text-align: center; margin-top: 50px;">
        <h2>WebGPU不支持</h2>
        <p>请使用支持WebGPU的现代浏览器 (Chrome 113+, Edge 113+)</p>
        <p>错误信息: ${error.message}</p>
      </div>
    `;
	}
}

export { WebGPUEngineCreator, WebGPUApplication, type WebGPUEngineOptions, type WebGPUEngineInfo };
