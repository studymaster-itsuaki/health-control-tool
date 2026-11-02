import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activityType,specialActivity,evaluateSpecial,FOOD_GOALS} from './catalogs.js';
import {menuFromExercise,recordSnapshot} from './exercises.js';
import {aggregateWeek,reviewWindow} from './weekly.js';
import {goalSelect,selectedMenus,priorityEditor,specialEditor} from './selection-view.js';
const p={id:'p',weeklyTarget:3,menus:[menuFromExercise('squat')],foodGoal:FOOD_GOALS[0]};
const log=(id,status='complete')=>({...recordSnapshot(menuFromExercise(id),status),profileId:'p',date:'2026-10-12'});
test('automatic categories prioritize normal over light over care and ignore missed/unrecorded',()=>{
 assert.equal(activityType([],p),'');assert.equal(activityType([log('squat','missed')],p),'');assert.equal(activityType([log('squat','')],p),'');
 assert.equal(activityType([log('self-care')],p),'care');assert.equal(activityType([log('self-care'),log('stretch','partial')],p),'light');assert.equal(activityType([log('walk'),log('squat','partial')],p),'normal');
 assert.equal(activityType([{menuId:'w',status:'complete'}],{menus:[{id:'w',name:'ウォーキング'}]}),'light');
});
test('special inputs validate master, durations, integers and relevant steps',()=>{
 assert.throws(()=>specialActivity('invented','1〜2時間',''));assert.throws(()=>specialActivity('walking','自由入力',''));for(const n of [-1,1.5,200001,'abc'])assert.throws(()=>specialActivity('walking','1〜2時間',n));
 assert.equal(specialActivity('cycling','1〜2時間',500).steps,null);assert.equal(specialActivity('walking','15分未満','').steps,null);
});
test('theme park uses high steps without double counting time or adding strength',()=>{
 const a=specialActivity('theme-park','2時間以上',20000);assert.deepEqual(evaluateSpecial(a),{points:200,cardio:200,walking:200,strength:0});
 for(const type of ['cleaning','moving'])assert.deepEqual(evaluateSpecial(specialActivity(type,'1〜2時間','')),{points:90,cardio:90,walking:0,strength:0});
 assert.equal(evaluateSpecial(specialActivity('other','2時間以上','')).points,0);assert.equal(evaluateSpecial('旧文章').points,0);
});
test('weekly activity is separate from strength and isolates dates and profiles',()=>{
 const state={dailyLogs:[{profileId:'p',date:'2026-10-12',activityType:'normal',specialActivity:'昔のハイキング',specialActivities:[specialActivity('theme-park','2時間以上',20000)]},{profileId:'other',date:'2026-10-13',specialActivities:[specialActivity('walking','2時間以上',50000)]}],exerciseLogs:[log('wall-push','missed')]};
 const before=JSON.stringify(state),s=aggregateWeek(state,p,reviewWindow('2026-10-19').dates);assert.equal(s.specialPoints,200);assert.equal(s.activityDays,1);assert.equal(s.strengthLoad.total,0);assert.equal(s.load.total,0);assert.equal(s.ratings.find(r=>r.label==='筋力刺激').value,'△');assert.equal(s.categories.normal,0);assert.equal(s.special.length,2);assert.equal(JSON.stringify(state),before);
});
test('legacy settings survive selecting master items and names are escaped',()=>{
 const legacy={id:'old',name:'独自種目',detail:'昔の内容',baseScore:123};const oldWalk={id:'old-walk',name:'ウォーキング',detail:'以前の時間'};const f=new FormData();f.append('menus','walk');const menus=selectedMenus(f,[legacy,oldWalk]);assert.deepEqual(menus,[legacy,oldWalk]);
 f.append('menus','unknown');assert.throws(()=>selectedMenus(f,[legacy]));assert.match(goalSelect('foodGoal',FOOD_GOALS,'昔の目標'),/旧カスタム項目/);assert.match(priorityEditor(['旧目標']),/旧カスタム項目/);assert.match(specialEditor({specialActivity:'<script>'}),/&lt;script&gt;/);
});
test('other special activity is excluded from activity and habit evaluation',()=>{
 const s=aggregateWeek({dailyLogs:[{profileId:'p',date:'2026-10-12',specialActivities:[specialActivity('other','2時間以上','')]}],exerciseLogs:[]},p,reviewWindow('2026-10-19').dates);assert.equal(s.specialPoints,0);assert.equal(s.activityDays,0);assert.equal(s.bodyDays,0);assert.equal(s.special.length,1);
});
