/**
 * touch-input.js
 * ============================================================
 * タッチ入力を仮想ゲームパッド状態に変換する。
 * スマホでの表示時にタッチでボタンやスティックを操作可能にする。
 *
 * 依存: config.js, script.js より前に読み込む
 *      keyboard-input.js の virtualGamepad を使用
 * ============================================================
 */

"use strict";

// ── 状態管理 ──────────────────────────────────────────────────

/**
 * タッチ入力の状態管理
 * touchId → { buttonIndex, stickId, startPos, ... }
 */
const touchState = {
  /** アクティブなタッチ: touchId → タッチ情報 */
  activeTouches: new Map(),
  /** スティック操作中のタッチID: stickId → touchId */
  stickTouches: new Map(),
};

// ── ユーティリティ関数 ────────────────────────────────────────

/**
 * タッチ座標をコントローラー画像の実座標に変換する。
 * スケールとオフセットを考慮して正確な座標を取得。
 *
 * @param {Touch} touch - タッチオブジェクト
 * @returns {{ x: number, y: number } | null} - 画像上の座標、または変換失敗時はnull
 */
function getTouchCoordinates(touch) {
  const img = document.getElementById("controller-image");
  const wrapper = document.getElementById("controller-wrapper");
  
  if (!img || !wrapper) return null;
  
  // 現在の設定を取得
  const config = typeof state !== "undefined" ? state.currentConfig : null;
  if (!config) return null;

  // wrapper内でのタッチ座標を取得
  const rect = wrapper.getBoundingClientRect();
  const touchX = touch.clientX - rect.left;
  const touchY = touch.clientY - rect.top;

  // スケール比率を計算（script.jsのupdateOverlayScale()と同じロジック）
  // img.offsetWidth = 実際の表示サイズ
  // config.imageWidth = config.jsで定義された基準サイズ
  const scale = img.offsetWidth / config.imageWidth;

  // config座標系に変換（スケールの逆数を掛ける）
  const realX = touchX / scale;
  const realY = touchY / scale;

  // デバッグ用ログ（スケール情報を含む）
  console.log('[Touch Debug] Scale info:', {
    clientX: touch.clientX,
    clientY: touch.clientY,
    wrapperLeft: rect.left,
    wrapperTop: rect.top,
    touchX: touchX,
    touchY: touchY,
    imgOffsetWidth: img.offsetWidth,
    configImageWidth: config.imageWidth,
    scale: scale,
    realX: realX,
    realY: realY
  });

  return { x: realX, y: realY };
}

/**
 * 指定座標がボタンの範囲内にあるかチェックする。
 *
 * @param {number} x - 座標X
 * @param {number} y - 座標Y
 * @param {object} button - ボタン設定
 * @returns {boolean} - 範囲内ならtrue
 */
function isPointInButton(x, y, button) {
  const shape = button.shape || "circle";
  
  if (shape === "rect") {
    // 矩形ボタン
    const left = button.x - button.w / 2;
    const right = button.x + button.w / 2;
    const top = button.y - button.h / 2;
    const bottom = button.y + button.h / 2;
    
    return x >= left && x <= right && y >= top && y <= bottom;
  } else {
    // 円形/楕円ボタン
    const dx = (x - button.x) / (button.w / 2);
    const dy = (y - button.y) / (button.h / 2);
    
    return (dx * dx + dy * dy) <= 1;
  }
}

/**
 * 指定座標がスティック範囲内にあるかチェックする。
 *
 * @param {number} x - 座標X
 * @param {number} y - 座標Y
 * @param {object} stick - スティック設定
 * @returns {boolean} - 範囲内ならtrue
 */
function isPointInStick(x, y, stick) {
  const dx = x - stick.cx;
  const dy = y - stick.cy;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // スティック範囲より少し大きめに判定（操作しやすさのため）
  return distance <= stick.radius * 1.5;
}

/**
 * タッチ座標から該当するボタンを検索する。
 *
 * @param {number} x - 座標X
 * @param {number} y - 座標Y
 * @param {object} config - コントローラー設定
 * @returns {object | null} - 該当するボタン設定、見つからない場合はnull
 */
function findButtonAtPosition(x, y, config) {
  if (!config || !config.buttons) return null;
  
  // ボタンを逆順で検索（後から描画されたものが上にあるため）
  for (let i = config.buttons.length - 1; i >= 0; i--) {
    const button = config.buttons[i];
    if (isPointInButton(x, y, button)) {
      return button;
    }
  }
  
  return null;
}

/**
 * タッチ座標から該当するスティックを検索する。
 *
 * @param {number} x - 座標X
 * @param {number} y - 座標Y
 * @param {object} config - コントローラー設定
 * @returns {object | null} - 該当するスティック設定、見つからない場合はnull
 */
function findStickAtPosition(x, y, config) {
  if (!config || !config.sticks) return null;
  
  for (const stick of config.sticks) {
    if (isPointInStick(x, y, stick)) {
      return stick;
    }
  }
  
  return null;
}

/**
 * スティックのタッチ位置から軸の値を計算する。
 *
 * @param {number} touchX - タッチ座標X
 * @param {number} touchY - タッチ座標Y
 * @param {object} stick - スティック設定
 * @returns {{ axisX: number, axisY: number }} - 軸の値（-1.0 〜 1.0）
 */
