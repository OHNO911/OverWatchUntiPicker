/**
 * ui/render.js
 *
 * DOM 描画ロジック。
 * appState を読み取り、DOM を更新する関数群。
 * 状態を直接変更しない（読み取り専用でアクセスする）。
 *
 * ヒーローカードやスロットへのクリック処理は、コールバックとして main.js から受け取る。
 * これにより render.js が main.js に依存しない構造を保つ。
 */

import { appState } from '../core/state.js';
import { MAP_OPTIONS } from '../core/map-stats.js';

// ---------------------------------------------------------------------------
// ヒーロー選択グリッド
// ---------------------------------------------------------------------------

/**
 * 指定ロールのヒーロー選択グリッドを描画する。
 *
 * @param {string} role - 'tank' | 'damage' | 'support'
 * @param {function(HeroData): void} onToggleHero - カードクリック時のコールバック
 * @param {(hero: HeroData) => boolean} [canSelectHero] - 選択可能か判定する関数
 */
export function renderHeroGrid(role, onToggleHero, canSelectHero = () => true) {
    const grid = document.getElementById('hero-grid');
    if (!grid) return;
    grid.innerHTML = '';

    appState.heroData.filter(h => h.role === role).forEach(hero => {
        const isSelected = appState.selectedHeroes.some(h => h.id === hero.id);
        const isSelectable = canSelectHero(hero);
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `hero-card rounded-lg ${isSelected ? 'active' : ''} ${isSelectable ? '' : 'is-locked'}`;
        card.setAttribute('aria-pressed', String(isSelected));
        card.disabled = !isSelectable && !isSelected;
        card.title = !isSelectable && !isSelected ? '現在のチーム条件では選択できません' : hero.name;
        card.innerHTML = `
            <div class="badge badge-${hero.archetype}">${hero.archetype}</div>
            <div class="hero-img-container">
                <img src="${_heroImg(hero)}" class="hero-img" alt="${hero.name}">
            </div>
            <div class="hero-label">${hero.name}</div>`;
        card.onclick = () => onToggleHero(hero);
        grid.appendChild(card);
    });
}

// ---------------------------------------------------------------------------
// チームスロット
// ---------------------------------------------------------------------------

/**
 * チームスロット（敵選択欄）を描画する。
 *
 * @param {function(HeroData): void} onRemoveHero - スロットクリック時のコールバック
 */
export function renderTeamSlots(onRemoveHero) {
    const container = document.getElementById('team-slots');
    if (!container) return;
    container.innerHTML = '';

    if (appState.isRoleQueue) {
        const roles = appState.teamSize === 6
            ? ['tank', 'tank', 'damage', 'damage', 'support', 'support']
            : ['tank', 'damage', 'damage', 'support', 'support'];
        roles.forEach((role, i) => {
            const sameRoleSelected = appState.selectedHeroes.filter(h => h.role === role);
            const roleOccurrence = roles.slice(0, i).filter(r => r === role).length;
            _renderSlot(container, sameRoleSelected[roleOccurrence], role, onRemoveHero);
        });
    } else {
        for (let i = 0; i < appState.teamSize; i++) {
            _renderSlot(container, appState.selectedHeroes[i], null, onRemoveHero);
        }
    }
}

/**
 * スロット1つを描画してコンテナに追加する（内部ヘルパー）。
 *
 * @param {HTMLElement} container
 * @param {HeroData|undefined} hero
 * @param {string|null} fixedRole
 * @param {function(HeroData): void} onRemoveHero
 */
function _renderSlot(container, hero, fixedRole, onRemoveHero) {
    const slot = document.createElement('div');
    const roleColor = hero
        ? (hero.role === 'tank' ? 'tank' : (hero.role === 'damage' ? 'dps' : 'sup'))
        : '';
    slot.className = `slot aspect-square rounded-xl ${hero ? 'slot-filled neon-border-' + roleColor : ''}`;

    if (hero) {
        slot.onclick = () => onRemoveHero(hero);
        slot.innerHTML = `
            <div class="badge badge-${hero.archetype}">${hero.archetype}</div>
            <div class="hero-img-container">
                <img src="${_heroImg(hero)}" class="hero-img" alt="${hero.name}">
            </div>
            <div class="hero-label">${hero.name}</div>`;
    } else {
        const roleLabels = { tank: 'タンク', damage: 'ダメージ', support: 'サポート' };
        const label = fixedRole ? roleLabels[fixedRole] : '（空き）';
        slot.innerHTML = `<span class="text-[8px] uppercase text-slate-500 font-black">${label}</span>`;
    }

    container.appendChild(slot);
}

// ---------------------------------------------------------------------------
// 推奨アンチピック結果
// ---------------------------------------------------------------------------

