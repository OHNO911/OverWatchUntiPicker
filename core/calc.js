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
