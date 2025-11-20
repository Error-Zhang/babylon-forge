import { defineConfig } from 'vite';

export default defineConfig({
	resolve: {
		alias: {
			'@': '/src',
		},
	},
	assetsInclude: ['**/*.gltf', '**/*.glb'],
	base: './', // 让electron路径从相对路径生成（避免 file:// 错误）
	build: {
		target: 'esnext',
		minify: 'esbuild', // 使用 esbuild 进行压缩，速度快
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules')) {
						if (id.includes('@babylonjs')) return 'babylon';
						return 'vendor';
					}
				},
			},
		},
		assetsInlineLimit: 0, // 所有资源都单独打包为文件，不 inline
		cssCodeSplit: true, // 拆分 CSS
		emptyOutDir: true, // 每次构建清空 dist
	},
	worker: {
		format: 'es',
	},
	server: {
		port: 5173,
	},
});
