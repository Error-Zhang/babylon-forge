import { Inject } from '@/global/Decorators.ts';
import { type Scene, WebGPUEngine } from '@babylonjs/core';
import type { InitConfig } from '@/core/WebGpuStarter.ts';
import { SceneComponent } from '@/components/SceneComponent.ts';

export abstract class DemoSceneClass extends SceneComponent {
	@Inject(WebGPUEngine)
	protected engine!: WebGPUEngine;
	abstract create(config: InitConfig): AsyncGenerator<Scene>;
}
