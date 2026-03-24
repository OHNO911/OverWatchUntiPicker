/**
 * core/map-stats.js
 *
 * 公式 Hero Statistics ページ（Overwatch）をスクレイピングし、
 * マップ別の勝率を localStorage にキャッシュする。
 */

const CACHE_KEY = 'ow-map-winrate-cache-v2';
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12時間

const STATS_PAGE_BASE = 'https://overwatch.blizzard.com/ja-jp/rates/';
const INPUT = 'PC';
const REGION = 'Asia';
const ROLE = 'All';
const RQ = '0';
const TIER = 'All';

/** UIで使うマップ一覧（value は内部共通名） */
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

const heroKeyToId = Object.entries(HERO_NAME_TO_ID).reduce((acc, [label, id]) => {
    acc[normalizeToken(label)] = id;
    return acc;
}, {});

function normalizeToken(value) {
    return String(value || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[’']/g, '')
        .replace(/[^A-Za-z0-9: .\-]/g, '')
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

function mapToQuerySlug(map) {
    if (!map) return 'all-maps';
    return normalizeToken(map)
        .replace(/:/g, '')
        .replace(/\./g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function buildSourceUrl(map) {
    const params = new URLSearchParams({
        input: INPUT,
        map: mapToQuerySlug(map),
        region: REGION,
        role: ROLE,
        rq: RQ,
        tier: TIER,
    });

    const target = `${STATS_PAGE_BASE}?${params.toString()}`;
    return `https://r.jina.ai/http://${target.replace(/^https?:\/\//, '')}`;
}

function isPercentLine(line) {
    return /^[0-9]+(?:\.[0-9]+)?%$/.test(line.trim());
}

function parseWinRateLines(text) {
    const lines = text
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);

    const winrates = {};
    for (let i = 0; i < lines.length - 2; i++) {
        const heroRaw = lines[i];
        const winRateRaw = lines[i + 1];
        const pickRateRaw = lines[i + 2];
        if (!isPercentLine(winRateRaw) || !isPercentLine(pickRateRaw)) continue;

        const heroId = heroKeyToId[normalizeToken(heroRaw)];
        if (!heroId) continue;

        winrates[heroId] = Number(winRateRaw.replace('%', ''));
        i += 2;
    }

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

    const res = await fetch(buildSourceUrl(map));
    if (!res.ok) {
        throw new Error(`Failed to fetch map stats: HTTP ${res.status}`);
    }

    const txt = await res.text();
    const parsed = parseWinRateLines(txt);

    const payload = {
        byRank: {
            master: { ...parsed },
            diamond: { ...parsed },
        },
        blended: parsed,
        updatedAt: Date.now(),
    };

    cache[map] = payload;
    saveCache(cache);
    return { ...payload, source: 'network' };
}
