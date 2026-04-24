/**
 * config.js
 * ============================================================
 * コントローラーごとのボタンマッピング設定ファイル。
 * ここを編集するだけで座標・ラベル・画像パスをカスタマイズできます。
 *
 * 座標系: コントローラー画像の左上を (0, 0) とした px 単位。
 *   座標は images/ フォルダ内の実際の写真から計測した値です。
 *
 * 再計算方法:
 *   1. 実画像を表示サイズ (imageWidth × imageHeight) にリサイズ
 *   2. グリッドオーバーレイ付き画像を生成して各ボタン中心座標を読み取る
 *   3. x, y にオーバーレイ中心座標、w, h にボタン直径（px）を設定
 *
 * 元画像サイズと表示サイズの対応:
 *   DualSense        : 1500×1000 px → 表示 800×533 px (スケール 0.533)
 *   Fighting Stick   : 1417×752  px → 表示 800×425 px (スケール 0.565)
 * ============================================================
 */

"use strict";

// ----------------------------------------------------------------
// DualSense (PlayStation 5) マッピング
// 座標は images/ps5_dualsense.jpg を 800×533 に縮小した状態で計測。
// ----------------------------------------------------------------
const DUALSENSE_CONFIG = {
  id: "dualsense",
  name: "DualSense",

  /** 接続デバイス名に含まれる文字列（部分一致・大文字小文字無視）*/
  deviceNamePatterns: ["DualSense", "PS5 Controller", "PlayStation 5"],

  /**
   * コントローラー画像のパスと表示サイズ。
   * 元画像 1500×1000 を 3:2 アスペクト比のまま縮小した値。
   */
  image: "images/ps5_dualsense.jpg",
  imageWidth: 800,
  imageHeight: 533,

  /**
   * ボタン定義
   *   index : Gamepad API の buttons[] インデックス
   *   label : 表示ラベル
   *   x, y  : オーバーレイの中心座標 (px)
   *   w, h  : オーバーレイのサイズ (px)
   *   shape : "circle" | "rect" (省略時は "circle")
   */
  buttons: [
    // ── フェイスボタン（右側ダイヤモンド配置）──────────────
    { index:  0, label: "×",       x: 638, y: 202, w: 40, h: 40 },
    { index:  1, label: "○",       x: 688, y: 163, w: 40, h: 40 },
    { index:  2, label: "□",       x: 585, y: 163, w: 40, h: 40 },
    { index:  3, label: "△",       x: 638, y: 127, w: 40, h: 40 },

    // ── ショルダー / トリガー ─────────────────────────────
    // L1/R1 はバンパー（手前側）、L2/R2 はトリガー（奥側・最上段）
    { index:  4, label: "L1",      x: 193, y:  47, w: 90, h: 25, shape: "rect" },
    { index:  5, label: "R1",      x: 607, y:  47, w: 90, h: 25, shape: "rect" },
    { index:  6, label: "L2",      x: 188, y:  17, w: 82, h: 22, shape: "rect" },
    { index:  7, label: "R2",      x: 612, y:  17, w: 82, h: 22, shape: "rect" },

    // ── 特殊ボタン ────────────────────────────────────────
    { index:  8, label: "Create",  x: 185, y:  68, w: 28, h: 24 },
    { index:  9, label: "Options", x: 480, y:  68, w: 28, h: 24 },
    { index: 10, label: "L3",      x: 225, y: 248, w: 42, h: 42 },
    { index: 11, label: "R3",      x: 465, y: 248, w: 42, h: 42 },
    { index: 16, label: "PS",      x: 400, y: 292, w: 34, h: 34 },
    { index: 17, label: "Touch",   x: 400, y: 183, w: 130, h: 82, shape: "rect" },

    // ── 十字キー ──────────────────────────────────────────
    { index: 12, label: "↑",       x: 141, y: 108, w: 34, h: 34 },
    { index: 13, label: "↓",       x: 141, y: 178, w: 34, h: 34 },
    { index: 14, label: "←",       x:  99, y: 143, w: 34, h: 34 },
    { index: 15, label: "→",       x: 183, y: 143, w: 34, h: 34 },
  ],

  /**
   * アナログスティック定義
   *   axisX, axisY : Gamepad API の axes[] インデックス
   *   cx, cy       : スティック中心座標 (px)
   *   radius       : スティック可動範囲の半径 (px)
   */
  sticks: [
    { id: "LS", label: "LS", axisX: 0, axisY: 1, cx: 225, cy: 248, radius: 53 },
    { id: "RS", label: "RS", axisX: 2, axisY: 3, cx: 465, cy: 248, radius: 53 },
  ],
};

