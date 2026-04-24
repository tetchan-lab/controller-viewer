# Controller Viewer 🎮

ゲーム配信・録画で使える「gamepadviewer」風のブラウザ内コントローラー可視化アプリです。  
接続したゲームパッドのボタン押下・スティック操作をリアルタイムで画面に表示します。

**HTML / JavaScript / CSS + PNG のみで動作。外部サーバー不要。**

---

## 📁 ファイル構成

```
controller-viewer/
├── index.html                ← メインページ
├── css/
│   └── style.css             ← スタイル（背景・レイアウト）
├── js/
│   ├── config.js             ← ★ ボタン座標・設定（ここを編集）
│   └── app.js                ← Gamepad API ロジック・描画
├── images/
│   ├── gamepad.png           ← DualSense 用サンプル画像
│   ├── fightingstick.png     ← ファイティングスティック用サンプル画像
│   └── generate_images.py    ← サンプル画像を生成する Python スクリプト
└── README.md                 ← このファイル
```

---

## 🚀 セットアップ手順

### 1. リポジトリをダウンロード

```bash
git clone https://github.com/<あなたのアカウント>/controller-viewer.git
# または右上の「Code → Download ZIP」でダウンロードして解凍
```

### 2. ブラウザで開く

```
controller-viewer/index.html
```

をダブルクリックするか、ブラウザのアドレスバーに絶対パスを入力して開きます。

### 3. コントローラーを接続

USB または Bluetooth でゲームパッドを接続し、**何かボタンを押す**と自動認識されます  
（ブラウザの仕様上、最初にボタンを押すまで検出されない場合があります）。

### 4. コントローラー種別を選択

画面上部のドロップダウンから使用するコントローラーを選択します。

---

## 📺 OBS（配信ソフト）へのブラウザソース追加手順

1. OBS Studio を起動し、ソースを追加 → **「ブラウザ」** を選択
2. **URL** に `index.html` の絶対パスを入力します：
   ```
   file:///C:/path/to/controller-viewer/index.html
   ```
   > Windows の場合は `C:\` を `C:/` に読み替えてください。  
   > Mac/Linux の場合: `file:///Users/yourname/controller-viewer/index.html`
3. **幅 / 高さ** を画像サイズに合わせて設定（デフォルト: 800 × 400）
4. **「カスタム CSS」** に以下を追加すると背景が完全透明になります：
   ```css
   body { background: transparent !important; }
   ```
5. 「コントロールバー」（上部の選択欄）を非表示にしたい場合は、URL に
   `?obs=1` を付けてください（CSSで非表示になります）。

> **ヒント**: OBS のブラウザソースは「コントローラーが接続されているPC上」のブラウザとして動作します。
> コントローラーを接続して最初にボタンを押してください。

---

## 🖼️ 実際のコントローラー写真への差し替え

### 画像を用意する

1. コントローラーの写真を撮影、またはスキャンします
2. 画像編集ソフト（GIMP, Photoshop など）で背景を透過（PNG 推奨）
3. 解像度の例：800 × 400 px（必要に応じて変更可）

### 画像を配置する

```
images/gamepad.png          ← DualSense / DS4 用
images/fightingstick.png    ← ファイティングスティック用
```

既存のサンプル PNG を上書き保存するだけで反映されます。

### 画像サイズが変わる場合

`js/config.js` の `imageWidth` / `imageHeight` を更新してください：

```js
dualsense: {
  name: "DualSense / DS4",
  image: "images/gamepad.png",
  imageWidth: 1200,   // ← 新しい幅
  imageHeight: 600,   // ← 新しい高さ
  ...
}
```

---

## 🗺️ 座標マッピングの修正方法

ボタン座標は `js/config.js` に集約されています。

### 手順

1. ブラウザの開発者ツール（F12）→ **Elements** タブで `<canvas>` 要素を確認
2. または画像をPhotoshop/GIMPで開き、ボタン中心のピクセル座標を調べる
3. `config.js` の対応ボタンの `x`, `y` を変更する

