import GameApp from './GameApp.ts';

// 启动应用
async function startApp(): Promise<void> {
	const app = new GameApp('game-canvas');

	await app.initialize();
}

// 启动
startApp().catch(console.error);
