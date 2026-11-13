import BizError from '../error/biz-error';

// Mapping serviceId -> DeepL language code
const DEEPL_LANG = {
  'zh-Hans': 'ZH-HANS',
  'zh-Hant': 'ZH-HANT',
  'zh-TW': 'ZH-HANT',
  'en': 'EN-US',
  'en-US': 'EN-US',
  'en-GB': 'EN-GB',
  'id': 'ID',
  'ja': 'JA',
  'ko': 'KO',
  'fr': 'FR',
  'fr-CA': 'FR',
  'de': 'DE',
  'es': 'ES',
  'pt': 'PT-BR',
  'pt-PT': 'PT-PT',
  'ru': 'RU',
  'it': 'IT',
  'nl': 'NL',
  'pl': 'PL',
  'sv': 'SV',
  'da': 'DA',
  'fi': 'FI',
  'el': 'EL',
  'hu': 'HU',
  'ro': 'RO',
  'sk': 'SK',
  'sl': 'SL',
  'bg': 'BG',
  'cs': 'CS',
  'et': 'ET',
  'lt': 'LT',
  'lv': 'LV',
  'uk': 'UK',
  'tr': 'TR',
  'ar': 'AR',
  'nb': 'NB',
};

function deeplTargetCode(code) {
  const norm = String(code || '').toLowerCase();
  if (norm.startsWith('zh-hant') || norm === 'zh-tw' || norm === 'zh-hk') return 'ZH-HANT';
  if (norm.startsWith('zh')) return 'ZH-HANS';
  if (norm === 'en') return 'EN-US';
  if (norm === 'pt') return 'PT-BR';
  return DEEPL_LANG[code] || code.toUpperCase();
}

function deeplSourceCode(code) {
  if (!code || code === 'auto') return undefined;
  const norm = String(code).toLowerCase();
  if (norm.startsWith('zh')) return 'ZH';
  return code.toUpperCase();
}

let activeEnv = null;

const provider = {
  setEnv(env) {
    activeEnv = env;
  },

  /**
   * @param {string[]} texts  - Array of strings to translate
   * @param {string}   target - Target language code (e.g. 'id')
   * @param {string}   [source='auto'] - Source language code (e.g. 'zh-Hans')
   * @param {object}   [env]  - Worker environment bindings (optional override)
   */
  async translate(texts, target, source = 'auto', env = activeEnv) {
    const apiKey = env?.DEEPL_API_KEY || (typeof process !== 'undefined' ? process.env?.DEEPL_API_KEY : null) || globalThis.DEEPL_API_KEY;
    if (!apiKey) throw new BizError('翻译服务未配置 API 密钥（DEEPL_API_KEY）。', 503);

    const baseUrl = apiKey.endsWith(':fx')
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';

    const chunks = [];
    let chunk = [];
    for (const text of texts) {
      if (typeof text !== 'string' || text.length > 12000)
        throw new BizError('翻译文本过长，请分段处理。', 400);
      chunk.push(text);
      if (chunk.length >= 50) {
        chunks.push(chunk);
        chunk = [];
      }
    }
    if (chunk.length) chunks.push(chunk);

    const targetLang = deeplTargetCode(target);
    const sourceLang = deeplSourceCode(source);

    const translated = [];
    for (const batch of chunks) {
      let response, result;
      const requestPayload = {
        text: batch,
        target_lang: targetLang,
      };
      if (sourceLang) {
        requestPayload.source_lang = sourceLang;
      }
      if (source === 'zh-Hans') {
        requestPayload.context = 'Webmail application user interface: account login, log out of account, navigation, buttons, and settings.';
      }

      try {
        response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `DeepL-Auth-Key ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok)
          throw new BizError(`翻译服务请求失败（HTTP ${response.status}），请稍后重试。`, 503);
        result = await response.json();
      } catch (error) {
        if (error instanceof BizError) throw error;
        throw new BizError('翻译服务暂时不可用，请稍后重试。', 503);
      }

      if (!Array.isArray(result?.translations) || result.translations.length !== batch.length)
        throw new BizError('翻译服务返回了不完整的结果，请稍后重试。', 503);

      translated.push(...result.translations.map(item => item.text));
    }

    return translated;
  },
};

export default provider;
