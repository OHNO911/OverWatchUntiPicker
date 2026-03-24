/**
 * core/map-stats.js
 *
 * マップ別/ランク帯別のヒーロー勝率をスクレイピングで取得し、
 * localStorage にキャッシュする。
 */

const CACHE_KEY = 'ow-map-winrate-cache-v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12時間

/** UIで使うマップ一覧（value はプロバイダー向け英語表記） */
export const MAP_OPTIONS = [
    { label: '未選択', value: '' },
    { label: 'Busan', value: 'busan' },
    { label: 'Ilios', value: 'ilios' },
    { label: 'Lijiang Tower', value: 'lijiang tower' },
    { label: 'Oasis', value: 'oasis' },
    { label: 'Nepal', value: 'nepal' },
    { label: 'Circuit Royal', value: 'circuit royal' },
    { label: 'Dorado', value: 'dorado' },
    { label: 'Junkertown', value: 'junkertown' },
    { label: 'Rialto', value: 'rialto' },
    { label: 'Route 66', value: 'route 66' },
    { label: 'Havana', value: 'havana' },
    { label: 'King’s Row', value: 'king’s row' },
    { label: 'Eichenwalde', value: 'eichenwalde' },
    { label: 'Numbani', value: 'numbani' },
    { label: 'Paraiso', value: 'paraiso' },
    { label: 'Midtown', value: 'midtown' },
    { label: 'Shambali Monastery', value: 'shambali monastery' },
    { label: 'Colosseo', value: 'colosseo' },
    { label: 'Esperanca', value: 'esperanca' },
    { label: 'New Queen Street', value: 'new queen street' },
];

const RANKS = ['master', 'diamond'];

/** Overbuff英名 -> データ側 id */
const HERO_NAME_TO_ID = {
    'D.Va': 'dva',
    Doomfist: 'doomfist',
    Hazard: 'hazard',
    'Junker Queen': 'junker-queen',
    Mauga: 'mauga',
    Orisa: 'orisa',
    Ramattra: 'ramattra',
    Reinhardt: 'reinhardt',
    Roadhog: 'roadhog',
    Sigma: 'sigma',
    Winston: 'winston',
    'Wrecking Ball': 'wrecking-ball',
    Zarya: 'zarya',
    Ashe: 'ashe',
    Bastion: 'bastion',
    Cassidy: 'cassidy',
    Echo: 'echo',
    Freja: 'freja',
    Genji: 'genji',
    Hanzo: 'hanzo',
    Junkrat: 'junkrat',
    Mei: 'mei',
    Pharah: 'pharah',
    Reaper: 'reaper',
    Sojourn: 'sojourn',
    'Soldier: 76': 'soldier-76',
    Sombra: 'sombra',
    Symmetra: 'symmetra',
    Torbjorn: 'torbjorn',
    Tracer: 'tracer',
    Vendetta: 'vendetta',
    Venture: 'venture',
    Widowmaker: 'widowmaker',
    Ana: 'ana',
    Baptiste: 'baptiste',
    Brigitte: 'brigitte',
    Illari: 'illari',
    Juno: 'juno',
    Kiriko: 'kiriko',
    Lifeweaver: 'lifeweaver',
    Lucio: 'lucio',
    Mercy: 'mercy',
    Moira: 'moira',
    Wuyang: 'wuyang',
    Zenyatta: 'zenyatta',
};

function buildSourceUrl(map, rank) {
    const target = `https://www.overbuff.com/heroes?platform=pc&gameMode=competitive&skillTier=${rank}&map=${encodeURIComponent(map)}`;
    return `https://r.jina.ai/http://${target.replace(/^https?:\/\//, '')}`;
}

function parseWinRateLines(text) {
    const rows = text.split('\n');
    const winrates = {};

    rows.forEach(line => {
        const match = line.match(/\|\s*\[?([A-Za-z0-9.\-': ]+)\]?\s*\|[^|]*\|\s*([0-9]+(?:\.[0-9]+)?)%/);
        if (!match) return;
        const heroLabel = match[1].trim();
        const id = HERO_NAME_TO_ID[heroLabel];
        if (!id) return;
        winrates[id] = Number(match[2]);
    });

    return winrates;
}

function loadCache() {
    try {
        return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    } catch {
        return {};
    }
}

function saveCache(cache) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function isFresh(entry) {
    return Boolean(entry?.updatedAt) && (Date.now() - entry.updatedAt < CACHE_TTL_MS);
}

/**
 * マップの勝率データを取得（キャッシュ優先）。
 * 返値:
 * {
 *   byRank: { master: {heroId: rate}, diamond: {heroId: rate} },
 *   blended: { heroId: rate },
 *   source: 'cache' | 'network'
 * }
 */
export async function getMapWinRates(map, forceRefresh = false) {
    if (!map) return null;

    const cache = loadCache();
    const cached = cache[map];
    if (!forceRefresh && isFresh(cached)) {
        return { ...cached, source: 'cache' };
    }

    const byRank = { master: {}, diamond: {} };
    await Promise.all(RANKS.map(async rank => {
        const res = await fetch(buildSourceUrl(map, rank));
        if (!res.ok) return;
        const txt = await res.text();
        byRank[rank] = parseWinRateLines(txt);
    }));

    const blended = {};
    Object.keys(HERO_NAME_TO_ID).forEach(name => {
        const id = HERO_NAME_TO_ID[name];
        const m = byRank.master[id];
        const d = byRank.diamond[id];
        if (typeof m === 'number' && typeof d === 'number') blended[id] = (m + d) / 2;
        else if (typeof m === 'number') blended[id] = m;
        else if (typeof d === 'number') blended[id] = d;
    });

    const payload = { byRank, blended, updatedAt: Date.now() };
    cache[map] = payload;
    saveCache(cache);
    return { ...payload, source: 'network' };
}
