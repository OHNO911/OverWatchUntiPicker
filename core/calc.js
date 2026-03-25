/**
 * core/calc.js
 *
 * アンチピックスコア計算ロジック。
 * 副作用なしの純粋関数のみを含む。DOM アクセス・状態変更は行わない。
 *
 * 入力:
 *   - selectedHeroes : 敵チームに選択されたヒーローの配列
 *   - heroData       : 全ヒーローのマスターデータ配列
 *
 * 出力:
 *   - 各ヒーローに score / advantages / disadvantages を付与した配列
 *
 * TODO: advantages / disadvantages に加えて structured な reason データ
 *       ({ type, target, weight }) を返すことで、UI 側で「なぜこのピックか」
 *       を柔軟に表示できるようにする拡張余地あり。
 * TODO: 5v5 / 6v6 のモードによってスコア重み付けを変えたい場合は
 *       options 引数として受け取る形に拡張する。
 */

/**
 * 敵チーム構成に対するアンチピックスコアを全ヒーロー分計算する。
 *
 * @param {import('../data/heroes.js').HeroData[]} selectedHeroes - 選択された敵ヒーロー
 * @param {import('../data/heroes.js').HeroData[]} heroData       - 全ヒーロー一覧
 * @returns {ScoredHero[]} スコア付きヒーロー配列
 */
export function calculateAntiScores(selectedHeroes, heroData, options = {}) {
    const mapWinRates = options.mapWinRates || null;
    const mapWeight = typeof options.mapWeight === 'number' ? options.mapWeight : 0;

    // 敵チームの構成タイプ別ヒーロー数を集計
    const enemyArchTypes = { dive: 0, rush: 0, poke: 0 };
    selectedHeroes.forEach(h => {
        if (h.archetype !== 'null') enemyArchTypes[h.archetype]++;
    });

    return heroData.map(h => {
        let antiImpact = 0;
        const advantages = [];
        const disadvantages = [];

        // サポートは構成相性の影響を受けやすいため係数を高く設定
        const archImpactMultiplier = h.role === 'support' ? 1.5 : 1.0;

        // 自分自身が敵に選ばれている場合、その分の構成タイプ影響を減算
        const selfInEnemyCount = selectedHeroes.filter(enemy => enemy.id === h.id).length;
        const effectiveEnemyArchTypes = { ...enemyArchTypes };
        if (h.archetype !== 'null' && selfInEnemyCount > 0) {
            effectiveEnemyArchTypes[h.archetype] = Math.max(
                0,
                effectiveEnemyArchTypes[h.archetype] - selfInEnemyCount,
            );
        }

        // 構成タイプ相性の計算（matchups: 1=得意 / 2=普通 / 3=苦手）
        const archLabelMap = { dive: 'ダイブ', rush: 'ラッシュ', poke: 'ポーク' };
        Object.entries(effectiveEnemyArchTypes).forEach(([arch, count]) => {
            if (count > 0) {
                const rating = h.matchups[arch] ?? 2;
                antiImpact += (2 - rating) * 5 * count * archImpactMultiplier;
                if (rating <= 1) advantages.push(`${archLabelMap[arch]}に強い`);
                else if (rating >= 3) disadvantages.push(`${archLabelMap[arch]}に弱い`);
            }
        });

        // 個別ヒーロー相性の計算（antis: 1〜4、タンクは影響が大きい）
        selectedHeroes.forEach(enemy => {
            if (h.id === enemy.id) return;
            const tankMultiplier = enemy.role === 'tank' ? 1.5 : 1.0;

            // h が enemy に弱い場合（h.antis に enemy.name が登録されている）
            if (h.antis[enemy.name]) {
                antiImpact -= h.antis[enemy.name] * 8 * tankMultiplier;
                const qualifier = h.antis[enemy.name] === 1 ? 'ちょっと' : '';
                disadvantages.push(`${enemy.name}に${qualifier}弱い`);
            }

            // h が enemy に強い場合（enemy.antis に h.name が登録されている）
            if (enemy.antis[h.name]) {
                antiImpact += enemy.antis[h.name] * 8 * tankMultiplier;
                const qualifier = enemy.antis[h.name] === 1 ? 'ちょっと' : '';
                advantages.push(`${enemy.name}に${qualifier}強い`);
            }
        });

        // マップ別の勝率補正（基礎計算は維持したまま加算）
        let mapBonus = 0;
        if (mapWinRates && typeof mapWinRates[h.id] === 'number') {
            // 50%を基準に、最大 ±10 点程度に収まるようスケーリング
            mapBonus = (mapWinRates[h.id] - 50) * 2 * mapWeight;
            if (Math.abs(mapBonus) >= 0.2) {
                const sign = mapBonus > 0 ? '+' : '';
                const label = `マップ統計補正 ${sign}${mapBonus.toFixed(1)}`;
                if (mapBonus >= 0) advantages.push(label);
                else disadvantages.push(label);
            }
        }

        return {
            ...h,
            score: Math.max(10, Math.min(99, 50.0 + antiImpact + mapBonus)),
            advantages: [...new Set(advantages)],
            disadvantages: [...new Set(disadvantages)],
        };
    });
}

/**
 * 構成提案（Tank1 / DPS2 / Support2）を返す。
 * 入力負荷を避けるため、使用率/勝率などの外部入力は使わない。
 *
 * @param {import('../data/heroes.js').HeroData[]} selectedHeroes
 * @param {import('../data/heroes.js').HeroData[]} heroData
 * @param {{ mapWinRates?: Record<string, number>|null, mapWeight?: number }} [options]
 */
