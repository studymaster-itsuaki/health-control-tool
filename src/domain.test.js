import {test} from 'node:test';
import assert from 'node:assert/strict';
import {weekDates,progress,localDate} from './domain.js';
test('Sunday belongs to preceding Monday and handles year boundary',()=>{assert.deepEqual(weekDates('2027-01-03'),['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03'])});
test('weekly totals exclude outside dates and distinguish partial/missed',()=>{assert.deepEqual(progress([{date:'2026-10-19',status:'complete'},{date:'2026-10-20',status:'partial'},{date:'2026-10-21',status:'missed'},{date:'2026-10-18',status:'complete'}],weekDates('2026-10-21')),{complete:1,partial:1,missed:1})});
test('local date uses local calendar',()=>assert.equal(localDate(new Date(2026,9,21,0,5)),'2026-10-21'));
