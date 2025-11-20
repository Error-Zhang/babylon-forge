import { Inject } from '@/global/Decorators.ts';
import { INJECT_TOKENS } from '@/entry/constants.ts';
import type { Scene, WebGPUEngine } from '@babylonjs/core';

export abstract class DemoSceneClass {
	@Inject(INJECT_TOKENS.Engine)
	protected engine!: WebGPUEngine;
	abstract create(): Promise<Scene>;
	dispose() {}
}
