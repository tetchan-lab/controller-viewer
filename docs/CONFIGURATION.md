# コントローラー設定・カスタマイズガイド

このドキュメントでは、新しいコントローラー画像の追加、座標の計測・調整、カスタムコントローラーの設定方法について説明します。

---

## 目次

- [コントローラー写真の差し替え方](#コントローラー写真の差し替え方)
- [ボタン座標の計測と再計算プロセス](#ボタン座標の計測と再計算プロセス)
- [現在の座標マッピング](#現在の座標マッピング)
- [ボタン番号一覧](#ボタン番号一覧)
- [新しいコントローラーを追加する](#新しいコントローラーを追加する)

---

## コントローラー写真の差し替え方

1. **実際のコントローラー写真を撮影**（推奨: 正面・真上から均一照明で撮影）
2. `images/` フォルダに配置（例: `images/mycontroller.jpg`）
3. `config.js` の `image` / `imageWidth` / `imageHeight` プロパティを更新:

   ```js
   // config.js
   const DUALSENSE_CONFIG = {
     image: "images/mycontroller.jpg",  // ← 実際のファイル名に変更
     imageWidth:  800,                  // ← 表示幅 (px)
     imageHeight: 533,                  // ← 表示高さ (px) ※アスペクト比を維持
     // ...
   };
   ```

> **アスペクト比の合わせ方:** `imageHeight = round(imageWidth * 元画像高さ / 元画像幅)`  
> 例: 元画像 1500×1000 → `round(800 * 1000 / 1500) = 533`

---

## ボタン座標の計測と再計算プロセス

座標は `images/` フォルダ内の**実際の写真から直接計測**した値です。
以下のプロセスで再計算できます。

### 座標系

```
(0, 0) ─────────────────────────── x
  │
  │   コントローラー画像
  │   imageWidth × imageHeight (px)
  │
  y
```

- `x`, `y` はオーバーレイ要素の**中心座標**（px）
- `w`, `h` はオーバーレイ要素の**幅・高さ**（px）

### 再計算手順

1. **元画像を表示サイズにリサイズ**  
   スケール係数 = `imageWidth ÷ 元画像幅`  
   例: DualSense → `800 ÷ 1500 = 0.533`

2. **グリッドオーバーレイ付き画像を生成して計測**  
   Python（Pillow）などでグリッド線を描画し、各ボタン中心の *(x, y)* を読み取る。

   ```python
   from PIL import Image, ImageDraw

   img = Image.open("images/ps5_dualsense.jpg").resize((800, 533))
   draw = ImageDraw.Draw(img)
   # 50px ごとにグリッド線を描画して座標を読み取る
   for x in range(0, 800, 50):
       draw.line([(x, 0), (x, 533)], fill=(255, 0, 0, 80))
   for y in range(0, 533, 50):
       draw.line([(0, y), (800, y)], fill=(255, 0, 0, 80))
   img.save("grid_dualsense.png")
   ```

3. **config.js を更新**  
   読み取った中心座標を `x`, `y` に、ボタン直径を `w`, `h` に設定する。

4. **デバッグモードで確認**  
   `?debug` パラメーターを追加してブラウザで開き、座標が正しいか確認する。
   ```
   http://localhost:8080/?debug
   ```

---

## 現在の座標マッピング

### DualSense（表示サイズ: 800×533、元画像: 1500×1000）

| ボタン | index | x | y | w | h | shape |
|---|---|---|---|---|---|---|
| × | 0 | 647 | 212 | 50 | 50 | circle |
| ○ | 1 | 706 | 153 | 50 | 50 | circle |
| □ | 2 | 589 | 154 | 50 | 50 | circle |
| △ | 3 | 648 | 95 | 50 | 50 | circle |
| L1 | 4 | 152 | 12 | 106 | 20 | rect |
| R1 | 5 | 648 | 12 | 106 | 20 | rect |
| L2 | 6 | 50 | 16 | 82 | 24 | rect |
| R2 | 7 | 750 | 16 | 82 | 24 | rect |
| Create | 8 | 214 | 67 | 20 | 36 | circle |
| Options | 9 | 585 | 67 | 20 | 36 | circle |
| L3 | 10 | 272 | 262 | 42 | 42 | circle |
| R3 | 11 | 527 | 262 | 42 | 42 | circle |
| PS | 16 | 400 | 304 | 34 | 8 | rect |
| タッチパッド | 17 | 400 | 95 | 280 | 168 | rect |
| 十字キー ↑ | 12 | 151 | 107 | 34 | 34 | circle |
| 十字キー ↓ | 13 | 151 | 200 | 34 | 34 | circle |
| 十字キー ← | 14 | 106 | 152 | 34 | 34 | circle |
| 十字キー → | 15 | 198 | 152 | 34 | 34 | circle |
| LS（左スティック） | — | cx=272 | cy=262 | radius=48 | — |
| RS（右スティック） | — | cx=527 | cy=262 | radius=48 | — |

### Fighting Stick Mini（表示サイズ: 800×425、元画像: 1417×752）

| ボタン | index | x | y | w | h | shape |
|---|---|---|---|---|---|---|
| □ | 2 | 417 | 169 | 60 | 32 | circle |
| △ | 3 | 502 | 156 | 60 | 32 | circle |
| R1 | 5 | 589 | 150 | 60 | 32 | circle |
| L1 | 4 | 678 | 150 | 60 | 32 | circle |
| × | 0 | 418 | 210 | 60 | 32 | circle |
| ○ | 1 | 506 | 198 | 60 | 32 | circle |
| R2 | 7 | 596 | 192 | 62 | 32 | circle |
| L2 | 6 | 688 | 191 | 66 | 32 | circle |
| PS | 16 | 404 | 120 | 30 | 16 | circle |
| Share | 8 | 458 | 120 | 22 | 14 | circle |
| Options | 9 | 506 | 120 | 22 | 14 | circle |
| L3 | 10 | 553 | 121 | 22 | 14 | circle |
| R3 | 11 | 601 | 120 | 22 | 14 | circle |
| Lever（レバー） | — | cx=181 | cy=189 | radius=63 | — |

> **Note:** レバーの十字キー入力（index 12〜15）は `sticks` の Lever 定義で処理されます。`config.js` の `sticks[].axisX` / `axisY` で軸割り当てを変更できます。

---

## ボタン番号一覧

### DualSense のボタン番号一覧

| index | ボタン | index | ボタン |
|---|---|---|---|
| 0 | ×（Cross） | 9 | Options |
| 1 | ○（Circle） | 10 | L3（左スティック押し込み） |
| 2 | □（Square） | 11 | R3（右スティック押し込み） |
| 3 | △（Triangle） | 12 | 十字キー ↑ |
| 4 | L1 | 13 | 十字キー ↓ |
| 5 | R1 | 14 | 十字キー ← |
| 6 | L2（アナログ） | 15 | 十字キー → |
| 7 | R2（アナログ） | 16 | PS ボタン |
| 8 | Create | 17 | タッチパッド |

### Fighting Stick Mini のボタン番号一覧

Fighting Stick Mini のファームウェア/接続モードによってインデックスが異なる場合があります。
`config.js` の `buttons[].index` を実機に合わせて調整してください。

| index（標準） | ボタン |
|---|---|
| 0 | ×（弱キック） |
| 1 | ○（中キック） |
| 2 | □（弱パンチ） |
| 3 | △（中パンチ） |
| 4 | L1（強パンチ） |
| 5 | R1（強キック） |
| 6 | L2 |
| 7 | R2 |
| 8 | Share / Select |
| 9 | Options / Start |
| 10 | L3 |
| 11 | R3 |
| 12〜15 | 十字キー（レバー） |
| 16 | PS / HOME |

---

## 新しいコントローラーを追加する

`config.js` に新しい設定オブジェクトを追加し、`ALL_CONFIGS` 配列に追加するだけです。

### 1. config.js に新しい設定を追加

```js
// config.js に追記
const MY_CONTROLLER_CONFIG = {
  id: "myController",
  name: "My Controller",
  deviceNamePatterns: ["My Controller Name"],  // デバイス自動判定用キーワード
  image: "images/my-controller.jpg",
  imageWidth: 800,
  imageHeight: 450,   // 元画像に合わせてアスペクト比を維持して計算
  buttons: [
    { index: 0, label: "A", x: 300, y: 200, w: 40, h: 40, shape: "circle" },
    { index: 1, label: "B", x: 350, y: 200, w: 40, h: 40, shape: "circle" },
    // ... 他のボタンを追加
  ],
  sticks: [
    { id: "LS", label: "LS", axisX: 0, axisY: 1, cx: 200, cy: 250, radius: 45 },
    { id: "RS", label: "RS", axisX: 2, axisY: 3, cx: 400, cy: 250, radius: 45 },
  ],
  sounds: {
    // サウンドファイルのパス（オプション）
    button: {
      press: "sounds/mycontroller/btn-press.mp3",
      release: "sounds/mycontroller/btn-release.mp3"
    },
    // ... 他のサウンドカテゴリ
  }
};

// 配列に追加
const ALL_CONFIGS = [
  DUALSENSE_CONFIG,
  FIGHTING_STICK_MINI_CONFIG,
  MY_CONTROLLER_CONFIG  // ← 追加
];
```

### 2. index.html に切り替えボタンを追加（オプション）

手動切り替えボタンを追加する場合：

```html
<div id="controller-select">
  <button class="ctrl-btn" id="btn-dualsense">DualSense</button>
  <button class="ctrl-btn" id="btn-fightingStickMini">Fighting Stick Mini</button>
  <button class="ctrl-btn" id="btn-myController">My Controller</button> <!-- 追加 -->
</div>
```

script.js に対応するイベントリスナーを追加：

```js
document.getElementById("btn-myController").addEventListener("click", () => {
  switchController("myController");
});
```

### 3. サウンドファイルを準備（オプション）

サウンド機能を使用する場合は、`sounds/mycontroller/` フォルダに音声ファイルを配置してください。
詳細は [sounds/README.md](../sounds/README.md) を参照してください。

### 4. デバッグモードで確認

`?debug` パラメーターを使って座標が正しいか確認：

```
http://localhost:8080/?controller=myController&debug
```

### その他の便利なクエリパラメーター

- `?keyboard=off` - キーボード/マウス入力を無効化（実ゲームパッドのみ）
- `?device=0` - デバイス0番のみ受け付ける（複数コントローラー使用時）

詳細は **[README.md - クエリパラメーター一覧](../README.md#クエリパラメーター一覧)** を参照してください。

---

## 関連ドキュメント

- **[README.md](../README.md)** - メインドキュメント（使い方・OBS設定）
- **[TECHNICAL.md](TECHNICAL.md)** - 技術仕様（Gamepad API、設計メモ）
- **[sounds/README.md](../sounds/README.md)** - サウンドファイル準備ガイド
