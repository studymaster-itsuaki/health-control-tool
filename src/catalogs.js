import {resolveExercise} from './exercises.js';
export const PRIORITIES=['見た目を引き締めたい','体脂肪を落としたい','筋力をつけたい','運動習慣を作りたい','体重を減らしたい'];
export const FOOD_GOALS=['毎食、たんぱく質をひとつ','1日1回、たんぱく質をひとつ','毎日、野菜を食べる','食事をゆっくり食べる','間食の量を決める'];
export const OPTIONAL_GOALS=['','ストレッチをする','セルフケアをする','睡眠の時間を整える'];
export const SPECIAL_ACTIVITIES=[['walking','長時間歩行',true],['theme-park','テーマパーク',true],['cleaning','大掃除',false],['outing','買い物・外出',true],['hiking','ハイキング',true],['cycling','自転車',false],['swimming','水泳',false],['sports','スポーツ',false],['moving','引っ越し・重作業',false],['other','その他（評価対象外）',false]].map(([id,label,steps])=>({id,label,steps}));
export const DURATIONS=['15分未満','15〜30分','30〜60分','1〜2時間','2時間以上'];
export function specialActivity(type,duration,steps){
 const activity=SPECIAL_ACTIVITIES.find(a=>a.id===type);
 if(!activity||!DURATIONS.includes(duration))throw new Error('活動と時間を選択してください');
 const value=steps===''||steps==null?null:Number(steps);
 if(value!==null&&(!Number.isInteger(value)||value<0||value>200000))throw new Error('歩数は0〜200000の整数で入力してください');
 return {type,duration,steps:activity.steps?value:null,ruleVersion:1};
}
// Product activity points: time bands 10/25/50/90/150, walking steps 1pt/100 steps.
// Use the larger measure to avoid double counting time and steps. No strength credit.
export function evaluateSpecial(row){
 const a=SPECIAL_ACTIVITIES.find(a=>a.id===row?.type),index=DURATIONS.indexOf(row?.duration);
 if(!a||a.id==='other'||index<0)return {points:0,cardio:0,walking:0,strength:0};
 const steps=a.steps&&Number.isInteger(row.steps)&&row.steps>=0&&row.steps<=200000?row.steps:0;
 const points=Math.max([10,25,50,90,150][index],Math.floor(steps/100));
 return {points,cardio:points,walking:a.steps?points:0,strength:0};
}
export function specialLabel(row){const a=SPECIAL_ACTIVITIES.find(a=>a.id===row?.type);return a?`${a.label}・${row.duration}${a.steps&&row.steps!=null?`・${row.steps}歩`:''}`:'旧カスタム項目（評価対象外）';}
export function activityType(logs,profile){
 const types=logs.filter(l=>['complete','partial'].includes(l.status)).map(l=>{
 const m=profile.menus.find(m=>m.id===l.menuId);
 const e=resolveExercise(l)||resolveExercise(m);
 return l.activityKind||e?.activityKind||m?.activityKind||(l.tags?.includes('cardio')||e?.tags.includes('cardio')||m?.tags?.includes('cardio')||['walk','march'].includes(l.exerciseId)||['ウォーキング','その場足踏み'].includes(l.menuName)?'light':'normal');
 });
 return types.includes('normal')?'normal':types.includes('light')?'light':types.includes('care')?'care':'';
}
