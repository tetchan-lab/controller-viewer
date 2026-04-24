/**
 * config.js
 * ============================================================
 * コントローラーごとのボタンマッピング設定ファイル。
 * ここを編集するだけで座標・ラベル・画像パスをカスタマイズできます。
 *
 * 座標系: コントローラー画像の左上を (0, 0) とした px 単位。
 *   画像を差し替えたあと imageWidth / imageHeight とボタン座標を
 *   実際の写真に合わせて調整してください。
 * ============================================================
 */

"use strict";

// ----------------------------------------------------------------
// DualSense (PlayStation 5) マッピング
// ※ 座標は仮値です。実際の写真に合わせて調整してください。
// ----------------------------------------------------------------
const DUALSENSE_CONFIG = {
  id: "dualsense",
  name: "DualSense",

  /** 接続デバイス名に含まれる文字列（部分一致・大文字小文字無視）*/
  deviceNamePatterns: ["DualSense", "PS5 Controller", "PlayStation 5"],

  /** コントローラー画像のパスと基準サイズ */
  image: "images/dualsense.svg",
  imageWidth: 800,
  imageHeight: 450,

  /**
   * ボタン定義
   *   index : Gamepad API の buttons[] インデックス
   *   label : 表示ラベル
   *   x, y  : オーバーレイの中心座標 (px)
   *   w, h  : オーバーレイのサイズ (px)
   *   shape : "circle" | "rect" (省略時は "circle")
   */
  buttons: [
    // ── フェイスボタン ────────────────────────────────────
    { index:  0, label: "×",        x: 610, y: 265, w: 38, h: 38 },
    { index:  1, label: "○",        x: 650, y: 225, w: 38, h: 38 },
    { index:  2, label: "□",        x: 570, y: 225, w: 38, h: 38 },
    { index:  3, label: "△",        x: 610, y: 185, w: 38, h: 38 },

    // ── ショルダー / トリガー ─────────────────────────────
    { index:  4, label: "L1",       x: 175, y: 115, w: 55, h: 30, shape: "rect" },
    { index:  5, label: "R1",       x: 625, y: 115, w: 55, h: 30, shape: "rect" },
    { index:  6, label: "L2",       x: 175, y:  78, w: 55, h: 30, shape: "rect" },
    { index:  7, label: "R2",       x: 625, y:  78, w: 55, h: 30, shape: "rect" },

    // ── 特殊ボタン ────────────────────────────────────────
    { index:  8, label: "Create",   x: 315, y: 225, w: 34, h: 34 },
    { index:  9, label: "Options",  x: 485, y: 225, w: 34, h: 34 },
    { index: 10, label: "L3",       x: 235, y: 300, w: 38, h: 38 },
    { index: 11, label: "R3",       x: 505, y: 300, w: 38, h: 38 },
    { index: 16, label: "PS",       x: 400, y: 270, w: 40, h: 40 },
    { index: 17, label: "Touch",    x: 400, y: 215, w: 90, h: 55, shape: "rect" },

    // ── 十字キー ──────────────────────────────────────────
    { index: 12, label: "↑",        x: 200, y: 188, w: 32, h: 32 },
    { index: 13, label: "↓",        x: 200, y: 252, w: 32, h: 32 },
    { index: 14, label: "←",        x: 168, y: 220, w: 32, h: 32 },
    { index: 15, label: "→",        x: 232, y: 220, w: 32, h: 32 },
  ],

  /**
   * アナログスティック定義
   *   axisX, axisY : Gamepad API の axes[] インデックス
   *   cx, cy       : スティック中心座標 (px)
   *   radius       : スティック可動範囲の半径 (px)
   */
  sticks: [
    { id: "LS", label: "LS", axisX: 0, axisY: 1, cx: 235, cy: 300, radius: 45 },
    { id: "RS", label: "RS", axisX: 2, axisY: 3, cx: 505, cy: 300, radius: 45 },
  ],
};

// ----------------------------------------------------------------
// Fighting Stick Mini (HORI) マッピング
// ※ 座標は仮値です。実際の写真に合わせて調整してください。
// ----------------------------------------------------------------
const FIGHTING_STICK_MINI_CONFIG = {
  id: "fightingStickMini",
  name: "Fighting Stick Mini",

  /** 接続デバイス名に含まれる文字列（部分一致・大文字小文字無視）*/
  deviceNamePatterns: ["Fighting Stick", "HORI", "Arcade Stick", "FS-Mini"],

  /** コントローラー画像のパスと基準サイズ */
  image: "images/fightingstick.svg",
  imageWidth: 800,
  imageHeight: 450,

  /**
   * ボタン定義
   * Fighting Stick Mini の標準アーケード配列（上段 4 + 下段 4）。
   * 実機の buttons[] インデックスはファームウェア/ドライバにより異なる場合があります。
   */
  buttons: [
    // ── フェイスボタン（上段）────────────────────────────
    { index:  3, label: "△",    x: 425, y: 185, w: 48, h: 48 },
    { index:  2, label: "□",    x: 490, y: 160, w: 48, h: 48 },
    { index:  5, label: "R1",   x: 560, y: 158, w: 48, h: 48 },
    { index:  4, label: "L1",   x: 630, y: 163, w: 48, h: 48 },

    // ── フェイスボタン（下段）────────────────────────────
    { index:  0, label: "×",    x: 430, y: 250, w: 48, h: 48 },
    { index:  1, label: "○",    x: 498, y: 225, w: 48, h: 48 },
    { index:  7, label: "R2",   x: 568, y: 222, w: 48, h: 48 },
    { index:  6, label: "L2",   x: 638, y: 228, w: 48, h: 48 },

    // ── 特殊ボタン ────────────────────────────────────────
    { index:  8, label: "Share",   x: 270, y: 345, w: 40, h: 34 },
    { index:  9, label: "Options", x: 345, y: 345, w: 40, h: 34 },
    { index: 16, label: "PS",      x: 400, y: 390, w: 40, h: 40 },
    { index: 10, label: "L3",      x: 470, y: 345, w: 34, h: 34 },
    { index: 11, label: "R3",      x: 530, y: 345, w: 34, h: 34 },

    // ── 十字キー（レバーが d-pad にマップされる場合）────
    { index: 12, label: "↑",       x: 180, y: 205, w: 38, h: 38 },
    { index: 13, label: "↓",       x: 180, y: 283, w: 38, h: 38 },
    { index: 14, label: "←",       x: 141, y: 244, w: 38, h: 38 },
    { index: 15, label: "→",       x: 219, y: 244, w: 38, h: 38 },
  ],

  /**
   * レバー（アナログスティックにマップされる場合）
   * レバーが d-pad 専用の場合はこのセクションは表示に使われません。
   */
  sticks: [
    { id: "Lever", label: "Lever", axisX: 0, axisY: 1, cx: 180, cy: 244, radius: 55 },
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
