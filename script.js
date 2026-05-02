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

  // 画像読み込み完了後にスケール調整（スマホ対応）
  if (elements.controllerImg.complete) {
    updateOverlayScale();
  } else {
    elements.controllerImg.addEventListener('load', updateOverlayScale, { once: true });
  }
}

/**
 * オーバーレイとcanvasをスマホ画面に合わせてスケール調整する。
 * CSSメディアクエリで画像が縮小された場合、オーバーレイ座標も比例縮小する。
 */
function updateOverlayScale() {
  if (!state.currentConfig) return;

  const wrapper = document.getElementById("controller-wrapper");
  const img = elements.controllerImg;
  
  // 画像の実際の表示サイズを取得
  const actualWidth = img.offsetWidth;
  const configWidth = state.currentConfig.imageWidth;
  
  // スケール比率を計算
  const scale = actualWidth / configWidth;
  
  // オーバーレイとcanvasをスケール調整
  elements.overlayLayer.style.transform = `scale(${scale})`;
  elements.overlayLayer.style.transformOrigin = 'top left';
  elements.overlayLayer.style.width = configWidth + 'px';
  elements.overlayLayer.style.height = state.currentConfig.imageHeight + 'px';
  
  elements.stickCanvas.style.transform = `scale(${scale})`;
  elements.stickCanvas.style.transformOrigin = 'top left';
  
  // デバッグオーバーレイもスケール調整
  const debugOverlay = document.getElementById("debug-overlay");
  if (debugOverlay) {
    debugOverlay.style.transform = `scale(${scale})`;
    debugOverlay.style.transformOrigin = 'top left';
  }
  
  // wrapperの高さを画像の実際の高さに合わせる（アスペクト比維持）
  wrapper.style.height = (state.currentConfig.imageHeight * scale) + 'px';
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
      // レバータイプ（シャフト付き）
      const container = buildStickImgOverlay(stick);
      elements.overlayLayer.appendChild(container);
    } else if (stick.stickBallRadius !== undefined || stick.stickMaskShapes !== undefined) {
      // カスタムアナログスティック（SVG版）
      const container = buildAnalogStickOverlay(stick);
      elements.overlayLayer.appendChild(container);
    } else {
      // 従来のアナログスティック（canvas版）
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

/**
 * アナログスティック用の SVG を生成する（レバーと異なりシャフト無し）。
 *
 * stick config で使うプロパティ:
 *   cx, cy            : スティック中心座標
 *   radius            : スティック可動範囲の半径
 *   stickBallRadius   : ボール半径 px（省略時 20）
 *   stickTilt         : 最大傾き量 px（省略時 radius * 0.6）
 *   stickColor        : ボールの色 "#rrggbb"（省略時 "#1a1a1a"）
 *   stickMaskShapes   : 元写真のスティックを隠す形状配列 [{type,fill,gradient,...}]
 *                       gradient: true を指定すると球体グラデーションを適用
 *
 * @param {object} stick
 * @returns {SVGElement}
 */
function buildAnalogStickOverlay(stick) {
  const centerX = stick.cx;
  const centerY = stick.cy;
  const ballR = stick.stickBallRadius ?? 20;
  const tilt = stick.stickTilt ?? stick.radius * 0.6;
  const color = stick.stickColor || "#1a1a1a";

  // ── SVG 範囲を計算（ボール + 傾き範囲 + マスク）──────────
  const pad = ballR + tilt + 6;
  let minX = centerX - pad;
  let minY = centerY - pad;
  let maxX = centerX + pad;
  let maxY = centerY + pad;

  // マスク形状が存在すれば SVG 範囲を拡張
  if (stick.stickMaskShapes) {
    for (const s of stick.stickMaskShapes) {
      let b;
      if (s.type === "circle")
        b = { l: s.cx - s.r, t: s.cy - s.r, r: s.cx + s.r, b: s.cy + s.r };
      if (s.type === "ellipse")
        b = { l: s.cx - s.rx, t: s.cy - s.ry, r: s.cx + s.rx, b: s.cy + s.ry };
      if (s.type === "rect") b = { l: s.x, t: s.y, r: s.x + s.w, b: s.y + s.h };
      if (b) {
        minX = Math.min(minX, b.l);
        minY = Math.min(minY, b.t);
        maxX = Math.max(maxX, b.r);
        maxY = Math.max(maxY, b.b);
      }
    }
  }

  const svgW = maxX - minX;
  const svgH = maxY - minY;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.id = "stick-img-" + stick.id;
  svg.setAttribute("width", svgW);
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

  // マスク用グラデーション（球体表現）
  let maskGradIds = [];
  if (stick.stickMaskShapes) {
    stick.stickMaskShapes.forEach((shape, idx) => {
      if (shape.gradient) {
        const maskGradId = `stick-mask-grad-${stick.id}-${idx}`;
        maskGradIds.push({ idx, id: maskGradId, shape });

        const maskGrad = document.createElementNS(ns, "radialGradient");
        maskGrad.setAttribute("id", maskGradId);
        maskGrad.setAttribute("cx", "30%");
        maskGrad.setAttribute("cy", "20%");
        maskGrad.setAttribute("r", "65%");
        maskGrad.setAttribute("gradientUnits", "objectBoundingBox");

        const baseColor = shape.fill || "#1a1a1a";
        const maskStops = [
          ["0%", _adjustHexColor(baseColor, 80)],
          ["50%", baseColor],
          ["100%", _adjustHexColor(baseColor, -100)],
        ];

        maskStops.forEach(([off, col]) => {
          const s = document.createElementNS(ns, "stop");
          s.setAttribute("offset", off);
          s.setAttribute("stop-color", col);
          maskGrad.appendChild(s);
        });
        defs.appendChild(maskGrad);
      }
    });
  }

  // 動くボール用グラデーション（フラット寄り）
  const gradId = "stick-ball-grad-" + stick.id;
  const grad = document.createElementNS(ns, "radialGradient");
  grad.setAttribute("id", gradId);
  grad.setAttribute("cx", "40%");
  grad.setAttribute("cy", "30%");
  grad.setAttribute("r", "70%");
  grad.setAttribute("gradientUnits", "objectBoundingBox");

  // 軽いグラデーション（フラット寄り）
  const gradStops = [
    ["0%", _adjustHexColor(color, 30)], // この 30 を 10 や 5 に
    ["60%", color],
    ["60%", color],
    ["100%", _adjustHexColor(color, -20)], // この -40 を -10 や -5 に
  ];

  gradStops.forEach(([off, col]) => {
    const s = document.createElementNS(ns, "stop");
    s.setAttribute("offset", off);
    s.setAttribute("stop-color", col);
    grad.appendChild(s);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);

  // ── マスク（元写真のスティックを覆い隠す）────────────────
  if (stick.stickMaskShapes) {
    stick.stickMaskShapes.forEach((shape, idx) => {
      let el;
      if (shape.type === "circle") {
        el = document.createElementNS(ns, "circle");
        el.setAttribute("cx", String(shape.cx));
        el.setAttribute("cy", String(shape.cy));
        el.setAttribute("r", String(shape.r));
      } else if (shape.type === "ellipse") {
        el = document.createElementNS(ns, "ellipse");
        el.setAttribute("cx", String(shape.cx));
        el.setAttribute("cy", String(shape.cy));
        el.setAttribute("rx", String(shape.rx));
        el.setAttribute("ry", String(shape.ry));
      } else if (shape.type === "rect") {
        el = document.createElementNS(ns, "rect");
        el.setAttribute("x", String(shape.x));
        el.setAttribute("y", String(shape.y));
        el.setAttribute("width", String(shape.w));
        el.setAttribute("height", String(shape.h));
        if (shape.rx) el.setAttribute("rx", String(shape.rx));
      }
      if (el) {
        // グラデーションが有効な場合は適用
        const maskGradInfo = maskGradIds.find((m) => m.idx === idx);
        if (maskGradInfo) {
          el.setAttribute("fill", `url(#${maskGradInfo.id})`);
          el.setAttribute("stroke", "rgba(0,0,0,0.3)");
          el.setAttribute("stroke-width", "1");
        } else {
          el.setAttribute("fill", shape.fill || "transparent");
        }
        svg.appendChild(el);

        // マスク球体のハイライト（gradient=trueの円形のみ）
        if (shape.gradient && shape.type === "circle") {
          const maskHl = document.createElementNS(ns, "ellipse");
          const hlOffsetX = shape.r * 0.25;
          const hlOffsetY = shape.r * 0.35;
          maskHl.setAttribute("cx", String(shape.cx - hlOffsetX));
          maskHl.setAttribute("cy", String(shape.cy - hlOffsetY));
          maskHl.setAttribute("rx", String(shape.r * 0.35));
          maskHl.setAttribute("ry", String(shape.r * 0.22));
          maskHl.setAttribute("fill", "rgba(255,255,255,0.25)");
          svg.appendChild(maskHl);
        }
      }
    });
  }

  // ── 可動範囲の外枠（薄い円）──────────────────────────────
  const rangeCircle = document.createElementNS(ns, "circle");
  rangeCircle.setAttribute("cx", String(centerX));
  rangeCircle.setAttribute("cy", String(centerY));
  rangeCircle.setAttribute("r", String(stick.radius));
  rangeCircle.setAttribute("fill", "none");
  rangeCircle.setAttribute("stroke", "rgba(255,255,255,0.1)");
  rangeCircle.setAttribute("stroke-width", "2");
  svg.appendChild(rangeCircle);

  // ── ボール（動く部分：軽いグラデーション）────────────────
  const ball = document.createElementNS(ns, "circle");
  ball.id = "stick-ball-" + stick.id;
  ball.setAttribute("cx", String(centerX));
  ball.setAttribute("cy", String(centerY));
  ball.setAttribute("r", String(ballR));
  ball.setAttribute("fill", `url(#${gradId})`);
  ball.setAttribute("stroke", "rgba(255,255,255,0.15)");
  ball.setAttribute("stroke-width", "1");
  svg.appendChild(ball);

  // ── 中心部分（溝より内側）──────────────────────────────────
  const centerCircle = document.createElementNS(ns, "circle");
  centerCircle.id = "stick-center-" + stick.id;
  const centerRadius = ballR * 0.84; // 中心円の半径（溝の最内側より小さく）
  centerCircle.setAttribute("cx", String(centerX));
  centerCircle.setAttribute("cy", String(centerY));
  centerCircle.setAttribute("r", String(centerRadius));
  centerCircle.setAttribute("fill", _adjustHexColor(color, -8)); // 少し暗めの色
  svg.appendChild(centerCircle);

  // ── スペキュラハイライト（軽め）──────────────────────────
  // 一旦保留。スティックは表面が平坦のため強いハイライトは不自然に見える可能性がある。
  /*
  const hl = document.createElementNS(ns, "ellipse");
  hl.id = "stick-hl-" + stick.id;
  hl.setAttribute("cx", String(centerX - ballR * 0.25));
  hl.setAttribute("cy", String(centerY - ballR * 0.13));
  hl.setAttribute("rx", String(ballR * 0.13));
  hl.setAttribute("ry", String(ballR * 0.08));
  hl.setAttribute("fill", "rgba(255,255,255,0.20)");
  svg.appendChild(hl);
  */

  // ── 溝（円周状パターン）──────────────────────────────────
  const grooveGroup = document.createElementNS(ns, "g");
  grooveGroup.id = "stick-grooves-" + stick.id;

  const numRings = 1; // 溝の輪の数（2〜5で調整）
  const numSegments = 32; // 各リングのセグメント数

  for (let ring = 0; ring < numRings; ring++) {
    const ringRadius = ballR * (0.7 + ring * 0.2); // 各リングの半径
    const segmentAngle = (Math.PI * 2) / numSegments;
    const grooveWidth = segmentAngle * ringRadius * 0.9; // 溝の幅

    for (let i = 0; i < numSegments; i++) {
      const angle1 = i * segmentAngle;
      const angle2 = angle1 + grooveWidth / ringRadius;

      // 円周上の2点を計算
      const x1 = centerX + Math.cos(angle1) * ringRadius;
      const y1 = centerY + Math.sin(angle1) * ringRadius;
      const x2 = centerX + Math.cos(angle2) * ringRadius;
      const y2 = centerY + Math.sin(angle2) * ringRadius;

      const groove = document.createElementNS(ns, "line");
      groove.setAttribute("x1", String(x1));
      groove.setAttribute("y1", String(y1));
      groove.setAttribute("x2", String(x2));
      groove.setAttribute("y2", String(y2));
      groove.setAttribute("stroke", _adjustHexColor(color, -60));
      groove.setAttribute("stroke-width", "2.5");
      groove.setAttribute("opacity", "0.4");
      groove.setAttribute("stroke-linecap", "round");
      grooveGroup.appendChild(groove);
    }
  }

  svg.appendChild(grooveGroup);

  return svg;
}

/**
 * アナログスティック SVG をアナログ入力に合わせて更新する。
 *
 * @param {object}  stick
 * @param {Gamepad} gp
 */
function updateAnalogStick(stick, gp) {
  const centerX = stick.cx;
  const centerY = stick.cy;
  const ballR   = stick.stickBallRadius ?? 20;
  const tilt    = stick.stickTilt       ?? (stick.radius * 0.6);

  // アナログ軸の値を取得
  const ax = gp.axes[stick.axisX] || 0;
  const ay = gp.axes[stick.axisY] || 0;

  const bx = centerX + ax * tilt;
  const by = centerY + ay * tilt;

  const ball = document.getElementById("stick-ball-" + stick.id);
  const hl   = document.getElementById("stick-hl-"   + stick.id);
  const centerCircle = document.getElementById("stick-center-" + stick.id);  // 追加
  const grooves = document.getElementById("stick-grooves-" + stick.id);  // 追加

  if (ball) {
    ball.setAttribute("cx", String(bx));
    ball.setAttribute("cy", String(by));
  }
  if (hl) {
    hl.setAttribute("cx", String(bx - ballR * 0.22));
    hl.setAttribute("cy", String(by - ballR * 0.30));
  }
  // 中心円も移動 ← 追加
  if (centerCircle) {
    centerCircle.setAttribute("cx", String(bx));
    centerCircle.setAttribute("cy", String(by));
  }
  // 溝も一緒に移動 ← 追加
  if (grooves) {
    grooves.setAttribute("transform", `translate(${ax * tilt}, ${ay * tilt})`);
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
    
    // OBS用URLを更新
    updateObsUrl();
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
  
  // OBS用URLを更新
  updateObsUrl();
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
  
  // OBS用URLを更新
  updateObsUrl();
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
  
  // OBS用URLを更新
  updateObsUrl();
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

// ── キーボード/マウス仮想入力マージ ─────────────────────────────

/**
 * 実ゲームパッドの状態にキーボード/マウス仮想入力をマージする。
 * 同じボタン/軸については OR（最大値）をとる。
 *
 * @param {Gamepad} realGp - 実ゲームパッド
 * @returns {{ index: number, buttons: Array, axes: Array }}
 */
function _mergeGamepadWithVirtual(realGp) {
  const vGp = virtualGamepad;
  const maxBtns = Math.max(realGp.buttons.length, vGp.buttons.length);
  const mergedButtons = Array.from({ length: maxBtns }, (_, i) => {
    const r = realGp.buttons[i] || { pressed: false, value: 0 };
    const v = vGp.buttons[i]   || { pressed: false, value: 0 };
    return {
      pressed: r.pressed || v.pressed,
      value:   Math.max(r.value || 0, v.value || 0),
    };
  });
  const maxAxes = Math.max(realGp.axes.length, vGp.axes.length);
  const mergedAxes = Array.from({ length: maxAxes }, (_, i) => {
    const r = realGp.axes[i] || 0;
    const v = vGp.axes[i]    || 0;
    return Math.abs(r) >= Math.abs(v) ? r : v;
  });
  return { index: realGp.index, buttons: mergedButtons, axes: mergedAxes };
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

  // ── キーボード/マウス入力のマージ ──
  if (typeof virtualGamepad !== "undefined") {
    const hasVirtual =
      virtualGamepad.buttons.some((b) => b.pressed) ||
      virtualGamepad.axes.some((v) => Math.abs(v) > 0);
    // キー押下時のみサウンド初期化を試みる
    if (hasVirtual && !state.soundInitialized) initSoundSystemOnce();
    if (gp) {
      // 実ゲームパッドと仔想入力を OR マージ
      gp = _mergeGamepadWithVirtual(gp);
    } else if (state.currentConfig) {
      // ゲームパッド未接続時は virtualGamepad をそのまま使う。
      // キーを離した際に hasVirtual=false でも必ず通ってオーバーレイをクリアするため。
      gp = { index: -1, buttons: virtualGamepad.buttons, axes: virtualGamepad.axes };
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
    } else if (stick.stickBallRadius !== undefined || stick.stickMaskShapes !== undefined) {
      // カスタムアナログスティック（SVG版）を更新
      updateAnalogStick(stick, gp);

      // アナログスティックのサウンド処理
      updateStickSoundState(gp, stick, axisX, axisY, 0.2, "stick", config);
    } else {
      // 従来のアナログスティック（div + dot）を更新
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

    // canvas に軸記録を描画（レバーとカスタムアナログスティックはスキップ）
    if (stick.type !== "lever" && !stick.stickBallRadius && !stick.stickMaskShapes) {
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

  // ゲームパッド未接続でもキーボード/マウス入力が動くようにポーリングを開始
  startPolling();

  // ウィンドウリサイズ時にオーバーレイのスケールを再調整（スマホ対応）
  window.addEventListener('resize', () => {
    updateOverlayScale();
  });

  // ブラウザ情報を表示（OBS検証用）
  displayBrowserInfo();
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
    
    // OBS用URLを更新
    updateObsUrl();
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
  
  // OBS用URLを更新
  updateObsUrl();
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
  
  // OBS用URLを更新
  updateObsUrl();
}

// ── OBS用URL生成 ──────────────────────────────────────────────

/**
 * ゲームパッドIDから識別用キーワードを抽出する
 * @param {string} gamepadId - Gamepad.id
 * @returns {string} - デバイス識別キーワード（小文字）
 */
function extractDeviceKeyword(gamepadId) {
  if (!gamepadId) return '';
  
  const idLower = gamepadId.toLowerCase();
  
  // DualSense系
  if (idLower.includes('dualsense')) {
    return 'dualsense';
  }
  
  // Fighting Stick Mini（XBOX 360互換モードで動作）
  // ID例: "XBOX 360 Controller For Windows (STANDARD GAMEPAD)"
  if (idLower.includes('for windows')) {
    return 'windows'; // 通常ブラウザ用（OBS用URLでは "xbox" として統一するため、ここでは "windows" を返す）
  }
  
  // Xbox系
  // ID例: "Xbox 360 Controller (XInput STANDARD GAMEPAD)"
  // "xbox" のみで判定（"xinput" は他デバイスにも含まれる可能性があるため除外）
  if (idLower.includes('xbox')) {
    return 'xbox';
  }
  
  // Switch Pro Controller
  if (idLower.includes('switch')) {
    return 'switch';
  }
  
  // その他：最初の単語を抽出（スペース、括弧、ハイフンで分割）
  const match = idLower.match(/^([a-z0-9]+)/);
  return match ? match[1] : 'gamepad';
}

/**
 * OBS用URLを生成する
 * @returns {string} - 生成されたURL
 */
function generateObsUrl() {
  const baseUrl = 'https://tetchan-lab.github.io/controller-viewer/';
  const params = [];
  
  // controller パラメーター
  if (state.currentConfig && state.currentConfig.id) {
    params.push(`controller=${state.currentConfig.id}`);
  }
  
  // device パラメーター
  if (state.activeGamepad) {
    const idLower = state.activeGamepad.id.toLowerCase();
    // Xbox系デバイス（Fighting Stick Mini含む）は xbox で統一
    if (idLower.includes('xbox')) {
      params.push('device=xbox');
    } else {
      // DualSenseなど他のデバイス
      const deviceKeyword = extractDeviceKeyword(state.activeGamepad.id);
      if (deviceKeyword) {
        params.push(`device=${deviceKeyword}`);
      }
    }
  }
  
  // sound パラメーター
  const soundEnabled = soundManager.isEnabled();
  params.push(`sound=${soundEnabled ? 'on' : 'off'}`);
  
  // URLを組み立て
  if (params.length > 0) {
    return `${baseUrl}?${params.join('&')}`;
  }
  
  return baseUrl;
}

/**
 * 動作確認用URLを生成する（Chromeなど通常ブラウザ用、デバイスキーワードをそのまま使用）
 * @returns {string} - 生成されたURL
 */
function generateWindowUrl() {
  const baseUrl = 'https://tetchan-lab.github.io/controller-viewer/';
  const params = [];
  
  // controller パラメーター
  if (state.currentConfig && state.currentConfig.id) {
    params.push(`controller=${state.currentConfig.id}`);
  }
  
  // device パラメーター（動作確認用は元のキーワードを使用）
  if (state.activeGamepad) {
    const deviceKeyword = extractDeviceKeyword(state.activeGamepad.id);
    if (deviceKeyword) {
      params.push(`device=${deviceKeyword}`);
    }
  }
  
  // sound パラメーター
  const soundEnabled = soundManager.isEnabled();
  params.push(`sound=${soundEnabled ? 'on' : 'off'}`);
  
  // URLを組み立て
  if (params.length > 0) {
    return `${baseUrl}?${params.join('&')}`;
  }
  
  return baseUrl;
}

/**
 * OBS用URL表示を更新する
 */
function updateObsUrl() {
  const obsUrlOutput = document.getElementById('obs-url-output');
  const windowUrlOutput = document.getElementById('window-url-output');
  
  if (obsUrlOutput) {
    const obsUrl = generateObsUrl();
    obsUrlOutput.value = obsUrl;
    
    // プレースホルダーを更新（ゲームパッド未接続時）
    if (!state.activeGamepad) {
      obsUrlOutput.placeholder = 'コントローラーを接続すると、OBS用URLが生成されます';
    } else {
      obsUrlOutput.placeholder = '';
    }
  }
  
  if (windowUrlOutput) {
    const windowUrl = generateWindowUrl();
    windowUrlOutput.value = windowUrl;
    
    // プレースホルダーを更新（ゲームパッド未接続時）
    if (!state.activeGamepad) {
      windowUrlOutput.placeholder = 'コントローラーを接続すると、URLが生成されます';
    } else {
      windowUrlOutput.placeholder = '';
    }
  }
}

/**
 * ブラウザ情報を取得して表示する（OBS検証用）
 */
function displayBrowserInfo() {
  const infoContainer = document.getElementById('browser-info-content');
  if (!infoContainer) return;

  const info = {
    'User-Agent': navigator.userAgent,
    'Vendor': navigator.vendor,
    'Platform': navigator.platform,
    'App Name': navigator.appName,
    'App Version': navigator.appVersion,
    'App Code Name': navigator.appCodeName,
    'Product': navigator.product,
    'Product Sub': navigator.productSub,
    'Language': navigator.language,
    'Languages': navigator.languages ? navigator.languages.join(', ') : 'N/A',
    'Online': navigator.onLine,
    'Cookie Enabled': navigator.cookieEnabled,
    'Hardware Concurrency': navigator.hardwareConcurrency || 'N/A',
    'Max Touch Points': navigator.maxTouchPoints || 'N/A',
    'Screen Width': screen.width,
    'Screen Height': screen.height,
    'Window Width': window.innerWidth,
    'Window Height': window.innerHeight,
  };

  // OBS/CEF検出
  const userAgentLower = navigator.userAgent.toLowerCase();
  const isOBS = userAgentLower.includes('obs');
  const isCEF = userAgentLower.includes('cef');

  let html = '<table style="width: 100%; border-collapse: collapse;">';
  
  // OBS/CEF検出結果を強調表示
  if (isOBS || isCEF) {
    html += '<tr style="background: rgba(255,0,0,0.3);">';
    html += '<td colspan="2" style="padding: 8px; font-weight: bold; color: #ff6666;">⚠️ OBS/CEF ブラウザとして検出されました</td>';
    html += '</tr>';
  }

  for (const [key, value] of Object.entries(info)) {
    html += '<tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">';
    html += `<td style="padding: 5px; font-weight: bold; color: #00ffff;">${key}:</td>`;
    html += `<td style="padding: 5px; word-break: break-all;">${value}</td>`;
    html += '</tr>';
  }
  html += '</table>';

  infoContainer.innerHTML = html;
}

/**
 * OBS用URLをクリップボードにコピーする
 */
async function copyObsUrl() {
  const urlOutput = document.getElementById('obs-url-output');
  const copyStatus = document.getElementById('copy-status-obs');
  
  if (!urlOutput || !urlOutput.value) {
    if (copyStatus) {
      copyStatus.textContent = '⚠️ URLが生成されていません';
      copyStatus.className = 'copy-status error';
      setTimeout(() => {
        copyStatus.textContent = '';
      }, 2000);
    }
    return;
  }
  
  try {
    await navigator.clipboard.writeText(urlOutput.value);
    
    if (copyStatus) {
      copyStatus.textContent = '✓ コピーしました';
      copyStatus.className = 'copy-status success';
      setTimeout(() => {
        copyStatus.textContent = '';
      }, 2000);
    }
  } catch (error) {
    console.error('Failed to copy URL:', error);
    
    if (copyStatus) {
      copyStatus.textContent = '✗ コピーに失敗しました';
      copyStatus.className = 'copy-status error';
      setTimeout(() => {
        copyStatus.textContent = '';
      }, 2000);
    }
  }
}

/**
 * 動作確認用URLをクリップボードにコピーする
 */
async function copyWindowUrl() {
  const urlOutput = document.getElementById('window-url-output');
  const copyStatus = document.getElementById('copy-status-window');
  
  if (!urlOutput || !urlOutput.value) {
    if (copyStatus) {
      copyStatus.textContent = '⚠️ URLが生成されていません';
      copyStatus.className = 'copy-status error';
      setTimeout(() => {
        copyStatus.textContent = '';
      }, 2000);
    }
    return;
  }
  
  try {
    await navigator.clipboard.writeText(urlOutput.value);
    
    if (copyStatus) {
      copyStatus.textContent = '✓ コピーしました';
      copyStatus.className = 'copy-status success';
      setTimeout(() => {
        copyStatus.textContent = '';
      }, 2000);
    }
  } catch (error) {
    console.error('Failed to copy URL:', error);
    
    if (copyStatus) {
      copyStatus.textContent = '✗ コピーに失敗しました';
      copyStatus.className = 'copy-status error';
      setTimeout(() => {
        copyStatus.textContent = '';
      }, 2000);
    }
  }
}
