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
   * サウンド定義
   *   dpad           : 十字キー用のサウンド
   *   buttons        : ボタン用のサウンド
   *   stick          : アナログスティック押し込み用のサウンド
   *   create_options : Create/Optionsボタン用のサウンド
   */
  sounds: {
    dpad: {
      press: "sounds/dualsense/dpad-press.mp3",
      release: "sounds/dualsense/dpad-release.mp3"
    },
    buttons: {
      press: "sounds/dualsense/btn-press.mp3",
      release: "sounds/dualsense/btn-release.mp3"
    },
    stick: {
      press: "sounds/dualsense/stick-press.mp3",
      release: "sounds/dualsense/stick-release.mp3"
    },
    create_options: {
      press: "sounds/dualsense/create_options-press.mp3",
      release: "sounds/dualsense/create_options-press.mp3"  // 離した音は押下音と同じ
    }
  },

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
    { index:  0, label: "×",       x: 647, y: 212, w: 50, h: 50, soundCategory: "buttons" },
    { index:  1, label: "○",       x: 706, y: 153, w: 50, h: 50, soundCategory: "buttons" },
    { index:  2, label: "□",       x: 589, y: 154, w: 50, h: 50, soundCategory: "buttons" },
    { index:  3, label: "△",       x: 648, y: 95, w: 50, h: 50, soundCategory: "buttons" },

    // ── ショルダー / トリガー ─────────────────────────────
    { index:  4, label: "L1",      x: 152, y:  12, w: 106, h: 20, shape: "rect", soundCategory: "buttons" },
    { index:  5, label: "R1",      x: 648, y:  12, w: 106, h: 20, shape: "rect", soundCategory: "buttons" },
    { index:  6, label: "L2",      x: 50, y:  16, w: 82, h: 24, shape: "rect", soundCategory: "buttons" },
    { index:  7, label: "R2",      x: 750, y:  16, w: 82, h: 24, shape: "rect", soundCategory: "buttons" },

    // ── 特殊ボタン ────────────────────────────────────────
    { index:  8, label: "Create",  x: 214, y:  67, w: 20, h: 36, soundCategory: "create_options" },
    { index:  9, label: "Options", x: 585, y:  67, w: 20, h: 36, soundCategory: "create_options" },
    { index: 10, label: "L3",      x: 272, y: 262, w: 42, h: 42, soundCategory: "buttons" },
    { index: 11, label: "R3",      x: 527, y: 262, w: 42, h: 42, soundCategory: "buttons" },
    { index: 16, label: "PS",      x: 400, y: 304, w: 34, h: 8, shape: "rect", soundCategory: "buttons" },
    { index: 17, label: "Touch",   x: 400, y: 95, w: 280, h: 168, shape: "rect", soundCategory: "buttons" },

    // ── 十字キー ──────────────────────────────────────────
    { index: 12, label: "↑",       x: 151, y: 107, w: 34, h: 34, soundCategory: "dpad" },
    { index: 13, label: "↓",       x: 151, y: 200, w: 34, h: 34, soundCategory: "dpad" },
    { index: 14, label: "←",       x: 106, y: 152, w: 34, h: 34, soundCategory: "dpad" },
    { index: 15, label: "→",       x: 198, y: 152, w: 34, h: 34, soundCategory: "dpad" },
  ],

  /**
   * アナログスティック定義
   *   axisX, axisY : Gamepad API の axes[] インデックス
   *   cx, cy       : スティック中心座標 (px)
   *   radius       : スティック可動範囲の半径 (px)
   */
  sticks: [
    { id: "LS", label: "LS", axisX: 0, axisY: 1, cx: 272, cy: 262, radius: 48 },
    { id: "RS", label: "RS", axisX: 2, axisY: 3, cx: 527, cy: 262, radius: 48 },
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
  // FIGHTING STICK MINI は Xbox 360 互換モードで動作するため、
  // Gamepad API の id は "XBOX 360 Controller For Windows (STANDARD GAMEPAD)" と報告される。
  deviceNamePatterns: ["Fighting Stick", "HORI", "Arcade Stick", "FS-Mini", "XBOX 360 Controller"],

  /**
   * コントローラー画像のパスと表示サイズ。
   * 元画像 1417×752 をアスペクト比のまま縮小した値。
   */
  image: "images/fighting_stick_mini.jpg",
  imageWidth: 800,
  imageHeight: 425,

  /**
   * サウンド定義
   *   lever   : レバー用のサウンド
   *   buttons : ボタン用のサウンド
   *   upbtn   : 上部の小さなボタン用のサウンド
   */
  sounds: {
    lever: {
      press: "sounds/fightingStickMini/lever-press.mp3",
      release: "sounds/fightingStickMini/lever-release.mp3"
    },
    buttons: {
      press: "sounds/fightingStickMini/btn-press.mp3",
      release: "sounds/fightingStickMini/btn-release.mp3"
    },
    upbtn: {
      press: "sounds/fightingStickMini/upbtn-press.mp3",
      release: "sounds/fightingStickMini/upbtn-release.mp3"
    }
  },

  /**
   * ボタン定義
   * Fighting Stick Mini の標準アーケード配列（上段 4 + 下段 4）。
   * 実機の buttons[] インデックスはファームウェア/ドライバにより異なる場合があります。
   */
  buttons: [
    // ── フェイスボタン（上段 左→右: □ △ R1 L1）──────────
    { index:  2, label: "□",      x: 417, y: 169, w: 60, h: 32, soundCategory: "buttons" },
    { index:  3, label: "△",      x: 502, y: 156, w: 60, h: 32, soundCategory: "buttons" },
    { index:  5, label: "R1",     x: 589, y: 150, w: 60, h: 32, soundCategory: "buttons" },
    { index:  4, label: "L1",     x: 678, y: 150, w: 60, h: 32, soundCategory: "buttons" },

    // ── フェイスボタン（下段 左→右: × ○ R2 L2）──────
    { index:  0, label: "×",      x: 418, y: 210, w: 60, h: 32, soundCategory: "buttons" },
    { index:  1, label: "○",      x: 506, y: 198, w: 60, h: 32, soundCategory: "buttons" },
    { index:  7, label: "R2",     x: 596, y: 192, w: 62, h: 32, soundCategory: "buttons" },
    { index:  6, label: "L2",     x: 688, y: 191, w: 66, h: 32, soundCategory: "buttons" },

    // ── 特殊ボタン（天板中央ストリップ）─────────────────
    { index: 16, label: "PS",      x: 404, y: 120, w: 30, h: 16, soundCategory: "upbtn" },
    { index:  8, label: "Share",   x: 458, y: 120, w: 22, h: 14, soundCategory: "upbtn" },
    { index:  9, label: "Options", x: 506, y: 120, w: 22, h: 14, soundCategory: "upbtn" },
    { index: 10, label: "L3",      x: 553, y: 121, w: 22, h: 14, soundCategory: "upbtn" },
    { index: 11, label: "R3",      x: 601, y: 120, w: 22, h: 14, soundCategory: "upbtn" },

    // ── レバー（d-padボタンとして認識される場合の定義）──
    { index: 12, label: "↑", x: 181, y: 140, w: 0, h: 0, soundCategory: "lever" },  // サイズ0で非表示
    { index: 13, label: "↓", x: 181, y: 240, w: 0, h: 0, soundCategory: "lever" },
    { index: 14, label: "←", x: 130, y: 189, w: 0, h: 0, soundCategory: "lever" },
    { index: 15, label: "→", x: 230, y: 189, w: 0, h: 0, soundCategory: "lever" },
  ],

  /**
   * レバー定義
   *   レバーは通常 d-pad（十字キー）にマップされますが、
   *   ドライバ設定によってはアナログ axes にマップされることもあります。
   *   その場合はここの axisX / axisY を実機に合わせて調整してください。
   */
  sticks: [
    { id: "Lever", label: "Lever", type: "lever", axisX: 0, axisY: 1, cx: 181, cy: 189, radius: 63,
      stickBallX: 194, stickBallY: 73,   // ニュートラル時のボール中心
      stickBaseX: 194, stickBaseY: 180,  // シャフト入口（天板上）
      stickBallRadius: 56,               // ボール半径 px
      stickTilt: 24,                     // 最大傾き量 px（デフォルト：20）
      stickShaftWidth: 30,               // シャフトの太さ px
      stickColor: "#e82832",            // ボール・シャフトの色（デフォルト：#c8222a）
      stickMaskShapes: [
        // 元写真のレバーを视覚的に消す覚い形状
        { type: "circle",  cx: 194, cy: 73,  r: 60,           fill: "#1c3005" }, // ボール周辺（背景グリーン）
        { type: "rect",    x: 176,  y: 124,  w: 36, h: 70, rx: 10, fill: "#1c3005" }, // シャフト（ボディ白）
        //{ type: "ellipse", cx: 187, cy: 194, rx: 68, ry: 32,  fill: "#161616" }, // ベースディスク（黒）
      ] },
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
