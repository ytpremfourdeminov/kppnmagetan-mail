import i18next from 'i18next';
import zh from './zh.js'
import en from './en.js'
import id from './id.js'

const resources = {
	zh: {
		translation: zh,
	},
	en: {
		translation: en,
	},
	id: {
		translation: id,
	},
};

i18next.init({
	lng: 'zh',
	fallbackLng: 'zh',
	resources,
});

export const t = (key, values) => i18next.t(key, values)

export function lngFromHeader(value) {
	const code = String(value || '').toLowerCase().trim();
	if (code.startsWith('en')) return 'en';
	if (code.startsWith('id')) return 'id';
	return 'zh';
}

export default i18next;
