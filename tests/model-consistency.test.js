import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, stepSimulation, setIntervention, setPatient, migrateState, validateSimulationState, SCENARIOS, SCHEMA_VERSION, FIXED_STEP_SECONDS, MAX_STEP_SECONDS } from '../src/physiology.js';

const near=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} should equal ${b}`);

test('pressure, oxygen and ventricular identities hold during every intervention transition',()=>{
  for(const scenario of SCENARIOS){
    const state=createSimulation(scenario.id);
    setIntervention(state,'dobutamine',8);
    setIntervention(state,'norepinephrine',.25);
    setIntervention(state,'fluid',500);
    for(let frame=0;frame<300;frame++){
      stepSimulation(state,1/30);
      const m=state.metrics;
      near(m.co,m.hr*m.sv/1000);
      near(m.map,m.cvp+m.co*m.svr/80);
      near(m.map,(m.sbp+2*m.dbp)/3);
      near(m.sv,m.edv-m.esv);
      near(m.ef,100*m.sv/m.edv);
      near(m.cpp,m.map-m.icp);
      const ca=1.34*state.patient.hemoglobin*m.spo2/100+.003*m.pao2;
      near(m.do2,10*m.co*ca);
      const cv=1.34*state.patient.hemoglobin*m.svo2/100+.003*35;
      near(m.vo2,10*m.co*(ca-cv));
    }
  }
});

test('a severe shunt retains an oxygenation limitation even on 100 percent oxygen',()=>{
  const healthy=createSimulation('healthy'),ards=createSimulation('ards');
  assert.ok(ards.metrics.spo2<85);
  for(const state of [healthy,ards]){setIntervention(state,'fio2',100);stepSimulation(state,30);}
  assert.ok(healthy.metrics.spo2>99);
  assert.ok(ards.metrics.spo2<97);
  assert.ok(ards.metrics.pao2<healthy.metrics.pao2*.5);
});

test('moderate PEEP recruits ARDS lung while reducing forward flow',()=>{
  const state=createSimulation('ards');
  const before={...state.metrics};
  setIntervention(state,'peep',10);stepSimulation(state,30);
  assert.ok(state.metrics.spo2>before.spo2);
  assert.ok(state.metrics.co<before.co);
  assert.ok(state.metrics.pvr>before.pvr);
});

test('inotrope increases demand and heart rate, afterload limits pump-failure response',()=>{
  const state=createSimulation('cardiogenic'),before={...state.metrics};
  setIntervention(state,'dobutamine',10);stepSimulation(state,30);
  assert.ok(state.metrics.hr>before.hr);
  assert.ok(state.metrics.co>before.co);
  assert.ok(state.metrics.vo2>before.vo2);
  const output=state.metrics.co;
  setIntervention(state,'norepinephrine',1);stepSimulation(state,30);
  assert.ok(state.metrics.map>before.map);
  assert.ok(state.metrics.co<output*1.1);
});

test('congestion changes renal flow and visible lung water in pump failure',()=>{
  const state=createSimulation('cardiogenic'),before={...state.metrics};
  setIntervention(state,'fluid',2000);stepSimulation(state,30);
  assert.ok(state.metrics.cvp>before.cvp);
  assert.ok(state.metrics.lungWater>before.lungWater);
  assert.ok(createSimulation().metrics.renalFlow>800);
  assert.ok(createSimulation().metrics.pvr>80 && createSimulation().metrics.pvr<160);
});

test('hyperventilation decreases cerebral flow even as conventional CPP rises',()=>{
  const state=createSimulation('brain-injury'),before={...state.metrics};
  setIntervention(state,'respiratoryRate',28);stepSimulation(state,30);
  assert.ok(state.metrics.paco2<before.paco2);
  assert.ok(state.metrics.cpp>before.cpp);
  assert.ok(state.metrics.brainFlow<before.brainFlow);
});

test('paused and invalid time steps do not change a simulation',()=>{
  const state=createSimulation();const before=JSON.stringify(state);
  for(const dt of [0,-1,NaN,Infinity])stepSimulation(state,dt);
  assert.equal(JSON.stringify(state),before);
  stepSimulation(state,Number.MAX_VALUE);
  assert.ok(state.time<=60);
  assert.ok(state.history.length<=61);
});

test('unknown and nonfinite input cannot poison exported state',()=>{
  const state=createSimulation();
  setIntervention(state,'__proto__',9);setIntervention(state,'norepinephrine',Infinity);
  setPatient(state,'constructor',100);setPatient(state,'autoregulation','false');
  assert.equal(state.patient.autoregulation,true);
  assert.equal(state.interventions.norepinephrine,0);
  assert.ok(Object.values(state.metrics).every(Number.isFinite));
  assert.doesNotThrow(()=>JSON.parse(JSON.stringify(state)));
});

test('v2 state exposes canonical schema and keeps legacy controls compatible',()=>{
  const state=createSimulation();
  assert.equal(state.schemaVersion,SCHEMA_VERSION);
  assert.equal(state.timeS,0);
  assert.equal(state.time,0);
  assert.equal(state.interventions.ventilator.mode,'volume-controlled');
  assert.equal(state.interventions.vasoactive.norepinephrine,0);
  assert.equal(state.interventions.fio2,21);
  assert.ok('urineOutput' in state.metrics);
  setIntervention(state,'fio2',80);
  assert.equal(state.interventions.ventilator.fio2,80);
  assert.equal(state.interventions.vasoactive.epinephrine,0);
});

test('v1 flat snapshots migrate atomically into v2 with bounded finite outputs',()=>{
  const migrated=migrateState({schemaVersion:1,scenarioId:'healthy',time:4,patient:{weight:80},interventions:{fio2:60,peep:8,respiratoryRate:20,tidalVolume:7,norepinephrine:.2,dobutamine:3,fluid:400}});
  assert.equal(migrated.schemaVersion,2);
  assert.equal(migrated.timeS,4);
  assert.equal(migrated.patient.weight,80);
  assert.equal(migrated.interventions.ventilator.fio2,60);
  assert.equal(migrated.interventions.vasoactive.dobutamine,3);
  assert.equal(migrated.interventions.fluid,400);
  assert.ok(Object.values(migrated.metrics).every(Number.isFinite));
  assert.equal(validateSimulationState({schemaVersion:2,scenarioId:'healthy',unknown:true}).valid,false);
  assert.throws(()=>migrateState({scenarioId:'healthy',unknown:true}),/Unknown state key/);
  assert.throws(()=>migrateState({scenarioId:'healthy',interventions:{ventilator:{bogus:1}}}),/Unknown ventilator key/);
  assert.throws(()=>migrateState({scenarioId:'healthy',interventions:{vasoactive:{norepinephrine:Infinity}}}),/Invalid vasoactive value/);
  assert.throws(()=>migrateState({scenarioId:'healthy',interventions:{hypertonicSolution:{id:'3-percent'}}}),/uncalibrated/);
  assert.throws(()=>migrateState({scenarioId:'healthy',visual:{opacity:{brain:NaN}}}),/Invalid opacity/);
  assert.equal(validateSimulationState({schemaVersion:2,interventions:{ventilator:{mode:'pressure-control'}}}).valid,true);
  assert.equal(validateSimulationState({schemaVersion:2,interventions:{ventilator:{mode:'bogus-mode'}}}).valid,false);
});

test('fixed stepping is deterministic, bounded, and records one-second history cadence',()=>{
  const a=createSimulation('ards'),b=createSimulation('ards');
  setIntervention(a,'fio2',100); setIntervention(b,'fio2',100);
  for(let n=0;n<90;n++){stepSimulation(a,FIXED_STEP_SECONDS);stepSimulation(b,FIXED_STEP_SECONDS);}
  near(a.timeS,3); assert.equal(a.time,b.time);
  assert.deepEqual(a.metrics,b.metrics);
  assert.deepEqual(a.history.map((sample)=>sample.time),[0,1,2,3]);
  const before=a.timeS; stepSimulation(a,Number.MAX_VALUE);
  assert.equal(a.timeS-before,MAX_STEP_SECONDS);
  assert.ok(a.history.length<=64);
  assert.ok(Object.values(a.metrics).every(Number.isFinite));
});

test('organ metric units remain distinct and cerebral identity is exact',()=>{
  const state=createSimulation(); stepSimulation(state,1);
  assert.ok(Number.isFinite(state.metrics.brainFlow));
  assert.ok(Number.isFinite(state.metrics.renalFlow));
  assert.ok(Number.isFinite(state.metrics.urineOutput));
  assert.notEqual(state.metrics.renalFlow,state.metrics.urineOutput);
  near(state.metrics.cpp,state.metrics.map-state.metrics.icp);
});