export function calculateTeamCompositions(selectedHeroes, heroData, options = {}) {
    if (!Array.isArray(selectedHeroes) || selectedHeroes.length === 0) return [];

    const mapWinRates = options.mapWinRates || null;
    const mapWeight = typeof options.mapWeight === 'number' ? options.mapWeight : 0;

    const roleHeroes = {
        tank: heroData.filter(h => h.role === 'tank'),
        damage: heroData.filter(h => h.role === 'damage'),
        support: heroData.filter(h => h.role === 'support'),
    };

    const topTank = [...roleHeroes.tank]
        .sort((a, b) => _scoreVsEnemy(b, selectedHeroes) - _scoreVsEnemy(a, selectedHeroes))
        .slice(0, 3);
    const topDps = [...roleHeroes.damage]
        .sort((a, b) => _scoreVsEnemy(b, selectedHeroes) - _scoreVsEnemy(a, selectedHeroes))
        .slice(0, 5);
    const topSup = [...roleHeroes.support]
        .sort((a, b) => _scoreVsEnemy(b, selectedHeroes) - _scoreVsEnemy(a, selectedHeroes))
        .slice(0, 5);

    const dpsPairs = _pickPairs(topDps);
    const supPairs = _pickPairs(topSup);

    const comps = [];
    topTank.forEach(tank => {
        dpsPairs.forEach(dps => {
            supPairs.forEach(support => {
                const team = [tank, ...dps, ...support];
                const breakdown = _calcTeamBreakdown(team, selectedHeroes, mapWinRates, mapWeight);
                comps.push({
                    name: _buildCompName(team),
                    team,
                    breakdown,
                    total: breakdown.total,
                    reasons: _buildReasons(team, selectedHeroes, breakdown),
                });
            });
        });
    });

    return comps
        .sort((a, b) => b.total - a.total)
        .slice(0, 3)
        .map((c, idx) => ({
            rank: idx + 1,
            ...c,
        }));
}

function _pickPairs(heroes) {
    const pairs = [];
    for (let i = 0; i < heroes.length; i++) {
        for (let j = i + 1; j < heroes.length; j++) {
            pairs.push([heroes[i], heroes[j]]);
        }
    }
    return pairs;
}

function _scoreVsEnemy(hero, selectedHeroes) {
    let score = 0;
    selectedHeroes.forEach(enemy => {
        if (enemy.antis?.[hero.name]) score += enemy.antis[hero.name] * 8;
        if (hero.antis?.[enemy.name]) score -= hero.antis[enemy.name] * 8;
    });
    return score;
}

function _calcTeamBreakdown(team, selectedHeroes, mapWinRates, mapWeight) {
    const counterRaw = team.reduce((sum, hero) => sum + _scoreVsEnemy(hero, selectedHeroes), 0);
    const counter = _clamp01to100(50 + counterRaw / 3);

    let synergyRaw = 50;
    const tags = { dive: 0, poke: 0, rush: 0 };
    team.forEach(h => {
        if (h.archetype === 'dive' || h.archetype === 'poke' || h.archetype === 'rush') {
            tags[h.archetype]++;
        }
    });
    const topTagCount = Math.max(tags.dive, tags.poke, tags.rush);
    if (topTagCount >= 4) synergyRaw += 10;
    if (topTagCount <= 2) synergyRaw -= 8;
    synergyRaw += (team.filter(h => h.archetype !== 'null').length - 3) * 2;
    const synergy = _clamp01to100(synergyRaw);

    let mapFit = 50;
    if (mapWinRates && mapWeight > 0) {
        const avg = team.reduce((sum, h) => sum + (mapWinRates[h.id] ?? 50), 0) / team.length;
        mapFit = _clamp01to100(50 + (avg - 50) * (0.6 + mapWeight));
    }

    const avgDiff = team.reduce((sum, h) => sum + _heroDifficulty(h), 0) / team.length;
    const compDiff = topTagCount >= 4 && (tags.dive >= 4) ? 3 : 1.5;
    const difficultyPenalty = Math.min(15, (0.6 * avgDiff + 0.4 * compDiff) * 2);

    const total = _clamp01to100(
        0.55 * counter
        + 0.30 * synergy
        + 0.15 * mapFit
        - difficultyPenalty,
    );

    return {
        counter: Math.round(counter * 10) / 10,
        synergy: Math.round(synergy * 10) / 10,
        mapFit: Math.round(mapFit * 10) / 10,
        difficultyPenalty: Math.round(difficultyPenalty * 10) / 10,
        total: Math.round(total * 10) / 10,
    };
}

function _heroDifficulty(hero) {
    if (hero.role === 'tank') return 3;
    if (hero.archetype === 'dive') return 4;
    if (hero.archetype === 'poke') return 3;
    if (hero.archetype === 'rush') return 2.5;
    return 3;
}

function _buildCompName(team) {
    const tags = team.map(h => h.archetype);
    const dive = tags.filter(t => t === 'dive').length;
    const poke = tags.filter(t => t === 'poke').length;
    const rush = tags.filter(t => t === 'rush').length;
    if (dive >= 4) return 'Dive構成';
    if (poke >= 4) return 'Poke構成';
    if (rush >= 4) return 'Brawl構成';
    return 'Hybrid構成';
}

function _buildReasons(team, selectedHeroes, breakdown) {
    const topEnemy = selectedHeroes[0]?.name ?? '敵構成';
    return [
        `${topEnemy}への対面圧力が高い`,
        `構成連携スコア ${breakdown.synergy}`,
        `実行難度ペナルティ ${breakdown.difficultyPenalty}`,
    ];
}

function _clamp01to100(v) {
    return Math.max(0, Math.min(100, v));
}
