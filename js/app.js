/**
 * app.js  –  Gamepad Viewer メインロジック
 * =====================================================
 * - Gamepad API でコントローラーを自動検出・ポーリング
 * - canvas にボタン強調・スティック可視化を描画
 * - 設定は js/config.js を編集してください
 */

"use strict";

// ──────────────────────────────────────────────────────
// DOM 要素
// ──────────────────────────────────────────────────────
const canvas     = document.getElementById("overlay");
const ctx        = canvas.getContext("2d");
const selectEl   = document.getElementById("controller-type");
const statusEl   = document.getElementById("gamepad-status");
const noCtrlEl   = document.getElementById("no-controller");
const wrapperEl  = document.getElementById("controller-wrapper");
const bgEl       = document.getElementById("controller-bg");

// ──────────────────────────────────────────────────────
// 状態
// ──────────────────────────────────────────────────────
let currentConfig  = CONTROLLER_CONFIGS[DEFAULT_CONTROLLER];
let controllerImg  = new Image();
let imgLoaded      = false;
let activeGamepadIdx = null;  // 使用中のゲームパッドインデックス
let animFrameId    = null;

// ──────────────────────────────────────────────────────
// コントローラー画像の読み込み
// ──────────────────────────────────────────────────────
function loadControllerImage(cfg) {
  imgLoaded = false;
  controllerImg = new Image();
  controllerImg.onload = () => {
    imgLoaded = true;
  };
  controllerImg.onerror = () => {
    console.warn("画像の読み込みに失敗しました:", cfg.image);
    imgLoaded = false;
  };
  // CSS 背景にも設定（フォールバック）
  bgEl.style.backgroundImage = `url('${cfg.image}')`;
  bgEl.style.width  = cfg.imageWidth  + "px";
  bgEl.style.height = cfg.imageHeight + "px";
  // canvas とラッパーのサイズを即座に確定
  resizeCanvas(cfg);
  controllerImg.src = cfg.image;
}

function resizeCanvas(cfg) {
  canvas.width  = cfg.imageWidth;
  canvas.height = cfg.imageHeight;
  wrapperEl.style.width  = cfg.imageWidth  + "px";
  wrapperEl.style.height = cfg.imageHeight + "px";
}

// ──────────────────────────────────────────────────────
// コントローラー種別の切替
// ──────────────────────────────────────────────────────
function switchController(key) {
  if (!CONTROLLER_CONFIGS[key]) return;
  currentConfig = CONTROLLER_CONFIGS[key];
  loadControllerImage(currentConfig);
}

// ──────────────────────────────────────────────────────
// Gamepad API
// ──────────────────────────────────────────────────────
window.addEventListener("gamepadconnected", (e) => {
  console.log("ゲームパッド接続:", e.gamepad.id);
  updateGamepadStatus();
});

window.addEventListener("gamepaddisconnected", (e) => {
  console.log("ゲームパッド切断:", e.gamepad.id);
  if (activeGamepadIdx === e.gamepad.index) {
    activeGamepadIdx = null;
  }
  updateGamepadStatus();
});

/** 接続中ゲームパッドの一覧を status バーに表示 */
function updateGamepadStatus() {
  const pads = getGamepads();
  if (pads.length === 0) {
    statusEl.textContent = "ゲームパッドが未接続です";
    noCtrlEl.classList.remove("hidden");
    activeGamepadIdx = null;
    return;
  }
  noCtrlEl.classList.add("hidden");
  statusEl.textContent = pads.map(p => `[${p.index}] ${p.id}`).join(" / ");
  // まだ選択されていなければ最初のパッドを使用
  if (activeGamepadIdx === null) {
    activeGamepadIdx = pads[0].index;
  }
}

/** null を除いたゲームパッド配列を返す */
function getGamepads() {
  return Array.from(navigator.getGamepads ? navigator.getGamepads() : [])
    .filter(Boolean);
}

