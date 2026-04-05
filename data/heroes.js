/**
 * data/heroes.js
 *
 * ScriptableObject 相当の静的データを JSON から読み込むためのローダー。
 */

/**
 * @typedef {'tank'|'damage'|'support'} HeroRole
 * @typedef {'dive'|'rush'|'poke'|'null'} HeroArchetype
 *
 * @typedef {Object} HeroData
 * @property {string} id
 * @property {string} name
 * @property {HeroRole} role
 * @property {HeroArchetype} archetype
 * @property {{ dive:number, rush:number, poke:number }} matchups
 * @property {Object.<string, number>} antis
 */

let cachedDefaultHeroData = null;

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

/**
 * JSON のデフォルトヒーローデータを読み込む。
 * 初回のみ fetch し、2回目以降はキャッシュを返す。
 *
 * @returns {Promise<HeroData[]>}
 */
export async function getDefaultHeroData() {
    if (cachedDefaultHeroData) {
        return deepClone(cachedDefaultHeroData);
    }

    const res = await fetch('./data/heroes.json', { cache: 'no-cache' });
    if (!res.ok) {
        throw new Error(`Failed to load hero data: HTTP ${res.status}`);
    }

    const parsed = await res.json();
    if (!Array.isArray(parsed)) {
        throw new Error('Invalid hero data format: expected array');
    }

    cachedDefaultHeroData = parsed;
    return deepClone(cachedDefaultHeroData);
}
