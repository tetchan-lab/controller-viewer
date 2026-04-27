# Controller Viewer

**🌐 Live Demo:** https://tetchan-lab.github.io/controller-viewer/

配信・録画向けのゲームコントローラー入力可視化Webアプリです。
**DualSense（PlayStation 5）** と **Fighting Stick Mini（HORI アーケードスティック）** を主な対象とし、ボタンやレバーを押すとリアルタイムで色が変わります。  
2026/04/28：**入力サウンド機能の追加（実機からサウンド収録）**

OBS などのブラウザソース（Browser Source）として読み込むだけで使えます。

---

## 目次

- [スクリーンショット](#スクリーンショット)
- [機能](#機能)
- [対応デバイス](#対応デバイス)
- [ファイル構成](#ファイル構成)
- [セットアップ](#セットアップ)
- [OBS での使い方](#obs-での使い方)
- [サウンドシステム](#サウンドシステム)
- [コントローラー写真の差し替え方](#コントローラー写真の差し替え方)
- [ボタン座標の計測と再計算プロセス](#ボタン座標の計測と再計算プロセス)
- [新しいコントローラーを追加する](#新しいコントローラーを追加する)
- [Gamepad API によるデバイス認識の仕組み](#gamepad-api-によるデバイス認識の仕組み)
- [設計メモ（後から調整しやすい構成について）](#設計メモ後から調整しやすい構成について)
- [ライセンス](#ライセンス)

---

## スクリーンショット

### DualSense (PS5)
![DualSense Demo](images/demo_dualsense.png)

### Fighting Stick Mini (HORI)
![Fighting Stick Mini Demo](images/demo_fighting_stick_mini.png)

---

## 機能

- **Gamepad API** によるリアルタイム入力検出（USB / Bluetooth 対応）
- コントローラー写真上へのボタン/スティック オーバーレイ表示
- ボタン押下時の色反転・グローエフェクト
- アナログスティックの可動範囲と現在位置の可視化
- **デバイス名による自動マッピング切り替え**（接続するだけで自動判定）
- 手動でのコントローラー切り替えボタン
- **リアルタイムサウンド再生**（実際のコントローラーの生音を収録）
  - ボタン・レバー・スティック操作時に対応する音を再生
  - 音量調整とON/OFF切り替え
  - 設定の永続化（localStorage）
  - OBSでも使える自動初期化（ゲームパッド入力で自動的にサウンド有効化）

---

## 対応デバイス

| デバイス | 自動判定キーワード |
|---|---|
| DualSense (PS5) | `DualSense`, `PS5 Controller`, `PlayStation 5` |
| Fighting Stick Mini (HORI) | `Fighting Stick`, `HORI`, `Arcade Stick`, `FS-Mini`, `XBOX 360 Controller` |

> **Note:** Fighting Stick Mini は Xbox 360 互換モードで動作するため、Gamepad API の `id` は  
> `"XBOX 360 Controller For Windows (STANDARD GAMEPAD)"` と報告されます。  
> そのため `"XBOX 360 Controller"` をパターンに追加することで自動判定が機能します。

上記以外のデバイスでも接続は可能です。手動でマッピングを選択してください。

---

## ファイル構成

```
controller-viewer/
├── index.html                   # ページ本体
├── style.css                    # スタイルシート（ボタンオーバーレイ・押下エフェクト）
├── script.js                    # Gamepad API ポーリング・描画ロジック
├── config.js                    # ★ ボタン座標・デバイス名パターンの設定ファイル
├── sound-manager.js             # Web Audio API によるサウンド管理
├── images/
│   ├── ps5_dualsense.jpg        # DualSense 実写真 (1500×1000 px)
│   └── fighting_stick_mini.jpg  # Fighting Stick Mini 実写真 (1417×752 px)
└── sounds/
    ├── README.md                # サウンドファイル準備ガイド
    ├── dualsense/               # DualSense 用サウンドファイル（MP3）
    │   ├── dpad_press.mp3
    │   ├── dpad_release.mp3
    │   ├── buttons_press.mp3
    │   ├── buttons_release.mp3
    │   ├── stick_press.mp3
    │   ├── stick_release.mp3
    │   └── create_options_press.mp3
    └── fightingStickMini/       # Fighting Stick Mini 用サウンドファイル（MP3）
        ├── lever_press.mp3
        ├── lever_release.mp3
        ├── buttons_press.mp3
        ├── buttons_release.mp3
        ├── upbtn_press.mp3
        └── upbtn_release.mp3
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

### ローカル環境で使用する場合

1. OBS のソース一覧で **「ブラウザ」** を追加
2. URL に `http://localhost:8080` を入力
3. 幅・高さを設定
   - DualSense: **幅 800 × 高さ 565**
   - Fighting Stick Mini: **幅 800 × 高さ 457**
4. OBS のフィルタで **「クロマキー」** を追加し、緑色（`#1c3005`）を指定して背景を透過

> **Note:** コントローラー画像はクロマキー合成用に緑背景のjpg形式を使用しています。
> OBSのクロマキーフィルタで背景を透過させてください。

### GitHub Pages で使用する場合（推奨）

GitHub Pages で公開されているため、ローカルサーバーなしで直接使用できます。

#### 特定のコントローラーを指定して使う（OBS用）

以下のURLをOBSのブラウザソースにコピー＆ペーストしてください。
クエリパラメーター `?controller=` により、指定したコントローラーのみが表示され、切り替えボタンやヒントメッセージが非表示になります。

**DualSense (PS5) 用：**
```
https://tetchan-lab.github.io/controller-viewer/?controller=dualsense
```

**Fighting Stick Mini 用：**
```
https://tetchan-lab.github.io/controller-viewer/?controller=fightingStickMini
```

**設定手順：**
1. OBS のソース一覧で **「ブラウザ」** を追加
2. 上記のいずれかのURLを「URL」欄にコピー＆ペースト
3. 幅・高さを設定
   - DualSense: **幅 800 × 高さ 565**
   - Fighting Stick Mini: **幅 800 × 高さ 457**
4. OBS のフィルタで **「クロマキー」** を追加し、緑色を指定して背景を透過

> **Note:** クエリパラメーターを使用すると、コントローラー切り替えボタンとステータス表示が非表示になり、
> 指定したコントローラーのみが常に表示されます。OBS での使用に最適化された表示になります。

#### デバッグモード（座標確認用）

ボタンやスティックの座標を確認したい場合は、`?debug` パラメーターを追加してください。
各オーバーレイ要素の中心に赤い十字線が表示され、座標調整に役立ちます。

```
https://tetchan-lab.github.io/controller-viewer/?debug
```

コントローラー指定とデバッグモードを併用する場合：
```
https://tetchan-lab.github.io/controller-viewer/?controller=dualsense&debug
```

---

## サウンドシステム

このアプリは **Web Audio API** を使用して、実際のコントローラーから録音した生音をリアルタイムで再生します。

### ■ 機能

- **低レイテンシー再生**：ボタン・レバー・スティック操作に即座に反応
- **カテゴリ別サウンド**：
  - DualSense: 十字キー、ボタン、スティック、Create/Options
  - Fighting Stick Mini: レバー、ボタン、上部小ボタン
- **音量調整とON/OFF**：歯車アイコン（⚙️）から設定可能
- **設定の永続化**：localStorage により設定を保存
- **自動初期化**：ゲームパッド接続・入力時に自動的にサウンドシステムを有効化（OBS対応）

### ■ 音量調整

#### 通常の使い方
画面右上の歯車アイコン（⚙️）をクリックして設定モーダルを開き、音量スライダーで調整できます。

- **初期音量**：50%
- **設定の保存**：調整した音量は localStorage に保存され、次回起動時も維持されます

#### OBS での音量調整

OBS で使用する場合は、以下の2つの方法で音量を調整できます：

1. **OBS の音量ミキサーを使う**（推奨）
   - ブラウザソースのプロパティから `OBSで音声を制御する` にチェック
   - `オーディオの詳細プロパティ` を開き、音声モニタリングで `モニターと出力` を選択
   - 他の音源とまとめて管理できるため便利

2. **アプリ内の設定**
   - 一度通常画面（クエリパラメーターなし）で歯車ボタンから音量調整
   - 設定は localStorage に保存されるため、OBS のブラウザソースでも反映されます（※手間がかかるので非推奨）

### 🔧 自動初期化の仕組み

ブラウザのセキュリティポリシー（Autoplay Policy）により、音声再生には通常ユーザーのクリック操作が必要です。
しかし、このアプリでは以下のタイミングで自動的にサウンドシステムの初期化を試みます：

- **ゲームパッド接続時**
- **ボタン押下検出時**
- **レバー/スティック入力検出時**
- **画面クリック/タッチ時**

これにより、OBS のブラウザソースとして使用する場合でも、コントローラーを操作するだけで音が鳴るようになります。

> **Note:** 初回のみブラウザのポリシーにより音声が出ない場合がありますが、
> その場合は一度画面をクリック/タッチするか、コントローラーのボタンを押すことで有効化されます。

### 📁 サウンドファイルについて

各コントローラーの実機から録音した音声ファイル（MP3形式）を使用しています。
録音手順や音声編集の詳細は **[sounds/README.md](sounds/README.md)** を参照してください。

---

## コントローラー写真の差し替え方

1. 実際のコントローラー写真を撮影（推奨: 正面・真上から均一照明で撮影）
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

### 現在の座標マッピング

#### DualSense（表示サイズ: 800×533、元画像: 1500×1000）

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

#### Fighting Stick Mini（表示サイズ: 800×425、元画像: 1417×752）

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

```js
// config.js に追記
const MY_CONTROLLER_CONFIG = {
  id: "myController",
  name: "My Controller",
  deviceNamePatterns: ["My Controller Name"],
  image: "images/my-controller.jpg",
  imageWidth: 800,
  imageHeight: 450,   // 元画像に合わせてアスペクト比を維持して計算
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
→ **[docs/gamepad-api.md](docs/gamepad-api.md)** を参照してください。

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
| サウンドファイルのパス | `config.js` | `sounds.{category}.press/release` |
| ボタンとサウンドの紐付け | `config.js` | `buttons[].soundCategory` |
| サウンドの初期音量 | `sound-manager.js` | `this.volume = 0.5` |
| 新しいコントローラー追加 | `config.js` | 新オブジェクトを追加 + `ALL_CONFIGS` に追記 |

---

## ライセンス

MIT License — 詳細は [LICENSE](LICENSE) を参照してください。
