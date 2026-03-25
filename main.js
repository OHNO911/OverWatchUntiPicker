/**
 * main.js
 *
 * エントリーポイント。
 * 各モジュールをインポートして組み合わせ、アプリケーションを初期化する。
 *
 * HTML の onclick 属性から呼び出せるように、必要な関数を window に公開する。
 * （ES Modules はデフォルトでスコープが閉じているため）
 */

import {
    appState,
    loadHeroData,
    loadSettings,
    saveHeroData,
    saveSettings,
    saveToHistory,
    undoHeroData,
    redoHeroData,
    applyRoleQueueLimits,
    resetToDefault,
} from './core/state.js';

import { calculateAntiScores, calculateTeamCompositions } from './core/calc.js';
import { getMapWinRates } from './core/map-stats.js';

import {
    renderHeroGrid,
    renderTeamSlots,
    renderAntiResults,
    renderDbTable,
    renderAntiPickerGrid,
    renderTeamCompositions,
    updateRoleQueueUI,
    applyRoleOrderUI,
    updateHistoryButtons,
    updateTeamSizeUI,
    renderMapControls,
} from './ui/render.js';

// ---------------------------------------------------------------------------
// 初期化
// ---------------------------------------------------------------------------

/** OverFast API からヒーロー画像 URL を取得する */
async function fetchImages() {
    try {
        const res = await fetch('https://overfast-api.tekrop.fr/heroes');
        const data = await res.json();
        const map = {};
        data.forEach(h => { map[h.key] = h.portrait; });
        return map;
    } catch {
        return {};
    }
}

window.onload = async () => {
    loadSettings();
    loadHeroData();
    appState.apiImages = await fetchImages();
    await syncMapStats();
    updateTeamSizeUI();
    updateRoleQueueUI();
    applyRoleOrderUI();
    changeTab(appState.activeRole || 'tank');
    updateUI();
};

// ---------------------------------------------------------------------------
// UI 更新（状態 → DOM の同期）
// ---------------------------------------------------------------------------

/**
 * チームスロットと現在のタブのヒーローグリッド、アンチ結果を再描画する。
 * 選択状態が変わったときに呼ぶ。
 */
function updateUI() {
    renderTeamSlots(removeHero);
    renderMapControls(refreshMapStats);

    renderHeroGrid(appState.activeRole, toggleHero, canSelectHero);

    updateAntiResults();
}

/** アンチピック結果を計算して描画する */
function updateAntiResults() {
    const scoredHeroes = calculateAntiScores(appState.selectedHeroes, appState.heroData, {
        mapWinRates: appState.mapWinRates?.blended,
        mapWeight: appState.mapWeight,
    });
    renderAntiResults(scoredHeroes);
    const compositions = calculateTeamCompositions(appState.selectedHeroes, appState.heroData, {
        mapWinRates: appState.mapWinRates?.blended,
        mapWeight: appState.mapWeight,
    });
    renderTeamCompositions(compositions);
}

/**
 * データ変更後の一連の後処理。
 * 履歴保存・localStorage 更新・DB テーブル再描画・アンチ結果更新を行う。
 *
 * @param {boolean} [shouldSaveHistory=true] - 呼び出し前に saveToHistory() が済んでいる場合は false
 */
function finalizeDataChange(shouldSaveHistory = true) {
    if (shouldSaveHistory) saveToHistory();
    saveHeroData();
    renderDbTable();
    updateAntiResults();
    updateHistoryButtons();
}

// ---------------------------------------------------------------------------
// チームサイズ・ロールキュー
// ---------------------------------------------------------------------------

function setTeamSize(size) {
    if (size !== 5) return;
    appState.teamSize = size;
    updateTeamSizeUI();
    if (appState.selectedHeroes.length > size) {
        appState.selectedHeroes = appState.selectedHeroes.slice(0, size);
    }
    if (appState.isRoleQueue) applyRoleQueueLimits();
    updateUI();
    saveSettings();
}

function toggleRoleQueue() {
    appState.isRoleQueue = true;
    applyRoleQueueLimits();
    updateRoleQueueUI();
    updateUI();
    saveSettings();
}

async function syncMapStats(forceRefresh = false) {
    if (!appState.selectedMap) {
        appState.mapWinRates = null;
        return;
    }
    try {
        appState.mapWinRates = await getMapWinRates(appState.selectedMap, forceRefresh);
    } catch {
        appState.mapWinRates = null;
    }
}

async function setMap(mapName) {
    appState.selectedMap = mapName;
    await syncMapStats();
    saveSettings();
    updateUI();
}

function setMapWeight(rawValue) {
    const v = Number(rawValue);
    if (Number.isNaN(v)) return;
    appState.mapWeight = Math.max(0, Math.min(1, v / 100));
    saveSettings();
    updateAntiResults();
    renderMapControls(refreshMapStats);
}

async function refreshMapStats() {
    await syncMapStats(true);
    updateUI();
}

// ---------------------------------------------------------------------------
// タブ・ロール並び替え
// ---------------------------------------------------------------------------

function changeTab(role) {
    appState.activeRole = role;
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active-tank', 'active-damage', 'active-support');
    });
    document.getElementById(`tab-${role}`)?.classList.add(`active-${role}`);
    renderHeroGrid(role, toggleHero, canSelectHero);
    saveSettings();
}

function moveRole(role, direction) {
    const idx = appState.roleOrder.indexOf(role);
    const newIdx = idx + direction;
    if (newIdx >= 0 && newIdx < appState.roleOrder.length) {
        [appState.roleOrder[idx], appState.roleOrder[newIdx]] =
            [appState.roleOrder[newIdx], appState.roleOrder[idx]];
        applyRoleOrderUI();
        saveSettings();
    }
}