// ----------------------------------------------------------------
// Fighting Stick Mini (HORI) マッピング
// 座標は images/fighting_stick_mini.jpg を 800×425 に縮小した状態で計測。
// ----------------------------------------------------------------
const FIGHTING_STICK_MINI_CONFIG = {
  id: "fightingStickMini",
  name: "Fighting Stick Mini",

  /** 接続デバイス名に含まれる文字列（部分一致・大文字小文字無視）*/
  deviceNamePatterns: ["Fighting Stick", "HORI", "Arcade Stick", "FS-Mini"],

  /**
   * コントローラー画像のパスと表示サイズ。
   * 元画像 1417×752 をアスペクト比のまま縮小した値。
   */
  image: "images/fighting_stick_mini.jpg",
  imageWidth: 800,
  imageHeight: 425,

  /**
   * ボタン定義
   * Fighting Stick Mini の標準アーケード配列（上段 4 + 下段 4）。
   * 実機の buttons[] インデックスはファームウェア/ドライバにより異なる場合があります。
   */
  buttons: [
    // ── フェイスボタン（上段 左→右: □ △ R1 L1）──────────
    { index:  2, label: "□",      x: 391, y: 175, w: 56, h: 56 },
    { index:  3, label: "△",      x: 476, y: 158, w: 56, h: 56 },
    { index:  5, label: "R1",     x: 563, y: 155, w: 56, h: 56 },
    { index:  4, label: "L1",     x: 651, y: 158, w: 56, h: 56 },

    // ── フェイスボタン（下段 左→右: × ○ R2 L2）──────────
    { index:  0, label: "×",      x: 395, y: 222, w: 56, h: 56 },
    { index:  1, label: "○",      x: 483, y: 212, w: 56, h: 56 },
    { index:  7, label: "R2",     x: 568, y: 210, w: 56, h: 56 },
    { index:  6, label: "L2",     x: 654, y: 214, w: 56, h: 56 },

    // ── 特殊ボタン（天板中央ストリップ）─────────────────
    { index: 16, label: "PS",      x: 387, y: 118, w: 30, h: 30 },
    { index:  8, label: "Share",   x: 432, y: 118, w: 28, h: 22, shape: "rect" },
    { index:  9, label: "Options", x: 476, y: 118, w: 28, h: 22, shape: "rect" },
    { index: 10, label: "L3",      x: 514, y: 118, w: 22, h: 22 },
    { index: 11, label: "R3",      x: 547, y: 118, w: 22, h: 22 },

    // ── 十字キー（レバーが d-pad にマップされる場合）────
    { index: 12, label: "↑",       x: 181, y: 148, w: 36, h: 36 },
    { index: 13, label: "↓",       x: 181, y: 230, w: 36, h: 36 },
    { index: 14, label: "←",       x: 133, y: 189, w: 36, h: 36 },
    { index: 15, label: "→",       x: 229, y: 189, w: 36, h: 36 },
  ],

  /**
   * レバー定義
   *   レバーは通常 d-pad（十字キー）にマップされますが、
   *   ドライバ設定によってはアナログ axes にマップされることもあります。
   *   その場合はここの axisX / axisY を実機に合わせて調整してください。
   */
  sticks: [
    { id: "Lever", label: "Lever", axisX: 0, axisY: 1, cx: 181, cy: 189, radius: 63 },
  ],
};

// ----------------------------------------------------------------
// デバイス自動判定ロジック
// ----------------------------------------------------------------

/**
 * 登録済みの全コントローラー設定（優先順位順に並べる）
 */
const ALL_CONFIGS = [DUALSENSE_CONFIG, FIGHTING_STICK_MINI_CONFIG];

/**
 * Gamepad の id 文字列から最適な設定を返す。
 * どのパターンにも一致しなければ null を返す。
 *
 * @param {string} gamepadId  - gamepad.id
 * @returns {object|null}     - マッチした設定オブジェクト or null
 */
function detectConfig(gamepadId) {
  const lower = gamepadId.toLowerCase();
  for (const cfg of ALL_CONFIGS) {
    for (const pattern of cfg.deviceNamePatterns) {
      if (lower.includes(pattern.toLowerCase())) {
        return cfg;
      }
    }
  }
  return null;
}
