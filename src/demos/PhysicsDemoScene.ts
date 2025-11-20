import {
	Scene,
	HemisphericLight,
	Vector3,
	Texture,
	SceneLoader,
	PhysicsAggregate,
	PhysicsShapeType,
	HavokPlugin,
	HingeConstraint,
} from '@babylonjs/core';
import '@babylonjs/loaders';
import { SurvivalCamera } from '../player/PlayerCamera.js';
import { INJECT_TOKENS } from '../entry/constants.ts';
import { diContainer } from '@/global/DIContainer.ts';
import { DemoSceneClass } from '@/global/DemoSceneClass.ts';

/**
 * 物理演示场景
 */
class PhysicsDemoScene extends DemoSceneClass {
	async create() {
		const scene = new Scene(this.engine);
		diContainer.register(INJECT_TOKENS.MineScene, scene);
		// Havok physics
		const havok = new HavokPlugin(true);
		scene.enablePhysics(new Vector3(0, -9.8, 0), havok);
		// Camera
		const camera = new SurvivalCamera(new Vector3(3, 0.3, -8));

		// Light
		const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
		light.intensity = 0.7;

		// Load environment
		await SceneLoader.ImportMeshAsync(
			'',
			'https://raw.githubusercontent.com/CedricGuillemet/dump/master/CharController/',
			'levelTest.glb',
			scene
		);
		this.setupEnvironment(scene);

		return scene;
	}

	setupEnvironment(scene: any) {
		const lightmap = new Texture('https://raw.githubusercontent.com/CedricGuillemet/dump/master/CharController/lightmap.jpg', scene);

		const staticMeshes = ['level_primitive0', 'level_primitive1', 'level_primitive2'];
		staticMeshes.forEach((name) => {
			const mesh = scene.getMeshByName(name);
			new PhysicsAggregate(mesh, PhysicsShapeType.MESH);

			mesh.isPickable = false;

			mesh.material.lightmapTexture = lightmap;
			mesh.material.useLightmapAsShadowmap = true;
			mesh.material.lightmapTexture.uAng = Math.PI;
			mesh.material.lightmapTexture.level = 1.6;
			mesh.material.lightmapTexture.coordinatesIndex = 1;

			mesh.freezeWorldMatrix();
			mesh.doNotSyncBoundingInfo = true;
		});

		// Cube physics
		const cubes = ['Cube', 'Cube.001', 'Cube.002', 'Cube.003', 'Cube.004', 'Cube.005'];
		cubes.forEach((name) => {
			new PhysicsAggregate(scene.getMeshByName(name), PhysicsShapeType.BOX, { mass: 0.1 });
		});

		// Moving plane
		const planeMesh = scene.getMeshByName('Cube.006');
		planeMesh.scaling.set(0.03, 3, 1);

		const fixedMass = new PhysicsAggregate(scene.getMeshByName('Cube.007'), PhysicsShapeType.BOX, { mass: 0 });
		const plane = new PhysicsAggregate(planeMesh, PhysicsShapeType.BOX, { mass: 0.1 });

		// Joint
		const joint = new HingeConstraint(new Vector3(0.75, 0, 0), new Vector3(-0.25, 0, 0), new Vector3(0, 0, -1), new Vector3(0, 0, 1), scene);
		fixedMass.body.addConstraint(plane.body, joint);
	}
}
export default PhysicsDemoScene;
