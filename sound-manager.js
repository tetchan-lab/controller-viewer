/**
 * SoundManager - Web Audio APIを使用したサウンド再生管理
 * 
 * 機能:
 * - 音声ファイルの事前読み込みとデコード
 * - 低レイテンシーなサウンド再生
 * - 音量制御とミュート機能
 * - localStorage連携による設定永続化
 */
class SoundManager {
  constructor() {
    this.audioContext = null;
    this.buffers = {}; // soundId -> AudioBuffer
    this.enabled = true;
    this.volume = 0.5; // 初期音量50%
    this.initialized = false;
    
    // localStorageから設定を復元
    this.loadSettings();
  }

  /**
   * AudioContextの初期化（ユーザーインタラクション後に呼び出す）
   */
  async init() {
    if (this.initialized) return;
    
    try {
      // AudioContextの作成（ベンダープレフィックス対応）
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.warn('Web Audio API is not supported in this browser');
        return;
      }
      
      this.audioContext = new AudioContext();
      
      // Chromeのautoplay policy対応: suspendedの場合はresume
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.initialized = true;
      console.log('SoundManager initialized');
    } catch (error) {
      console.error('Failed to initialize SoundManager:', error);
    }
  }

  /**
   * 音声ファイルを読み込んでデコード
   * @param {string} soundId - サウンドの識別子
   * @param {string} url - 音声ファイルのURL
   */
  async loadSound(soundId, url) {
    if (!this.audioContext) {
      console.warn('AudioContext not initialized. Call init() first.');
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.buffers[soundId] = audioBuffer;
      console.log(`Sound loaded: ${soundId} (${url})`);
    } catch (error) {
      console.error(`Failed to load sound: ${soundId} (${url})`, error);
      // エラー時でも処理を継続（サウンドなしで動作）
    }
  }

  /**
   * 複数の音声ファイルを一括読み込み
   * @param {Object} soundMap - { soundId: url, ... }
   */
  async loadSounds(soundMap) {
    const promises = Object.entries(soundMap).map(([soundId, url]) =>
      this.loadSound(soundId, url)
    );
    await Promise.all(promises);
  }

  /**
   * サウンドを再生
   * @param {string} soundId - サウンドの識別子
   * @param {number} volumeMultiplier - 音量倍率（オプション、0.0〜1.0）
   */
  play(soundId, volumeMultiplier = 1.0) {
    if (!this.enabled || !this.initialized || !this.audioContext) {
      return;
    }

    const buffer = this.buffers[soundId];
    if (!buffer) {
      console.warn(`Sound not loaded: ${soundId}`);
      return;
    }

    try {
      // BufferSourceNodeを作成（使い捨て）
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;

      // GainNodeで音量制御
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = this.volume * volumeMultiplier;

      // 接続: source -> gain -> destination
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // 再生開始
      source.start(0);
    } catch (error) {
      console.error(`Failed to play sound: ${soundId}`, error);
    }
  }

  /**
   * 音量を設定（0.0〜1.0）
   * @param {number} volume - 音量
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  /**
   * サウンドのON/OFFを切り替え
   * @param {boolean} enabled - 有効/無効
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.saveSettings();
  }

  /**
   * 設定をlocalStorageに保存
   */
  saveSettings() {
    try {
      localStorage.setItem('soundVolume', this.volume.toString());
      localStorage.setItem('soundEnabled', this.enabled.toString());
    } catch (error) {
      console.warn('Failed to save sound settings:', error);
    }
  }

  /**
   * 設定をlocalStorageから復元
   */
  loadSettings() {
    try {
      // URLクエリパラメーター "sound" の値を取得（優先度最高）
      const params = new URLSearchParams(window.location.search);
      const soundParam = params.get('sound');
      
      // ?sound=off または ?sound=on が指定されている場合は、それを優先
      if (soundParam !== null) {
        this.enabled = soundParam.toLowerCase() !== 'off';
        console.log(`Sound enabled set from query parameter: ${this.enabled}`);
        // クエリパラメーター指定時はlocalStorageの音量のみ復元
        const savedVolume = localStorage.getItem('soundVolume');
        if (savedVolume !== null) {
          this.volume = parseFloat(savedVolume);
        }
        return;
      }
      
      // クエリパラメーターがない場合はlocalStorageから復元
      const savedVolume = localStorage.getItem('soundVolume');
      if (savedVolume !== null) {
        this.volume = parseFloat(savedVolume);
      }

      const savedEnabled = localStorage.getItem('soundEnabled');
      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      }
    } catch (error) {
      console.warn('Failed to load sound settings:', error);
    }
  }

  /**
   * 現在の音量を取得
   * @returns {number} 音量（0.0〜1.0）
   */
  getVolume() {
    return this.volume;
  }

  /**
   * サウンドが有効かどうかを取得
   * @returns {boolean} 有効/無効
   */
  isEnabled() {
    return this.enabled;
  }
}

// グローバルインスタンスを作成
const soundManager = new SoundManager();
