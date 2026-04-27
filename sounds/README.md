# サウンドファイルについて

このディレクトリには、コントローラーのボタン操作時に再生される効果音ファイルを配置します。

## ディレクトリ構造

```
sounds/
├── dualsense/
│   ├── dpad-press.mp3           # 十字キー押下時
│   ├── dpad-release.mp3         # 十字キー離した時
│   ├── btn-press.mp3            # ボタン押下時
│   ├── btn-release.mp3          # ボタン離した時
│   ├── stick-press.mp3          # アナログスティック押下時（L3/R3）
│   ├── stick-release.mp3        # アナログスティック離した時（L3/R3）
│   └── create_options-press.mp3 # Create/Optionsボタン押下時
│
└── fightingStickMini/
    ├── lever-press.mp3          # レバー倒した時
    ├── lever-release.mp3        # レバーニュートラルに戻った時
    ├── btn-press.mp3            # ボタン押下時（×○□△ R1/R2 L1/L2）
    ├── btn-release.mp3          # ボタン離した時（×○□△ R1/R2 L1/L2）
    ├── upbtn-press.mp3          # 上部の小さなボタン押下時（PS/Share/Options/L3/R3）
    └── upbtn-release.mp3        # 上部の小さなボタン離した時（PS/Share/Options/L3/R3）
```

## 音声ファイルの準備

### 推奨仕様
- **フォーマット**: MP3, WAV, OGG（ブラウザ対応形式）
- **サンプルレート**: 44.1kHz または 48kHz
- **ビットレート**: 128kbps 以上（MP3の場合）
- **長さ**: 50〜200ms程度（短いクリック音が望ましい）
- **音量**: 正規化済み（ピークが0dBFS付近）

### 入手方法

#### 1. フリー効果音サイトから入手
- [効果音ラボ](https://soundeffect-lab.info/) - 日本語サイト
- [Freesound](https://freesound.org/) - クリエイティブ・コモンズライセンス
- [Zapsplat](https://www.zapsplat.com/) - 無料アカウント登録で利用可能

検索ワード例: `button click`, `mechanical switch`, `keyboard click`, `arcade stick`, `lever click`

#### 2. 自分で録音（推奨）
実際のコントローラー音を録音することで、最もリアルなサウンドが得られます。  
録音ソフト：[Audacity](https://www.audacityteam.org/)

**録音機材例：**
- オーディオインターフェース（volt276など）+ コンデンサーマイク/ダイナミックマイク
- スマートフォン（iPhone等）の標準録音アプリ
- PCの内蔵マイク

**効率的な録音手順：**

1. **一括録音**（推奨）
   - 1つの録音セッションで全パターンを収録
   - 例：「ボタン押す、離す、押す、離す...」を連続で10回
   - 後で編集時に切り出す方が効率的

2. **Audacityでの編集ワークフロー**
   
   ```
   ① インポート
      File → Open → 録音ファイルを開く
   
   ② ノイズ除去
      - 無音部分を選択 → Effect → Noise Reduction → Get Noise Profile
      - 全体を選択（Ctrl+A） → Effect → Noise Reduction → OK
   
   ③ トリミング
      - 必要な音の部分を選択（ドラッグ）
      - Ctrl+T（選択範囲をトリミング）
      - 前後の余白を0.01秒程度残す
   
   ④ 正規化
      - Effect → Normalize → Normalize peak amplitude to -1.0 dB
   
   ⑤ 書き出し
      - File → Export → Export Audio...
      - Format: MP3 Files
      - Quality: 128 kbps (Standard)以上
      - ファイル名を指定して保存
   ```

3. **複数ファイルの一括処理**（時短テク）
   - 各音をラベルで区切る：Analyze → Label Sounds
   - または手動で：Edit → Labels → Add Label at Selection (Ctrl+B)
   - File → Export → Export Multiple... でラベルごとに分割エクスポート

**録音のコツ：**
- マイクとコントローラーの距離：10〜20cm程度
- 周囲の雑音を最小限に（エアコン・PCファンを停止）
- 複数回録音して良いテイクを選ぶ
- 「押す音」と「離す音」は微妙に違うので、両方しっかり録る

#### 3. サンプル音声（開発用）
開発・テスト用に無音ファイル（silence.mp3）を配置することもできます：
```bash
# FFmpegで50msの無音ファイルを生成（開発用）
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 0.05 -q:a 9 silence.mp3
```

## 実装の詳細

音声ファイルは以下の流れで再生されます：

1. **初期化時** (`initSoundSystem()`)
   - すべてのサウンドファイルを非同期で読み込み
   - Web Audio APIでデコードして`AudioBuffer`として保持

2. **ボタン操作時** (`tick()`)
   - 前回フレームとの状態比較で押下/離したイベントを検知
   - 該当するサウンドカテゴリ（dpad, buttons, lever）を特定
   - `soundManager.play()` で再生

3. **音量制御**
   - モーダルウィンドウのスライダーで0〜100%の音量調整
   - localStorageに設定を永続化

## トラブルシューティング

### 音が鳴らない場合

1. **ファイル名を確認**
   - 上記のディレクトリ構造と完全に一致しているか
   - 大文字小文字を区別（例: `Btn-Press.mp3` ではなく `btn-press.mp3`）

2. **ブラウザの開発者ツールでエラーを確認**
   - F12キーで開発者ツールを開く
   - Consoleタブで「Failed to load sound」などのエラーメッセージを確認

3. **ファイル形式を確認**
   - ブラウザが対応している形式か（MP3, WAV, OGGなど）
   - ファイルが破損していないか

4. **ブラウザのautoplay policyを確認**
   - 一部のブラウザではユーザーインタラクション前に音声を再生できない
   - ページ読み込み後、一度クリックしてからゲームパッドを操作してみる

### ファイルが見つからない（404エラー）

- 相対パスが正しいか確認: `sounds/dualsense/btn-press.mp3`
- GitHub Pagesの場合、ファイルがリポジトリにコミット＆プッシュされているか確認

## ライセンスと著作権

使用する効果音のライセンスを必ず確認してください。
- 商用利用の可否
- クレジット表記の要否
- 再配布の可否

クリエイティブ・コモンズライセンスの場合は、README.mdやウェブサイトにクレジットを記載することを推奨します。
