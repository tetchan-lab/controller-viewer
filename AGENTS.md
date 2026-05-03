# Controller Viewer プロジェクト - GitHub Copilot エージェント設定

このファイルはcontroller-viewerプロジェクト専用のCopilot指示を定義します。

## 共通規約の参照

**重要**: まず `.github/copilot-instructions.md` を読み取り、ワークスペース全体の共通規約を適用してください。

## プロジェクト概要

ゲームコントローラーの入力を視覚化し、音声フィードバックを提供するWebアプリケーション。
Gamepad API、Web Audio API、タッチ/キーボード入力をサポート。

## ⚠️ 開発ワークフロー（必須）

### 🚨 実装前の必須事項

**新機能の実装やバグ修正を開始する前に、必ず以下の手順を実行してください：**

1. **現在のブランチを確認**
   ```bash
   git branch --show-current
   ```

2. **mainブランチで作業していたら即座に停止**
   - ❌ mainブランチで直接実装することは絶対に禁止
   - ✅ 必ず機能ブランチを作成してから作業

3. **機能ブランチの作成**
   ```bash
   git checkout -b <type>/<branch-name>
   ```
   
   ブランチ命名規則：
   - `feat/機能名` - 新機能追加の場合
   - `fix/バグ内容` - バグ修正の場合
   - `refactor/対象` - リファクタリングの場合
   - `docs/内容` - ドキュメント更新の場合
   
   例：
   ```bash
   git checkout -b feat/xbox-controller-support
   git checkout -b fix/analog-stick-deadzone
   git checkout -b refactor/sound-manager
   ```

4. **実装を開始**

5. **コミット** （Conventional Commits形式で）

6. **プルリクエストを作成してレビュー依頼**

### ワークフロー確認

**あなた（AI）が実装を依頼された場合：**

1. まず現在のブランチを確認
2. mainブランチの場合、ブランチ作成を提案
3. ユーザーの承認後に実装開始
4. **絶対にmainブランチで直接コードを変更しない**

## プロジェクト固有のコーディング規約

### アーキテクチャ

- **モジュール分離**: 機能ごとにファイルを分割
  - `script.js`: メインロジック、ゲームパッド処理
  - `sound-manager.js`: 音声管理
  - `keyboard-input.js`: キーボード入力エミュレーション
  - `touch-input.js`: タッチ入力処理
  - `config.js`: 設定管理

### ゲームパッド処理

- Gamepad APIの接続/切断イベントを適切にハンドリング
- ボタンとアナログスティックの状態を正確に反映
- アニメーションフレーム（requestAnimationFrame）を使用してポーリング
- デッドゾーン処理を実装

### 音声管理

- Web Audio APIを使用
- 音声ファイルはコントローラー種別ごとにフォルダ分割（`sounds/dualsense/`, `sounds/fightingStickMini/`など）
- 音量調整、ミュート機能を実装
- 効率的な音声バッファ管理

### UI/UX

- リアルタイムなビジュアルフィードバック
- レスポンシブデザイン対応
- アクセシビリティに配慮（キーボード操作サポート）
- CSSアニメーションでスムーズな視覚効果

### 設定管理

- `config.js`で集中管理
- ローカルストレージを使用して設定を永続化
- デフォルト値を明確に定義

### エラーハンドリング

- Gamepad API未対応ブラウザへの対応
- 音声ファイル読み込みエラーのハンドリング
- コンソールログで適切なデバッグ情報を出力

### パフォーマンス

- requestAnimationFrameを効率的に使用
- 不要なDOM操作を最小化
- イベントリスナーの適切な登録/解除

## ファイル命名規則

- JavaScriptファイル: ケバブケース（例: `sound-manager.js`, `keyboard-input.js`）
- 設定ファイル: `config.js`
- スタイルファイル: `style.css`
- ドキュメント: 大文字（例: `README.md`, `CONFIGURATION.md`）

## コメント規則

- 複雑なロジックには必ず日本語コメントを追加
- 関数の先頭に目的と引数、戻り値を記述
- Gamepad APIの仕様に関する参考URLを記載

## コミットメッセージ規約

Conventional Commits形式に従ってコミットメッセージを記述してください。

### フォーマット

```
<type>: <subject>

[optional body]

[optional footer]
```

### Type一覧

- **feat**: 新機能の追加
  - 例: `feat: DualSense コントローラーの触覚フィードバック対応`
- **fix**: バグ修正
  - 例: `fix: アナログスティックのデッドゾーン処理を修正`
- **docs**: ドキュメントのみの変更
  - 例: `docs: CONFIGURATION.md にサウンド設定の説明を追加`
- **style**: コードの動作に影響しない変更（フォーマット、セミコロンなど）
  - 例: `style: インデントをタブに統一`
- **refactor**: リファクタリング（機能変更を伴わない）
  - 例: `refactor: sound-manager.js のコード整理`
- **perf**: パフォーマンス改善
  - 例: `perf: requestAnimationFrame の最適化`
- **test**: テストの追加・修正
  - 例: `test: キーボード入力のテストケース追加`
- **chore**: ビルドプロセスや補助ツールの変更
  - 例: `chore: 依存パッケージの更新`

### Subject（件名）のルール

- 50文字以内を目安に簡潔に記述
- 日本語を使用
- 文末にピリオドを付けない
- 命令形で記述（例: 「追加する」ではなく「追加」）

### Body（本文）のルール（任意）

- 変更の理由や背景を説明
- 72文字で改行

### 例

```
feat: Xbox コントローラーのボタンマッピング追加

Xbox Wireless Controllerに対応し、
ボタン配置とアイコンを適切に表示する機能を実装

Closes #123
```

## テスト

- 複数のコントローラー種別でテスト
- 異なるブラウザでの動作確認
- タッチデバイスでの操作確認
