import {activityType,evaluateSpecial,specialLabel,FOOD_GOALS,OPTIONAL_GOALS} from './catalogs.js';
import {localDate,weekDates} from './domain.js';
import {weeklyLoad,score,resolveExercise,EXERCISES,menuFromExercise} from './exercises.js';
export const PLAN_KEYS=['weeklyTarget','menus','foodGoal','optionalGoal'];
export const BURDENS=['余裕','ちょうど','少しきつい','かなりきつい'];
export const CIRCUMSTANCES=['生理予定','忙しい','旅行','外食・飲み会','たくさん歩く予定','イベント','体調不安','その他','特になし'];
export function shiftDate(date,days){const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+days);return localDate(d)}
export function reviewWindow(today){const dates=weekDates(shiftDate(weekDates(today)[0],-1));return {dates,start:dates[0],end:dates[6],recommended:today<=shiftDate(weekDates(today)[0],2),effectiveFrom:shiftDate(weekDates(today)[0],7)}}
export function planValues(p){return Object.fromEntries(PLAN_KEYS.map(k=>[k,p[k]??(k==='optionalGoal'?'':null)]))}
export function effectiveProfile(profile,reviews,date){const approved=reviews.filter(r=>r.profileId===profile.id&&r.status==='approved'&&r.weeklyPlan?.effectiveFrom<=date).sort((a,b)=>a.weeklyPlan.effectiveFrom.localeCompare(b.weeklyPlan.effectiveFrom)||a.approvedAt.localeCompare(b.approvedAt));return {...profile,...(approved.at(-1)?.weeklyPlan.values||{})}}
const achieved=v=>v==='complete'?1:v==='partial'?.5:0;
export function aggregateWeek(state,profile,dates){
 const rows=state.dailyLogs.filter(r=>r.profileId===profile.id&&dates.includes(r.date));
 const logs=state.exerciseLogs.filter(r=>r.profileId===profile.id&&dates.includes(r.date));
 const active=logs.filter(r=>score(r)>0);
 const days=new Set(active.map(r=>r.date));
 const completeDays=new Set(logs.filter(r=>r.status==='complete').map(r=>r.date));
 const load=weeklyLoad(logs,profile,dates[6]);
 // Cardio contributes to activity, but not to the strength bookkeeping total.
 const strength=logs.filter(r=>{const tags=r.tags??resolveExercise(r)?.tags??resolveExercise(profile.menus.find(m=>m.id===r.menuId))?.tags??[];return tags.length>0&&!tags.includes('cardio')});
 const strengthLoad=weeklyLoad(strength,profile,dates[6]);
 const changes=[...(profile.menuChangeHistory||[]),...(profile.goalChangeHistory||[]),...rows.flatMap(r=>[...(r.menuChanges||[]),...(r.goalChanges||[])])].filter(c=>dates.includes(c.date));
 const tendencies=new Map();
 const key=m=>['foodGoal','optionalGoal'].includes(m.id)?m.id:m.exerciseId||m.name||m.menuName||m.id;
 for(const c of changes){for(const before of c.before||[]){if((c.after||[]).some(a=>key(a)===key(before)&&a.name===before.name&&a.detail===before.detail))continue;const id=key(before);const entry=tendencies.get(id)||{id,name:before.name||before.menuName||id,changed:0,external:0,personal:0,presented:0};entry.changed++;if(c.reason in entry)entry[c.reason]++;tendencies.set(id,entry)}}
 for(const t of tendencies.values()){
  const observed=new Set(logs.filter(l=>key(l)===t.id).map(l=>l.date));
  for(const d of rows){for(const m of d.presentedMenus||[]){if(key(m)===t.id)observed.add(d.date)}if(t.id==='foodGoal'&&d.foodGoalSnapshot===t.name)observed.add(d.date);if(t.id==='optionalGoal'&&d.optionalGoalSnapshot===t.name)observed.add(d.date)}
  // A change is also evidence of a presentation; old data may lack presentation snapshots.
  t.presented=Math.max(observed.size,t.changed);t.presentationNote='記録・変更履歴で確認できた提示のみ';
  t.suggestion=t.external>t.personal?'時間・場所に合う設計へ見直す候補です。':t.personal>t.external?'外す前に、短時間・少ない量にする案を試せます。':'理由を確認し、続けやすい形を一緒に選びましょう。';
 }
 const categories=Object.fromEntries(['normal','light','care'].map(k=>[k,dates.filter(date=>activityType(logs.filter(l=>l.date===date),profile)===k).length]));
 const special=rows.flatMap(r=>[...(r.specialActivity?[{date:r.date,text:`旧カスタム項目（評価対象外）：${r.specialActivity}`,points:0}]:[]),...(r.specialActivities||[]).map(a=>({date:r.date,text:specialLabel(a),...evaluateSpecial(a)}))]);
 const activityDays=new Set([...days,...special.filter(a=>a.points>0).map(a=>a.date)]).size;
 const specialPoints=special.reduce((n,a)=>n+a.points,0);
 const bodyDays=new Set([...days,...rows.filter(r=>r.bodyCare||r.specialActivity||(r.specialActivities||[]).length).map(r=>r.date)]).size;
 const food=rows.reduce((n,r)=>n+achieved(r.food),0),optional=rows.reduce((n,r)=>n+achieved(r.optional),0);
 const grade=(n,target)=>n>=target?'◎':n>=target/2?'○':'△';
 const known=logs.length+rows.length>0;
 return {recordedDays:new Set([...rows.map(r=>r.date),...logs.map(r=>r.date)]).size,exercise:{completeDays:completeDays.size,activeDays:days.size,target:rows.find(r=>r.weeklyTargetSnapshot)?.weeklyTargetSnapshot||profile.weeklyTarget},food:{value:food,recorded:rows.filter(r=>r.food).length,target:7},optional:{value:optional,recorded:rows.filter(r=>r.optional).length,target:profile.optionalGoal?7:0},categories,bodyDays,special,specialPoints,activityDays,load,strengthLoad,changes:{total:changes.length,external:changes.filter(c=>c.reason==='external').length,personal:changes.filter(c=>c.reason==='personal').length},tendencies:[...tendencies.values()],ratings:[['筋力刺激',new Set(strength.filter(r=>score(r)>0).map(r=>r.date)).size,Math.min(3,profile.weeklyTarget)],['活動量',activityDays,profile.weeklyTarget],['習慣継続',bodyDays,profile.weeklyTarget],['食事目標',food,7]].map(([label,n,target])=>({label,value:(label==='食事目標'?rows.some(r=>r.food):label==='筋力刺激'?strength.length>0:known)?grade(n,target):'—'}))};
}
export function generateProposal(profile,summary,input){
 const values=structuredClone(planValues(profile));const reasons={};
 const constrained=input.circumstances.some(c=>['忙しい','旅行','体調不安'].includes(c));
 const reduce=input.exerciseBurden==='かなりきつい'||constrained||input.exerciseWish==='下げる';
 if(reduce){values.weeklyTarget=Math.max(1,profile.weeklyTarget-1);values.menus=values.menus.map(m=>({...m,detail:'短時間で1セット・体調に合わせて',baseScore:Math.max(25,(m.baseScore??100)*.75)}));reasons.weeklyTarget='負担感・来週の事情を受け、回数をひとつ減らす案です。';reasons.menus='時間と記録上の負荷を控えめにする案です。'}
 else if(input.exerciseWish==='上げる'||input.exerciseWish==='任せる'&&input.exerciseBurden==='余裕'&&summary.exercise.completeDays>=profile.weeklyTarget){values.weeklyTarget=Math.min(7,profile.weeklyTarget+1);reasons.weeklyTarget='希望と実績から、週に1日増やす案です。'}
 if(!reduce){const frequent=summary.tendencies.find(t=>t.changed>=2);if(frequent){const found=values.menus.find(m=>(m.exerciseId||m.name)===frequent.id);if(found){found.detail='まず1分・少ない回数から';found.baseScore=Math.max(25,(found.baseScore??100)*.75);if(frequent.external>frequent.personal){const alternative=EXERCISES.find(e=>e.minutes===1&&!values.menus.some(m=>resolveExercise(m)?.id===e.id));if(alternative)Object.assign(found,menuFromExercise(alternative.id,found.id),{baseScore:75})}reasons.menus=frequent.suggestion}}}
 if(input.foodWish==='下げる'||input.foodBurden==='かなりきつい'||input.foodWish==='任せる'&&input.foodBurden==='少しきつい'){values.foodGoal=`1日1回から：${profile.foodGoal}`;reasons.foodGoal='取り組む機会を絞り、続けやすくする案です。'}
 else if(input.foodWish==='上げる'){values.foodGoal=`無理のない範囲で毎日：${profile.foodGoal}`;reasons.foodGoal='本人の希望に沿って、継続する機会を増やす案です。'}
 if(input.optionalWish==='外す'){values.optionalGoal='';reasons.optionalGoal='本人の希望に合わせて、任意目標を外す案です。'}
 if(input.optionalWish==='変更'){values.optionalGoal=input.optionalChange.trim();reasons.optionalGoal='入力した任意目標へ変更する案です。'}
 if(input.optionalWish==='続ける'&&values.optionalGoal&&['少しきつい','かなりきつい'].includes(input.optionalBurden)){values.optionalGoal=`短時間・できる日だけ：${values.optionalGoal}`;reasons.optionalGoal='負担感を受け、取り組む量を減らす案です。'}
 return PLAN_KEYS.map(key=>({key,before:planValues(profile)[key],value:values[key],reason:reasons[key]||'今の内容を維持する案です。',evidenceIds:[]}));
}
export function approveReview({profile,summary,input,proposal,decisions,today}){
 const window=reviewWindow(today);const values=planValues(profile);
 for(const [key,options] of [['foodGoal',FOOD_GOALS],['optionalGoal',OPTIONAL_GOALS]]){const d=decisions[key];if(d?.mode==='edit'&&!options.includes(d.value)&&d.value!==profile[key]&&d.value!==proposal.find(i=>i.key===key)?.value)throw new Error('登録済み目標から選択してください');}
 const menuEdit=decisions.menus;if(menuEdit?.mode==='edit'&&Array.isArray(menuEdit.value)&&menuEdit.value.some(m=>!resolveExercise(m)&&![...profile.menus,...(proposal.find(i=>i.key==='menus')?.value||[])].some(old=>JSON.stringify(old)===JSON.stringify(m))))throw new Error('登録済み種目から選択してください');
 for(const item of proposal){const d=decisions[item.key];if(!d||!['adopt','edit','keep'].includes(d.mode))throw new Error('各項目の扱いを選んでください');if(d.mode!=='keep')values[item.key]=d.mode==='edit'?d.value:item.value}
 if(!Number.isInteger(values.weeklyTarget)||values.weeklyTarget<1||values.weeklyTarget>7)throw new Error('週の回数は1〜7日で入力してください');
 if(!values.foodGoal?.trim()||values.foodGoal.length>200||(values.optionalGoal||'').length>200)throw new Error('目標を200文字以内で入力してください');
 if(!Array.isArray(values.menus)||!values.menus.length||values.menus.some(m=>!m.name?.trim()||!m.detail?.trim()||!Number.isFinite(m.baseScore??100)||(m.baseScore??100)<0))throw new Error('種目名・内容・負荷を確認してください');
 return {profileId:profile.id,weekStart:window.start,weekEnd:window.end,status:'approved',approvedAt:new Date().toISOString(),summary,input,proposal,decisions,weeklyPlan:{effectiveFrom:window.effectiveFrom,values},schemaVersion:1};
}
