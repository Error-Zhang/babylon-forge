import { Scene, Sound, AbstractMesh } from '@babylonjs/core';
import { Inject } from '@/global/Decorators.ts';
import { INJECT_TOKENS } from '@/entry/constants.ts';
import { SingleClass } from '@/global/Singleton.ts';

export type SoundCategory = 'bgm' | 'sfx';

export class SoundManager extends SingleClass {
	@Inject(INJECT_TOKENS.CurrentScene)
	private readonly scene!: Scene;

	private categories: Record<SoundCategory, Map<string, Sound>> = {
		bgm: new Map(),
		sfx: new Map(),
	};

	private volumes = {
		bgm: 0.6,
		sfx: 1,
	};

	load(
		key: string,
		url: string,
		category: SoundCategory,
		options: {
			loop?: boolean;
			autoplay?: boolean;
			spatialSound?: boolean; // 3D 空间音效开关
			maxDistance?: number;
			volume?: number;
		} = {}
	): Promise<Sound> {
		return new Promise((resolve) => {
			if (this.categories[category].has(key)) {
				resolve(this.categories[category].get(key)!);
				return;
			}

			const sound = new Sound(
				key,
				url,
				this.scene,
				() => {
					sound.setVolume(options.volume ?? this.volumes[category]);
					resolve(sound);
				},
				{
					loop: options.loop ?? false,
					autoplay: options.autoplay ?? false,
					spatialSound: options.spatialSound ?? false,
					maxDistance: options.maxDistance ?? 50,
				}
			);

			this.categories[category].set(key, sound);
		});
	}

	play(category: SoundCategory, key: string) {
		const sound = this.categories[category].get(key);
		if (!sound) return;
		sound.setVolume(this.volumes[category]);
		sound.play();
	}

	stop(category: SoundCategory, key: string) {
		const sound = this.categories[category].get(key);
		if (!sound) return;
		sound.stop();
	}

	setVolume(category: SoundCategory, v: number) {
		this.volumes[category] = v;
		this.categories[category].forEach((s) => s.setVolume(v));
	}

	attachToMesh(key: string, mesh: AbstractMesh) {
		const sound = this.categories.sfx.get(key);
		if (!sound) return;
		sound.attachToMesh(mesh);
	}

	dispose() {
		for (const category of Object.values(this.categories)) {
			category.forEach((sound) => sound.dispose());
			category.clear();
		}
	}
}
