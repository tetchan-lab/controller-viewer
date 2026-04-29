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

// ── 定数 ─────────────────────────────────────────────────────
/** デバイス名の最大表示長 */
const DEVICE_NAME_MAX_LENGTH = 50;
/** デバイス名の切り詰め長（"..." を付けるため -3） */
const DEVICE_NAME_TRUNCATE_LENGTH = 47;

// ── 状態管理 ─────────────────────────────────────────────────
const state = {
  /** 現在表示中のコントローラー設定 */
  currentConfig: null,
  /** 現在入力を読み取っている Gamepad オブジェクト（ポーリング用） */
  activeGamepad: null,
  /** 接続中の全 Gamepad を index → gamepad で管理 */
  connectedGamepads: {},
  /** ?controller= により固定された configId（null = 自動判定モード） */
  pinnedConfigId: null,
  /** ?device= により固定されたデバイスフィルター（null = すべて受け入れ） */
  pinnedDeviceFilter: null,
  /** requestAnimationFrame の ID */
  rafId: null,
  /** ボタンステート追跡（サウンドトリガー用）: gamepadIndex → { buttonIndex → boolean } */
  buttonStates: {},
  /** レバー/アナログスティックステート追跡: gamepadIndex → { stickId → { isNeutral } } */
  leverStates: {},
  /** サウンドシステムが初期化済みか */
  soundInitialized: false,
};

