/**
 * color-customizer.js
 * ============================================================
 * コントローラーの色をウェブUIでカスタマイズするための機能。
 * - DualSenseのアナログスティック色（左右まとめて）
 * - DualSenseのマスク色（左右まとめて）
 * - Fighting Stick Miniのレバー色
 * - Fighting Stick Miniのマスク色（ボール周辺とシャフトをまとめて）
 * 
 * LocalStorageに設定を保存し、ページ読み込み時に復元します。
 * ============================================================ */

"use strict";

/**
 * カラーカスタマイザーの設定を管理するクラス
 */
class ColorCustomizer {
  constructor() {
    this.storageKey = "controller-color-settings";
    // ────────────────────────────────────────────────────────────
    // 色設定のデフォルト値（Single Source of Truth）
    // もとは config.js の各コントローラー定義（stickColor / fill 等）に
    // 色が書かれていましたが、UIリアルタイム変更・LocalStorage保存・
    // URLパラメーター指定を統合するためにここへ集約されました。
    // 色のデフォルト値を変更したい場合はここを編集してください。
    // ページ読み込み時にこの値が config.js の色設定を上書きします。
    // ────────────────────────────────────────────────────────────
    this.defaultColors = {
      dualsense: {
        stick: "#e82832",      // アナログスティック色
        activeStick: null,     // 動作時の色（nullの場合はstickと同じ）
        mask: "#1a1a1a",       // マスク色
        brightness: 20         // スティック明るさ（0〜100）
      },
      fightingStickMini: {
        lever: "#e82832",      // レバー色
        activeLever: null,     // 動作時の色（nullの場合はleverと同じ）
        mask: "#1a1a1a",       // マスク色（ボール周辺とシャフト）
        brightness: 20         // レバー明るさ（0〜100）
      },
      fightingStickMiniSimple: {
        lever: "#e82832",      // レバー色
        activeLever: null,     // 動作時の色（nullの場合はleverと同じ）
        mask: "#1a1a1a",       // マスク色（ボール周辺）
        brightness: 20,        // レバー明るさ（0〜100）
        bg: "#00ff00"          // 背景色（クロマキー用の緑）
      }
    };
    
    // URLパラメーターから色が指定されているかチェック
    this.isColorFromURL = this.hasColorInURL();
    
    // 保存された設定を読み込む
    this.settings = this.loadSettings();
  }

  /**
   * URLパラメーターに色指定があるかチェック
   * @returns {boolean}
   */
  hasColorInURL() {
    const params = new URLSearchParams(window.location.search);
    return params.has('stick-color') || params.has('mask-color') || params.has('active-stick-color') || params.has('bgcolor');
  }

