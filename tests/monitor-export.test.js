import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation, stepSimulation, setIntervention, setPatient, volumeControlledBreath } from '../src/physiology.js';
import { monitorPlots, Monitors } from '../src/monitors.js';
import { serializeSession, serializeCSV, validateDerivedArchive, CSV_COLUMNS } from '../src/session.js';
const settings={layers:{particles:true,labels:true,vessels:true,transparent:false,opacity:{brain:.2,lungs:.4,kidneys:.6}}};
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);

test('production archive preserves historical territories, cycle settings and Starling values after interventions',()=>{
  const s=createSimulation();stepSimulation(s,3);const prior=structuredClone(s.history);
  setIntervention(s,'tidalVolume',10);setIntervention(s,'respiratoryRate',30);setIntervention(s,'peep',15);setIntervention(s,'dobutamine',10);stepSimulation(s,4);
  assert.deepEqual(s.history.slice(0,prior.length),prior);
  for(const row of s.history){close(Object.values(row.cerebralTerritories).reduce((a,b)=>a+b),row.brainFlow);close(row.preloadEDV,row.edv);close(row.strokeVolume,row.sv);close(row.contractilityRelative,row.inotropy);close(row.afterloadDimensionless,row.afterload);close(row.cycleDurationS,60/row.respiratoryRate);}
  assert.equal(s.history[0].respiratoryRate,16);assert.equal(s.history.at(-1).respiratoryRate,30);
  const exportData=serializeSession(s,settings,'2026-09-05T00:00:00.000Z');
  assert.deepEqual(exportData.history,s.history);assert.deepEqual(exportData.metrics.cerebralTerritories,s.metrics.cerebralTerritories);
  assert.deepEqual(exportData.ventilatorCycle,s.ventilatorCycle);assert.deepEqual(exportData.frankStarling,s.frankStarling);
  assert.equal(exportData.calibration.hypertonic.length,3);for(const r of exportData.calibration.hypertonic){assert.equal(r.calibrationStatus,'unreviewed');assert.equal(r.calibrationVersion,null);}
  stepSimulation(s,1);assert.equal(exportData.timeS,7);assert.equal(exportData.history.at(-1).time,7);
});

test('production CSV parses into exact original observations with distinct organ and ventilator units',()=>{
  const s=createSimulation('ards');stepSimulation(s,4);
  const [header,...rows]=serializeCSV(s).split('\n').map(line=>line.split(','));
  assert.equal(header.length,CSV_COLUMNS.length+1);assert.equal(rows.length,s.history.length);
  for(const name of ['renalPerfusion_mL_min','urineOutput_mL_h','ACA_mL_100g_min','airwayFlow_mL_s','preloadEDV_mL'])assert.ok(header.includes(name));
  for(let i=0;i<rows.length;i++){
    assert.equal(rows[i][0],'ards');assert.equal(rows[i].length,header.length);
    for(const [key,label]of CSV_COLUMNS){const expected=key.split('.').reduce((v,k)=>v[k],s.history[i]);close(Number(rows[i][header.indexOf(label)]),expected);}
  }
});

test('calibration and derived archives cannot import unknown, nonfinite, or enabled metadata',()=>{
  const s=createSimulation();const d=serializeSession(s,settings);validateDerivedArchive(d,s);
  for(const mutate of [d=>d.calibration.hypertonic[0].calibrationStatus='reviewed',d=>d.calibration.modelVersion='3',d=>d.ventilatorCycle.flowMlS=Infinity,d=>d.frankStarling.samples[0].sv=NaN,d=>d.frankStarling.operatingPoint.extra=1,d=>d.ventilatorCycle.phase='unsupported']){
    const invalid=structuredClone(d);mutate(invalid);assert.throws(()=>validateDerivedArchive(invalid,s));
  }
});

test('plot points and marker share current model values; pause no-op freezes all plot modes',()=>{
  const s=createSimulation();stepSimulation(s,1.3);
  const fs=monitorPlots(s,'starling')[0];assert.deepEqual(fs.marker,[s.metrics.edv,s.metrics.sv]);assert.deepEqual(fs.points,s.frankStarling.samples.map(p=>[p.edv,p.sv]));
  const breath=volumeControlledBreath(s);const plots=monitorPlots(s,'ventilator');
  for(const[index,key]of ['pressureCmH2O','flowMlS','volumeMl'].entries()){close(plots[index].marker[0],breath.timeInCycleS);close(plots[index].marker[1],breath[key]);for(let j=0;j<plots[index].points.length;j++)close(plots[index].points[j][1],volumeControlledBreath(s,plots[index].points[j][0])[key]);}
  const snapshot=['starling','ventilator','perfusion'].map(mode=>monitorPlots(s,mode));stepSimulation(s,0);assert.deepEqual(['starling','ventilator','perfusion'].map(mode=>monitorPlots(s,mode)),snapshot);
  const old=fs.marker;setIntervention(s,'fluid',1000);stepSimulation(s,10);assert.ok(monitorPlots(s,'starling')[0].marker[0]>old[0]);
  const sv=s.metrics.sv;setPatient(s,'contractility',140);stepSimulation(s,10);assert.ok(s.metrics.sv>sv);
  const inotropic=s.metrics.sv;setPatient(s,'vascularTone',180);stepSimulation(s,10);assert.ok(s.metrics.sv<inotropic);
  const fresh=createSimulation();assert.equal(monitorPlots(fresh,'perfusion')[0].points.length,1);assert.equal(monitorPlots(fresh,'ventilator')[0].marker[0],0);
});

test('actual monitor render methods expose labeled units and paint stable plots at paused time',()=>{
  globalThis.devicePixelRatio=1;
  const commands=[];const ctx=new Proxy({}, {get:(o,k)=>o[k]??((...args)=>commands.push([k,...args])),set:(o,k,v)=>{o[k]=v;return true;}});
  const canvases=Array.from({length:3},()=>({width:300,height:160,getBoundingClientRect:()=>({width:300,height:160}),getContext:()=>ctx,setAttribute(){}}));
  const summary={textContent:''};const el={innerHTML:'',querySelector:selector=>selector==='[data-model-summary]'?summary:null,querySelectorAll:selector=>selector==='[data-model-plot]'?canvases.slice(0,el.innerHTML.includes('model-monitor starling')?1:3):[]};
  const monitor=new Monitors(el),s=createSimulation();stepSimulation(s,1);
  for(const mode of ['starling','ventilator','perfusion']){monitor.setMode(mode);commands.length=0;monitor.update(s);const initial=JSON.stringify(commands);commands.length=0;monitor.update(s);assert.equal(JSON.stringify(commands),initial);assert.match(el.innerHTML,/Educational approximation/);assert.ok(summary.textContent.length>50);}
  assert.match(summary.textContent,/mL\/100 g\/min/);assert.match(summary.textContent,/mL\/h/);
});
