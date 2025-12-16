export const enum INJECT_TOKENS {
	CurrentScene = 'CurrentScene',
}
export const SCENE_MAPPINGS = {
	PhysicsDemoScene: () => import('@/demos/PhysicsDemoScene.ts').then((m) => m.default),
	LightDemoScene: () => import('@/demos/LightDemoScene.ts').then((m) => m.default),
	TestSceneComponentDemo: () => import('@/demos/TestSceneComponentDemo.ts').then((m) => m.default),
	PropertyDemoScene: () => import('@/demos/PropertyDemoScene').then((m) => m.default),
};