  /**
   * LocalStorageから設定を読み込む
   * 優先順位: URLパラメーター > localStorage > デフォルト値
   * @returns {object} 設定オブジェクト
   */
  loadSettings() {
    // 1. デフォルト設定をベースにする
    let settings = JSON.parse(JSON.stringify(this.defaultColors));
    
    // 2. localStorageから読み込んでマージ
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        settings.dualsense = { ...settings.dualsense, ...parsed.dualsense };
        settings.fightingStickMini = { ...settings.fightingStickMini, ...parsed.fightingStickMini };
        settings.fightingStickMiniSimple = { ...settings.fightingStickMiniSimple, ...parsed.fightingStickMiniSimple };
      }
    } catch (e) {
      console.warn("カラー設定の読み込みに失敗しました:", e);
    }
    
    // 3. URLパラメーターで上書き（最優先）
    const urlColors = this.getColorsFromURL();
    if (urlColors) {
      if (urlColors.dualsense) settings.dualsense = { ...settings.dualsense, ...urlColors.dualsense };
      if (urlColors.fightingStickMini) settings.fightingStickMini = { ...settings.fightingStickMini, ...urlColors.fightingStickMini };
      if (urlColors.fightingStickMiniSimple) settings.fightingStickMiniSimple = { ...settings.fightingStickMiniSimple, ...urlColors.fightingStickMiniSimple };
    }
    
    return settings;
  }

  /**
   * URLパラメーターから色設定を取得
   * @returns {object|null} 色設定オブジェクトまたはnull
   */
  getColorsFromURL() {
    const params = new URLSearchParams(window.location.search);
    const stickColor = params.get('stick-color');
    const activeStickColor = params.get('active-stick-color');
    const maskColor = params.get('mask-color');
    const bgColor = params.get('bgcolor');
    const controller = params.get('controller');
    
    // パラメーターが存在しない場合はnull
    if (!stickColor && !activeStickColor && !maskColor && !bgColor) {
      return null;
    }
    
    const result = {};
    
    // コントローラータイプに応じて色を適用
    if (controller === 'dualsense') {
      result.dualsense = {};
      if (stickColor) result.dualsense.stick = this.normalizeColor(stickColor);
      if (activeStickColor) result.dualsense.activeStick = this.normalizeColor(activeStickColor);
      if (maskColor) result.dualsense.mask = this.normalizeColor(maskColor);
    } else if (controller === 'fightingStickMini') {
      result.fightingStickMini = {};
      if (stickColor) result.fightingStickMini.lever = this.normalizeColor(stickColor);
      if (activeStickColor) result.fightingStickMini.activeLever = this.normalizeColor(activeStickColor);
      if (maskColor) result.fightingStickMini.mask = this.normalizeColor(maskColor);
    } else if (controller === 'fightingStickMiniSimple') {
      result.fightingStickMiniSimple = {};
      if (stickColor) result.fightingStickMiniSimple.lever = this.normalizeColor(stickColor);
      if (activeStickColor) result.fightingStickMiniSimple.activeLever = this.normalizeColor(activeStickColor);
      if (maskColor) result.fightingStickMiniSimple.mask = this.normalizeColor(maskColor);
      if (bgColor) result.fightingStickMiniSimple.bg = this.normalizeColor(bgColor);
    }
    
    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * カラーコードを正規化（#を付ける）
   * @param {string} color - カラーコード（"ff0000" or "#ff0000"）
   * @returns {string} 正規化されたカラーコード（"#ff0000"）
   */
  normalizeColor(color) {
    return color.startsWith('#') ? color : `#${color}`;
  }

  /**
   * LocalStorageに設定を保存する
   */
  saveSettings() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (e) {
      console.error("カラー設定の保存に失敗しました:", e);
    }
  }

  /**
   * DualSenseのアナログスティック色を設定
   * @param {string} color - カラーコード（例: "#ff0000"）
   */
  setDualSenseStickColor(color) {
    this.settings.dualsense.stick = color;
    this.saveSettings();
    this.applyDualSenseColors();
    // URL表示を更新
    if (typeof updateObsUrl === "function") {
      updateObsUrl();
    }
  }

  /**
   * DualSenseのマスク色を設定
   * @param {string} color - カラーコード（例: "#1a1a1a"）
   */
  setDualSenseMaskColor(color) {
    this.settings.dualsense.mask = color;
    this.saveSettings();
    this.applyDualSenseColors();
    // URL表示を更新
    if (typeof updateObsUrl === "function") {
      updateObsUrl();
    }
  }

  /**
   * DualSenseの動作時のスティック色を設定
   * @param {string} color - カラーコード（例: "#ff4444"）またはnull
   */
  setDualSenseActiveStickColor(color) {
    // 空文字列またはnullの場合はnullに変換
    this.settings.dualsense.activeStick = color || null;
    this.saveSettings();
    this.applyDualSenseColors();
    // URL表示を更新
    if (typeof updateObsUrl === "function") {
      updateObsUrl();
    }
  }

  /**
   * Fighting Stick Miniのレバー色を設定
   * @param {string} color - カラーコード（例: "#ff0000"）
   */
  setFightingStickLeverColor(color) {
    this.settings.fightingStickMini.lever = color;
    this.saveSettings();
    this.applyFightingStickColors();
    // URL表示を更新
    if (typeof updateObsUrl === "function") {
      updateObsUrl();
    }
  }

  /**
   * Fighting Stick Miniのマスク色を設定（ボール周辺とシャフト）
   * @param {string} color - カラーコード（例: "#1c3005"）
   */
  setFightingStickMaskColor(color) {
    this.settings.fightingStickMini.mask = color;
    this.saveSettings();
    this.applyFightingStickColors();
    // URL表示を更新
    if (typeof updateObsUrl === "function") {
      updateObsUrl();
    }
  }

  /**
   * Fighting Stick Miniの動作時のレバー色を設定
   * @param {string} color - カラーコード（例: "#ff4444"）またはnull
   */
  setFightingStickActiveLeverColor(color) {
    // 空文字列またはnullの場合はnullに変換
    this.settings.fightingStickMini.activeLever = color || null;
    this.saveSettings();
    this.applyFightingStickColors();
    // URL表示を更新
    if (typeof updateObsUrl === "function") {
      updateObsUrl();
    }
  }

  /**
   * スティック/レバーの明るさを設定
   * @param {string} controller - "dualsense" または "fightingStickMini"
   * @param {number} brightness - 明るさ（0〜100）
   */
  setBrightness(controller, brightness) {
    const value = Math.max(0, Math.min(100, parseInt(brightness, 10)));
    this.settings[controller].brightness = value;
    this.saveSettings();
    this.applyBrightness(controller);
    // URL表示を更新
    if (typeof updateObsUrl === "function") {
      updateObsUrl();
    }
  }

  /**
   * 指定コントローラーの明るさ設定をconfig.jsに適用
   * @param {string} controller - "dualsense", "fightingStickMini", "fightingStickMiniSimple"
   */
  applyBrightness(controller) {
    const brightness = this.settings[controller].brightness;
    
    if (controller === "dualsense" && typeof DUALSENSE_CONFIG !== "undefined") {
      DUALSENSE_CONFIG.stickBrightnessBoost = brightness;
    } else if (controller === "fightingStickMini" && typeof FIGHTING_STICK_MINI_CONFIG !== "undefined") {
      FIGHTING_STICK_MINI_CONFIG.stickBrightnessBoost = brightness;
    } else if (controller === "fightingStickMiniSimple" && typeof FIGHTING_STICK_SIMPLE_CONFIG !== "undefined") {
      FIGHTING_STICK_SIMPLE_CONFIG.stickBrightnessBoost = brightness;
    }
    
    // 現在表示中のコントローラーの場合、設定を即座に反映
    if (typeof state !== "undefined" && state.currentConfig) {
      if ((controller === "dualsense" && state.currentConfig.id === "dualsense") ||
          (controller === "fightingStickMini" && state.currentConfig.id === "fightingStickMini") ||
          (controller === "fightingStickMiniSimple" && state.currentConfig.id === "fightingStickMiniSimple")) {
        state.currentConfig.stickBrightnessBoost = brightness;
      }
    }
  }

  /**
   * DualSenseの色設定をconfig.jsに適用
   */
  applyDualSenseColors() {
    if (typeof DUALSENSE_CONFIG === "undefined") return;
    
    const stickColor = this.settings.dualsense.stick;
    const activeStickColor = this.settings.dualsense.activeStick;
    const maskColor = this.settings.dualsense.mask;
    
    // 左右両方のアナログスティックに色を適用
    DUALSENSE_CONFIG.sticks.forEach(stick => {
      stick.stickColor = stickColor;
      stick.activeStickColor = activeStickColor;
      // マスク形状の色も更新
      if (stick.stickMaskShapes) {
        stick.stickMaskShapes.forEach(shape => {
          shape.fill = maskColor;
        });
      }
    });
    
    // 再描画をトリガー
    this.reapplyCurrentConfig();
  }

  /**
   * Fighting Stick Mini（通常版）の色設定をconfig.jsに適用
   */
  applyFightingStickColors() {
    if (typeof FIGHTING_STICK_MINI_CONFIG === "undefined") return;
    
    const leverColor = this.settings.fightingStickMini.lever;
    const activeLeverColor = this.settings.fightingStickMini.activeLever;
    const maskColor = this.settings.fightingStickMini.mask;
    
    FIGHTING_STICK_MINI_CONFIG.sticks.forEach(stick => {
      if (stick.type === "lever") {
        stick.stickColor = leverColor;
        stick.activeStickColor = activeLeverColor;
        if (stick.stickMaskShapes) {
          stick.stickMaskShapes.forEach(shape => {
            shape.fill = maskColor;
          });
        }
      }
    });
    
    this.reapplyCurrentConfig();
  }

  /**
   * Fighting Stick Mini（簡易版）の色設定をconfig.jsに適用
   */
  applySimpleColors() {
    if (typeof FIGHTING_STICK_SIMPLE_CONFIG === "undefined") return;
    
    const leverColor = this.settings.fightingStickMiniSimple.lever;
    const activeLeverColor = this.settings.fightingStickMiniSimple.activeLever;
    const maskColor = this.settings.fightingStickMiniSimple.mask;
    
    FIGHTING_STICK_SIMPLE_CONFIG.sticks.forEach(stick => {
      if (stick.type === "lever") {
        stick.stickColor = leverColor;
        stick.activeStickColor = activeLeverColor;
        if (stick.stickMaskShapes) {
          stick.stickMaskShapes.forEach(shape => {
            shape.fill = maskColor;
          });
        }
      }
    });
    
    this.reapplyCurrentConfig();
  }

  /**
   * 現在のコントローラー設定を再適用して再描画をトリガー
   */
  reapplyCurrentConfig() {
    // script.jsのstate.currentConfigが存在すれば、applyConfigで再描画
    if (typeof state !== "undefined" && state.currentConfig && typeof applyConfig === "function") {
      applyConfig(state.currentConfig);
    }
  }

  /**
   * 現在の設定を取得（外部から参照するため）
   * @returns {object} 現在の色設定
   */
  getSettings() {
    return this.settings;
  }

  /**
   * すべての色設定を適用（初期化時に使用）
   */
  applyAllColors() {
    this.applyDualSenseColors();
    this.applyFightingStickColors();
    this.applySimpleColors();
    this.applyBrightness("dualsense");
    this.applyBrightness("fightingStickMini");
    this.applyBrightness("fightingStickMiniSimple");
  }

  /**
   * 簡易版背景色を取得
   * @returns {string} 背景色
   */
  getBgColor() {
    return this.settings.fightingStickMiniSimple.bg || this.defaultColors.fightingStickMiniSimple.bg;
  }

  /**
   * 簡易版背景色を設定
   * @param {string} color - 16進カラー（#rrggbb）
   */
  setSimpleBgColor(color) {
    this.settings.fightingStickMiniSimple.bg = color;
    this.saveSettings();
    this.applySimpleBgColorToDOM(color);
    
    // OBS用URLを更新
    if (typeof updateObsUrl === 'function') {
      updateObsUrl();
    }
  }

  /**
   * 簡易版の背景色を画面に即座に反映
   * @param {string} color - 背景色（#rrggbb）
   */
  applySimpleBgColorToDOM(color) {
    if (typeof state !== 'undefined' && state.currentConfig && state.currentConfig.renderMode === 'simple') {
      const wrapper = document.getElementById('controller-wrapper');
      if (wrapper) {
        wrapper.style.backgroundColor = color;
      }
    }
  }

  /**
   * Fighting Stick Mini (簡易版) のレバー色を設定
   * @param {string} color - カラーコード（例: "#ff0000"）
   */
  setSimpleLeverColor(color) {
    this.settings.fightingStickMiniSimple.lever = color;
    this.saveSettings();
    this.applySimpleColors();
    if (typeof updateObsUrl === 'function') {
      updateObsUrl();
    }
  }

  /**
   * Fighting Stick Mini (簡易版) の動作時レバー色を設定
   * @param {string} color - カラーコード（例: "#ff4444"）またはnull
   */
  setSimpleActiveLeverColor(color) {
    this.settings.fightingStickMiniSimple.activeLever = color || null;
    this.saveSettings();
    this.applySimpleColors();
    if (typeof updateObsUrl === 'function') {
      updateObsUrl();
    }
  }

  /**
   * Fighting Stick Mini (簡易版) のマスク色を設定
   * @param {string} color - カラーコード（例: "#1c3005"）
   */
  setSimpleMaskColor(color) {
    this.settings.fightingStickMiniSimple.mask = color;
    this.saveSettings();
    this.applySimpleColors();
    if (typeof updateObsUrl === 'function') {
      updateObsUrl();
    }
  }

  /**
   * 設定をデフォルトにリセット
   */
  resetToDefaults() {
    this.settings = JSON.parse(JSON.stringify(this.defaultColors));
    this.saveSettings();
    this.applyAllColors();
    this.updateUIInputs();
    this.applySimpleBgColorToDOM(this.defaultColors.fightingStickMiniSimple.bg);
  }

  /**
   * UIのカラーピッカーを現在の設定値に更新
   */
  updateUIInputs() {
    const inputs = {
      "dualsense-stick-color": this.settings.dualsense.stick,
      "dualsense-active-stick-color": this.settings.dualsense.activeStick || this.settings.dualsense.stick,
      "dualsense-mask-color": this.settings.dualsense.mask,
      "dualsense-brightness": this.settings.dualsense.brightness,
      "fightingstick-lever-color": this.settings.fightingStickMini.lever,
      "fightingstick-active-lever-color": this.settings.fightingStickMini.activeLever || this.settings.fightingStickMini.lever,
      "fightingstick-mask-color": this.settings.fightingStickMini.mask,
      "fightingstick-brightness": this.settings.fightingStickMini.brightness,
      "simple-bgcolor": this.settings.fightingStickMiniSimple.bg,
      "simple-lever-color": this.settings.fightingStickMiniSimple.lever,
      "simple-active-lever-color": this.settings.fightingStickMiniSimple.activeLever || this.settings.fightingStickMiniSimple.lever,
      "simple-mask-color": this.settings.fightingStickMiniSimple.mask,
      "simple-brightness": this.settings.fightingStickMiniSimple.brightness
    };
    
    for (const [id, value] of Object.entries(inputs)) {
      const input = document.getElementById(id);
      if (input) {
        input.value = value;
        // スライダーの場合は表示値も更新
        if (id.includes("brightness")) {
          const valueDisplay = document.getElementById(id + "-value");
          if (valueDisplay) {
            valueDisplay.textContent = value;
          }
        }
      }
    }
  }

  /**
   * カラーピッカーUIを初期化
   * イベントリスナーの登録のみを行い、初期値の反映は updateUIInputs() に委ねる
   */
  initializeUI() {
    // DualSense アナログスティック色
    const dualsenseStickInput = document.getElementById("dualsense-stick-color");
    if (dualsenseStickInput) {
      dualsenseStickInput.addEventListener("input", (e) => {
        this.setDualSenseStickColor(e.target.value);
      });
    }

    // DualSense マスク色
    const dualsenseMaskInput = document.getElementById("dualsense-mask-color");
    if (dualsenseMaskInput) {
      dualsenseMaskInput.addEventListener("input", (e) => {
        this.setDualSenseMaskColor(e.target.value);
      });
    }

    // DualSense 動作時のスティック色
    const dualsenseActiveStickInput = document.getElementById("dualsense-active-stick-color");
    if (dualsenseActiveStickInput) {
      dualsenseActiveStickInput.addEventListener("input", (e) => {
        this.setDualSenseActiveStickColor(e.target.value);
      });
    }

    // Fighting Stick Mini レバー色
    const fightingStickLeverInput = document.getElementById("fightingstick-lever-color");
    if (fightingStickLeverInput) {
      fightingStickLeverInput.addEventListener("input", (e) => {
        this.setFightingStickLeverColor(e.target.value);
      });
    }

    // Fighting Stick Mini マスク色
    const fightingStickMaskInput = document.getElementById("fightingstick-mask-color");
    if (fightingStickMaskInput) {
      fightingStickMaskInput.addEventListener("input", (e) => {
        this.setFightingStickMaskColor(e.target.value);
      });
    }

    // Fighting Stick Mini 動作時のレバー色
    const fightingStickActiveLeverInput = document.getElementById("fightingstick-active-lever-color");
    if (fightingStickActiveLeverInput) {
      fightingStickActiveLeverInput.addEventListener("input", (e) => {
        this.setFightingStickActiveLeverColor(e.target.value);
      });
    }

    // 簡易版背景色
    const simpleBgInput = document.getElementById('simple-bgcolor');
    if (simpleBgInput) {
      simpleBgInput.addEventListener('input', (e) => {
        this.setSimpleBgColor(e.target.value);
      });
    }

    // 簡易版レバー色（静止時）
    const simpleLeverInput = document.getElementById('simple-lever-color');
    if (simpleLeverInput) {
      simpleLeverInput.addEventListener('input', (e) => {
        this.setSimpleLeverColor(e.target.value);
      });
    }

    // 簡易版レバー色（動作時）
    const simpleActiveLeverInput = document.getElementById('simple-active-lever-color');
    if (simpleActiveLeverInput) {
      simpleActiveLeverInput.addEventListener('input', (e) => {
        this.setSimpleActiveLeverColor(e.target.value);
      });
    }

    // 簡易版マスク色
    const simpleMaskInput = document.getElementById('simple-mask-color');
    if (simpleMaskInput) {
      simpleMaskInput.addEventListener('input', (e) => {
        this.setSimpleMaskColor(e.target.value);
      });
    }

    // リセットボタン
    const resetBtn = document.getElementById("color-reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (confirm("色設定をデフォルトに戻しますか？")) {
          this.resetToDefaults();
        }
      });
    }

    // 初期値を一括反映（URLパラメーター・localStorage・デフォルト値が適用済みの this.settings を使用）
    this.updateUIInputs();
  }
}

