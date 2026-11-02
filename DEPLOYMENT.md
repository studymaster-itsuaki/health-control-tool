# GitHub Pagesでの公開

公開URL: https://studymaster-itsuaki.github.io/health-control-tool/

リポジトリ: https://github.com/studymaster-itsuaki/health-control-tool

2026-10-31: GitHub上の28件のテスト、ビルド、Pagesデプロイ成功。公開HTML・JS・CSS・manifest・サービスワーカー・アイコンの内容が検証済みビルドと一致することを確認しました。公開ページのログイン画面表示も確認済みです。本人アカウントでの公開先ログイン操作は本人にて実施します。

リポジトリ直下がViteプロジェクトです。GitHubのSettings → Pages → Build and deployment → Sourceは **GitHub Actions** を選択します。
mainへ反映すると28件の自動テストと本番ビルドを実行し、成功したdistだけをGitHub Pagesへ公開します。手動の再公開はActions → Test and deploy GitHub Pages → Run workflowから実行できます。

`.env.production`には公開用Firebase Web SDK設定4項目だけを保存します。この設定はブラウザへ配布される公開情報です。管理用サービスアカウント鍵や認証トークンを追加しないでください。`.env.local`、端末データ、検証スクリーンショット、ログはGitの対象外です。
Firebaseデータへのアクセスは既存Authenticationとユーザー本人のUID限定Firestoreルールで保護します。公開ワークフローはFirestoreルールや既存データを変更しません。

## Firebase Authentication

Firebaseコンソールでhealth-control-tool → Authentication → Settings → Authorized domainsを開き、公開サイトのホスト名を追加します。`https://`やリポジトリ名のパスは入力しません。既存ドメインは削除しません。

公開後、設定から既存アカウントへログインし、クラウド同期済みの表示を確認します。新しい公開ドメインは端末内保存が別領域になるため、ローカルURLで端末内だけに保存したデータは自動では移りません。Firebaseに保存済みの記録は同じアカウントで取得できます。

## PWA更新

JS/CSSに加えてHTML・アイコン・manifestの内容変更でもサービスワーカーのキャッシュ世代を更新します。以前のアプリを開いている場合、新版の反映にいったん閉じて開き直す操作が必要なことがあります。

2026-11-02更新：選択式設定・実施内容からの自動分類・特別活動のルール評価を追加。自動テストは34件。Firebaseの既存認証・ルール・保存先は変更せず、新フィールドは互換的に追加します。旧文字列や過去記録の削除・一括移行はありません。