/**
 * 推奨アンチピックの結果を描画する。
 *
 * @param {ScoredHero[]} scoredHeroes - calculateAntiScores() の戻り値
 */
export function renderAntiResults(scoredHeroes) {
    const resultsDiv = document.getElementById('analysis-results');
    const placeholder = document.getElementById('analysis-placeholder');
    if (!resultsDiv || !placeholder) return;

    if (appState.selectedHeroes.length === 0) {
        resultsDiv.classList.add('hidden');
        placeholder.classList.remove('hidden');
        return;
    }

    placeholder.classList.add('hidden');
    resultsDiv.classList.remove('hidden');

    ['tank', 'damage', 'support'].forEach(role => {
        const topContainer = document.getElementById(`results-${role}`);
        const moreContainer = document.getElementById(`more-${role}`);
        if (!topContainer || !moreContainer) return;

        const roleHeroes = scoredHeroes
            .filter(h => h.role === role)
            .sort((a, b) => b.score - a.score);

        // 同スコアには同じ順位を付与
        let currentRank = 0;
        let lastScore = -1;
        roleHeroes.forEach(h => {
            if (h.score !== lastScore) { currentRank++; lastScore = h.score; }
            h.rank = currentRank;
        });

        const color = role === 'tank' ? '#3b82f6' : (role === 'damage' ? '#ef4444' : '#22c55e');
        const topDisplay = roleHeroes.filter(h => h.rank <= 3).length >= 3
            ? roleHeroes.filter(h => h.rank <= 3)
            : roleHeroes.slice(0, 3);

        topContainer.innerHTML = topDisplay.map(h => _renderHeroRow(h, role, color)).join('');
        moreContainer.innerHTML = roleHeroes.slice(topDisplay.length).map(h => _renderHeroRow(h, role, color)).join('');
    });
}

/**
 * おすすめ構成（5人セット）を描画する。
 *
 * @param {Array<{
 *  rank:number,
 *  name:string,
 *  team:Array<{id:string,name:string,role:string}>,
 *  breakdown:{counter:number,synergy:number,mapFit:number,difficultyPenalty:number,total:number},
 *  reasons:string[]
 * }>} compositions
 */
