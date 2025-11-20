export type INJECT_TOKEN = keyof typeof INJECT_TOKENS;

export const INJECT_TOKENS = {
	Engine: 'Engine',
	MineScene: 'MineScene',
	IsSceneLoading: 'IsSceneLoading',
} as const;

export const SCENE_NAMES = {
	PhysicsDemoScene: 'PhysicsDemoScene',
	LightDemoScene: 'LightDemoScene',
} as const;

export const SCENE_MAPPINGS = {
	[SCENE_NAMES.PhysicsDemoScene]: () => import('@/demos/PhysicsDemoScene.ts').then((m) => m.default),
	[SCENE_NAMES.LightDemoScene]: () => import('@/demos/LightDemoScene.ts').then((m) => m.default),
};
