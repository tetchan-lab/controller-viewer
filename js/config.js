/**
 * config.js  –  コントローラー設定ファイル
 * =====================================================
 * このファイルで「画像パス・ボタン座標・スティック座標」を
 * 編集してください。他のファイルを触る必要はありません。
 *
 * ボタン定義の各フィールド：
 *   id      : 識別子（任意の文字列）
 *   index   : Gamepad API の buttons[index] に対応する番号
 *   x, y    : 画像上のボタン中心座標（ピクセル）
 *   w, h    : 強調表示する楕円の幅・高さ（ピクセル）
 *   color   : 押下時のオーバーレイ色（CSS rgba 形式）
 *   analog  : true にするとアナログ入力量で透明度が変わる
 *
 * スティック定義の各フィールド：
 *   id      : 識別子
 *   axisX   : Gamepad API の axes[axisX]（横軸）
 *   axisY   : Gamepad API の axes[axisY]（縦軸）
 *   cx, cy  : スティック中心座標（ピクセル）
 *   radius  : 可動範囲の半径（ピクセル）
 *   dotRadius: ドットの描画半径（ピクセル）
 *   color   : ドットの色
 */

"use strict";

// ======================================================
// アプリ全体の設定
// ======================================================
const APP_CONFIG = {
  /** requestAnimationFrame を使ったポーリング。
   *  falseにすると setInterval (16ms) を使います。 */
  useRAF: true,
  /** スティック・デッドゾーン（この値未満の入力は無視） */
  deadzone: 0.08,
  /** ボタン押下とみなすアナログ閾値 */
  buttonThreshold: 0.1,
};