// ---------------------------------------------------------------------------
// ヒーロー選択
// ---------------------------------------------------------------------------


function canSelectHero(hero) {
    const isAlreadySelected = appState.selectedHeroes.some(h => h.id === hero.id);
    if (isAlreadySelected) return true;
    if (appState.selectedHeroes.length >= appState.teamSize) return false;
    if (!appState.isRoleQueue) return true;

    const limit = appState.teamSize === 6 ? 2 : (hero.role === 'tank' ? 1 : 2);
    const currentCount = appState.selectedHeroes.filter(h => h.role === hero.role).length;
    return currentCount < limit;
}

function toggleHero(hero) {
    const idx = appState.selectedHeroes.findIndex(h => h.id === hero.id);
    if (idx >= 0) {
        appState.selectedHeroes.splice(idx, 1);
    } else {
        if (!canSelectHero(hero)) return;
        appState.selectedHeroes.push(hero);
    }
    updateUI();
}

function removeHero(hero) {
    appState.selectedHeroes = appState.selectedHeroes.filter(h => h.id !== hero.id);
    updateUI();
}

function clearTeam() {
    appState.selectedHeroes = [];
    updateUI();
}

// ---------------------------------------------------------------------------
// Undo / Redo
// ---------------------------------------------------------------------------

function undo() {
    if (undoHeroData()) finalizeDataChange(false);
}

function redo() {
    if (redoHeroData()) finalizeDataChange(false);
}

// ---------------------------------------------------------------------------
// データベースモーダル
// ---------------------------------------------------------------------------

function openDbModal() {
    appState.matchupEditingHeroes = {};
    appState.antiDeleteMode = {};
    updateHistoryButtons();
    document.getElementById('db-modal')?.classList.add('open');
    renderDbTable();
}

function closeDbModal() {
    document.getElementById('db-modal')?.classList.remove('open');
}

function resetHeroData() {
    if (confirm('データベースを初期状態に戻しますか？')) {
        resetToDefault();
        finalizeDataChange(false);
    }
}

function toggleMatchupEdit(heroId) {
    appState.matchupEditingHeroes[heroId] = !appState.matchupEditingHeroes[heroId];
    renderDbTable();
}

function toggleAntiDeleteMode(heroId) {
    appState.antiDeleteMode[heroId] = !appState.antiDeleteMode[heroId];
    renderDbTable();
}

function updateMatchup(heroId, type, delta) {
    const hero = appState.heroData.find(h => h.id === heroId);
    if (!hero) return;
    const newVal = (hero.matchups[type] || 2) + delta;
    if (newVal >= 1 && newVal <= 3) {
        saveToHistory();
        hero.matchups[type] = newVal;
        finalizeDataChange(false);
    }
}

function deleteAnti(heroId, antiName) {
    const hero = appState.heroData.find(h => h.id === heroId);
    if (hero && hero.antis[antiName] !== undefined) {
        saveToHistory();
        delete hero.antis[antiName];
        finalizeDataChange(false);
    }
}

function openAntiPicker(heroId) {
    appState.currentEditingHeroId = heroId;
    const picker = document.getElementById('anti-picker');
    if (!picker) return;
    renderAntiPickerGrid();
    picker.classList.remove('hidden');
}

function closeAntiPicker() {
    document.getElementById('anti-picker')?.classList.add('hidden');
}

function selectAntiHero(heroId) {
    appState.currentAddingAntiHero = appState.heroData.find(h => h.id === heroId);
    closeAntiPicker();

    const display = document.getElementById('selected-anti-display');
    const hero = appState.currentAddingAntiHero;
    if (display && hero) {
        const imgSrc = appState.apiImages[hero.id]
            || `https://static.playoverwatch.com/heroportrait/${hero.id}.png`;
        display.innerHTML = `
            <img src="${imgSrc}" class="w-16 h-16 object-contain mb-2">
            <div class="text-white font-black">${hero.name}</div>`;
    }

    document.getElementById('anti-rating-picker')?.classList.remove('hidden');
}

function closeAntiRatingPicker() {
    document.getElementById('anti-rating-picker')?.classList.add('hidden');
}

function saveNewAnti(rating) {
    const baseHero = appState.heroData.find(h => h.id === appState.currentEditingHeroId);
    if (baseHero && appState.currentAddingAntiHero) {
        saveToHistory();
        baseHero.antis[appState.currentAddingAntiHero.name] = rating;
        closeAntiRatingPicker();
        finalizeDataChange(false);
    }
}

// ---------------------------------------------------------------------------
// 展開・折りたたみ
// ---------------------------------------------------------------------------

function toggleExpand(role) {
    const moreDiv = document.getElementById(`more-${role}`);
    const arrow = document.querySelector(`#expand-${role} .arrow-icon`);
    if (moreDiv && arrow) {
        const isOpen = moreDiv.classList.toggle('open');
        arrow.classList.toggle('open', isOpen);
    }
}

// ---------------------------------------------------------------------------
// HTML の onclick 属性から呼び出せるよう window に公開
// ---------------------------------------------------------------------------

Object.assign(window, {
    setTeamSize,
    toggleRoleQueue,
    changeTab,
    moveRole,
    clearTeam,
    openDbModal,
    closeDbModal,
    resetHeroData,
    undo,
    redo,
    toggleMatchupEdit,
    toggleAntiDeleteMode,
    updateMatchup,
    deleteAnti,
    openAntiPicker,
    closeAntiPicker,
    selectAntiHero,
    closeAntiRatingPicker,
    saveNewAnti,
    toggleExpand,
    setMap,
    setMapWeight,
    refreshMapStats,
});