// グローバルインスタンスを作成
let colorCustomizer;

/**
 * 即時初期化（config.jsの読み込み直後に色を適用するため）
 */
(function initColorCustomizer() {
  colorCustomizer = new ColorCustomizer();
  
  // config.jsに色設定を即座に適用
  colorCustomizer.applyAllColors();
  
  // DOM読み込み後にUIを初期化
  if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", () => {
      colorCustomizer.initializeUI();
    });
  } else {
    // DOMが既に読み込まれている場合は即座に初期化
    colorCustomizer.initializeUI();
  }
})();

/**
 * カラーカスタマイザー設定モーダルを開く（グローバル関数）
 */
function openColorSettings() {
  const modal = document.getElementById("color-modal");
  if (modal) {
    modal.style.display = "block";
    if (colorCustomizer) {
      colorCustomizer.updateUIInputs();
    }
  }
}

/**
 * カラーカスタマイザー設定モーダルを閉じる（グローバル関数）
 */
function closeColorSettings() {
  const modal = document.getElementById("color-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

/**
 * スティック/レバーの明るさを更新（グローバル関数）
 * @param {string} controller - "dualsense", "fightingStickMini", "fightingStickMiniSimple" のいずれか
 * @param {number} value - 明るさ（0〜100）
 */
function updateBrightness(controller, value) {
  if (!colorCustomizer) return;
  
  // 明るさを設定
  colorCustomizer.setBrightness(controller, value);
  
  // 表示値IDのマッピング
  const displayIdMap = {
    "dualsense": "dualsense-brightness-value",
    "fightingStickMini": "fightingstick-brightness-value",
    "fightingStickMiniSimple": "simple-brightness-value"
  };
  const valueDisplay = document.getElementById(displayIdMap[controller] || `${controller}-brightness-value`);
  if (valueDisplay) {
    valueDisplay.textContent = value;
  }
}