function calculateStickAxes(touchX, touchY, stick) {
  const dx = touchX - stick.cx;
  const dy = touchY - stick.cy;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // 範囲外の場合は最大値に制限
  if (distance > stick.radius) {
    const angle = Math.atan2(dy, dx);
    return {
      axisX: Math.cos(angle),
      axisY: Math.sin(angle)
    };
  }
  
  // 範囲内の場合は比率で計算
  return {
    axisX: dx / stick.radius,
    axisY: dy / stick.radius
  };
}

// ── タッチイベントハンドラー ──────────────────────────────────

/**
 * タッチ開始時の処理
 *
 * @param {TouchEvent} e - タッチイベント
 */
function handleTouchStart(e) {
  // virtualGamepad が存在しない場合は何もしない
  if (typeof virtualGamepad === "undefined") return;
  
  // 現在の設定を取得
  const config = typeof state !== "undefined" ? state.currentConfig : null;
  if (!config) return;
  
  // 追加されたタッチを処理
  for (const touch of e.changedTouches) {
    const coords = getTouchCoordinates(touch);
    if (!coords) continue;
    
    // デバッグ用ログ（本番環境では削除可能）
    console.log('[Touch Debug] Touch coords:', coords);
    
    // スティックを優先的にチェック（スティック範囲が広いため）
    const stick = findStickAtPosition(coords.x, coords.y, config);
    if (stick) {
      console.log('[Touch Debug] Stick detected:', stick.id);
      
      // スティック操作開始
      touchState.activeTouches.set(touch.identifier, {
        type: "stick",
        stickId: stick.id,
        stick: stick,
        startPos: { x: coords.x, y: coords.y }
      });
      touchState.stickTouches.set(stick.id, touch.identifier);
      
      // 初期位置で軸を更新
      const axes = calculateStickAxes(coords.x, coords.y, stick);
      virtualGamepad.axes[stick.axisX] = axes.axisX;
      virtualGamepad.axes[stick.axisY] = axes.axisY;
      
      continue;
    }
    
    // ボタンをチェック
    const button = findButtonAtPosition(coords.x, coords.y, config);
    if (button) {
      console.log('[Touch Debug] Button detected:', button.label, 'index:', button.index);
      
      // ボタン押下開始
      touchState.activeTouches.set(touch.identifier, {
        type: "button",
        buttonIndex: button.index,
        button: button
      });
      
      virtualGamepad.buttons[button.index] = { pressed: true, value: 1.0 };
    } else {
      console.log('[Touch Debug] No button found at coords:', coords);
    }
  }
  
  // デフォルト動作を防止（スクロールなど）
  e.preventDefault();
}

/**
 * タッチ移動時の処理
 *
 * @param {TouchEvent} e - タッチイベント
 */
function handleTouchMove(e) {
  if (typeof virtualGamepad === "undefined") return;
  
  for (const touch of e.changedTouches) {
    const touchInfo = touchState.activeTouches.get(touch.identifier);
    if (!touchInfo) continue;
    
    const coords = getTouchCoordinates(touch);
    if (!coords) continue;
    
    if (touchInfo.type === "stick") {
      // スティック操作の更新
      const axes = calculateStickAxes(coords.x, coords.y, touchInfo.stick);
      virtualGamepad.axes[touchInfo.stick.axisX] = axes.axisX;
      virtualGamepad.axes[touchInfo.stick.axisY] = axes.axisY;
    }
    // ボタンの場合は移動しても特に何もしない
  }
  
  e.preventDefault();
}

/**
 * タッチ終了時の処理
 *
 * @param {TouchEvent} e - タッチイベント
 */
function handleTouchEnd(e) {
  if (typeof virtualGamepad === "undefined") return;
  
  for (const touch of e.changedTouches) {
    const touchInfo = touchState.activeTouches.get(touch.identifier);
    if (!touchInfo) continue;
    
    if (touchInfo.type === "button") {
      // ボタンを離す
      virtualGamepad.buttons[touchInfo.buttonIndex] = { pressed: false, value: 0 };
    } else if (touchInfo.type === "stick") {
      // スティックをニュートラルに戻す
      virtualGamepad.axes[touchInfo.stick.axisX] = 0;
      virtualGamepad.axes[touchInfo.stick.axisY] = 0;
      touchState.stickTouches.delete(touchInfo.stickId);
    }
    
    touchState.activeTouches.delete(touch.identifier);
  }
  
  e.preventDefault();
}

/**
 * タッチキャンセル時の処理（画面外に出た場合など）
 *
 * @param {TouchEvent} e - タッチイベント
 */
function handleTouchCancel(e) {
  // タッチ終了と同じ処理
  handleTouchEnd(e);
}

// ── 初期化 ────────────────────────────────────────────────────

/**
 * タッチ入力システムの初期化。
 * DOMContentLoadedで自動的に呼ばれる。
 */
function initTouchInput() {
  const wrapper = document.getElementById("controller-wrapper");
  if (!wrapper) {
    console.warn("touch-input.js: controller-wrapper が見つかりません");
    return;
  }
  
  // タッチイベントリスナーを登録
  wrapper.addEventListener("touchstart", handleTouchStart, { passive: false });
  wrapper.addEventListener("touchmove", handleTouchMove, { passive: false });
  wrapper.addEventListener("touchend", handleTouchEnd, { passive: false });
  wrapper.addEventListener("touchcancel", handleTouchCancel, { passive: false });
  
  console.log("touch-input.js: タッチ入力が初期化されました");
}

// DOMContentLoaded でタッチ入力を初期化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTouchInput);
} else {
  initTouchInput();
}