// ── DOM 参照 ──────────────────────────────────────────────────
const elements = {
  deviceName:    document.getElementById("device-name"),
  controllerImg: document.getElementById("controller-image"),
  overlayLayer:  document.getElementById("button-overlays"),
  stickCanvas:   document.getElementById("stick-canvas"),
  btnDualSense:  document.getElementById("btn-dualsense"),
  btnFSMini:     document.getElementById("btn-fightingStickMini"),
  deviceSelect:  document.getElementById("device-select"),
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

  // デバッグモードの場合は座標確認オーバーレイを描画
  if (isDebugMode()) buildDebugOverlay(config);

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

  // スティック / レバー オーバーレイ
  for (const stick of config.sticks) {
    if (stick.type === "lever") {
      const container = buildStickImgOverlay(stick);
      elements.overlayLayer.appendChild(container);
    } else {
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
}

// ── カスタムレバー SVG ─────────────────────────────────────────

/**
 * 16進カラー文字列の輝度を調整する。
 * @param {string} hex "#rrggbb"
 * @param {number} delta  調整量 (-255 ~ 255)
 * @returns {string}
 */
function _adjustHexColor(hex, delta) {
  const n = parseInt(hex.replace("#", ""), 16);
  const clamp = (v) => Math.min(255, Math.max(0, v));
  const r = clamp((n >> 16)        + delta);
  const g = clamp(((n >> 8) & 0xff) + delta);
  const b = clamp((n & 0xff)        + delta);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/**
 * 写真の遠近感に合わせたカスタムレバー SVG を生成する。
 *
 * stick config で使うプロパティ:
 *   stickBallX/Y      : ニュートラル時のボール中心（画像座標）
 *   stickBaseX/Y      : シャフトが天板から出てくる固定点（画像座標）
 *   stickBallRadius   : ボール半径 px
 *   stickTilt         : 最大傾き量 px（フル入力時のボール移動距離）
 *   stickShaftWidth   : シャフトの太さ px（省略時 7）
 *   stickColor        : ボール・シャフトの色 "#rrggbb"（省略時グレー）
 *   stickMaskShapes   : 元写真のレバーを隠す形状配列 [{type,fill,...}]
 *
 * @param {object} stick
 * @returns {SVGElement}
 */
function buildStickImgOverlay(stick) {
  const baseX   = stick.stickBaseX      ?? stick.cx;
  const baseY   = stick.stickBaseY      ?? stick.cy;
  const ballNX  = stick.stickBallX      ?? stick.cx;
  const ballNY  = stick.stickBallY      ?? stick.cy - 80;
  const ballR   = stick.stickBallRadius ?? 28;
  const tilt    = stick.stickTilt       ?? 20;
  const shaftW  = stick.stickShaftWidth ?? 7;
  const color   = stick.stickColor      || null;

  // ── ボール・シャフトを包む基本範囲 ────────────────────────
  const pad = ballR + tilt + 6;
  let minX = Math.min(baseX, ballNX) - pad;
  let minY = Math.min(baseY, ballNY) - pad;
  let maxX = Math.max(baseX, ballNX) + pad;
  let maxY = Math.max(baseY, ballNY) + pad;

  // マスク形状が存在すれば SVG 範囲を拡張
  if (stick.stickMaskShapes) {
    for (const s of stick.stickMaskShapes) {
      let b;
      if (s.type === "circle")  b = { l: s.cx - s.r,  t: s.cy - s.r,  r: s.cx + s.r,  b: s.cy + s.r  };
      if (s.type === "ellipse") b = { l: s.cx - s.rx, t: s.cy - s.ry, r: s.cx + s.rx, b: s.cy + s.ry };
      if (s.type === "rect")    b = { l: s.x,         t: s.y,         r: s.x  + s.w,  b: s.y  + s.h  };
      if (b) {
        minX = Math.min(minX, b.l); minY = Math.min(minY, b.t);
        maxX = Math.max(maxX, b.r); maxY = Math.max(maxY, b.b);
      }
    }
  }

  const svgW = maxX - minX;
  const svgH = maxY - minY;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.id = "stick-img-" + stick.id;
  svg.setAttribute("width",  svgW);
  svg.setAttribute("height", svgH);
  svg.setAttribute("viewBox", `${minX} ${minY} ${svgW} ${svgH}`);
  svg.style.cssText = [
    "position:absolute",
    `left:${minX}px`,
    `top:${minY}px`,
    "pointer-events:none",
    "z-index:5",
    "overflow:visible",
  ].join(";");

  // ── グラデーション定義 ────────────────────────────────────
  const defs = document.createElementNS(ns, "defs");

  const gradId = "lever-ball-grad-" + stick.id;
  const grad   = document.createElementNS(ns, "radialGradient");
  grad.setAttribute("id", gradId);
  grad.setAttribute("cx", "35%"); grad.setAttribute("cy", "25%"); grad.setAttribute("r", "60%");
  grad.setAttribute("gradientUnits", "objectBoundingBox");

  const gradStops = color
    ? [["0%", _adjustHexColor(color, 70)], ["45%", color], ["100%", _adjustHexColor(color, -80)]]
    : [["0%", "#585858"], ["45%", "#181818"], ["100%", "#000"]];

  gradStops.forEach(([off, col]) => {
    const s = document.createElementNS(ns, "stop");
    s.setAttribute("offset", off); s.setAttribute("stop-color", col);
    grad.appendChild(s);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);

  // ── マスク（元写真のレバーを覆い隠す）────────────────────
  if (stick.stickMaskShapes) {
    for (const shape of stick.stickMaskShapes) {
      let el;
      if (shape.type === "circle") {
        el = document.createElementNS(ns, "circle");
        el.setAttribute("cx", String(shape.cx));
        el.setAttribute("cy", String(shape.cy));
        el.setAttribute("r",  String(shape.r));
      } else if (shape.type === "ellipse") {
        el = document.createElementNS(ns, "ellipse");
        el.setAttribute("cx", String(shape.cx));
        el.setAttribute("cy", String(shape.cy));
        el.setAttribute("rx", String(shape.rx));
        el.setAttribute("ry", String(shape.ry));
      } else if (shape.type === "rect") {
        el = document.createElementNS(ns, "rect");
        el.setAttribute("x",      String(shape.x));
        el.setAttribute("y",      String(shape.y));
        el.setAttribute("width",  String(shape.w));
        el.setAttribute("height", String(shape.h));
        if (shape.rx) el.setAttribute("rx", String(shape.rx));
      }
      if (el) {
        el.setAttribute("fill", shape.fill || "transparent");
        svg.appendChild(el);
      }
    }
  }

  // ── シャフト ──────────────────────────────────────────────
  const shaftColor = color ? _adjustHexColor(color, -40) : "#c8c8c8";
  const shaft = document.createElementNS(ns, "line");
  shaft.id = "lever-shaft-custom-" + stick.id;
  shaft.setAttribute("x1", String(baseX));  shaft.setAttribute("y1", String(baseY));
  shaft.setAttribute("x2", String(ballNX)); shaft.setAttribute("y2", String(ballNY));
  shaft.setAttribute("stroke", shaftColor);
  shaft.setAttribute("stroke-width", String(shaftW));
  shaft.setAttribute("stroke-linecap", "round");
  svg.appendChild(shaft);

  // ── ボール ────────────────────────────────────────────────
  const ball = document.createElementNS(ns, "circle");
  ball.id = "lever-ball-custom-" + stick.id;
  ball.setAttribute("cx", String(ballNX)); ball.setAttribute("cy", String(ballNY));
  ball.setAttribute("r",  String(ballR));
  ball.setAttribute("fill", `url(#${gradId})`);
  ball.setAttribute("stroke", "rgba(255,255,255,0.07)");
  ball.setAttribute("stroke-width", "1.5");
  svg.appendChild(ball);

  // ── スペキュラハイライト ──────────────────────────────────
  const hl = document.createElementNS(ns, "ellipse");
  hl.id = "lever-hl-custom-" + stick.id;
  hl.setAttribute("cx", String(ballNX - ballR * 0.22));
  hl.setAttribute("cy", String(ballNY - ballR * 0.30));
  hl.setAttribute("rx", String(ballR * 0.32));
  hl.setAttribute("ry", String(ballR * 0.20));
  hl.setAttribute("fill", "rgba(255,255,255,0.18)");
  svg.appendChild(hl);

  return svg;
}

/**
 * カスタムレバー SVG をアナログ入力 / d-pad 入力に合わせて更新する。
 * シャフト根元（stickBaseX/Y）は固定のまま、ボールが傾き方向に移動する。
 *
 * @param {object}  stick
 * @param {Gamepad} gp
 * @param {object}  config
 */
function updateStickImg(stick, gp, config) {
  const ballNX = stick.stickBallX      ?? stick.cx;
  const ballNY = stick.stickBallY      ?? stick.cy - 80;
  const ballR  = stick.stickBallRadius ?? 28;
  const tilt   = stick.stickTilt       ?? 20;

  // アナログ軸を優先し、ニュートラルなら d-pad ボタンで補完
  let ax = gp.axes[stick.axisX] || 0;
  let ay = gp.axes[stick.axisY] || 0;
  if (Math.abs(ax) < 0.1 && Math.abs(ay) < 0.1) {
    // config.buttons に ↑↓←→ がなくても動くよう固定インデックスで直読み
    const dpadUp    = stick.dpadUp    ?? 12;
    const dpadDown  = stick.dpadDown  ?? 13;
    const dpadLeft  = stick.dpadLeft  ?? 14;
    const dpadRight = stick.dpadRight ?? 15;
    if (gp.buttons[dpadUp]?.pressed)    ay -= 1;
    if (gp.buttons[dpadDown]?.pressed)  ay += 1;
    if (gp.buttons[dpadLeft]?.pressed)  ax -= 1;
    if (gp.buttons[dpadRight]?.pressed) ax += 1;
    // 斜め入力を正規化
    const len = Math.sqrt(ax * ax + ay * ay);
    if (len > 1) { ax /= len; ay /= len; }
  }

  const bx = ballNX + ax * tilt;
  const by = ballNY + ay * tilt;

  const shaft = document.getElementById("lever-shaft-custom-" + stick.id);
  const ball  = document.getElementById("lever-ball-custom-"  + stick.id);
  const hl    = document.getElementById("lever-hl-custom-"    + stick.id);

  if (shaft) {
    shaft.setAttribute("x2", String(bx));
    shaft.setAttribute("y2", String(by));
  }
  if (ball) {
    ball.setAttribute("cx", String(bx));
    ball.setAttribute("cy", String(by));
  }
  if (hl) {
    hl.setAttribute("cx", String(bx - ballR * 0.22));
    hl.setAttribute("cy", String(by - ballR * 0.30));
  }
}

// ── 手動切り替え ──────────────────────────────────────────────

/**
 * コントローラーを手動で切り替える（ページ上のボタン用）。
 * 変更前：UI 設定だけでなく、対応するゲームパッドを activeGamepad に切り替える。
 * 変更後：UI 設定だけでなく、接続中の任意のゲームパッドを activeGamepad に設定する。
 * @param {string} configId - "dualsense" | "fightingStickMini"
 */
function switchController(configId) {
  const config = ALL_CONFIGS.find((c) => c.id === configId);
  if (!config) return;
  applyConfig(config);

  // 変更前：接続中のゲームパッドから該当デバイスを探して activeGamepad を切り替える
  // 変更後：接続中の任意のゲームパッドを activeGamepad に設定
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of gamepads) {
    if (!gp) continue;

    // すべてのゲームパッドで全ての設定が使えるようにする
    state.activeGamepad = gp;
    elements.deviceName.textContent = `接続中: ${gp.id}`;
    elements.deviceName.classList.add("connected");
    if (state.rafId === null) startPolling();
    return;  // 最初の有効なゲームパッドを使う    
  }
}

/**
 * アクティブなコントローラーボタンのスタイルを更新する。
 * @param {string} configId
 */
function updateActiveButton(configId) {
  elements.btnDualSense.classList.toggle("active", configId === "dualsense");
  elements.btnFSMini.classList.toggle("active",    configId === "fightingStickMini");
}

/**
 * デバイスステータステキストを更新する。
 * @param {Gamepad} gamepad - 接続中のゲームパッド
 */
function updateDeviceStatusText(gamepad) {
  const count = Object.keys(state.connectedGamepads).length;
  if (count > 1) {
    elements.deviceName.textContent = `接続中 (${count}台): ${gamepad.id} 他`;
  } else {
    elements.deviceName.textContent = `接続中: ${gamepad.id}`;
  }
  elements.deviceName.classList.add("connected");
}

/**
 * デバイス選択UIを更新する（接続中のゲームパッド一覧を表示）。
 */
function updateDeviceSelect() {
  if (!elements.deviceSelect) return;

  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const currentValue = elements.deviceSelect.value;

  // 現在の選択肢をクリア（"すべてのデバイス"以外）
  elements.deviceSelect.innerHTML = '<option value="auto">すべてのデバイス</option>';

  // 接続中のゲームパッドを選択肢に追加
  for (const gp of gamepads) {
    if (!gp) continue;
    
    const option = document.createElement("option");
    option.value = String(gp.index);
    
    // デバイス名を短縮表示（長すぎる場合）
    let displayName = gp.id;
    if (displayName.length > DEVICE_NAME_MAX_LENGTH) {
      displayName = displayName.substring(0, DEVICE_NAME_TRUNCATE_LENGTH) + "...";
    }
    option.textContent = `[${gp.index}] ${displayName}`;
    
    elements.deviceSelect.appendChild(option);
  }

  // 以前の選択を復元（可能なら）
  if (currentValue && Array.from(elements.deviceSelect.options).some(opt => opt.value === currentValue)) {
    elements.deviceSelect.value = currentValue;
  }
}

/**
 * デバイスを手動で切り替える（デバイス選択ドロップダウン用）。
 * @param {string} value - "auto" または index番号
 */
function switchDevice(value) {
  if (value === "auto") {
    // すべてのデバイスを受け入れる
    state.pinnedDeviceFilter = null;
  } else {
    // 特定のデバイスのみ受け入れる
    state.pinnedDeviceFilter = value;
    
    // activeGamepadを更新
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const targetIndex = parseInt(value, 10);
    const targetGp = gamepads[targetIndex];
    
    if (targetGp) {
      state.activeGamepad = targetGp;
      elements.deviceName.textContent = `接続中: ${targetGp.id}`;
      elements.deviceName.classList.add("connected");
      if (state.rafId === null) startPolling();
    }
  }
}

// ── Gamepad API イベント ──────────────────────────────────────

window.addEventListener("gamepadconnected", (e) => {
  const gp = e.gamepad;
  console.log(`[GamepadConnected] ${gp.id}`);

  // 接続済みリストに登録
  state.connectedGamepads[gp.index] = gp;

  // デバイス選択UIを更新
  updateDeviceSelect();

  // ゲームパッド接続時にサウンドシステム初期化を試みる（OBS対応）
  initSoundSystemOnce();

  // クエリパラメーター ?controller= 指定時は自動判定を完全に無効化
  if (state.pinnedConfigId !== null) {
    // activeGamepadが未設定の場合は設定してポーリング開始（入力受付のため）
    if (state.activeGamepad === null) {
      state.activeGamepad = gp;
      startPolling();
    }
    // 接続中のゲームパッド数を表示（クエリパラメーター時は非表示だが、内部状態は更新）
    updateDeviceStatusText(gp);
    return;
  }

  // 既にアクティブなゲームパッドがある場合は自動切り替えしない
  // ただし、接続されたことはUIに表示する
  if (state.activeGamepad !== null) {
    // 接続中のゲームパッド数を表示
    updateDeviceStatusText(state.activeGamepad);
    return;
  }

  state.activeGamepad = gp;

  // すべてのゲームパッドを受け入れる（設定は手動切り替え可能）
  // まだ設定が適用されていない場合のみデフォルト設定を適用
  if (!state.currentConfig) {
    applyConfig(DUALSENSE_CONFIG);
  }
  
  updateDeviceStatusText(gp);

  startPolling();
});

window.addEventListener("gamepaddisconnected", (e) => {
  console.log(`[GamepadDisconnected] ${e.gamepad.id}`);

  // 接続済みリストから削除
  delete state.connectedGamepads[e.gamepad.index];

  // デバイス選択UIを更新
  updateDeviceSelect();

  if (state.activeGamepad && state.activeGamepad.index === e.gamepad.index) {
    state.activeGamepad = null;
    stopPolling();
    clearCanvas();

    // 他に接続済みのゲームパッドがあれば自動で切り替える
    const remaining = Object.keys(state.connectedGamepads);
    if (remaining.length > 0) {
      const nextGp = (navigator.getGamepads ? navigator.getGamepads() : [])[remaining[0]];
      if (nextGp) {
        state.activeGamepad = nextGp;
        // 現在の設定を維持（ユーザーが手動で切り替えた設定を尊重）
        updateDeviceStatusText(nextGp);
        startPolling();
        return;
      }
    }

    elements.deviceName.textContent = "コントローラー未接続";
    elements.deviceName.classList.remove("connected");
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
 * ボタンのサウンドカテゴリを取得する。
 * @param {number} buttonIndex - ボタンのインデックス
 * @param {object} config - コントローラー設定
 * @returns {string|null} - サウンドカテゴリ（"dpad", "buttons", "lever"）またはnull
 */
function getButtonSoundCategory(buttonIndex, config) {
  if (!config || !config.buttons) return null;
  const button = config.buttons.find(b => b.index === buttonIndex);
  return button ? (button.soundCategory || null) : null;
}

/**
 * スティック/レバーのサウンドステートを更新する。
 * @param {Gamepad} gp - ゲームパッド
 * @param {object} stick - スティック設定
 * @param {number} axisX - X軸の値
 * @param {number} axisY - Y軸の値
 * @param {number} threshold - ニュートラル判定の閾値
 * @param {string} soundCategory - サウンドカテゴリ（"lever" | "stick"）
 * @param {object} config - コントローラー設定
 */
function updateStickSoundState(gp, stick, axisX, axisY, threshold, soundCategory, config) {
  const isNeutral = Math.abs(axisX) < threshold && Math.abs(axisY) < threshold;
  
  // デバイスごとにステートを分離
  if (!state.leverStates[gp.index]) {
    state.leverStates[gp.index] = {};
  }
  const prevState = state.leverStates[gp.index][stick.id] || { isNeutral: true };
  
  if (isNeutral !== prevState.isNeutral) {
    // 最初の入力時にサウンドシステム初期化を試みる（OBS対応）
    if (!state.soundInitialized) {
      initSoundSystemOnce();
    }
    
    if (config.sounds && config.sounds[soundCategory]) {
      const soundId = `${config.id}_${soundCategory}`;
      if (!isNeutral) {
        soundManager.play(`${soundId}_press`);
      } else {
        soundManager.play(`${soundId}_release`);
      }
    }
    state.leverStates[gp.index][stick.id] = { isNeutral };
  }
}

/**
 * 1フレーム分の入力状態を取得してUIに反映する。
 */
function tick() {
  // Chrome では getGamepads() で最新状態を取得する必要がある
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  
  // デバイスフィルターを取得（クエリパラメーターまたは手動選択）
  const deviceFilter = state.pinnedDeviceFilter;
  
  // 接続中のすべてのゲームパッドから最初に入力があるものを使う
  let gp = null;
  for (const gamepad of gamepads) {
    if (!gamepad) continue;
    
    // デバイスフィルターに一致しない場合はスキップ
    if (!matchesDeviceFilter(gamepad, deviceFilter)) continue;
    
    // ボタンが押されているか、スティックが動いていればアクティブとみなす
    const hasInput = gamepad.buttons.some(btn => btn && (btn.pressed || btn.value > 0.1)) ||
                     gamepad.axes.some(axis => Math.abs(axis) > 0.1);
    if (hasInput) {
      gp = gamepad;
      // アクティブなゲームパッドを更新（ステータスバー表示用）
      if (state.activeGamepad === null || state.activeGamepad.index !== gamepad.index) {
        state.activeGamepad = gamepad;
        // クエリパラメーター指定時は表示を更新しない
        if (state.pinnedConfigId === null) {
          updateDeviceStatusText(gamepad);
        }
      }
      break;
    }
  }
  
  // 入力がなければ activeGamepad を使う（初期表示用）
  if (!gp && state.activeGamepad !== null) {
    const candidateGp = gamepads[state.activeGamepad.index];
    // activeGamepadもデバイスフィルターでチェック
    if (candidateGp && matchesDeviceFilter(candidateGp, deviceFilter)) {
      gp = candidateGp;
    }
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

    // ボタンステート変化の検知とサウンド再生（デバイスごとに分離）
    if (!state.buttonStates[gp.index]) {
      state.buttonStates[gp.index] = {};
    }
    const prevPressed = state.buttonStates[gp.index][idx] || false;
    if (pressed !== prevPressed) {
      // 最初のボタン入力時にサウンドシステム初期化を試みる（OBS対応）
      if (!state.soundInitialized) {
        initSoundSystemOnce();
      }
      
      const soundCategory = getButtonSoundCategory(idx, config);
      if (soundCategory) {
        const soundId = `${config.id}_${soundCategory}`;
        if (pressed) {
          // 押下時
          soundManager.play(`${soundId}_press`);
        } else {
          // 離した時
          soundManager.play(`${soundId}_release`);
        }
      }
      state.buttonStates[gp.index][idx] = pressed;
    }
  });

  // ── スティック状態の反映 ──
  const ctx = elements.stickCanvas.getContext("2d");
  ctx.clearRect(0, 0, elements.stickCanvas.width, elements.stickCanvas.height);

  for (const stick of config.sticks) {
    const axisX = gp.axes[stick.axisX] || 0;
    const axisY = gp.axes[stick.axisY] || 0;

    if (stick.type === "lever") {
      // カスタムレバー SVG を更新（d-pad / アナログ対応）
      updateStickImg(stick, gp, config);

      // レバーのサウンド処理
      updateStickSoundState(gp, stick, axisX, axisY, 0.3, "lever", config);
    } else {
      // アナログスティック（div + dot）を更新
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
      
      // アナログスティックのサウンド処理
      updateStickSoundState(gp, stick, axisX, axisY, 0.2, "stick", config);
    }

    // canvas に軸記録を描画（レバーはスキップ）
    if (stick.type !== "lever") {
      drawStickIndicator(ctx, stick, axisX, axisY);
    }
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
  ctx.fillStyle = "rgba(220, 40, 50, 0.85)";
  ctx.fill();
}

function clearCanvas() {
  const ctx = elements.stickCanvas.getContext("2d");
  ctx.clearRect(0, 0, elements.stickCanvas.width, elements.stickCanvas.height);
}

// ── デバッグオーバーレイ (?debug=1) ──────────────────────────

function isDebugMode() {
  return new URLSearchParams(window.location.search).has("debug");
}

/**
 * 各ボタン・スティックの設定座標を画像上に可視化する。
 * ?debug=1 を URL に付与すると有効になる。
 * @param {object} config
 */
function buildDebugOverlay(config) {
  const existing = document.getElementById("debug-overlay");
  if (existing) existing.remove();

  const canvas = document.createElement("canvas");
  canvas.id     = "debug-overlay";
  canvas.width  = config.imageWidth;
  canvas.height = config.imageHeight;
  canvas.style.cssText =
    "position:absolute;inset:0;pointer-events:none;z-index:20;";

  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 2;

  // ── ボタン ──
  for (const btn of config.buttons) {
    const shape = btn.shape || "circle";
    const isRect = shape === "rect";

    // 塗りつぶし（半透明）
    ctx.fillStyle = "rgba(255, 60, 60, 0.15)";
    ctx.beginPath();
    if (isRect) {
      ctx.rect(btn.x - btn.w / 2, btn.y - btn.h / 2, btn.w, btn.h);
    } else {
      ctx.ellipse(btn.x, btn.y, btn.w / 2, btn.h / 2, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    // 枠線
    ctx.strokeStyle = "rgba(255, 60, 60, 0.9)";
    ctx.stroke();

    // 中心十字
    ctx.beginPath();
    ctx.moveTo(btn.x - 7, btn.y); ctx.lineTo(btn.x + 7, btn.y);
    ctx.moveTo(btn.x, btn.y - 7); ctx.lineTo(btn.x, btn.y + 7);
    ctx.stroke();

    // ラベル（インデックス:ラベル名）
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`${btn.index}:${btn.label}`, btn.x + 6, btn.y - 4);

    // 座標値
    ctx.fillStyle = "rgba(255,255,180,0.9)";
    ctx.font = "9px monospace";
    ctx.fillText(`(${btn.x},${btn.y})`, btn.x + 6, btn.y + 8);
  }

  // ── スティック / レバー ──
  for (const stick of config.sticks) {
    ctx.strokeStyle = "rgba(0, 200, 255, 0.8)";
    ctx.beginPath();
    ctx.arc(stick.cx, stick.cy, stick.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(stick.cx - 8, stick.cy); ctx.lineTo(stick.cx + 8, stick.cy);
    ctx.moveTo(stick.cx, stick.cy - 8); ctx.lineTo(stick.cx, stick.cy + 8);
    ctx.stroke();

    ctx.fillStyle = "#00ccff";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`${stick.id}(${stick.cx},${stick.cy})`, stick.cx + 10, stick.cy - 2);
  }

  document.getElementById("controller-wrapper").appendChild(canvas);
}

// ── クエリパラメーター解析 ────────────────────────────────────

/**
 * ?controller=dualsense や ?controller=fightingStickMini を読み取る。
 * 指定があればそのコンフィグを返し、なければ null。
 * @returns {object|null}
 */
function getQueryConfig() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("controller");
  if (!id) return null;
  return ALL_CONFIGS.find((c) => c.id === id) || null;
}

/**
 * ?device= パラメーターからデバイスフィルターを取得する。
 * 指定がなければ null を返す（すべてのデバイスを受け入れる）。
 * 
 * 指定方法:
 *   ?device=0              → index番号で指定
 *   ?device=dualsense      → ID文字列で部分一致
 *   ?device=054c:0ce6      → ベンダー:プロダクトIDで指定
 * 
 * @returns {string|null}
 */
function getDeviceFilter() {
  const params = new URLSearchParams(window.location.search);
  return params.get("device") || null;
}

/**
 * ゲームパッドがデバイスフィルターに一致するかチェックする。
 * 
 * @param {Gamepad} gamepad - チェック対象のゲームパッド
 * @param {string|null} filter - デバイスフィルター（null = すべて許可）
 * @returns {boolean} - フィルターに一致すればtrue
 */
function matchesDeviceFilter(gamepad, filter) {
  if (!filter) return true;  // フィルター指定なし = すべて許可
  if (!gamepad) return false;

  const filterLower = filter.toLowerCase();

  // index番号による指定（例: "0", "1", "2"）
  if (/^\d+$/.test(filter)) {
    return gamepad.index === parseInt(filter, 10);
  }

  // ベンダー:プロダクトID による指定（例: "054c:0ce6"）
  if (/^[0-9a-f]{4}:[0-9a-f]{4}$/i.test(filter)) {
    const idLower = gamepad.id.toLowerCase();
    // "Vendor: 054c Product: 0ce6" 形式を検出
    const vendorMatch = idLower.match(/vendor:\s*([0-9a-f]{4})/i);
    const productMatch = idLower.match(/product:\s*([0-9a-f]{4})/i);
    if (vendorMatch && productMatch) {
      const deviceId = `${vendorMatch[1]}:${productMatch[1]}`;
      return deviceId === filterLower;
    }
    return false;
  }

  // ID文字列による部分一致（例: "dualsense", "xbox"）
  return gamepad.id.toLowerCase().includes(filterLower);
}

// ── 起動処理 ──────────────────────────────────────────────────

(function init() {
  const queryConfig = getQueryConfig();
  const deviceFilter = getDeviceFilter();

  // デバイスフィルターを状態に保存
  if (deviceFilter) {
    state.pinnedDeviceFilter = deviceFilter;
  }

  // クエリパラメーター指定時はステータスバーUI・ヒントを非表示にする
  if (queryConfig) {
    document.getElementById("status-bar").style.display = "none";
    document.getElementById("hint").style.display = "none";
    // body に透過背景クラスを付与（OBS等でクロマキー合成しやすいように）
    document.body.classList.add("transparent-bg");
    applyConfig(queryConfig);
    state.pinnedConfigId = queryConfig.id;
  } else {
    applyConfig(DUALSENSE_CONFIG);
  }

  // デバッグモードのバッジ表示
  if (isDebugMode()) document.body.classList.add("debug-mode");

  // すでに接続済みのゲームパッドがある場合に対応（ページリロード後など）
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of gamepads) {
    if (!gp) continue;
    state.connectedGamepads[gp.index] = gp;
    if (state.activeGamepad === null) {
      state.activeGamepad = gp;
      const count = Object.keys(state.connectedGamepads).length;
      if (count > 1) {
        elements.deviceName.textContent = `接続中 (${count}台): ${gp.id} 他`;
      } else {
        elements.deviceName.textContent = `接続中: ${gp.id}`;
      }
      elements.deviceName.classList.add("connected");
      startPolling();
    }
  }

  // デバイス選択UIを初期化
  updateDeviceSelect();
  
  // デバイスフィルターが指定されている場合、セレクトボックスを更新
  if (deviceFilter && elements.deviceSelect) {
    // index番号の場合はそのまま設定
    if (/^\d+$/.test(deviceFilter)) {
      elements.deviceSelect.value = deviceFilter;
    }
  }

  // ページ全体の最初のクリックでサウンドシステムを初期化（Chrome autoplay policy対応）
  document.addEventListener('click', initSoundSystemOnce, { once: true });
  document.addEventListener('touchstart', initSoundSystemOnce, { once: true });
})();

// ── サウンドシステム初期化 ─────────────────────────────────────
/**
 * ユーザーインタラクション後に1度だけサウンドシステムを初期化（Chrome autoplay policy対応）
 */
async function initSoundSystemOnce() {
  // soundManagerの初期化状態で判定（失敗した場合も再試行可能）
  if (soundManager.initialized) return;
  
  await initSoundSystem();
  
  // 初期化が成功した場合のみフラグを立てる
  if (soundManager.initialized) {
    state.soundInitialized = true;
  }
}

/**
 * サウンドマネージャーの初期化とサウンドファイルの事前読み込み
 */
async function initSoundSystem() {
  // AudioContextの初期化
  await soundManager.init();

  // すべてのコントローラー設定からサウンドファイルを収集
  const soundMap = {};
  for (const config of ALL_CONFIGS) {
    if (!config.sounds) continue;

    for (const [category, paths] of Object.entries(config.sounds)) {
      const soundIdPrefix = `${config.id}_${category}`;
      if (paths.press) {
        soundMap[`${soundIdPrefix}_press`] = paths.press;
      }
      if (paths.release) {
        soundMap[`${soundIdPrefix}_release`] = paths.release;
      }
    }
  }

  // サウンドファイルを一括読み込み
  await soundManager.loadSounds(soundMap);

  // UI初期化（localStorageから設定を復元）
  initSoundUI();
}

/**
 * サウンド設定UIの初期化（localStorageから復元）
 */
function initSoundUI() {
  const volumeSlider = document.getElementById('sound-volume');
  const volumeValue = document.getElementById('volume-value');
  const enabledCheckbox = document.getElementById('sound-enabled');

  if (volumeSlider && volumeValue) {
    const volume = Math.round(soundManager.getVolume() * 100);
    volumeSlider.value = volume;
    volumeValue.textContent = `${volume}%`;
  }

  if (enabledCheckbox) {
    enabledCheckbox.checked = soundManager.isEnabled();
  }
}

/**
 * サウンド設定モーダルを開く
 */
function openSoundSettings() {
  const modal = document.getElementById('sound-modal');
  const modalContent = modal?.querySelector('.modal-content');
  const settingsBtn = document.getElementById('btn-sound-settings');
  
  if (modal && modalContent && settingsBtn) {
    // 歯車ボタンの位置を取得
    const btnRect = settingsBtn.getBoundingClientRect();
    
    // モーダルを歯車ボタンの下に配置
    const topPosition = btnRect.bottom + 8; // ボタンの下に8pxの余白
    const rightPosition = window.innerWidth - btnRect.right; // 右端からの距離を合わせる
    
    modalContent.style.top = `${topPosition}px`;
    modalContent.style.right = `${rightPosition}px`;
    
    modal.style.display = 'block';
  }
}

/**
 * サウンド設定モーダルを閉じる
 */
function closeSoundSettings() {
  const modal = document.getElementById('sound-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * サウンドのON/OFFを切り替え
 * @param {boolean} enabled - 有効/無効
 */
function toggleSound(enabled) {
  soundManager.setEnabled(enabled);
}

/**
 * 音量を更新
 * @param {number} value - 音量（0〜100）
 */
function updateVolume(value) {
  const volume = parseInt(value, 10) / 100;
  soundManager.setVolume(volume);
  
  const volumeValue = document.getElementById('volume-value');
  if (volumeValue) {
    volumeValue.textContent = `${value}%`;
  }
}
