import { Inject } from '@/global/Decorators.ts';
import { INJECT_TOKENS } from '@/entry/constants.ts';
import type { Scene, WebGPUEngine } from '@babylonjs/core';
import type { InitConfig } from '@/core/WebGpuStarter.ts';

export abstract class DemoSceneClass {
	@Inject(INJECT_TOKENS.Engine)
	protected engine!: WebGPUEngine;
	abstract create(config: InitConfig): Promise<Scene>;
	dispose() {}
}
