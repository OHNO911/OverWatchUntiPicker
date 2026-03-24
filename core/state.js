/**
 * core/state.js
 *
 * アプリケーションの状態管理。
 * - appState : アプリ全体の状態を一元管理するオブジェクト
 * - load/save : localStorage への永続化
 * - undo/redo : ヒーローデータ編集の履歴管理
 * - applyRoleQueueLimits : ロールキュー制限の適用
 *
 * DOM アクセス・描画処理は含まない。
 */

import { DEFAULT_HERO_DATA } from '../data/heroes.js';

/**
 * アプリ全体の状態。main.js と ui/render.js から参照する。
 * DOMから逆算するのではなく、ここを唯一の信頼できる状態源とする。
 */
export const appState = {
    /** @type {import('../data/heroes.js').HeroData[]} 現在のヒーローデータ（編集可能） */
    heroData: [...DEFAULT_HERO_DATA],

    /** @type {import('../data/heroes.js').HeroData[]} 現在選択されている敵ヒーロー */
    selectedHeroes: [],

    /** @type {boolean} ロールキューモードが有効か */
    isRoleQueue: true,

    /** @type {5|6} チームサイズ */
    teamSize: 5,

    /** @type {string[]} 推奨アンチピック欄のロール表示順 */
    roleOrder: ['tank', 'damage', 'support'],

    /** @type {string} 現在選択中のマップ（未選択時は空文字） */
    selectedMap: '',

    /** @type {number} マップ統計ウェイト(0.0〜1.0) */
    mapWeight: 0.35,

    /** @type {{byRank:Object, blended:Object, updatedAt:number, source?:string}|null} マップ統計 */
    mapWinRates: null,

    /** @type {Object.<string, string>} OverFast API から取得したヒーロー画像URLマップ */
    apiImages: {},

    // --- DBモーダルのトランジェント状態（モーダルを閉じたらリセット） ---
    /** @type {string|null} 現在編集中のヒーローID */
    currentEditingHeroId: null,

    /** @type {import('../data/heroes.js').HeroData|null} アンチ追加対象として選択されたヒーロー */
    currentAddingAntiHero: null,

    /** @type {Object.<string, boolean>} matchups 編集中フラグ（キー: heroId） */
    matchupEditingHeroes: {},

    /** @type {Object.<string, boolean>} アンチ削除モードフラグ（キー: heroId） */
    antiDeleteMode: {},

    // --- undo / redo 履歴 ---
    /** @type {string[]} JSON スナップショットのスタック */
    undoStack: [],

    /** @type {string[]} JSON スナップショットのスタック */
    redoStack: [],
};

// ---------------------------------------------------------------------------
// 永続化
// ---------------------------------------------------------------------------

/** heroData を localStorage に保存する */
export function saveHeroData() {
    localStorage.setItem('ow-anti-hero-data', JSON.stringify(appState.heroData));
}

/** localStorage から heroData を復元する */
export function loadHeroData() {
    const saved = localStorage.getItem('ow-anti-hero-data');
    if (saved) appState.heroData = JSON.parse(saved);
}

/** 設定（teamSize / isRoleQueue / roleOrder）を localStorage に保存する */
export function saveSettings() {
    const { teamSize, isRoleQueue, roleOrder, selectedMap, mapWeight } = appState;
    localStorage.setItem('ow-anti-settings', JSON.stringify({
        teamSize,
        isRoleQueue,
        roleOrder,
        selectedMap,
        mapWeight,
    }));
}

/** localStorage から設定を復元する */
export function loadSettings() {
    const saved = localStorage.getItem('ow-anti-settings');
    if (saved) {
        const s = JSON.parse(saved);
        appState.teamSize = s.teamSize ?? 5;
        appState.isRoleQueue = s.isRoleQueue ?? true;
        appState.roleOrder = s.roleOrder ?? ['tank', 'damage', 'support'];
        appState.selectedMap = s.selectedMap ?? '';
        appState.mapWeight = s.mapWeight ?? 0.35;
    }
}

// ---------------------------------------------------------------------------
// Undo / Redo
// ---------------------------------------------------------------------------

/** 現在の heroData をアンドゥスタックに積む（編集前に呼ぶ） */
export function saveToHistory() {
    appState.undoStack.push(JSON.stringify(appState.heroData));
    appState.redoStack = [];
}

/**
 * 直前の編集を元に戻す。
 * @returns {boolean} 元に戻せた場合は true
 */
export function undoHeroData() {
    if (appState.undoStack.length === 0) return false;
    appState.redoStack.push(JSON.stringify(appState.heroData));
    appState.heroData = JSON.parse(appState.undoStack.pop());
    return true;
}

/**
 * undo を再適用する。
 * @returns {boolean} やり直しができた場合は true
 */
export function redoHeroData() {
    if (appState.redoStack.length === 0) return false;
    appState.undoStack.push(JSON.stringify(appState.heroData));
    appState.heroData = JSON.parse(appState.redoStack.pop());
    return true;
}

/** heroData を DEFAULT_HERO_DATA に戻す（undo スタックに現状を積んでから実行） */
export function resetToDefault() {
    saveToHistory();
    appState.heroData = JSON.parse(JSON.stringify(DEFAULT_HERO_DATA));
}

// ---------------------------------------------------------------------------
// ロールキュー制限
// ---------------------------------------------------------------------------

/**
 * 現在の teamSize / isRoleQueue に従って selectedHeroes を制限する。
 * 超過分を末尾から削除する。
 */
export function applyRoleQueueLimits() {
    const counts = { tank: 0, damage: 0, support: 0 };
    appState.selectedHeroes = appState.selectedHeroes.filter(hero => {
        const limit = appState.teamSize === 6 ? 2 : (hero.role === 'tank' ? 1 : 2);
        counts[hero.role]++;
        return counts[hero.role] <= limit;
    });
}