// ======================================================
// コントローラー設定（複数登録可能）
// ======================================================
const CONTROLLER_CONFIGS = {

  // ────────────────────────────────────────────────────
  // DualSense / DualShock 4 用設定
  // 画像: images/gamepad.png  (800 × 400 px)
  // ────────────────────────────────────────────────────
  dualsense: {
    name: "DualSense / DS4",
    image: "images/gamepad.png",
    imageWidth: 800,
    imageHeight: 400,

    buttons: [
      // ── フェイスボタン ──────────────────────────────
      { id: "cross",    index:  0, x: 590, y: 285, w: 44, h: 44, shape: "circle", color: "rgba(100,180,255,0.75)" },
      { id: "circle",   index:  1, x: 630, y: 245, w: 44, h: 44, shape: "circle", color: "rgba(255,120,120,0.75)" },
      { id: "square",   index:  2, x: 550, y: 245, w: 44, h: 44, shape: "circle", color: "rgba(210,140,230,0.75)" },
      { id: "triangle", index:  3, x: 590, y: 205, w: 44, h: 44, shape: "circle", color: "rgba(120,230,140,0.75)" },

      // ── バンパー ────────────────────────────────────
      { id: "L1", index:  4, x: 165, y: 112, w: 100, h: 30, shape: "rect", color: "rgba(240,200,80,0.70)" },
      { id: "R1", index:  5, x: 635, y: 112, w: 100, h: 30, shape: "rect", color: "rgba(240,200,80,0.70)" },

      // ── トリガー（アナログ） ──────────────────────
      { id: "L2", index:  6, x: 155, y:  68, w: 110, h: 40, shape: "rect", color: "rgba(240,160,50,0.80)", analog: true },
      { id: "R2", index:  7, x: 645, y:  68, w: 110, h: 40, shape: "rect", color: "rgba(240,160,50,0.80)", analog: true },

      // ── 中央ボタン ──────────────────────────────────
      { id: "create",   index:  8, x: 330, y: 183, w: 32, h: 32, shape: "circle", color: "rgba(200,200,255,0.75)" },
      { id: "options",  index:  9, x: 470, y: 183, w: 32, h: 32, shape: "circle", color: "rgba(200,200,255,0.75)" },

      // ── スティック押下 ──────────────────────────────
      { id: "L3", index: 10, x: 315, y: 270, w: 48, h: 48, shape: "circle", color: "rgba(255,255,100,0.60)" },
      { id: "R3", index: 11, x: 480, y: 270, w: 48, h: 48, shape: "circle", color: "rgba(255,255,100,0.60)" },

      // ── 方向キー ─────────────────────────────────────
      { id: "dup",    index: 12, x: 225, y: 197, w: 44, h: 44, shape: "rect", color: "rgba(255,255,255,0.65)" },
      { id: "ddown",  index: 13, x: 225, y: 275, w: 44, h: 44, shape: "rect", color: "rgba(255,255,255,0.65)" },
      { id: "dleft",  index: 14, x: 186, y: 236, w: 44, h: 44, shape: "rect", color: "rgba(255,255,255,0.65)" },
      { id: "dright", index: 15, x: 264, y: 236, w: 44, h: 44, shape: "rect", color: "rgba(255,255,255,0.65)" },

      // ── PS / タッチパッド ────────────────────────────
      { id: "ps",       index: 16, x: 400, y: 300, w: 36, h: 36, shape: "circle", color: "rgba(180,220,255,0.80)" },
      { id: "touchpad", index: 17, x: 400, y: 183, w: 120, h: 76, shape: "rect",   color: "rgba(180,220,255,0.60)" },
    ],

    sticks: [
      // id, axisX, axisY, cx, cy, radius（可動範囲）, dotRadius, color
      { id: "left",  axisX: 0, axisY: 1, cx: 315, cy: 270, radius: 28, dotRadius: 10, color: "rgba(255,255,255,0.90)" },
      { id: "right", axisX: 2, axisY: 3, cx: 480, cy: 270, radius: 28, dotRadius: 10, color: "rgba(255,255,255,0.90)" },
    ],
  },

  // ────────────────────────────────────────────────────
  // ファイティングスティック用設定
  // 画像: images/fightingstick.png  (800 × 400 px)
  // ────────────────────────────────────────────────────
  fightingstick: {
    name: "ファイティングスティック",
    image: "images/fightingstick.png",
    imageWidth: 800,
    imageHeight: 400,

    buttons: [
      // ── 下段 4 ボタン（index 0-3） ───────────────────
      { id: "btn0", index: 0, x: 370, y: 268, w: 60, h: 60, shape: "circle", color: "rgba(255,100,100,0.80)" },
      { id: "btn1", index: 1, x: 450, y: 252, w: 60, h: 60, shape: "circle", color: "rgba(255,220, 60,0.80)" },
      { id: "btn2", index: 2, x: 530, y: 252, w: 60, h: 60, shape: "circle", color: "rgba(100,230,100,0.80)" },
      { id: "btn3", index: 3, x: 610, y: 268, w: 60, h: 60, shape: "circle", color: "rgba(100,150,255,0.80)" },

      // ── 上段 4 ボタン（index 4-7） ───────────────────
      { id: "btn4", index: 4, x: 370, y: 188, w: 60, h: 60, shape: "circle", color: "rgba(220,120,230,0.80)" },
      { id: "btn5", index: 5, x: 450, y: 172, w: 60, h: 60, shape: "circle", color: "rgba(240,160, 60,0.80)" },
      { id: "btn6", index: 6, x: 530, y: 172, w: 60, h: 60, shape: "circle", color: "rgba( 80,230,240,0.80)" },
      { id: "btn7", index: 7, x: 610, y: 188, w: 60, h: 60, shape: "circle", color: "rgba( 60,220,220,0.80)" },

      // ── サイドボタン（スティック右側） ───────────────
      // ※ 実機のボタン番号はデバイスによって異なります。
      //   ご自身のスティックの index に合わせて変更してください。
      { id: "R3",      index: 11, x: 670, y: 310, w: 40, h: 40, shape: "circle", color: "rgba(255,255,100,0.60)" },
      { id: "share",   index:  8, x: 240, y: 345, w: 32, h: 32, shape: "circle", color: "rgba(200,200,255,0.75)" },
      { id: "options", index:  9, x: 320, y: 345, w: 32, h: 32, shape: "circle", color: "rgba(200,200,255,0.75)" },
      { id: "ps",      index: 16, x: 400, y: 345, w: 32, h: 32, shape: "circle", color: "rgba(180,220,255,0.80)" },
    ],

    sticks: [
      // レバー（ジョイスティック）
      { id: "lever", axisX: 0, axisY: 1, cx: 175, cy: 215, radius: 35, dotRadius: 14, color: "rgba(255,255,255,0.90)" },
    ],
  },

};

// デフォルトで読み込む設定のキー
const DEFAULT_CONTROLLER = "dualsense";
