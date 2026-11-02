import {weekDates} from './domain.js';
export const BODY_PARTS={legs:'脚',hips:'お尻',chest:'胸',back:'背中',core:'体幹',cardio:'全身・有酸素'};
export const CHANGE_REASONS={external:'外的制約',personal:'自分都合'};
export const STATUS_FACTOR={complete:1,partial:0.5,missed:0};
// Points are product bookkeeping units, not physiological load or a medical target.
export const EVIDENCE={activity:{title:'厚生労働省「身体活動・運動ガイド2023」',url:'https://www.mhlw.go.jp/content/001195869.pdf',summary:'体調や体力に合わせ、無理のない量から取り組む。筋トレは週2〜3日が推奨されています。',scope:'一般的な運動習慣の参考。種目の配点・部位順位・以下の量はアプリ独自の目安です。'}};
const exercise=(id,name,tags,detail,minutes,how,feel,mistakes,caution)=>({id,name,tags,detail,minutes,baseScore:100,how,feel,mistakes,caution,evidenceIds:[]});
export const EXERCISES=[
 exercise('squat','スクワット',['legs','hips'],'ゆっくり5回〜10回・約2分',2,'足を肩幅ほどに開き、お尻を後ろへ引いて浅く腰を下ろし、ゆっくり戻します。','太もも・お尻。感じ方には個人差があります。','膝が内側に入る、かかとが浮く、腰を丸める。','痛みのない深さで。バランスが不安なら固定された支えを使います。'),
 exercise('walk','ウォーキング',['cardio'],'無理のないペースで5分',5,'視線を前にし、自然に腕を振って、会話できるペースで歩きます。','全身が温まり、脚を使う感覚。','急に速くする、歩幅を無理に広げる。','安全な平坦な場所を選び、息苦しさや痛みがあれば中止します。'),
 exercise('wall-push','壁腕立て',['chest','core'],'ゆっくり5回〜10回・約2分',2,'動かない壁に両手をつき、体を一直線に保って肘を曲げ、壁を押して戻します。','胸・腕の後ろ側。','腰が反る、肩がすくむ、肘を大きく開きすぎる。','滑らない床で。手首や肩が痛むときは行いません。'),
 exercise('shoulder-blade','肩甲骨寄せ',['back'],'ゆっくり5回・約1分',1,'座るか立ち、肩を下げたまま両肘を後ろへ引き、肩甲骨を軽く寄せて戻します。','肩甲骨の間。','肩をすくめる、腰を大きく反る、勢いをつける。','首や肩に痛みが出ない小さな範囲で行います。'),
 exercise('bridge','ヒップリフト',['hips','core'],'ゆっくり5回〜10回・約2分',2,'仰向けで膝を曲げ、足裏を床につけます。息を吐きながらお尻を少し持ち上げ、ゆっくり下ろします。','お尻・体幹。','腰を反って高く上げる、首で体重を支える。','安定した床で。腰や首が痛む場合は行いません。'),
 exercise('heel-raise','かかと上げ',['legs'],'ゆっくり5回〜10回・約1分',1,'固定された支えに手を添え、両かかとをゆっくり上げて、ゆっくり下ろします。','ふくらはぎ。','反動を使う、足首を外側へ倒す。','転倒を防ぐ支えを使い、足首に痛みがあれば中止します。'),
 exercise('march','その場足踏み',['cardio','legs'],'楽なペースで1分',1,'安定した場所で、足を交互に少し持ち上げて足踏みします。','脚・全身が温まる感覚。','膝を無理に高く上げる、息を止める。','周囲の物を片づけ、ふらつく場合は固定された支えを使います。'),
 exercise('seated-core','座って体幹キープ',['core'],'自然な呼吸で20秒〜30秒・約1分',1,'安定した椅子に座り、足裏を床につけます。背筋を楽に伸ばし、お腹を軽く締めて呼吸します。','お腹まわり。','息を止める、背中を反りすぎる、肩に力が入る。','力みすぎず、腰に違和感が出たら休みます。')
];
EXERCISES.push({...exercise('stretch','やさしいストレッチ',[],'痛みのない範囲で1分',1,'呼吸を止めず、楽な範囲でゆっくり伸ばします。','軽く伸びる感覚。','反動をつける。','痛む場合は中止します。'),activityKind:'light'}, {...exercise('self-care','首肩のセルフケア',[],'楽な姿勢で1分',1,'肩の力を抜いてゆっくり動かします。','首肩がゆるむ感覚。','強く押す。','痛む場合は中止します。'),activityKind:'care'});
export function resolveExercise(item){return EXERCISES.find(e=>e.id===item?.exerciseId)||EXERCISES.find(e=>e.name===(item?.menuName||item?.name));}
export function menuFromExercise(id,menuId=id){const e=EXERCISES.find(e=>e.id===id);if(!e)throw new Error('種目が見つかりません');return {activityKind:e.activityKind||(e.tags.includes('cardio')?'light':'normal'),id:menuId,exerciseId:e.id,name:e.name,detail:e.detail,tags:[...e.tags],baseScore:e.baseScore};}
export function score(row){return (STATUS_FACTOR[row.status]??0)*(Number.isFinite(row.baseScore)&&row.baseScore>=0?row.baseScore:100);}
export function recordSnapshot(menu,status,planned=true){const e=resolveExercise(menu);return {activityKind:menu.activityKind||e?.activityKind||(e?.tags.includes('cardio')?'light':'normal'),menuId:menu.id,menuName:menu.name,detail:menu.detail||'',exerciseId:e?.id||'',tags:[...(menu.tags||e?.tags||[])],baseScore:menu.baseScore??e?.baseScore??100,status,planned,scoreVersion:1};}
export function todayMenus(profile,daily,logs,date){const planned=profile.menus.map(m=>daily.menuOverrides?.[m.id]||m);const ids=new Set(planned.map(m=>m.id));return planned.concat(logs.filter(l=>l.profileId===profile.id&&l.date===date&&!ids.has(l.menuId)).map(l=>({id:l.menuId,name:l.menuName,detail:l.detail||'',exerciseId:l.exerciseId||'',tags:l.tags||resolveExercise(l)?.tags||[],baseScore:l.baseScore??100,extra:l.planned===false})));}
export function weeklyLoad(logs,profile,date){const dates=weekDates(date).filter(d=>d<=date);const totals=Object.fromEntries(Object.keys(BODY_PARTS).map(k=>[k,0]));let total=0;for(const row of logs){if(row.profileId!==profile.id||!dates.includes(row.date))continue;const value=score(row);total+=value;const tags=row.tags??resolveExercise(row)?.tags??resolveExercise(profile.menus.find(m=>m.id===row.menuId))?.tags??[];const known=[...new Set(tags)].filter(t=>t in totals);for(const tag of known)totals[tag]+=value/known.length;}return {total,parts:totals};}
export function recommendations(logs,profile,date,{minutes=5,exclude=[],wellbeing='ふつう'}={}){if(['休みたい','疲れ気味'].includes(wellbeing))return [];const {parts}=weeklyLoad(logs,profile,date);const activeToday=new Set(logs.filter(l=>l.profileId===profile.id&&l.date===date&&score(l)>0).map(l=>resolveExercise(l)?.id));return EXERCISES.filter(e=>e.tags.length&&e.minutes<=minutes&&!exclude.includes(e.id)&&!activeToday.has(e.id)).map(e=>({...e,load:e.tags.reduce((s,t)=>s+parts[t],0)/e.tags.length})).sort((a,b)=>a.load-b.load||a.minutes-b.minutes||a.id.localeCompare(b.id)).slice(0,3);}
export function changeEntry(before,after,reason,date){if(!Object.hasOwn(CHANGE_REASONS,reason))throw new Error('変更理由を選択してください');return {date,reason,before,after,changedAt:new Date().toISOString()};}
