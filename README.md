# Controller Viewer

配信・録画向けのゲームコントローラー入力可視化Webアプリです。
**DualSense（PlayStation 5）** と **Fighting Stick Mini（HORI アーケードスティック）** を主な対象とし、ボタンやレバーを押すとリアルタイムで色が変わります。

OBS などのブラウザソース（Browser Source）として読み込むだけで使えます。

---

## 機能

- **Gamepad API** によるリアルタイム入力検出（USB / Bluetooth 対応）
- コントローラー写真上へのボタン/スティック オーバーレイ表示
- ボタン押下時の色反転・グローエフェクト
- アナログスティックの可動範囲と現在位置の可視化
- **デバイス名による自動マッピング切り替え**（接続するだけで自動判定）
- 手動でのコントローラー切り替えボタン

---

## 対応デバイス

| デバイス | 自動判定キーワード |
|---|---|
| DualSense (PS5) | `DualSense`, `PS5 Controller`, `PlayStation 5` |
| Fighting Stick Mini (HORI) | `Fighting Stick`, `HORI`, `Arcade Stick`, `FS-Mini` |

上記以外のデバイスでも接続は可能です。手動でマッピングを選択してください。

---

## ファイル構成

```
controller-viewer/
├── index.html          # ページ本体
├── style.css           # スタイルシート（ボタンオーバーレイ・押下エフェクト）
├── script.js           # Gamepad API ポーリング・描画ロジック
├── config.js           # ★ ボタン座標・デバイス名パターンの設定ファイル
└── images/
    ├── dualsense.svg   # DualSense のプレースホルダー画像（写真に差し替え推奨）
    └── fightingstick.svg # Fighting Stick Mini のプレースホルダー画像（同上）
```

---

## セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/tetchan-lab/controller-viewer.git
cd controller-viewer
```

### 2. ブラウザで開く（ローカル）

`index.html` をブラウザで直接開くか、ローカルサーバーを立ち上げます。

```bash
# Python を使った簡易サーバー（任意）
python3 -m http.server 8080
# ブラウザで http://localhost:8080 を開く
```

> **Note:** `file://` プロトコルでは Gamepad API が使えないブラウザがあります。ローカルサーバーの使用を推奨します。

### 3. コントローラーを接続

USB または Bluetooth でコントローラーを接続後、ブラウザ上で何かボタンを押してください（ブラウザのセキュリティポリシーにより、ボタン入力後に Gamepad API が有効化されます）。

自動的にデバイス名を検出し、対応するマッピングに切り替わります。

---

## OBS での使い方

1. OBS のソース一覧で **「ブラウザ」** を追加
2. URL に `http://localhost:8080` または GitHub Pages の URL を入力
3. 幅・高さをコントローラー画像のサイズに合わせる（例: 800×450）
4. 「コントローラー背景を透過させたい場合」は以下を CSS カスタムに追記:
   ```css
   body { background: transparent !important; }
   ```

---

## コントローラー写真の差し替え方

1. 実際のコントローラー写真を撮影（推奨: 正面・真上から均一照明で撮影）
2. `images/` フォルダに配置（例: `images/dualsense.png`）
3. `config.js` の `image` プロパティを更新:

   ```js
   // config.js
   const DUALSENSE_CONFIG = {
     image: "images/dualsense.png",  // ← 実際のファイル名に変更
     imageWidth:  800,               // ← 写真の幅 (px) に変更
     imageHeight: 450,               // ← 写真の高さ (px) に変更
     // ...
   };
   ```

---

## ボタン座標のカスタマイズ

すべての座標は **`config.js`** に集約されています。写真に合わせて `x`, `y`, `w`, `h` を調整するだけです。

```js
// config.js — DualSense ボタン定義の例
buttons: [
  // index: Gamepad API の buttons[] インデックス
  // label: 表示ラベル
  // x, y : オーバーレイ中心座標 (px) ← ここを写真に合わせて調整
  // w, h : オーバーレイのサイズ (px)
  // shape: "circle" または "rect"（省略時は "circle"）

  { index:  0, label: "×",  x: 610, y: 265, w: 38, h: 38 },
  { index:  1, label: "○",  x: 650, y: 225, w: 38, h: 38 },
  { index:  2, label: "□",  x: 570, y: 225, w: 38, h: 38 },
  { index:  3, label: "△",  x: 610, y: 185, w: 38, h: 38 },
  // ...
],
```

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
| 12〜15 | 十字キー（レバー） |
| 16 | PS / HOME |

---

## 新しいコントローラーを追加する

`config.js` に新しい設定オブジェクトを追加し、`ALL_CONFIGS` 配列に追加するだけです。

```js
// config.js に追記
const MY_CONTROLLER_CONFIG = {
  id: "myController",
  name: "My Controller",
  deviceNamePatterns: ["My Controller Name"],
  image: "images/my-controller.png",
  imageWidth: 800,
  imageHeight: 450,
  buttons: [
    { index: 0, label: "A", x: 300, y: 200, w: 40, h: 40 },
    // ...
  ],
  sticks: [
    { id: "LS", label: "LS", axisX: 0, axisY: 1, cx: 200, cy: 250, radius: 45 },
  ],
};

// 配列に追加
const ALL_CONFIGS = [DUALSENSE_CONFIG, FIGHTING_STICK_MINI_CONFIG, MY_CONTROLLER_CONFIG];
```

`index.html` に切り替えボタンを追加することもできます:

```html
<button class="ctrl-btn" onclick="switchController('myController')">My Controller</button>
```

---

## 設計メモ（後から調整しやすい構成について）

このプロジェクトは **写真・座標が後から変更しやすい設計** を意識しています。

| 変更したいもの | 編集するファイル | 変更箇所 |
|---|---|---|
| ボタンの位置・サイズ | `config.js` | `buttons[].x`, `y`, `w`, `h` |
| ボタンのラベル表示 | `config.js` | `buttons[].label` |
| コントローラー写真 | `config.js` + `images/` | `image`, `imageWidth`, `imageHeight` |
| 押下時の色・エフェクト | `style.css` | `.btn-overlay.pressed` |
| スティック表示スタイル | `style.css` | `.stick-dot`, `.stick-overlay` |
| デバイス自動判定キーワード | `config.js` | `deviceNamePatterns[]` |
| 新しいコントローラー追加 | `config.js` | 新オブジェクトを追加 + `ALL_CONFIGS` に追記 |

---

## ライセンス

MIT License — 詳細は [LICENSE](LICENSE) を参照してください。
