/**
 * script.js
 * ============================================================
 * Gamepad API を使ったコントローラー入力の可視化メイン処理。
 *
 * 依存: config.js (DUALSENSE_CONFIG, FIGHTING_STICK_MINI_CONFIG,
 *                  ALL_CONFIGS, detectConfig)
 * ============================================================
 */

"use strict";

// ── 状態管理 ─────────────────────────────────────────────────
const state = {
  /** 現在表示中のコントローラー設定 */
  currentConfig: null,
  /** 現在接続中の Gamepad オブジェクト（ポーリング用） */
  activeGamepad: null,
  /** requestAnimationFrame の ID */
  rafId: null,
};

// ── DOM 参照 ──────────────────────────────────────────────────
const elements = {
  deviceName:    document.getElementById("device-name"),
  controllerImg: document.getElementById("controller-image"),
  overlayLayer:  document.getElementById("button-overlays"),
  stickCanvas:   document.getElementById("stick-canvas"),
  btnDualSense:  document.getElementById("btn-dualsense"),
  btnFSMini:     document.getElementById("btn-fightingStickMini"),
};

// ── 初期化 ────────────────────────────────────────────────────

/**
 * 指定した設定でUI全体を再構築する。
 * @param {object} config - config.js に定義されたコントローラー設定
 */
function applyConfig(config) {
  state.currentConfig = config;

  // 画像を差し替える
  elements.controllerImg.src = config.image;
  elements.controllerImg.alt = config.name;

  // コンテナのサイズを設定
  const wrapper = document.getElementById("controller-wrapper");
  wrapper.style.width  = config.imageWidth  + "px";
  wrapper.style.height = config.imageHeight + "px";

  // canvas サイズを合わせる
  elements.stickCanvas.width  = config.imageWidth;
  elements.stickCanvas.height = config.imageHeight;

  // ボタンオーバーレイを再生成
  buildOverlays(config);

  // アクティブボタンのハイライトを更新
  updateActiveButton(config.id);
}

/**
 * ボタン・スティックのオーバーレイ要素を生成して DOM に挿入する。
 * @param {object} config
 */
function buildOverlays(config) {
  elements.overlayLayer.innerHTML = "";

  for (const btn of config.buttons) {
    const el = document.createElement("div");
    el.className = "btn-overlay";
    el.dataset.index = btn.index;
    el.dataset.label = btn.label;

    const shape = btn.shape || "circle";
    el.classList.add("shape-" + shape);

    el.style.left   = (btn.x - btn.w / 2) + "px";
    el.style.top    = (btn.y - btn.h / 2) + "px";
    el.style.width  = btn.w + "px";
    el.style.height = btn.h + "px";

    const labelEl = document.createElement("span");
    labelEl.className = "btn-label";
    labelEl.textContent = btn.label;
    el.appendChild(labelEl);

    elements.overlayLayer.appendChild(el);
  }

  // スティックオーバーレイ
  for (const stick of config.sticks) {
    const el = document.createElement("div");
    el.className = "stick-overlay";
    el.id = "stick-" + stick.id;
    el.dataset.stickId = stick.id;

    const size = stick.radius * 2;
    el.style.left   = (stick.cx - stick.radius) + "px";
    el.style.top    = (stick.cy - stick.radius) + "px";
    el.style.width  = size + "px";
    el.style.height = size + "px";

    // スティックの「つまみ」
    const dot = document.createElement("div");
    dot.className = "stick-dot";
    el.appendChild(dot);

    elements.overlayLayer.appendChild(el);
  }
}

// ── 手動切り替え ──────────────────────────────────────────────

/**
 * コントローラーを手動で切り替える（ページ上のボタン用）。
 * @param {string} configId - "dualsense" | "fightingStickMini"
 */
function switchController(configId) {
  const config = ALL_CONFIGS.find((c) => c.id === configId);
  if (config) applyConfig(config);
}

/**
 * アクティブなコントローラーボタンのスタイルを更新する。
 * @param {string} configId
 */
function updateActiveButton(configId) {
  elements.btnDualSense.classList.toggle("active", configId === "dualsense");
  elements.btnFSMini.classList.toggle("active",    configId === "fightingStickMini");
}

// ── Gamepad API イベント ──────────────────────────────────────