export function renderTeamCompositions(compositions) {
    const container = document.getElementById('team-composition-results');
    const empty = document.getElementById('team-composition-empty');
    if (!container || !empty) return;

    if (!compositions || compositions.length === 0) {
        container.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    container.innerHTML = compositions.map(comp => {
        const team = comp.team.map(h => `
            <div class="flex items-center gap-2 bg-slate-900/60 border border-slate-700 rounded px-2 py-1">
                <img src="${_heroImg(h)}" alt="${h.name}" class="w-6 h-6 object-contain">
                <span class="text-[10px] font-bold text-slate-200">${h.name}</span>
            </div>
        `).join('');

        return `
            <div class="team-card bg-slate-900/80 border border-slate-700 rounded-xl p-3 space-y-2">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">#${comp.rank}</span>
                        <h5 class="text-sm font-black text-slate-100">${comp.name}</h5>
                    </div>
                    <span class="text-xs font-black text-cyan-300">総合 ${comp.breakdown.total}</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${team}</div>
                <div class="grid grid-cols-2 gap-1 text-[10px]">
                    <span class="text-slate-300">Counter: <b>${comp.breakdown.counter}</b></span>
                    <span class="text-slate-300">Synergy: <b>${comp.breakdown.synergy}</b></span>
                    <span class="text-slate-300">MapFit: <b>${comp.breakdown.mapFit}</b></span>
                    <span class="text-slate-300">Diff: <b>-${comp.breakdown.difficultyPenalty}</b></span>
                </div>
                <ul class="text-[10px] text-slate-400 list-disc pl-4 space-y-0.5">
                    ${comp.reasons.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>
        `;
    }).join('');
}

// ---------------------------------------------------------------------------
// マップ統計UI
// ---------------------------------------------------------------------------

/**
 * マップ選択・ウェイト表示を状態に同期する
 *
 * @param {() => void} onRefreshMapStats
 */
export function renderMapControls(onRefreshMapStats) {
    const select = document.getElementById('map-select');
    const slider = document.getElementById('map-weight');
    const sliderLabel = document.getElementById('map-weight-label');
    const cacheLabel = document.getElementById('map-cache-status');
    const refreshBtn = document.getElementById('map-refresh-btn');
    if (!select || !slider || !sliderLabel || !cacheLabel || !refreshBtn) return;

    if (select.options.length === 0) {
        MAP_OPTIONS.forEach(o => {
            const option = document.createElement('option');
            option.value = o.value;
            option.textContent = o.label;
            select.appendChild(option);
        });
    }
    select.value = appState.selectedMap;
    slider.value = Math.round((appState.mapWeight || 0) * 100);
    sliderLabel.textContent = `${slider.value}%`;

    if (!appState.selectedMap) {
        cacheLabel.textContent = 'マップ補正: 未選択';
    } else if (!appState.mapWinRates) {
        cacheLabel.textContent = 'マップ補正: 取得待ち';
    } else {
        const date = new Date(appState.mapWinRates.updatedAt);
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const src = appState.mapWinRates.source === 'cache' ? 'cache' : 'network';
        cacheLabel.textContent = `マップ補正: ${src} ${hh}:${mm}`;
    }

    refreshBtn.onclick = onRefreshMapStats;
}

/**
 * ランキング1行分の HTML を生成する（内部ヘルパー）。
 *
 * @param {ScoredHero} h
 * @param {string} role
 * @param {string} color - CSS カラー文字列
 * @returns {string}
 */
function _renderHeroRow(h, role, color) {
    const displayScore = Math.round(h.score * 10) / 10;
    return `
        <div class="rank-card role-${role} ${h.rank <= 3 ? 'rank-' + h.rank : ''} p-2 rounded flex items-center gap-3"
             onclick="this.classList.toggle('is-expanded')" style="color: ${color}">
            <div class="w-10 h-10 rounded bg-slate-900 overflow-hidden flex-shrink-0 p-0.5">
                <img src="${_heroImg(h)}" class="w-full h-full object-contain">
            </div>
            <div class="flex-grow min-w-0">
                <div class="flex justify-between items-start gap-1">
                    <span class="text-[10px] font-black uppercase text-slate-100 truncate">${h.name}</span>
                    <span class="font-black text-[10px] flex-shrink-0">${displayScore}%</span>
                </div>
                <div class="w-full bg-slate-950 h-1 rounded-full overflow-hidden my-1">
                    <div class="h-full" style="width: ${displayScore}%; background-color:${color}"></div>
                </div>
                <div class="labels-container">
                    ${h.advantages.map(l => `<span class="label-item bg-blue-500/20 text-blue-300 border-blue-500/30">${l}</span>`).join('')}
                    ${h.disadvantages.map(l => `<span class="label-item bg-red-500/20 text-red-300 border-red-500/30">${l}</span>`).join('')}
                </div>
            </div>
        </div>`;
}

// ---------------------------------------------------------------------------
// データベースモーダル
// ---------------------------------------------------------------------------

/** ヒーロー相性データベーステーブルを描画する */
export function renderDbTable() {
    const container = document.getElementById('db-table-container');
    if (!container) return;

    const sorted = [...appState.heroData].sort((a, b) => {
        if (a.role !== b.role) {
            if (a.role === 'tank') return -1;
            if (b.role === 'tank') return 1;
            if (a.role === 'damage') return -1;
            return 1;
        }
        return a.name.localeCompare(b.name, 'ja');
    });

    const roleLabels = { tank: 'タンク', damage: 'ダメージ', support: 'サポート' };
    const roleColors = {
        tank: 'bg-blue-600/10 text-blue-400',
        damage: 'bg-red-600/10 text-red-400',
        support: 'bg-green-600/10 text-green-400',
    };

    let html = `<div class="divide-y divide-slate-900">`;
    let currentRole = '';

    sorted.forEach(h => {
        if (currentRole !== h.role) {
            currentRole = h.role;
            html += `<div class="${roleColors[h.role]} pl-4 py-1.5 text-[10px] font-black tracking-widest border-b border-slate-900 uppercase">${roleLabels[h.role]}</div>`;
        }

        const isEditing = appState.matchupEditingHeroes[h.id];
        const isDeleting = appState.antiDeleteMode[h.id];
        const m = h.matchups;

        const renderStepper = (type, val) => {
            const colorClass = val <= 1 ? 'text-blue-400' : val >= 3 ? 'text-red-400' : 'text-slate-400';
            if (isEditing) {
                return `
                <div class="flex flex-col items-center">
                    <button onclick="updateMatchup('${h.id}', '${type}', 1)" class="stepper-btn">▲</button>
                    <span class="text-[9px] font-black my-0.5 ${colorClass}">${val}</span>
                    <button onclick="updateMatchup('${h.id}', '${type}', -1)" class="stepper-btn">▼</button>
                </div>`;
            }
            return `<span class="text-[9px] font-black ${colorClass}">${val}</span>`;
        };

        html += `
        <div class="grid grid-cols-12 items-center border-b border-slate-900 hover:bg-slate-900 transition-colors">
            <div class="col-span-3 pl-4 py-3 border-r border-slate-900 flex items-center gap-2">
                <img src="${_heroImg(h)}" class="w-6 h-6 bg-slate-900 rounded p-0.5">
                <span class="font-black text-slate-100 uppercase text-[9px] truncate">${h.name}</span>
            </div>
            <div class="col-span-3 py-2 border-r border-slate-900 flex flex-col items-center justify-center gap-1">
                <div class="flex items-center gap-3">
                    ${renderStepper('dive', m.dive)} ${renderStepper('rush', m.rush)} ${renderStepper('poke', m.poke)}
                </div>
                <button onclick="toggleMatchupEdit('${h.id}')" class="text-[8px] flex items-center gap-1 ${isEditing ? 'text-amber-500 font-bold' : 'text-slate-500 hover:text-slate-300'}">
                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    ${isEditing ? '完了' : '編集'}
                </button>
            </div>
            <div class="col-span-6 pl-3 pr-2 py-3 flex items-center gap-2">
                <div class="flex-grow flex flex-wrap items-center">
                    ${Object.entries(h.antis).map(([k, v]) => `
                        <span class="anti-tag">
                            <span class="text-[8px] text-slate-300">${k}(${v})</span>
                            ${isDeleting ? `<span onclick="deleteAnti('${h.id}', '${k}')" class="anti-del ml-1 text-red-500 font-bold hover:text-red-300">×</span>` : ''}
                        </span>`).join('')}
                    <button onclick="openAntiPicker('${h.id}')" class="add-anti-btn">＋追加</button>
                </div>
                <button onclick="toggleAntiDeleteMode('${h.id}')" class="flex-shrink-0 p-1.5 rounded hover:bg-slate-800 transition-colors ${isDeleting ? 'text-red-500 bg-red-500/10' : 'text-slate-500'}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        </div>`;
    });

    container.innerHTML = html + `</div>`;
}

/** アンチ追加用のヒーロー選択グリッドを描画する */
export function renderAntiPickerGrid() {
    const grid = document.getElementById('anti-picker-grid');
    if (!grid) return;
    grid.innerHTML = appState.heroData.map(h => `
        <div onclick="selectAntiHero('${h.id}')" class="cursor-pointer bg-slate-900 border border-slate-700 rounded p-1 hover:border-amber-500 transition">
            <img src="${_heroImg(h)}" class="w-full aspect-square object-contain">
            <div class="text-[8px] text-center mt-1 truncate">${h.name}</div>
        </div>
    `).join('');
}

// ---------------------------------------------------------------------------
// UI 状態反映（DOM への設定値反映）
// ---------------------------------------------------------------------------

/** ロールキュートグルの表示を更新する */
export function updateRoleQueueUI() {
    const button = document.getElementById('role-queue-btn');
    const toggle = document.getElementById('role-queue-toggle');
    const label = document.getElementById('role-queue-label');
    if (button) {
        button.classList.add('bg-emerald-500');
        button.classList.remove('bg-slate-700');
        button.setAttribute('aria-checked', String(appState.isRoleQueue));
        button.setAttribute('role', 'switch');
        button.setAttribute('aria-disabled', 'true');
        button.disabled = true;
        button.classList.add('opacity-60', 'cursor-not-allowed');
    }
    if (toggle) {
        toggle.style.transform = 'translateX(1.5rem)';
    }
    if (label) {
        label.textContent = 'ロールキュー（固定）';
    }
}

/** ロール表示順を DOM に反映する */
export function applyRoleOrderUI() {
    appState.roleOrder.forEach((role, index) => {
        const section = document.getElementById(`rank-section-${role}`);
        if (section) section.style.order = index;
    });
}

/** undo / redo ボタンの有効・無効を更新する */
export function updateHistoryButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = appState.undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = appState.redoStack.length === 0;
}

/** チームサイズボタンのハイライトとグリッドレイアウトを更新する */
export function updateTeamSizeUI() {
    const size5Btn = document.getElementById('size-5-btn');
    const size6Btn = document.getElementById('size-6-btn');
    size5Btn?.classList.add('bg-blue-600');
    size5Btn?.classList.remove('opacity-60');
    if (size6Btn) {
        size6Btn.classList.remove('bg-blue-600');
        size6Btn.classList.add('opacity-60', 'cursor-not-allowed');
        size6Btn.disabled = true;
    }
    const container = document.getElementById('team-slots');
    if (container) {
        container.className = 'grid gap-2 md:gap-4 mb-8 max-w-3xl mx-auto transition-all grid-cols-5';
    }
}

// ---------------------------------------------------------------------------
// 内部ユーティリティ
// ---------------------------------------------------------------------------

/**
 * ヒーローの画像 URL を返す。
 * OverFast API の画像を優先し、取得できなければ playoverwatch.com のフォールバックを使う。
 *
 * @param {{ id: string }} hero
 * @returns {string}
 */
function _heroImg(hero) {
    return appState.apiImages[hero.id]
        || `https://static.playoverwatch.com/heroportrait/${hero.id}.png`;
}
