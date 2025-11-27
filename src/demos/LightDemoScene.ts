import { Scene, HemisphericLight, PointLight, Vector3, MeshBuilder, StandardMaterial, Color3, ToHex } from '@babylonjs/core';
import { DemoSceneClass } from '@/global/DemoSceneClass.ts';
import { CreativeCamera } from '@/demos/player/PlayerCamera';

/**
 * 光照演示场景
 */
class LightDemoScene extends DemoSceneClass {
	async *create() {
		const scene = new Scene(this.engine);
		yield scene;
		const camera = new CreativeCamera(new Vector3(0, 5, -10));

		// 添加环境光
		const ambientLight = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), scene);
		ambientLight.intensity = 0.3;

		// 创建多个点光源
		const colors = [Color3.Red(), Color3.Green(), Color3.Blue(), Color3.Yellow(), Color3.Purple()];
		const positions = [new Vector3(-5, 3, -5), new Vector3(5, 3, -5), new Vector3(-5, 3, 5), new Vector3(5, 3, 5), new Vector3(0, 5, 0)];

		positions.forEach((pos, index) => {
			const pointLight = new PointLight(`pointLight${index}`, pos, scene);
			pointLight.diffuse = colors[index];
			pointLight.intensity = 0.8;
		});

		// 创建一些几何体来展示光照效果
		const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 2 }, scene);
		sphere.position = new Vector3(-3, 1, 0);

		const box = MeshBuilder.CreateBox('box', { size: 2 }, scene);
		box.position = new Vector3(3, 1, 0);

		const ground = MeshBuilder.CreateGround('ground', { width: 20, height: 20 }, scene);
		ground.position = new Vector3(0, 0, 0);

		// 为几何体添加材质
		const sphereMaterial = new StandardMaterial('sphereMaterial', scene);
		sphereMaterial.diffuseColor = Color3.Blue();
		sphere.material = sphereMaterial;

		const boxMaterial = new StandardMaterial('boxMaterial', scene);
		boxMaterial.diffuseColor = Color3.Yellow();
		box.material = boxMaterial;

		const groundMaterial = new StandardMaterial('groundMaterial', scene);
		groundMaterial.diffuseColor = Color3.Gray();
		ground.material = groundMaterial;
	}
}

export default LightDemoScene;