window.addEventListener("gamepadconnected", (e) => {
  const gp = e.gamepad;
  console.log(`[GamepadConnected] ${gp.id}`);

  state.activeGamepad = gp;

  // デバイス名で自動判定
  const detected = detectConfig(gp.id);
  if (detected) {
    applyConfig(detected);
    elements.deviceName.textContent = `接続中: ${gp.id}`;
    elements.deviceName.classList.add("connected");
  } else {
    elements.deviceName.textContent = `接続中（未対応デバイス）: ${gp.id}`;
    elements.deviceName.classList.add("connected");
  }

  startPolling();
});

window.addEventListener("gamepaddisconnected", (e) => {
  console.log(`[GamepadDisconnected] ${e.gamepad.id}`);

  if (state.activeGamepad && state.activeGamepad.index === e.gamepad.index) {
    state.activeGamepad = null;
    elements.deviceName.textContent = "コントローラー未接続";
    elements.deviceName.classList.remove("connected");
    stopPolling();
    clearCanvas();
  }
});

// ── ポーリングループ ──────────────────────────────────────────

function startPolling() {
  if (state.rafId !== null) return;
  loop();
}

function stopPolling() {
  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  // すべてのオーバーレイの pressed 状態を解除
  document.querySelectorAll(".btn-overlay.pressed").forEach((el) =>
    el.classList.remove("pressed")
  );
}

function loop() {
  state.rafId = requestAnimationFrame(() => {
    tick();
    loop();
  });
}

/**
 * 1フレーム分の入力状態を取得してUIに反映する。
 */
function tick() {
  // Chrome では getGamepads() で最新状態を取得する必要がある
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  if (state.activeGamepad !== null) {
    gp = gamepads[state.activeGamepad.index];
  }

  if (!gp || !state.currentConfig) return;

  const config = state.currentConfig;

  // ── ボタン状態の反映 ──
  const overlays = elements.overlayLayer.querySelectorAll(".btn-overlay");
  overlays.forEach((el) => {
    const idx = parseInt(el.dataset.index, 10);
    const btn = gp.buttons[idx];
    if (!btn) return;

    const pressed = btn.pressed || btn.value > 0.5;
    el.classList.toggle("pressed", pressed);

    // アナログ値（L2/R2など）をCSS変数に渡して視覚的な強度表現に使用可能
    if (typeof btn.value === "number") {
      el.style.setProperty("--analog-value", btn.value.toFixed(2));
    }
  });

  // ── スティック状態の反映 ──
  const ctx = elements.stickCanvas.getContext("2d");
  ctx.clearRect(0, 0, elements.stickCanvas.width, elements.stickCanvas.height);

  for (const stick of config.sticks) {
    const axisX = gp.axes[stick.axisX] || 0;
    const axisY = gp.axes[stick.axisY] || 0;

    // スティックのつまみ位置を更新
    const stickEl = document.getElementById("stick-" + stick.id);
    if (stickEl) {
      const dot = stickEl.querySelector(".stick-dot");
      if (dot) {
        const maxOffset = stick.radius * 0.6;
        const dx = axisX * maxOffset;
        const dy = axisY * maxOffset;
        dot.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }
    }

    // canvas に軌跡の円を描画
    drawStickIndicator(ctx, stick, axisX, axisY);
  }
}

/**
 * スティックの可動範囲と現在位置をキャンバスに描画する。
 */
function drawStickIndicator(ctx, stick, axisX, axisY) {
  const { cx, cy, radius } = stick;
  const dotX = cx + axisX * radius * 0.6;
  const dotY = cy + axisY * radius * 0.6;

  // 可動範囲の外枠（薄い円）
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // スティック位置のドット
  ctx.beginPath();
  ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 200, 255, 0.75)";
  ctx.fill();
}

function clearCanvas() {
  const ctx = elements.stickCanvas.getContext("2d");
  ctx.clearRect(0, 0, elements.stickCanvas.width, elements.stickCanvas.height);
}

// ── 起動処理 ──────────────────────────────────────────────────

(function init() {
  // デフォルトは DualSense を表示
  applyConfig(DUALSENSE_CONFIG);

  // すでに接続済みのゲームパッドがある場合に対応（ページリロード後など）
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of gamepads) {
    if (!gp) continue;
    state.activeGamepad = gp;
    const detected = detectConfig(gp.id);
    if (detected) {
      applyConfig(detected);
    }
    elements.deviceName.textContent = `接続中: ${gp.id}`;
    elements.deviceName.classList.add("connected");
    startPolling();
    break;
  }
})();
