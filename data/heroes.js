/**
 * data/heroes.js
 *
 * 全ヒーローのマスターデータ。
 * UIロジックや計算ロジックを含まない純粋なデータ定義ファイル。
 *
 * 各エントリのスキーマ:
 *   id        {string}  - APIキー (OverFast API / playoverwatch.com の URL キー)
 *   name      {string}  - 表示名（日本語）
 *   role      {string}  - 'tank' | 'damage' | 'support'
 *   archetype {string}  - 'dive' | 'rush' | 'poke' | 'null'
 *   matchups  {Object}  - 構成タイプへの苦手度 { dive, rush, poke }（1=得意 〜 3=苦手）
 *   antis     {Object}  - 苦手なヒーロー名をキー、苦手度を値とするマップ（1〜4）
 *
 * TODO: 将来的に weight / reason フィールドを追加して
 *       「なぜこのピックが推奨されるか」の根拠文を持てるようにする。
 * TODO: 5v5 / 6v6 モード固有のデータがあればここに拡張する。
 */

/** @type {HeroData[]} */
export const DEFAULT_HERO_DATA = [
    // --- タンク ---
    { id: "dva",            name: "D.Va",             role: "tank",    archetype: "dive", matchups: { dive: 2, rush: 3, poke: 1 }, antis: { "ザリア": 3, "シンメトラ": 2, "ブリギッテ": 1, "メイ": 2, "ロードホッグ": 1 } },
    { id: "doomfist",       name: "ドゥームフィスト",   role: "tank",    archetype: "dive", matchups: { dive: 2, rush: 2, poke: 2 }, antis: { "オリーサ": 3, "アナ": 2, "エコー": 2, "トールビョーン": 1, "ブリギッテ": 2, "ファラ": 2, "ロードホッグ": 3, "ソンブラ": 2 } },
    { id: "hazard",         name: "ハザード",           role: "tank",    archetype: "rush", matchups: { dive: 1, rush: 2, poke: 3 }, antis: { "D.Va": 2, "ザリア": 2, "ソンブラ": 2, "ファラ": 2, "エコー": 2, "ゼニヤッタ": 1, "ロードホッグ": 3, "オリーサ": 2 } },
    { id: "junker-queen",   name: "ジャンカークイーン", role: "tank",    archetype: "rush", matchups: { dive: 1, rush: 2, poke: 2 }, antis: { "キリコ": 2, "アナ": 2, "ジャンクラット": 2, "ルシオ": 2, "ザリア": 3, "モイラ": 1, "ロードホッグ": 2 } },
    { id: "mauga",          name: "マウガ",             role: "tank",    archetype: "rush", matchups: { dive: 2, rush: 2, poke: 2 }, antis: { "D.Va": 1, "リーパー": 3, "ハンゾー": 2, "ソジョーン": 1, "フレイヤ": 1 } },
    { id: "orisa",          name: "オリーサ",           role: "tank",    archetype: "rush", matchups: { dive: 2, rush: 1, poke: 2 }, antis: { "ザリア": 3, "メイ": 2, "エコー": 1, "ファラ": 2, "シンメトラ": 2 } },
    { id: "ramattra",       name: "ラマットラ",         role: "tank",    archetype: "rush", matchups: { dive: 1, rush: 2, poke: 3 }, antis: { "オリーサ": 2, "ハザード": 2, "ゼニヤッタ": 3 } },
    { id: "reinhardt",      name: "ラインハルト",       role: "tank",    archetype: "rush", matchups: { dive: 3, rush: 2, poke: 3 }, antis: { "シグマ": 1, "オリーサ": 1, "ラマットラ": 3, "ファラ": 2, "エコー": 2, "ルシオ": 1, "バスティオン": 3, "ロードホッグ": 2 } },
    { id: "roadhog",        name: "ロードホッグ",       role: "tank",    archetype: "null", matchups: { dive: 2, rush: 3, poke: 3 }, antis: { "オリーサ": 3, "マウガ": 2, "ソジョーン": 2, "ハンゾー": 2, "フレイヤ": 1, "アナ": 3 } },
    { id: "sigma",          name: "シグマ",             role: "tank",    archetype: "poke", matchups: { dive: 3, rush: 3, poke: 1 }, antis: { "ラインハルト": 1, "ラマットラ": 2, "ドゥームフィスト": 2, "ザリア": 2, "ベンチャー": 1, "メイ": 2, "ウィンストン": 3, "ゲンジ": 2, "ソンブラ": 3, "シンメトラ": 3 } },
    { id: "winston",        name: "ウィンストン",       role: "tank",    archetype: "dive", matchups: { dive: 2, rush: 3, poke: 1 }, antis: { "D.Va": 3, "キャスディ": 3, "ジャンカークイーン": 3, "トールビョーン": 3, "ブリギッテ": 2, "リーパー": 4, "ロードホッグ": 2 } },
    { id: "wrecking-ball",  name: "レッキング・ボール", role: "tank",    archetype: "dive", matchups: { dive: 2, rush: 2, poke: 1 }, antis: { "マウガ": 2, "キャスディ": 2, "ロードホッグ": 2, "トレーサー": 2, "ソンブラ": 3 } },
    { id: "zarya",          name: "ザリア",             role: "tank",    archetype: "rush", matchups: { dive: 2, rush: 2, poke: 2 }, antis: { "ウィンストン": 1, "メイ": 2, "ファラ": 2, "ラマットラ": 2, "ライフウィーバー": 1, "エコー": 2, "ラインハルト": 2 } },

    // --- ダメージ ---
    { id: "ashe",           name: "アッシュ",           role: "damage",  archetype: "poke", matchups: { dive: 3, rush: 1, poke: 1 }, antis: { "ハザード": 2, "D.Va": 3, "レッキング・ボール": 2, "ウィドウメイカー": 1, "ソンブラ": 2, "ベンチャー": 2, "ウィンストン": 3 } },
    { id: "bastion",        name: "バスティオン",       role: "damage",  archetype: "poke", matchups: { dive: 3, rush: 2, poke: 2 }, antis: { "トレーサー": 3, "ゲンジ": 2, "D.Va": 2, "オリーサ": 1, "アッシュ": 1, "フレイヤ": 2, "シグマ": 3 } },
    { id: "cassidy",        name: "キャスディ",         role: "damage",  archetype: "rush", matchups: { dive: 1, rush: 2, poke: 3 }, antis: { "ソジョーン": 2, "アナ": 1, "ウィドウメイカー": 2 } },
    { id: "echo",           name: "エコー",             role: "damage",  archetype: "null", matchups: { dive: 2, rush: 2, poke: 3 }, antis: { "トレーサー": 2, "ウィドウメイカー": 2, "アッシュ": 2, "キャスディ": 2, "D.Va": 3, "アナ": 2, "ジュノ": 2, "イラリー": 2, "バティスト": 3 } },
    { id: "freja",          name: "フレイヤ",           role: "damage",  archetype: "poke", matchups: { dive: 2, rush: 1, poke: 1 }, antis: { "D.Va": 2, "ウィドウメイカー": 3, "ソルジャー": 2, "バティスト": 3, "ウィンストン": 3, "レッキング・ボール": 2, "トレーサー": 2 } },
    { id: "genji",          name: "ゲンジ",             role: "damage",  archetype: "dive", matchups: { dive: 2, rush: 3, poke: 1 }, antis: { "トールビョーン": 3, "ザリア": 3, "ウィンストン": 2, "モイラ": 2, "シンメトラ": 2, "ファラ": 2, "ブリギッテ": 2, "ルシオ": 3, "メイ": 3 } },
    { id: "hanzo",          name: "ハンゾー",           role: "damage",  archetype: "poke", matchups: { dive: 3, rush: 3, poke: 1 }, antis: { "レッキング・ボール": 3, "ファラ": 2, "エコー": 2, "ドゥームフィスト": 2, "ウィンストン": 3, "ゲンジ": 3 } },
    { id: "junkrat",        name: "ジャンクラット",     role: "damage",  archetype: "null", matchups: { dive: 3, rush: 2, poke: 3 }, antis: { "ザリア": 1, "フレイヤ": 2, "ジュノ": 2, "バティスト": 2, "ソジョーン": 1, "ファラ": 3, "エコー": 3 } },
    { id: "mei",            name: "メイ",               role: "damage",  archetype: "rush", matchups: { dive: 2, rush: 2, poke: 2 }, antis: { "ファラ": 3, "エコー": 3 } },
    { id: "pharah",         name: "ファラ",             role: "damage",  archetype: "poke", matchups: { dive: 2, rush: 2, poke: 3 }, antis: { "エコー": 3, "ウィドウメイカー": 2, "キャスディ": 2, "ソルジャー": 2, "イラリー": 2, "バティスト": 2, "アナ": 1, "D.Va": 3 } },
    { id: "reaper",         name: "リーパー",           role: "damage",  archetype: "rush", matchups: { dive: 1, rush: 2, poke: 2 }, antis: { "キャスディ": 3, "ウィドウメイカー": 1, "エコー": 2, "シグマ": 3, "アナ": 1, "イラリー": 1, "ルシオ": 1, "ファラ": 3 } },
    { id: "sojourn",        name: "ソジョーン",         role: "damage",  archetype: "poke", matchups: { dive: 2, rush: 3, poke: 2 }, antis: { "レッキング・ボール": 2, "ハザード": 1, "ウィンストン": 2, "ゲンジ": 2, "トレーサー": 1, "ソンブラ": 2, "D.Va": 2, "ベンチャー": 1 } },
    { id: "soldier-76",     name: "ソルジャー76",       role: "damage",  archetype: "poke", matchups: { dive: 3, rush: 2, poke: 2 }, antis: { "ウィンストン": 2, "レッキング・ボール": 3, "ゲンジ": 3, "ドゥームフィスト": 3, "トレーサー": 1, "ベンチャー": 2 } },
    { id: "sombra",         name: "ソンブラ",           role: "damage",  archetype: "dive", matchups: { dive: 2, rush: 2, poke: 1 }, antis: { "キャスディ": 1, "キリコ": 3, "ブリギッテ": 3, "ファラ": 2, "エコー": 1, "トールビョーン": 2 } },
    { id: "symmetra",       name: "シンメトラ",         role: "damage",  archetype: "rush", matchups: { dive: 2, rush: 3, poke: 3 }, antis: { "アッシュ": 2, "ウィドウメイカー": 1, "ソジョーン": 2, "バティスト": 1, "ファラ": 3, "エコー": 2, "フレイヤ": 2 } },
    { id: "torbjorn",       name: "トールビョーン",     role: "damage",  archetype: "poke", matchups: { dive: 1, rush: 2, poke: 3 }, antis: { "ファラ": 3, "オリーサ": 1, "ザリア": 2, "シグマ": 3, "ソジョーン": 2, "フレイヤ": 3, "ゼニヤッタ": 1, "エコー": 2 } },
    { id: "tracer",         name: "トレーサー",         role: "damage",  archetype: "dive", matchups: { dive: 2, rush: 2, poke: 1 }, antis: { "ソンブラ": 1, "キャスディ": 3, "トールビョーン": 3 } },
    { id: "vendetta",       name: "ヴェンデッタ",       role: "damage",  archetype: "dive", matchups: { dive: 2, rush: 3, poke: 1 }, antis: { "ロードホッグ": 3, "トールビョーン": 2, "フレイヤ": 1, "ファラ": 1, "エコー": 1 } },
    { id: "venture",        name: "ベンチャー",         role: "damage",  archetype: "rush", matchups: { dive: 2, rush: 2, poke: 3 }, antis: { "ファラ": 2, "エコー": 2, "トールビョーン": 2, "キャスディ": 3, "ロードホッグ": 1, "メイ": 2, "リーパー": 2, "モイラ": 1, "ブリギッテ": 3 } },
    { id: "widowmaker",     name: "ウィドウメイカー",   role: "damage",  archetype: "poke", matchups: { dive: 3, rush: 3, poke: 1 }, antis: { "レッキング・ボール": 3, "ドゥームフィスト": 3, "ソンブラ": 4, "ゲンジ": 2, "トレーサー": 2, "ウィンストン": 3 } },

    // --- サポート ---
    { id: "ana",            name: "アナ",               role: "support", archetype: "poke", matchups: { dive: 3, rush: 2, poke: 2 }, antis: { "ゲンジ": 2, "トレーサー": 1, "キリコ": 2, "ソンブラ": 2, "ウィンストン": 3 } },
    { id: "baptiste",       name: "バティスト",         role: "support", archetype: "poke", matchups: { dive: 3, rush: 2, poke: 2 }, antis: { "ウィンストン": 3, "レッキング・ボール": 3, "D.Va": 1, "ゲンジ": 2, "ソンブラ": 2, "トレーサー": 2, "ウィドウメイカー": 2, "ベンチャー": 3, "ハザード": 2 } },
    { id: "brigitte",       name: "ブリギッテ",         role: "support", archetype: "rush", matchups: { dive: 1, rush: 3, poke: 3 }, antis: { "ファラ": 2, "エコー": 2, "フレイヤ": 2 } },
    { id: "illari",         name: "イラリー",           role: "support", archetype: "poke", matchups: { dive: 3, rush: 2, poke: 2 }, antis: { "ハザード": 2, "D.Va": 3, "ゲンジ": 2, "トレーサー": 1, "ソンブラ": 1, "ウィンストン": 2, "レッキング・ボール": 3 } },
    { id: "juno",           name: "ジュノ",             role: "support", archetype: "rush", matchups: { dive: 3, rush: 2, poke: 3 }, antis: { "ウィンストン": 3, "レッキング・ボール": 2, "ウィドウメイカー": 1, "ジャンカークイーン": 1, "ゲンジ": 1, "トレーサー": 2 } },
    { id: "kiriko",         name: "キリコ",             role: "support", archetype: "dive", matchups: { dive: 1, rush: 2, poke: 2 }, antis: { "ウィンストン": 2, "ゲンジ": 1, "ファラ": 2, "エコー": 2 } },
    { id: "lifeweaver",     name: "ライフウィーバー",   role: "support", archetype: "poke", matchups: { dive: 2, rush: 3, poke: 3 }, antis: { "ソンブラ": 2, "レッキング・ボール": 2, "ウィンストン": 3, "ベンチャー": 2, "ハザード": 1 } },
    { id: "lucio",          name: "ルシオ",             role: "support", archetype: "rush", matchups: { dive: 1, rush: 2, poke: 2 }, antis: { "ソンブラ": 2, "モイラ": 1, "キャスディ": 2 } },
    { id: "mercy",          name: "マーシー",           role: "support", archetype: "poke", matchups: { dive: 3, rush: 3, poke: 3 }, antis: { "バティスト": 2, "ジュノ": 1, "ウィンストン": 1, "D.Va": 1, "ウィドウメイカー": 2, "キャスディ": 2, "ソルジャー76": 3, "アッシュ": 2, "アナ": 2 } },
    { id: "moira",          name: "モイラ",             role: "support", archetype: "rush", matchups: { dive: 1, rush: 2, poke: 2 }, antis: { "D.Va": 2, "ロードホッグ": 1, "キャスディ": 2, "ファラ": 1 } },
    { id: "wuyang",         name: "ウーヤン",           role: "support", archetype: "rush", matchups: { dive: 2, rush: 2, poke: 1 }, antis: { "D.Va": 2, "トレーサー": 3, "ゲンジ": 2, "ソンブラ": 1 } },
    { id: "zenyatta",       name: "ゼニヤッタ",         role: "support", archetype: "poke", matchups: { dive: 3, rush: 2, poke: 2 }, antis: { "レッキング・ボール": 2, "ドゥームフィスト": 2, "ジャンカークイーン": 1, "D.Va": 2, "ベンチャー": 3, "ソンブラ": 2, "トレーサー": 3, "ゲンジ": 3 } },
];
