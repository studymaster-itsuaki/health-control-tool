# GitHub Pagesでの公開

リポジトリ直下がViteプロジェクトです。GitHubのSettings → Pages → Build and deployment → Sourceは **GitHub Actions** を選択します。
mainへ反映すると28件の自動テストと本番ビルドを実行し、成功したdistだけをGitHub Pagesへ公開します。手動の再公開はActions → Test and deploy GitHub Pages → Run workflowから実行できます。

`.env.production`には公開用Firebase Web SDK設定4項目だけを保存します。この設定はブラウザへ配布される公開情報です。管理用サービスアカウント鍵や認証トークンを追加しないでください。`.env.local`、端末データ、検証スクリーンショット、ログはGitの対象外です。
Firebaseデータへのアクセスは既存Authenticationとユーザー本人のUID限定Firestoreルールで保護します。公開ワークフローはFirestoreルールや既存データを変更しません。

## Firebase Authentication

Firebaseコンソールでhealth-control-tool → Authentication → Settings → Authorized domainsを開き、公開サイトのホスト名を追加します。`https://`やリポジトリ名のパスは入力しません。既存ドメインは削除しません。

公開後、設定から既存アカウントへログインし、クラウド同期済みの表示を確認します。新しい公開ドメインは端末内保存が別領域になるため、ローカルURLで端末内だけに保存したデータは自動では移りません。Firebaseに保存済みの記録は同じアカウントで取得できます。

## PWA更新

JS/CSSに加えてHTML・アイコン・manifestの内容変更でもサービスワーカーのキャッシュ世代を更新します。以前のアプリを開いている場合、新版の反映にいったん閉じて開き直す操作が必要なことがあります。
