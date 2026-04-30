/**
 * keyboard-input.js
 * ============================================================
 * キーボード・マウス入力を仮想ゲームパッド状態に変換する。
 *
 * キーマッピング（DualSense / Fighting Stick Mini 共通）:
 *   十字キー/レバー  : W=上  S=下  A=左  D=右
 *   ×               : Space / Enter / マウス左クリック
 *   ○               : J
 *   □               : K
 *   △               : E
 *   Create / Share  : R
 *   Options         : Escape
 *   L1              : O
 *   R1              : P
 *   左スティック     : W=上  S=下  A=左  D=右（十字キーと共用）
 *   右スティック     : Numpad8=上  Numpad2=下  Numpad4=左  Numpad6=右
 *
 * 依存: なし（script.js より前に読み込む）
 * ============================================================
 */

"use strict";

// ── 仮想ゲームパッド状態 ──────────────────────────────────────

/**
 * キーボード/マウス入力から構築される仮想ゲームパッドの状態。
 * script.js の tick() から参照される。
 */
const virtualGamepad = {
  /** buttons[index] → { pressed: boolean, value: number } */
  buttons: Array.from({ length: 20 }, () => ({ pressed: false, value: 0 })),
  /** axes[0]=LS_X, axes[1]=LS_Y, axes[2]=RS_X, axes[3]=RS_Y */
  axes: [0, 0, 0, 0],
};

// ── 入力マッピング ────────────────────────────────────────────

/**
 * KeyboardEvent.code → ゲームパッドボタンインデックス
 *
 * ボタン番号の対応:
 *   0  = × (Cross)
 *   1  = ○ (Circle)
 *   2  = □ (Square)
 *   3  = △ (Triangle)
 *   4  = L1
 *   5  = R1
 *   8  = Create / Share
 *   9  = Options
 *   12 = 十字キー上 / レバー上
 *   13 = 十字キー下 / レバー下
 *   14 = 十字キー左 / レバー左
 *   15 = 十字キー右 / レバー右
 */
const KEY_TO_BUTTON_INDEX = {
  "Space":  0,   // × (Cross)
  "Enter":  0,   // × (Cross)
  "KeyJ":   1,   // ○ (Circle)
  "KeyK":   2,   // □ (Square)
  "KeyE":   3,   // △ (Triangle)
  "KeyO":   4,   // L1
  "KeyP":   5,   // R1
  "KeyR":   8,   // Create / Share
  "Escape": 9,   // Options
  "KeyW":   12,  // 十字キー上 / レバー上
  "KeyS":   13,  // 十字キー下 / レバー下
  "KeyA":   14,  // 十字キー左 / レバー左
  "KeyD":   15,  // 十字キー右 / レバー右
};

/**
 * マウスボタン番号 → ゲームパッドボタンインデックス
 *   0 = 左クリック → × (Cross)
 */
const MOUSE_TO_BUTTON_INDEX = {
  0: 0,
};

/**
 * スクロール等のデフォルト動作を抑止するキーコードのセット。
 * テキスト入力中は抑止しない（_shouldIgnoreKeyboard() でガード済み）。
 */
const PREVENT_DEFAULT_KEYS = new Set([
  "Space",
  "KeyW", "KeyS", "KeyA", "KeyD",
  "Numpad2", "Numpad4", "Numpad6", "Numpad8",
]);

// ── 内部状態 ──────────────────────────────────────────────────

/** 現在押下中の入力コードセット（KeyboardEvent.code または "Mouse0" 形式） */
const _pressedInputs = new Set();

// ── ユーティリティ ────────────────────────────────────────────

/**
 * テキスト入力中など、キーボード入力を無視すべき状況かどうか。
 * @returns {boolean}
 */
