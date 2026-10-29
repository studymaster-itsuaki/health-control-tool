export function syncStatus({signedIn, error, pendingWrites, snapshots}) {
  if (!signedIn) return 'ログインすると同期できます';
  if (error) return `同期エラー (${error})`;
  if (pendingWrites > 0 || snapshots.some(s => s.pending)) return '端末保存済み・同期待ち';
  if (!snapshots.length || snapshots.some(s => !s.ready)) return 'クラウド接続中';
  if (snapshots.some(s => s.cached)) return 'キャッシュ表示・接続確認中';
  return 'クラウド同期済み';
}