// ──────────────────────────────────────────────────────
// Canvas 描画
// ──────────────────────────────────────────────────────
function drawFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // コントローラー画像を描画（canvas に直接描く）
  if (imgLoaded) {
    ctx.drawImage(controllerImg, 0, 0, canvas.width, canvas.height);
  }

  // ゲームパッドが繋がっていなければ終了
  const pads = getGamepads();
  if (pads.length === 0) {
    scheduleNextFrame();
    return;
  }
  // アクティブなパッドを選択（なければ最初のものを使用）
  let pad = pads.find(p => p.index === activeGamepadIdx) || pads[0];
  activeGamepadIdx = pad.index;

  const cfg = currentConfig;

  // ── ボタン描画 ──
  for (const btn of cfg.buttons) {
    const b = pad.buttons[btn.index];
    if (!b) continue;
    const val = b.value ?? (b.pressed ? 1 : 0);
    if (val < APP_CONFIG.buttonThreshold) continue;

    // アナログ対応：押し込み量で透明度を変化
    const alpha = btn.analog ? val : 1.0;
    drawButtonOverlay(btn, alpha);
  }

  // ── スティック描画 ──
  for (const stick of cfg.sticks) {
    const rawX = pad.axes[stick.axisX] ?? 0;
    const rawY = pad.axes[stick.axisY] ?? 0;
    const ax = Math.abs(rawX) < APP_CONFIG.deadzone ? 0 : rawX;
    const ay = Math.abs(rawY) < APP_CONFIG.deadzone ? 0 : rawY;
    drawStickOverlay(stick, ax, ay);
  }

  scheduleNextFrame();
}

/** ボタンのオーバーレイを描画 */
function drawButtonOverlay(btn, alpha) {
  // color 文字列から rgba を再構築してアルファを掛け合わせる
  const baseColor = parseRgba(btn.color);
  const finalAlpha = baseColor.a * alpha;
  const fillStyle = `rgba(${baseColor.r},${baseColor.g},${baseColor.b},${finalAlpha.toFixed(2)})`;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = fillStyle;

  const hw = btn.w / 2;
  const hh = btn.h / 2;

  if (btn.shape === "circle") {
    ctx.beginPath();
    ctx.ellipse(btn.x, btn.y, hw, hh, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // rect（角丸）
    const r = Math.min(hw, hh, 8);
    roundRect(ctx, btn.x - hw, btn.y - hh, btn.w, btn.h, r);
    ctx.fill();
  }

  ctx.restore();
}

/** スティックの可動インジケーターを描画 */
function drawStickOverlay(stick, ax, ay) {
  const dx = ax * stick.radius;
  const dy = ay * stick.radius;
  const dotX = stick.cx + dx;
  const dotY = stick.cy + dy;

  ctx.save();

  // 可動範囲の背景円
  ctx.beginPath();
  ctx.arc(stick.cx, stick.cy, stick.radius + stick.dotRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // スティック位置ドット
  ctx.beginPath();
  ctx.arc(dotX, dotY, stick.dotRadius, 0, Math.PI * 2);
  ctx.fillStyle = stick.color;
  ctx.fill();

  // 中心から現在位置へのライン
  if (Math.abs(ax) > 0 || Math.abs(ay) > 0) {
    ctx.beginPath();
    ctx.moveTo(stick.cx, stick.cy);
    ctx.lineTo(dotX, dotY);
    ctx.strokeStyle = "rgba(255,255,255,0.50)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

// ──────────────────────────────────────────────────────
// ユーティリティ
// ──────────────────────────────────────────────────────

/** "rgba(r,g,b,a)" 文字列をパース */
function parseRgba(str) {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return { r: 255, g: 255, b: 255, a: 0.7 };
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
}

/** 角丸矩形のパスを作成 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** 次フレームをスケジュール */
function scheduleNextFrame() {
  if (APP_CONFIG.useRAF) {
    animFrameId = requestAnimationFrame(drawFrame);
  } else {
    animFrameId = setTimeout(drawFrame, 16);
  }
}

// ──────────────────────────────────────────────────────
// 初期化
// ──────────────────────────────────────────────────────

/** セレクタを設定から動的生成 */
function buildSelector() {
  selectEl.innerHTML = "";
  for (const [key, cfg] of Object.entries(CONTROLLER_CONFIGS)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = cfg.name;
    if (key === DEFAULT_CONTROLLER) opt.selected = true;
    selectEl.appendChild(opt);
  }
}

selectEl.addEventListener("change", () => {
  switchController(selectEl.value);
});

function init() {
  buildSelector();
  switchController(DEFAULT_CONTROLLER);
  updateGamepadStatus();
  drawFrame();
}

document.addEventListener("DOMContentLoaded", init);