```js
// 例：× ボタンの位置を (590, 285) → (610, 295) に修正
{ id: "cross", index: 0, x: 610, y: 295, w: 44, h: 44, shape: "circle", color: "rgba(100,180,255,0.75)" },
```

| フィールド | 説明 |
|-----------|------|
| `x`, `y`  | 画像上のボタン中心座標（px） |
| `w`, `h`  | 強調表示エリアの幅・高さ（px） |
| `shape`   | `"circle"` または `"rect"`（角丸矩形） |
| `color`   | 押下時のオーバーレイ色 `rgba(R,G,B,透明度)` |
| `analog`  | `true` にするとアナログ入力量で透明度が変わる |
| `index`   | Gamepad API の `buttons[index]` 番号 |

### Gamepad API のボタン番号（標準マッピング）

| index | DualSense / DS4 | Xbox 互換 |
|-------|----------------|-----------|
| 0     | × (Cross)      | A         |
| 1     | ○ (Circle)     | B         |
| 2     | □ (Square)     | X         |
| 3     | △ (Triangle)   | Y         |
| 4     | L1             | LB        |
| 5     | R1             | RB        |
| 6     | L2 (アナログ)  | LT        |
| 7     | R2 (アナログ)  | RT        |
| 8     | Create / Share | View/Back |
| 9     | Options        | Menu/Start|
| 10    | L3 (左スティック押込) | LS   |
| 11    | R3 (右スティック押込) | RS   |
| 12    | 十字キー ↑      | D-Up      |
| 13    | 十字キー ↓      | D-Down    |
| 14    | 十字キー ←      | D-Left    |
| 15    | 十字キー →      | D-Right   |
| 16    | PS ボタン      | Xbox/Guide|
| 17    | タッチパッド押込| —         |

### スティック（Axes）の番号

| axes[n] | DualSense / DS4 |
|---------|----------------|
| 0       | 左スティック 横 |
| 1       | 左スティック 縦 |
| 2       | 右スティック 横 |
| 3       | 右スティック 縦 |

---

## ✨ カスタマイズ例

### 新しいコントローラー設定を追加する

`js/config.js` の `CONTROLLER_CONFIGS` に新しいキーを追加するだけです：

```js
const CONTROLLER_CONFIGS = {
  dualsense: { ... },
  fightingstick: { ... },

  // ▼ 新しいコントローラーを追加
  mypad: {
    name: "マイパッド",
    image: "images/mypad.png",
    imageWidth: 900,
    imageHeight: 450,
    buttons: [
      { id: "btn_a", index: 0, x: 650, y: 280, w: 44, h: 44, shape: "circle", color: "rgba(100,220,100,0.75)" },
      // 必要なボタンを追加...
    ],
    sticks: [
      { id: "left", axisX: 0, axisY: 1, cx: 200, cy: 250, radius: 30, dotRadius: 10, color: "rgba(255,255,255,0.90)" },
    ],
  },
};
```

### ボタン押下の色を変える

```js
// 例: × ボタンを黄色に
{ id: "cross", index: 0, x: 590, y: 285, w: 44, h: 44, shape: "circle", color: "rgba(255,255,50,0.80)" },
```

### デッドゾーンを調整する（スティックが動きっぱなしの場合）

`js/config.js` の `APP_CONFIG.deadzone` を調整してください：

```js
const APP_CONFIG = {
  deadzone: 0.12,  // 0.0 〜 0.3 の範囲で調整（大きいほど鈍感）
  ...
};
```

### 背景を完全透明にして OBS に重ねる

`css/style.css` の先頭に追加：

```css
body { background: transparent !important; }
#control-bar, #footer { display: none !important; }
```

または OBS ブラウザソースの「カスタム CSS」に上記を追加してください。

---

## 🛠️ サンプル画像の再生成

Python 3 と Pillow がインストールされた環境で：

```bash
pip install Pillow
cd images
python3 generate_images.py
```

---

## 📋 動作確認済み環境

- Google Chrome 124+
- Microsoft Edge 124+
- Firefox 125+（Gamepad API は接続後ボタン入力が必要）

> **Safari / iOS は Gamepad API への対応が限定的なため非推奨**

---

## ライセンス

MIT License
