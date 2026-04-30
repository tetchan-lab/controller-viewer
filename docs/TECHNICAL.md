# 技術仕様・設計ドキュメント

このドキュメントでは、Controller Viewer の技術的な実装詳細、Gamepad API の使用方法、設計思想について説明します。

---

## 目次

- [ファイル構成](#ファイル構成)
- [Gamepad API によるデバイス認識の仕組み](#gamepad-api-によるデバイス認識の仕組み)
- [サウンドシステムの詳細](#サウンドシステムの詳細)
- [設計メモ（後から調整しやすい構成について）](#設計メモ後から調整しやすい構成について)

---

## ファイル構成

```
controller-viewer/
├── index.html                   # ページ本体
├── style.css                    # スタイルシート（ボタンオーバーレイ・押下エフェクト）
├── script.js                    # Gamepad API ポーリング・描画ロジック
├── config.js                    # ★ ボタン座標・デバイス名パターンの設定ファイル
├── keyboard-input.js            # キーボード/マウス入力を仮想ゲームパッド状態に変換
├── sound-manager.js             # Web Audio API によるサウンド管理
├── docs/
│   ├── CONFIGURATION.md         # カスタマイズガイド（座標計測・新規コントローラー追加）
│   ├── TECHNICAL.md             # 技術仕様（本ファイル）
│   └── gamepad-api.md           # Gamepad API 詳細リファレンス
├── images/
│   ├── ps5_dualsense.jpg        # DualSense 実写真 (1500×1000 px)
│   └── fighting_stick_mini.jpg  # Fighting Stick Mini 実写真 (1417×752 px)
└── sounds/
    ├── README.md                # サウンドファイル準備ガイド
    ├── dualsense/               # DualSense 用サウンドファイル（MP3）
    │   ├── dpad-press.mp3
    │   ├── dpad-release.mp3
    │   ├── btn-press.mp3
    │   ├── btn-release.mp3
    │   ├── stick-press.mp3
    │   ├── stick-release.mp3
    │   ├── touch-press.mp3
    │   ├── touch-release.mp3
    │   └── create_options-press.mp3
    └── fightingStickMini/       # Fighting Stick Mini 用サウンドファイル（MP3）
        ├── lever-press.mp3
        ├── lever-release.mp3
        ├── btn-press.mp3
        ├── btn-release.mp3
        ├── upbtn-press.mp3
        └── upbtn-release.mp3
```

### 各ファイルの役割

| ファイル | 役割 |
|---|---|
| `index.html` | DOM構造、コントローラー画像・オーバーレイコンテナの配置 |
| `style.css` | ボタンオーバーレイのスタイル、押下エフェクト、レスポンシブ対応 |
| `script.js` | Gamepad API ポーリング、オーバーレイ描画、デバイス自動判定 |
| `config.js` | **設定の中心**：ボタン座標、デバイス名パターン、サウンドパス |
| `keyboard-input.js` | キーボード/マウスイベントを仮想ゲームパッド状態に変換（`?keyboard=on/off` で制御） |
| `sound-manager.js` | Web Audio API によるサウンド管理、音量調整、ローディング |

---

## Gamepad API によるデバイス認識の仕組み

このアプリは、ブラウザ標準の **Gamepad API** を使ってコントローラーを認識しています。  
コントローラーを接続してブラウザ上でボタンを押すと `gamepadconnected` イベントが発火し、  
取得できる `Gamepad` オブジェクトのプロパティから自動判定を行います。

### Gamepad オブジェクトの主要プロパティ

| プロパティ | 型 | 説明 |
|---|---|---|
| `id` | `string` | デバイスの識別文字列（メーカー名・モデル名を含む） |
| `index` | `number` | ブラウザが接続順に割り当てる番号（0〜3） |
| `connected` | `boolean` | 現在接続中かどうか |
| `mapping` | `string` | ボタン配列の規格（`"standard"` または `""`） |
| `buttons` | `GamepadButton[]` | ボタンの状態の配列 |
| `axes` | `number[]` | アナログ軸の値（-1.0〜1.0） |
| `timestamp` | `number` | 最終更新時刻（`performance.now()` の値） |

### デバイスの区別に使えるプロパティ

| 目的 | 使うプロパティ |
|---|---|
| 異なるモデルを区別する | `id`（部分一致で判定） |
| 同じモデルの複数台を区別する | `index`（接続順番号） |
| 現在接続中かを確認する | `connected` |

### ⚠️ `id` プロパティについての重要な注意

`id` はデバイス固有の識別子（シリアル番号など）**ではありません**。  
`id` にはメーカー名とモデル名が含まれるため、**同じ型のコントローラーを複数接続した場合は `id` が同一になります**。  
その場合は `index`（接続順番号）で個別に区別します。

また、USB 接続と Bluetooth 接続で `id` の書式が異なる場合があります。

```javascript
// id の例（DualSense、USB 接続）
"DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)"

// id の例（DualSense、Bluetooth 接続）
"DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)"

// id の例（Fighting Stick Mini、USB 接続）
"XBOX 360 Controller For Windows (STANDARD GAMEPAD)"
```

### 接続確認のサンプルコード

```javascript
// 接続時に全プロパティをログ出力する
window.addEventListener("gamepadconnected", (event) => {
  const gp = event.gamepad;
  console.log("id       :", gp.id);       // モデル判別（固有IDではない）
  console.log("index    :", gp.index);    // 複数台の個別識別に使う
  console.log("connected:", gp.connected);
  console.log("mapping  :", gp.mapping);
  console.log("buttons  :", gp.buttons.length, "個");
  console.log("axes     :", gp.axes.length, "本");
});

// ポーリングでボタン状態を取得する（Chrome は毎フレーム getGamepads() が必要）
function poll(activeIndex) {
  const gp = navigator.getGamepads()[activeIndex];
  if (!gp) return;

  gp.buttons.forEach((btn, i) => {
    if (btn.pressed) {
      console.log(`ボタン ${i}: value=${btn.value.toFixed(3)}`);
    }
  });

  gp.axes.forEach((val, i) => {
    if (Math.abs(val) > 0.1) {   // デッドゾーン処理
      console.log(`軸 ${i}: ${val.toFixed(4)}`);
    }
  });
}
```

詳細なプロパティ解説・コードサンプル・各デバイスの接続実例は  
→ **[gamepad-api.md](gamepad-api.md)** を参照してください。

### デバイス自動判定の仕組み

`config.js` の各コントローラー設定には `deviceNamePatterns` 配列があり、  
`id` プロパティに含まれるキーワードで自動判定を行います。

```js
// config.js
const DUALSENSE_CONFIG = {
  id: "dualsense",
  name: "DualSense (PS5)",
  deviceNamePatterns: [
    "DualSense",
    "PS5 Controller",
    "PlayStation 5"
  ],
  // ...
};
```

`script.js` の `detectConfig()` 関数が、接続されたゲームパッドの `id` と  
各設定の `deviceNamePatterns` を照合し、一致したものを自動適用します。

```js
// script.js
function detectConfig(gamepad) {
  for (const config of ALL_CONFIGS) {
    for (const pattern of config.deviceNamePatterns) {
      if (gamepad.id.includes(pattern)) {
        return config;
      }
    }
  }
  return null;  // 一致しない場合は null
}
```

---

## サウンドシステムの詳細

このアプリは **Web Audio API** を使用して、実際のコントローラーから録音した生音をリアルタイムで再生します。

### アーキテクチャ

```
sound-manager.js
  ├─ SoundManager クラス
  │   ├─ AudioContext の作成・管理
  │   ├─ サウンドファイルの読み込み（fetch + decodeAudioData）
  │   ├─ カテゴリ別サウンドバッファの管理
  │   └─ 再生メソッド（play）
  │
script.js
  ├─ SoundManager のインスタンス化
  ├─ ゲームパッド入力検出時に play() を呼び出し
  └─ ボタンステート追跡（press/release の区別）
```

### 主な機能

#### 1. 低レイテンシー再生

Web Audio API の `AudioBufferSourceNode` を使用することで、  
ボタン押下から音声再生までの遅延を最小化しています。

```js
// sound-manager.js
play(categoryKey, action) {
  const buffer = this.soundBuffers[categoryKey]?.[action];
  if (!buffer) return;

  const source = this.audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(this.gainNode);
  source.start(0);
}
```

#### 2. カテゴリ別サウンド管理

コントローラーごとに異なる音を再生できるよう、カテゴリ別に管理：

| カテゴリ | 説明 | DualSense | Fighting Stick Mini |
|---|---|---|---|
| `dpad` | 十字キー | ✓ | — |
| `button` | フェイスボタン | ✓ | ✓ |
| `stick` | アナログスティック | ✓ | — |
| `lever` | アーケードレバー | — | ✓ |
| `touch` | タッチパッド | ✓ | — |
| `upbtn` | 上部小ボタン | — | ✓ |
| `create_options` | Create/Options | ✓ | — |

各ボタンには `soundCategory` プロパティが割り当てられており、  
それに応じたサウンドが再生されます。

```js
// config.js
buttons: [
  { index: 0, label: "×", x: 647, y: 212, w: 50, h: 50, soundCategory: "button" },
  { index: 12, label: "↑", x: 151, y: 107, w: 34, h: 34, soundCategory: "dpad" },
  // ...
]
```

#### 3. 音量調整とON/OFF

`GainNode` を使用して音量をコントロール：

```js
// sound-manager.js
setVolume(value) {
  this.volume = Math.max(0, Math.min(1, value));
  if (this.gainNode) {
    this.gainNode.gain.value = this.volume;
  }
}
```

設定は localStorage に保存され、次回起動時も維持されます。

```js
// script.js
soundManager.setVolume(parseFloat(localStorage.getItem('soundVolume')) || 0.5);
soundManager.setMuted(localStorage.getItem('soundMuted') === 'true');
```

#### 4. Chrome Autoplay Policy 対応

ブラウザのセキュリティポリシーにより、音声再生には通常ユーザーのインタラクションが必要です。  
このアプリでは以下のタイミングで自動的にサウンドシステムの初期化を試みます：

- ゲームパッド接続時
- ボタン押下検出時
- レバー/スティック入力検出時
- 画面クリック/タッチ時

```js
// script.js
async function initSoundSystemOnce() {
  if (soundManager.initialized) return;
  
  await initSoundSystem();
}

document.addEventListener('click', initSoundSystemOnce, { once: true });
document.addEventListener('touchstart', initSoundSystemOnce, { once: true });
```

これにより、OBS のブラウザソースとして使用する場合でも、  
コントローラーを操作するだけで音が鳴るようになります。

### サウンドファイルの準備

各コントローラーの実機から録音した音声ファイル（MP3形式）を使用しています。  
録音手順や音声編集の詳細は **[../sounds/README.md](../sounds/README.md)** を参照してください。

---

## 設計メモ（後から調整しやすい構成について）

このプロジェクトは **写真・座標が後から変更しやすい設計** を意識しています。

### 変更箇所の一覧表

| 変更したいもの | 編集するファイル | 変更箇所 |
|---|---|---|
| ボタンの位置・サイズ | `config.js` | `buttons[].x`, `y`, `w`, `h` |
| ボタンのラベル表示 | `config.js` | `buttons[].label` |
| コントローラー写真 | `config.js` + `images/` | `image`, `imageWidth`, `imageHeight` |
| 押下時の色・エフェクト | `style.css` | `.btn-overlay.pressed` |
| スティック表示スタイル | `style.css` | `.stick-dot`, `.stick-overlay` |
| デバイス自動判定キーワード | `config.js` | `deviceNamePatterns[]` |
| サウンドファイルのパス | `config.js` | `sounds.{category}.press/release` |
| ボタンとサウンドの紐付け | `config.js` | `buttons[].soundCategory` |
| サウンドの初期音量 | `sound-manager.js` | `this.volume = 0.5` |
| 新しいコントローラー追加 | `config.js` | 新オブジェクトを追加 + `ALL_CONFIGS` に追記 |

### 設計原則

#### 1. 設定の集中管理（config.js）

座標・デバイス名・サウンドパスなど、変更頻度の高い設定は  
すべて `config.js` に集約しています。

```js
// config.js
const DUALSENSE_CONFIG = {
  id: "dualsense",
  name: "DualSense (PS5)",
  deviceNamePatterns: ["DualSense", "PS5 Controller"],
  image: "images/ps5_dualsense.jpg",
  imageWidth: 800,
  imageHeight: 533,
  buttons: [ /* ... */ ],
  sticks: [ /* ... */ ],
  sounds: { /* ... */ }
};
```

#### 2. ロジックとスタイルの分離

- **script.js**: ゲームパッド入力の検出・状態管理
- **style.css**: 見た目・アニメーション・レスポンシブ対応
- **config.js**: データ（座標・パス・パターン）

この分離により、デザインの変更がロジックに影響しないようになっています。

#### 3. オーバーレイの動的生成

ボタンオーバーレイは `buildOverlays()` 関数で  
`config.js` の設定から動的に生成されます。

```js
// script.js
function buildOverlays(config) {
  elements.overlayLayer.innerHTML = "";

  for (const btn of config.buttons) {
    const el = document.createElement("div");
    el.className = "btn-overlay";
    el.style.left = (btn.x - btn.w / 2) + "px";
    el.style.top = (btn.y - btn.h / 2) + "px";
    el.style.width = btn.w + "px";
    el.style.height = btn.h + "px";
    // ...
    elements.overlayLayer.appendChild(el);
  }
}
```

HTMLに直接ボタン要素を書かないため、  
設定を変更するだけで即座に反映されます。

#### 4. レスポンシブ対応

CSSメディアクエリで画面サイズに応じた表示調整を行い、  
JavaScript の `updateOverlayScale()` 関数で  
オーバーレイ・canvas・デバッグオーバーレイを  
画像の縮小率に合わせてスケール調整します。

```js
// script.js
function updateOverlayScale() {
  const scale = img.offsetWidth / state.currentConfig.imageWidth;
  
  elements.overlayLayer.style.transform = `scale(${scale})`;
  elements.stickCanvas.style.transform = `scale(${scale})`;
  
  const debugOverlay = document.getElementById("debug-overlay");
  if (debugOverlay) {
    debugOverlay.style.transform = `scale(${scale})`;
  }
}
```

これにより、スマホ・タブレット・PCのどの画面サイズでも  
正確な座標でオーバーレイが表示されます。

---

## 関連ドキュメント

- **[README.md](../README.md)** - メインドキュメント（使い方・OBS設定）
- **[CONFIGURATION.md](CONFIGURATION.md)** - カスタマイズガイド（座標計測・新規コントローラー追加）
- **[gamepad-api.md](gamepad-api.md)** - Gamepad API 詳細リファレンス
- **[sounds/README.md](../sounds/README.md)** - サウンドファイル準備ガイド
