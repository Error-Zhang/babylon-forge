// 若声明文件没有export默认会当作全局处理，不需要declare global否则会报错
import HK from '@babylonjs/havok';
declare global {
	interface Window {
		HK?: HK;
	}
}
