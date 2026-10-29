import {test} from 'node:test';
import assert from 'node:assert/strict';
import {syncStatus} from './sync-status.js';
const base={signedIn:true,error:null,pendingWrites:0,snapshots:[{ready:true,cached:false,pending:false}]};
test('one cached listener prevents a false synced claim',()=>assert.equal(syncStatus({...base,snapshots:[...base.snapshots,{ready:true,cached:true}]}),'キャッシュ表示・接続確認中'));
test('write permission failure remains visible after other listener succeeds',()=>assert.equal(syncStatus({...base,error:'permission-denied'}),'同期エラー (permission-denied)'));
test('pending write prevents synced claim',()=>assert.equal(syncStatus({...base,pendingWrites:1}),'端末保存済み・同期待ち'));
test('server confirmed subscriptions and settled writes are synced',()=>assert.equal(syncStatus(base),'クラウド同期済み'));