function _shouldIgnoreKeyboard() {
  const tag = document.activeElement?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

/**
 * 仮想ゲームパッドの状態を現在の _pressedInputs から再計算する。
 */
function _updateVirtualGamepad() {
  // ── ボタンをリセット ──
  for (const btn of virtualGamepad.buttons) {
    btn.pressed = false;
    btn.value = 0;
  }

  // ── 軸をリセット ──
  virtualGamepad.axes[0] = 0;
  virtualGamepad.axes[1] = 0;
  virtualGamepad.axes[2] = 0;
  virtualGamepad.axes[3] = 0;

  // ── キー → ボタン ──
  for (const code of _pressedInputs) {
    const btnIdx = KEY_TO_BUTTON_INDEX[code];
    if (btnIdx !== undefined) {
      virtualGamepad.buttons[btnIdx].pressed = true;
      virtualGamepad.buttons[btnIdx].value = 1;
    }

    // マウスボタン ("Mouse0", "Mouse1", ...)
    if (code.startsWith("Mouse")) {
      const mouseBtn = parseInt(code.slice(5), 10);
      const mBtnIdx = MOUSE_TO_BUTTON_INDEX[mouseBtn];
      if (mBtnIdx !== undefined) {
        virtualGamepad.buttons[mBtnIdx].pressed = true;
        virtualGamepad.buttons[mBtnIdx].value = 1;
      }
    }
  }

  // ── WASD → 左アナログスティック軸 ──
  if (_pressedInputs.has("KeyA")) virtualGamepad.axes[0] -= 1;
  if (_pressedInputs.has("KeyD")) virtualGamepad.axes[0] += 1;
  if (_pressedInputs.has("KeyW")) virtualGamepad.axes[1] -= 1;
  if (_pressedInputs.has("KeyS")) virtualGamepad.axes[1] += 1;

  // ── テンキー → 右アナログスティック軸 ──
  if (_pressedInputs.has("Numpad4")) virtualGamepad.axes[2] -= 1;
  if (_pressedInputs.has("Numpad6")) virtualGamepad.axes[2] += 1;
  if (_pressedInputs.has("Numpad8")) virtualGamepad.axes[3] -= 1;
  if (_pressedInputs.has("Numpad2")) virtualGamepad.axes[3] += 1;

  // ── 斜め入力の正規化（左スティック）──
  const lsLen = Math.hypot(virtualGamepad.axes[0], virtualGamepad.axes[1]);
  if (lsLen > 1) {
    virtualGamepad.axes[0] /= lsLen;
    virtualGamepad.axes[1] /= lsLen;
  }

  // ── 斜め入力の正規化（右スティック）──
  const rsLen = Math.hypot(virtualGamepad.axes[2], virtualGamepad.axes[3]);
  if (rsLen > 1) {
    virtualGamepad.axes[2] /= rsLen;
    virtualGamepad.axes[3] /= rsLen;
  }
}

// ── イベントリスナー ──────────────────────────────────────────

window.addEventListener("keydown", (e) => {
  if (_shouldIgnoreKeyboard()) return;
  if (e.repeat) return;
  if (PREVENT_DEFAULT_KEYS.has(e.code)) {
    e.preventDefault();
  }
  _pressedInputs.add(e.code);
  _updateVirtualGamepad();
});

window.addEventListener("keyup", (e) => {
  _pressedInputs.delete(e.code);
  _updateVirtualGamepad();
});

window.addEventListener("mousedown", (e) => {
  if (MOUSE_TO_BUTTON_INDEX[e.button] === undefined) return;
  _pressedInputs.add(`Mouse${e.button}`);
  _updateVirtualGamepad();
});

window.addEventListener("mouseup", (e) => {
  if (MOUSE_TO_BUTTON_INDEX[e.button] === undefined) return;
  _pressedInputs.delete(`Mouse${e.button}`);
  _updateVirtualGamepad();
});

// ウィンドウのフォーカスが外れた際に全入力をリセット（キー離し検知の漏れ対策）
window.addEventListener("blur", () => {
  _pressedInputs.clear();
  _updateVirtualGamepad();
});
