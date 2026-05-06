/**
 * stick-color-animator.js
 * ============================================================
 * スティック・レバーが動いたときに色を明るくするアニメーション機能。
 * 
 * 依存: script.js (_adjustHexColor 関数を使用)
 * ============================================================
 */

"use strict";

/**
 * スティック/レバーの色を動きの強さに応じて更新する。
 * ニュートラル位置からの距離が大きいほど明るくなる。
 * 
 * @param {string} stickId - スティックID（例: "LS", "RS", "Lever"）
 * @param {number} intensity - 動きの強さ（0〜1）
 * @param {string} baseColor - 元の色（例: "#e82832"）
 * @param {string} type - "stick" または "lever"
 */
function updateStickColor(stickId, intensity, baseColor, type) {
  // 明るさ調整量を計算（最大+80程度）
  const brightnessBoost = Math.floor(intensity * 80);
  
  if (type === "lever") {
    // レバーの場合：シャフトとボールの両方を更新
    updateLeverColor(stickId, brightnessBoost, baseColor);
  } else if (type === "stick") {
    // アナログスティックの場合：ボールのみ更新
    updateAnalogStickColor(stickId, brightnessBoost, baseColor);
  }
}

/**
 * レバーの色を更新する（シャフト + ボール + グラデーション）。
 * 
 * @param {string} stickId - レバーID
 * @param {number} boost - 明るさ調整量（0〜80）
 * @param {string} baseColor - 元の色
 */
function updateLeverColor(stickId, boost, baseColor) {
  // グラデーション定義を更新
  const gradId = "lever-ball-grad-" + stickId;
  const grad = document.getElementById(gradId);
  
  if (grad) {
    const stops = grad.querySelectorAll("stop");
    if (stops.length >= 3) {
      // 元のグラデーション定義（buildStickImgOverlayより）
      // 0%: 明るい, 45%: ベース, 100%: 暗い
      stops[0].setAttribute("stop-color", _adjustHexColor(baseColor, 70 + boost));
      stops[1].setAttribute("stop-color", _adjustHexColor(baseColor, boost));
      stops[2].setAttribute("stop-color", _adjustHexColor(baseColor, -80 + boost));
    }
  }
  
  // シャフトの色を更新
  const shaft = document.getElementById("lever-shaft-custom-" + stickId);
  if (shaft) {
    const shaftColor = _adjustHexColor(baseColor, -40 + boost);
    shaft.setAttribute("stroke", shaftColor);
  }
}

/**
 * アナログスティックの色を更新する（ボール + グラデーション）。
 * 
 * @param {string} stickId - スティックID
 * @param {number} boost - 明るさ調整量（0〜80）
 * @param {string} baseColor - 元の色
 */
function updateAnalogStickColor(stickId, boost, baseColor) {
  // グラデーション定義を更新
  const gradId = "stick-ball-grad-" + stickId;
  const grad = document.getElementById(gradId);
  
  if (grad) {
    const stops = grad.querySelectorAll("stop");
    if (stops.length >= 4) {
      // 元のグラデーション定義（buildAnalogStickOverlayより）
      // 0%: やや明るい, 60%: ベース, 100%: やや暗い（フラット寄り）
      stops[0].setAttribute("stop-color", _adjustHexColor(baseColor, 30 + boost));
      stops[1].setAttribute("stop-color", _adjustHexColor(baseColor, boost));
      stops[2].setAttribute("stop-color", _adjustHexColor(baseColor, boost));
      stops[3].setAttribute("stop-color", _adjustHexColor(baseColor, -20 + boost));
    }
  }
  
  // 中心円の色を更新
  const centerCircle = document.getElementById("stick-center-" + stickId);
  if (centerCircle) {
    centerCircle.setAttribute("fill", _adjustHexColor(baseColor, -8 + boost));
  }
}
