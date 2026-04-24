# Gamepad API によるデバイス認識 — 詳細ドキュメント

このドキュメントでは、ブラウザ標準の **Gamepad API** を使ってコントローラーを認識する仕組みと、  
各プロパティの意味・実例・注意点を解説します。

---

## 目次

1. [Gamepad API の基本的な仕組み](#1-gamepad-api-の基本的な仕組み)
2. [Gamepad オブジェクトのプロパティ一覧](#2-gamepad-オブジェクトのプロパティ一覧)
3. [デバイスの区別・個別判定に使えるプロパティ](#3-デバイスの区別個別判定に使えるプロパティ)
4. [`id` プロパティについての重要な注意](#4-id-プロパティについての重要な注意)
5. [接続時のプロパティ実例](#5-接続時のプロパティ実例)
6. [コードサンプル](#6-コードサンプル)
7. [このプロジェクトでの活用方法](#7-このプロジェクトでの活用方法)

---

## 1. Gamepad API の基本的な仕組み

Gamepad API はブラウザ標準の JavaScript API で、**USB または Bluetooth 接続されたゲームコントローラーの入力をリアルタイムで取得**できます。

### 接続の検出

コントローラーを接続してブラウザ上でボタンを押すと、`gamepadconnected` イベントが発火します。

```javascript
window.addEventListener("gamepadconnected", (event) => {
  const gp = event.gamepad;  // Gamepad オブジェクト
  console.log("接続されました:", gp.id);
});
```

> **Note:** ブラウザのセキュリティポリシーにより、コントローラーを接続しただけでは API が有効化されません。  
> ページを開いた状態でコントローラーの **何かボタンを押す** と `gamepadconnected` イベントが発火します。

### 切断の検出

```javascript
window.addEventListener("gamepaddisconnected", (event) => {
  console.log("切断されました:", event.gamepad.id);
});
```

### 現在の接続状態を取得

```javascript
// 接続中の全ゲームパッドを取得（インデックス 0〜3 の配列）
const gamepads = navigator.getGamepads();
```

---

## 2. Gamepad オブジェクトのプロパティ一覧

`gamepadconnected` イベントの `event.gamepad` や `navigator.getGamepads()[i]` で取得できる  
`Gamepad` オブジェクトには以下のプロパティがあります。

| プロパティ | 型 | 説明 |
|---|---|---|
| `id` | `string` | デバイスの識別文字列（メーカー名・モデル名・USB VID/PID を含む場合がある） |
| `index` | `number` | ブラウザが割り当てる接続順の番号（0〜3） |
| `connected` | `boolean` | 現在接続中かどうか |
| `mapping` | `string` | ボタン配列のマッピング規格（`"standard"` または `""`） |
| `buttons` | `GamepadButton[]` | ボタンの状態の配列 |
| `axes` | `number[]` | アナログ軸の値の配列（-1.0〜1.0） |
| `timestamp` | `number` | 最後に状態が更新された時刻（`performance.now()` の値） |
| `vibrationActuator` | `GamepadHapticActuator \| null` | バイブレーション制御オブジェクト（対応デバイスのみ） |

### `buttons` の各要素（`GamepadButton`）

各ボタンは以下のプロパティを持ちます。

| プロパティ | 型 | 説明 |
|---|---|---|
| `pressed` | `boolean` | ボタンが押されているか |
| `touched` | `boolean` | ボタンに触れているか（タッチセンサー対応ボタンのみ） |
| `value` | `number` | アナログ値（0.0〜1.0、デジタルボタンは 0 または 1） |

### `axes` の値

各軸は `-1.0`（左/上）〜 `1.0`（右/下）の範囲で、`0.0` がニュートラル位置です。

| インデックス（標準マッピング） | 軸の意味 |
|---|---|
| `axes[0]` | 左スティック 左右（-1 = 左、1 = 右） |
| `axes[1]` | 左スティック 上下（-1 = 上、1 = 下） |
| `axes[2]` | 右スティック 左右 |
| `axes[3]` | 右スティック 上下 |

---

## 3. デバイスの区別・個別判定に使えるプロパティ

### デバイスの「モデル」を区別するには → `id`

`id` プロパティにはメーカー名やモデル名が含まれるため、**異なるモデルのコントローラーを区別する**のに使えます。  
このプロジェクトでは `detectConfig(gp.id)` で部分一致判定を行い、自動マッピングしています。

```javascript
// id の部分一致でモデルを判定する例
function detectDevice(gamepadId) {
  const lower = gamepadId.toLowerCase();
  if (lower.includes("dualsense") || lower.includes("playstation 5")) {
    return "DualSense";
  }
  if (lower.includes("fighting stick") || lower.includes("hori")) {
    return "Fighting Stick Mini";
  }
  return "Unknown";
}
```

### 複数の同型デバイスを区別するには → `index`

`index` はブラウザが接続順に割り当てる **0〜3 の番号**です。  
**同じモデルのコントローラーを複数接続した場合**、`id` は同じ文字列になりますが、`index` は異なります。

```javascript
// index で個別のコントローラーを特定する例
navigator.getGamepads().forEach((gp) => {
  if (!gp) return;
  console.log(`コントローラー ${gp.index}: ${gp.id}`);
});
// 出力例（同じ DualSense を 2 本接続した場合）:
// コントローラー 0: Sony Interactive Entertainment Wireless Controller (XXXX/XXXX)
// コントローラー 1: Sony Interactive Entertainment Wireless Controller (XXXX/XXXX)
```

### まとめ

| 目的 | 使うプロパティ |
|---|---|
| 異なるモデルを区別する | `id`（部分一致で判定） |
| 同じモデルの複数台を区別する | `index`（接続順番号） |
| 現在接続中かを確認する | `connected` |
| 標準ボタン配列かを確認する | `mapping === "standard"` |

---

## 4. `id` プロパティについての重要な注意

> ⚠️ **`id` はデバイス固有の識別子ではありません**

`id` に含まれる情報はブラウザや OS によって異なりますが、一般的に以下の形式です。

```
"<メーカー名> <モデル名> (<USB VID>/<USB PID>)"
```

### 実例

| デバイス | `id` の例（Chrome/Windows） |
|---|---|
| DualSense | `"Sony Interactive Entertainment Wireless Controller (054c/0ce6)"` |
| DualSense（Bluetooth） | `"Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)"` |
| Fighting Stick Mini | `"HORI CO.,LTD. Fighting Stick mini (0f0d/011c)"` |

### `id` で**できること・できないこと**

| できること | できないこと |
|---|---|
| メーカー・モデルの判別 | 同一モデルの個体識別（シリアル番号は取得不可） |
| 大まかなデバイス種別の判定 | Bluetooth と USB 接続の確実な区別（id 文字列が異なる場合がある） |
| 自動マッピング切り替えの判定根拠 | |

### 注意が必要なケース

1. **同じモデルを複数接続した場合** — `id` は同一、`index` で区別する
2. **接続方式（USB / Bluetooth）で `id` 文字列が変わる場合がある** — どちらの形式でも一致するようパターンを工夫する
3. **OS やブラウザのバージョンで `id` の書式が変わることがある** — 正規表現ではなく部分一致（`includes`）で判定するのが安全

---

## 5. 接続時のプロパティ実例

以下は実際に接続した際のプロパティ値の例です（ブラウザ: Chrome / OS: Windows）。

### DualSense（USB 接続）

```
gp.id        = "Sony Interactive Entertainment Wireless Controller (054c/0ce6)"
gp.index     = 0
gp.connected = true
gp.mapping   = "standard"
gp.buttons.length = 18   // 18 個のボタン（index 0〜17）
gp.axes.length    = 4    // 4 軸（左スティック X/Y、右スティック X/Y）
gp.timestamp = 12345.678 // performance.now() の値（ms）

// ボタン（何も押していない状態）:
gp.buttons[0] = { pressed: false, touched: false, value: 0 }  // ×ボタン
gp.buttons[6] = { pressed: false, touched: false, value: 0 }  // L2（アナログ）

// L2 を半押し（約 50%）:
gp.buttons[6] = { pressed: false, touched: true, value: 0.502 }

// L2 をフル押し:
gp.buttons[6] = { pressed: true, touched: true, value: 1.0 }

// 左スティックを右に倒した状態:
gp.axes[0] = 0.875  // -1.0（左）〜 1.0（右）
gp.axes[1] = 0.031  // -1.0（上）〜 1.0（下）
```

### DualSense（Bluetooth 接続）

```
gp.id        = "Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)"
gp.index     = 0
gp.connected = true
gp.mapping   = "standard"
gp.buttons.length = 18
gp.axes.length    = 4
```

> **Note:** USB と Bluetooth で `id` の書式が異なります。このプロジェクトの `detectConfig()` では  
> `"DualSense"`, `"PlayStation 5"`, `"Wireless Controller"` などの複数パターンで対応しています。

### Fighting Stick Mini（USB 接続）

```
gp.id        = "HORI CO.,LTD. Fighting Stick mini (0f0d/011c)"
gp.index     = 0
gp.connected = true
gp.mapping   = ""           // 非標準マッピング（"standard" でない場合がある）
gp.buttons.length = 13      // デバイスによって異なる
gp.axes.length    = 2       // レバーがアナログ軸にマップされる場合は 2 軸

// レバーを右に倒した状態（アナログマッピングの場合）:
gp.axes[0] = 1.0   // X 軸（右）
gp.axes[1] = 0.0   // Y 軸（ニュートラル）

// レバーが d-pad（十字キー）にマップされる場合:
gp.buttons[15] = { pressed: true, touched: false, value: 1 }  // →
```

---

## 6. コードサンプル

### 6-1. 接続中の全ゲームパッドのプロパティをログ出力する

```javascript
/**
 * 接続中の全ゲームパッドのプロパティをコンソールに出力する。
 * ブラウザの開発者ツール（F12）のコンソールから呼び出せます。
 */
function logAllGamepads() {
  const gamepads = navigator.getGamepads();

  [...gamepads].forEach((gp) => {
    if (!gp) return;

    console.group(`[Gamepad index=${gp.index}]`);
    console.log("id        :", gp.id);
    console.log("index     :", gp.index);
    console.log("connected :", gp.connected);
    console.log("mapping   :", gp.mapping || "(非標準)");
    console.log("timestamp :", gp.timestamp);

    console.group("buttons (" + gp.buttons.length + " 個)");
    gp.buttons.forEach((btn, i) => {
      if (btn.pressed || btn.value > 0) {
        console.log(`  buttons[${i}]: pressed=${btn.pressed}, value=${btn.value.toFixed(3)}`);
      }
    });
    console.groupEnd();

    console.group("axes (" + gp.axes.length + " 本)");
    gp.axes.forEach((val, i) => {
      console.log(`  axes[${i}]: ${val.toFixed(4)}`);
    });
    console.groupEnd();

    console.groupEnd();
  });
}

// 使い方: ブラウザのコンソールで実行
// logAllGamepads();
```

### 6-2. デバイスの種別を `id` で判定する

```javascript
/**
 * Gamepad の id 文字列からデバイス種別を返す。
 * id はメーカー＋モデル名であり固有 ID ではないため、部分一致で判定する。
 *
 * @param {string} gamepadId - gamepad.id
 * @returns {string} デバイス種別の名前
 */
function identifyDevice(gamepadId) {
  const lower = gamepadId.toLowerCase();

  if (lower.includes("dualsense") ||
      lower.includes("ps5 controller") ||
      lower.includes("playstation 5")) {
    return "DualSense (PS5)";
  }

  if (lower.includes("wireless controller") &&
      (lower.includes("054c") || lower.includes("0ce6"))) {
    // DualSense の Bluetooth 接続時の id 形式
    return "DualSense (PS5) — Bluetooth";
  }

  if (lower.includes("fighting stick") ||
      lower.includes("hori") ||
      lower.includes("arcade stick")) {
    return "Fighting Stick (HORI)";
  }

  return "Unknown Device";
}
```

### 6-3. ゲームパッド接続・切断のイベント処理

```javascript
/**
 * gamepadconnected / gamepaddisconnected イベントの基本的な処理例。
 */
window.addEventListener("gamepadconnected", (event) => {
  const gp = event.gamepad;

  console.log("=== コントローラー接続 ===");
  console.log("id       :", gp.id);
  console.log("index    :", gp.index);   // 複数台の個別識別に使う
  console.log("mapping  :", gp.mapping);
  console.log("buttons  :", gp.buttons.length, "個");
  console.log("axes     :", gp.axes.length, "本");

  // id でモデルを判別（id は固有 ID ではなくメーカー+モデル名）
  const deviceType = identifyDevice(gp.id);
  console.log("判定デバイス:", deviceType);
});

window.addEventListener("gamepaddisconnected", (event) => {
  const gp = event.gamepad;
  console.log(`コントローラー切断: index=${gp.index}, id=${gp.id}`);
});
```

### 6-4. ポーリングループでボタン入力を取得する

```javascript
/**
 * requestAnimationFrame を使ったポーリングループ。
 * Chrome では getGamepads() を毎フレーム呼んで最新状態を取得する必要がある。
 */
let activeIndex = null;  // 使用するコントローラーの index

window.addEventListener("gamepadconnected", (e) => {
  activeIndex = e.gamepad.index;
  requestAnimationFrame(poll);
});

function poll() {
  const gp = navigator.getGamepads()[activeIndex];
  if (!gp) return;

  // ボタンの押下チェック
  gp.buttons.forEach((btn, i) => {
    if (btn.pressed) {
      console.log(`ボタン ${i} 押下中 (value=${btn.value.toFixed(3)})`);
    }
  });

  // スティックの軸値チェック（デッドゾーン 0.1 以上を有効とする）
  const DEAD_ZONE = 0.1;
  gp.axes.forEach((val, i) => {
    if (Math.abs(val) > DEAD_ZONE) {
      console.log(`軸 ${i}: ${val.toFixed(4)}`);
    }
  });

  requestAnimationFrame(poll);
}
```

### 6-5. 複数コントローラーの管理

```javascript
/**
 * 同じモデルを複数接続した場合の管理例。
 * id は同一になるため、index で個別識別する。
 */
const connectedGamepads = new Map();  // key: index, value: gamepad 情報

window.addEventListener("gamepadconnected", (e) => {
  const gp = e.gamepad;
  connectedGamepads.set(gp.index, {
    index: gp.index,   // ← 同型複数台の個別識別キー
    id: gp.id,         // ← モデル判別用（固有 ID ではない）
    deviceType: identifyDevice(gp.id),
  });
  console.log(`接続済みコントローラー数: ${connectedGamepads.size}`);
});

window.addEventListener("gamepaddisconnected", (e) => {
  connectedGamepads.delete(e.gamepad.index);
  console.log(`接続済みコントローラー数: ${connectedGamepads.size}`);
});
```

---

## 7. このプロジェクトでの活用方法

このプロジェクトでは上記の仕組みを以下のように活用しています。

### デバイスの自動判定（`config.js` の `detectConfig` 関数）

```javascript
// config.js
function detectConfig(gamepadId) {
  const lower = gamepadId.toLowerCase();
  for (const cfg of ALL_CONFIGS) {
    for (const pattern of cfg.deviceNamePatterns) {
      // id は部分一致で判定（大文字小文字無視）
      if (lower.includes(pattern.toLowerCase())) {
        return cfg;  // マッチした設定オブジェクトを返す
      }
    }
  }
  return null;  // 未対応デバイス
}
```

### 接続中コントローラーの管理（`script.js`）

```javascript
// script.js
window.addEventListener("gamepadconnected", (e) => {
  const gp = e.gamepad;

  // index を保存して、ポーリング時に最新状態を取得するために使う
  state.activeGamepad = gp;

  // id でモデルを判別してマッピングを自動切り替え
  const config = detectConfig(gp.id);
  if (config) applyConfig(config);
});

function tick() {
  // Chrome では getGamepads() で毎フレーム最新の状態を取得する
  const gp = navigator.getGamepads()[state.activeGamepad.index];
  // ...
}
```

---

## 参考リンク

- [MDN: Gamepad API の使用](https://developer.mozilla.org/ja/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)
- [MDN: Gamepad インターフェイス](https://developer.mozilla.org/ja/docs/Web/API/Gamepad)
- [MDN: GamepadButton インターフェイス](https://developer.mozilla.org/ja/docs/Web/API/GamepadButton)
- [W3C: Gamepad 仕様](https://w3c.github.io/gamepad/)
