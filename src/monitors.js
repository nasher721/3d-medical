import { displayNumber } from './ui.js';
import { volumeControlledBreath } from './physiology.js';

const colors = {hr:'#77e994',map:'#ff7977',spo2:'#70b5ff',co:'#5de6c1',cvp:'#70b5ff',cpp:'#bcabff'};
const gaussian = (x, center, width) => Math.exp(-(((x - center) / width) ** 2));
// Lead-II sinus morphology: small upright P, narrow QRS with visible Q/R/S,
// then a broad upright T. Amplitudes are illustrative millivolts, not a
// diagnostic ECG or patient-specific rhythm model.
function ecg(p) {
  return .16*gaussian(p,.18,.035)
    -.12*gaussian(p,.30,.010)
    +.92*gaussian(p,.335,.013)
    -.22*gaussian(p,.368,.013)
    +.28*gaussian(p,.60,.075);
}
function arterial(p) { return Math.max(0, 1.5 * (1-Math.exp(-p*35))*Math.exp(-p*4)) + .1*gaussian(p,.47,.028); }
function pleth(p) { return Math.max(0,1.9*(1-Math.exp(-p*10))*Math.exp(-p*4))+.09*gaussian(p,.52,.08); }
function context(canvas) {
  const box=canvas.getBoundingClientRect();
  const dpr=Math.min(devicePixelRatio || 1,2);
  if(canvas.width!==Math.round(box.width*dpr)||canvas.height!==Math.round(box.height*dpr)){canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);}
  const ctx=canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);ctx.shadowBlur=0;ctx.clearRect(0,0,box.width,box.height);
  return {ctx,w:box.width,h:box.height};
}
function grid(ctx,w,h){ctx.strokeStyle='#1b2937';ctx.lineWidth=.5;ctx.beginPath();for(let x=0;x<w;x+=24){ctx.moveTo(x,0);ctx.lineTo(x,h);}for(let y=0;y<h;y+=24){ctx.moveTo(0,y);ctx.lineTo(w,y);}ctx.stroke();}
// Plot specifications contain model observations only. Drawing and exports use
// the same units; no independent physiology approximation lives in the monitor.
export function monitorPlots(state, mode) {
  if (mode === 'starling') {
    const fs = state.frankStarling;
    return [{ title: 'Schematic Frank–Starling', xLabel: 'Preload · EDV (mL)', yLabel: 'Stroke volume (mL)', color: colors.co,
      points: fs.samples.map(p => [p.edv, p.sv]), marker: [fs.operatingPoint.preload, fs.operatingPoint.strokeVolume] }];
  }
  if (mode === 'ventilator') {
    const cycle = volumeControlledBreath(state);
    const samples = Array.from({ length: 181 }, (_, i) => volumeControlledBreath(state, i * cycle.cycleDurationS / 180));
    return [['pressureCmH2O','Airway pressure','cmH2O',colors.map],['flowMlS','Airway flow','mL/s',colors.co],['volumeMl','Lung volume','mL',colors.spo2]].map(([key,title,unit,color]) => ({
      title, xLabel: 'Breath time (s)', yLabel: unit, color,
      points: samples.map((p,i) => [i * cycle.cycleDurationS / 180, p[key]]), marker: [cycle.timeInCycleS, cycle[key]] }));
  }
  if (mode === 'perfusion') {
    const history = state.history.filter(p => p.time >= state.timeS - 300);
    return [['brainFlow','Cerebral proxy','mL/100 g/min',colors.cpp],['renalFlow','Renal perfusion','mL/min',colors.co],['urineOutput','Urine outflow','mL/h','#ffd178']].map(([key,title,unit,color]) => ({
      title, xLabel: 'Simulation time (s)', yLabel: unit, color,
      points: history.map(p => [p.time,p[key]]), marker: [state.timeS,state.metrics[key]] }));
  }
  return [];
}
function drawPlot(canvas, plot) {
  const {ctx,w,h}=context(canvas), left=46, right=Math.max(left+1,w-12), top=24, bottom=Math.max(top+1,h-30);
  const points=[...plot.points,plot.marker];
  let xMax=Math.max(1,...points.map(p=>p[0])), yMin=Math.min(0,...points.map(p=>p[1])), yMax=Math.max(1,...points.map(p=>p[1]));
  const xMin=plot.xLabel.startsWith('Simulation')?Math.max(0,xMax-300):0;
  if(plot.xLabel.startsWith('Simulation'))xMax=Math.max(xMax,xMin+30);
  yMax+=(yMax-yMin)*.12;yMin-=Math.abs(yMin)*.12;
  const xy=([x,y])=>[left+(x-xMin)/(xMax-xMin)*(right-left),bottom-(y-yMin)/(yMax-yMin)*(bottom-top)];
  ctx.font='10px system-ui';ctx.lineWidth=.5;
  for(let i=0;i<=3;i++){
    const frac=i/3,y=bottom-frac*(bottom-top),x=left+frac*(right-left);
    ctx.strokeStyle='#253747';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();
    ctx.fillStyle='#a4b5c6';ctx.textAlign='right';ctx.fillText(displayNumber(yMin+frac*(yMax-yMin),1),left-5,y+3);
    ctx.textAlign='center';ctx.fillText(displayNumber(xMin+frac*(xMax-xMin),1),x,bottom+13);
  }
  ctx.textAlign='left';ctx.fillText(plot.yLabel,4,12);ctx.textAlign='center';ctx.fillText(plot.xLabel,(left+right)/2,h-3);
  ctx.strokeStyle=plot.color;ctx.lineWidth=1.8;ctx.beginPath();plot.points.forEach((p,i)=>i?ctx.lineTo(...xy(p)):ctx.moveTo(...xy(p)));ctx.stroke();
  ctx.fillStyle=plot.color;ctx.beginPath();ctx.arc(...xy(plot.marker),3.5,0,Math.PI*2);ctx.fill();ctx.textAlign='left';
}
export class Monitors {
  constructor(element){this.element=element;this.mode='waveforms';this.baseline=null;this.phase=0;this.lastTime=0;this.render();}
  setMode(mode){this.mode=mode;this.render();}
  render(){
    if(this.mode==='waveforms')this.element.innerHTML=`<div class="monitor waveform-monitor" style="--signal:${colors.hr}"><div class="monitor-heading">ECG <span>II · illustrative</span></div><div class="signal-body"><canvas data-wave="hr" aria-label="Illustrative ECG waveform"></canvas><div class="monitor-reading"><span>HR</span><strong data-metric="hr">72</strong><small>bpm</small></div></div><div class="monitor-foot">Sinus rhythm <span>25 mm/s</span></div></div><div class="monitor waveform-monitor" style="--signal:${colors.map}"><div class="monitor-heading">Arterial pressure <span>mmHg</span></div><div class="signal-body"><canvas data-wave="map" aria-label="Illustrative arterial pressure waveform"></canvas><div class="monitor-reading"><span>MAP</span><strong data-metric="map">88</strong><small data-bp>120 / 72</small></div></div><div class="monitor-foot">Systemic circulation <span data-delta="map"></span></div></div><div class="monitor waveform-monitor" style="--signal:${colors.spo2}"><div class="monitor-heading">Oxygen saturation <span>%</span></div><div class="signal-body"><canvas data-wave="spo2" aria-label="Illustrative oxygen saturation waveform"></canvas><div class="monitor-reading"><span>SaO₂</span><strong data-metric="spo2">98</strong><small>%</small></div></div><div class="monitor-foot">Arterial estimate <span data-delta="spo2"></span></div></div><div class="monitor output-monitor" style="--signal:${colors.co}"><div class="monitor-heading">Cardiac output</div><div class="large-reading"><span>CO</span><strong data-metric="co">5.0</strong><small>L/min</small></div><div class="monitor-foot">SV <span><b data-metric="sv">69</b> mL</span></div></div><div class="monitor resistance-monitor"><div><div class="monitor-heading">Central venous pressure</div><div class="compact-reading" style="color:${colors.cvp}">CVP <strong data-metric="cvp">6</strong><small>mmHg</small></div></div><div><div class="monitor-heading">Systemic vascular resistance</div><div class="compact-reading" style="color:${colors.co}">SVR <strong data-metric="svr">1312</strong><small>dyn·s/cm⁵</small></div></div></div>`;
    else if(this.mode==='trends') this.element.innerHTML=`<div class="trend-full"><div class="trend-heading"><span>Response over time</span><div>${['map','co','spo2','cpp'].map(key=>`<span style="color:${colors[key]}">${(key==='spo2'?'SaO₂':key.toUpperCase())}${key==='map'||key==='cpp'?' mmHg':key==='co'?' L/min':' %'}</span>`).join('')}</div><small>Independent scales · last 5 min</small></div><canvas data-trend aria-label="Physiological trends over the last five minutes"></canvas></div>`;
    else if(['starling','ventilator','perfusion'].includes(this.mode)) {
      const labels=this.mode==='starling'?['Schematic Frank–Starling']:this.mode==='ventilator'?['Airway pressure · cmH2O','Airway flow · mL/s','Lung volume · mL']:['Cerebral proxy · mL/100 g/min','Renal perfusion · mL/min','Urine outflow · mL/h'];
      this.element.innerHTML=`<div class="model-monitor ${this.mode}"><div class="model-monitor-plots">${labels.map((label,index)=>`<figure><figcaption>${label}</figcaption><canvas data-model-plot="${index}" aria-label="${label}"></canvas></figure>`).join('')}</div><div class="model-monitor-summary" data-model-summary></div><small class="model-monitor-note">Educational approximation · ${this.mode==='starling'?'EDV is a preload proxy; this is separate from the pressure–volume loop.':this.mode==='ventilator'?'Volume control · fixed I:E 1:2; prescribed expiration, not calibrated mechanics.':'Independent scales · regional values are tissue proxies; urine is separate from renal blood flow.'}</small></div>`;
    }
    else this.element.innerHTML=`<div class="pv-layout"><div class="pv-copy"><span class="section-label">LEFT VENTRICLE</span><h3>Pressure–volume loop</h3><p>Watch filling, ejection and afterload reshape the cardiac cycle.</p><small>Schematic loop derived from current volume and pressure estimates.</small></div><canvas data-pv aria-label="Illustrative left ventricular pressure-volume loop"></canvas><div class="pv-numbers"><span>End-diastolic volume <b><i data-metric="edv">120</i> mL</b></span><span>End-systolic volume <b><i data-metric="esv">51</i> mL</b></span><span>Ejection fraction <b><i data-metric="ef">58</i>%</b></span></div></div>`;
  }
  update(state){
    const m=state.metrics;const dt=Math.max(0,state.time-this.lastTime);this.phase+=dt*m.hr/60;this.lastTime=state.time;
    this.element.querySelectorAll('[data-metric]').forEach(el=>{el.textContent=displayNumber(m[el.dataset.metric],['co','cvp'].includes(el.dataset.metric)?1:0);});
    const bp=this.element.querySelector('[data-bp]');if(bp)bp.textContent=`${displayNumber(m.sbp)} / ${displayNumber(m.dbp)}`;
    this.element.querySelectorAll('[data-delta]').forEach(el=>{const key=el.dataset.delta;el.textContent=this.baseline?`${m[key]>=this.baseline[key]?'+':''}${displayNumber(m[key]-this.baseline[key])} vs baseline`:'';});
    this.element.querySelectorAll('[data-wave]').forEach(canvas=>{
      const {ctx,w,h}=context(canvas);grid(ctx,w,h);const key=canvas.dataset.wave;ctx.strokeStyle=colors[key];ctx.lineWidth=1.5;ctx.shadowBlur=5;ctx.shadowColor=colors[key];ctx.beginPath();
      for(let x=0;x<w;x++){const phase=((this.phase-((w-x)/w)*4*m.hr/60)%1+1)%1;const v=key==='hr'?ecg(phase):key==='map'?arterial(phase):pleth(phase);const y=key==='hr'?h*.68-v*h*.46:h*.84-v*h*.73; x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
    });
    const trend=this.element.querySelector('[data-trend]');if(trend)this.drawTrend(trend,state);
    const pv=this.element.querySelector('[data-pv]');if(pv)this.drawPV(pv,m);
    const plots=monitorPlots(state,this.mode);
    this.element.querySelectorAll('[data-model-plot]').forEach((canvas,index)=>{drawPlot(canvas,plots[index]);canvas.setAttribute('aria-label',`${plots[index].title}: ${displayNumber(plots[index].marker[1],2)} ${plots[index].yLabel}; ${plots[index].xLabel} ${displayNumber(plots[index].marker[0],2)}`);});
    const summary=this.element.querySelector('[data-model-summary]');
    if(summary){const fs=state.frankStarling,c=state.ventilatorCycle,i=state.interventions,t=m.cerebralTerritories;
      summary.textContent=this.mode==='starling'?`EDV ${displayNumber(m.edv,1)} mL · SV ${displayNumber(m.sv,1)} mL · Contractility ${displayNumber(fs.contractility,2)} relative · Afterload ${displayNumber(fs.afterload,2)} dimensionless`:
        this.mode==='ventilator'?`${c.phase} · VT ${i.tidalVolume} mL/kg PBW (${displayNumber(c.tidalVolumeMl)} mL) · RR ${i.respiratoryRate}/min · PEEP ${i.peep} cmH2O · FiO₂ ${i.fio2}% · Minute / alveolar ventilation ${displayNumber(c.minuteVentilationMlMin)} / ${displayNumber(c.alveolarVentilationMlMin)} mL/min · PaCO₂ ${displayNumber(m.paco2,1)} mmHg`:
        `Cerebral ${displayNumber(m.brainFlow,1)} (ACA ${displayNumber(t.aca,1)} · MCA ${displayNumber(t.mca,1)} · PCA ${displayNumber(t.pca,1)}) mL/100 g/min · Renal ${displayNumber(m.renalFlow,1)} mL/min · Urine ${displayNumber(m.urineOutput,1)} mL/h · CPP / MAP / ICP ${displayNumber(m.cpp)} / ${displayNumber(m.map)} / ${displayNumber(m.icp)} mmHg`;
    }
  }
  drawTrend(canvas,state){
    const {ctx,w,h}=context(canvas);grid(ctx,w,h);const history=state.history.filter(p=>p.time>=state.time-300);const left=35,right=w-15,top=8,bottom=h-25;
    if(history.length<2){ctx.fillStyle='#92a2b6';ctx.font='12px system-ui';ctx.fillText('Recording physiology… Adjust an intervention to explore its response.',35,h/2);return;}
    const t0=Math.max(0,state.time-300),span=Math.max(30,state.time-t0);
    for(const key of ['map','co','spo2','cpp']){const values=history.map(p=>p[key]??p.metrics?.[key]).filter(Number.isFinite);if(!values.length)continue;let lo=Math.min(...values),hi=Math.max(...values);const pad=Math.max((hi-lo)*.15,key==='co'?1:10);lo=Math.max(0,lo-pad);hi+=pad;ctx.strokeStyle=colors[key];ctx.lineWidth=1.7;ctx.beginPath();history.forEach((p,i)=>{const value=p[key]??p.metrics?.[key];const x=left+(p.time-t0)/span*(right-left),y=bottom-(value-lo)/(hi-lo)*(bottom-top);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();ctx.fillStyle=colors[key];ctx.font='10px monospace';ctx.fillText(`${(key==='spo2'?'SaO₂':key.toUpperCase())} ${displayNumber(values.at(-1),key==='co'?1:0)}`,left+(['map','co','spo2','cpp'].indexOf(key))*(w-50)/4,bottom+20);}
  }
  drawPV(canvas,m){
    const {ctx,w,h}=context(canvas);const x0=40,y0=h-25,sx=(w-65)/240,sy=(h-45)/200;grid(ctx,w,h);ctx.fillStyle='#92a2b6';ctx.font='10px system-ui';ctx.fillText('mmHg',4,12);ctx.fillText('Volume (mL)',w-80,h-5);[0,60,120,180,240].forEach(v=>ctx.fillText(v,x0+v*sx-7,h-10));
    const point=(v,p)=>[x0+v*sx,y0-p*sy];const edv=m.edv||120,esv=m.esv||50;ctx.strokeStyle=colors.co;ctx.fillStyle='#5de6c113';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(...point(esv,5));ctx.bezierCurveTo(...point(edv*.8,5),...point(edv,8),...point(edv,m.cvp+7));ctx.lineTo(...point(edv,m.dbp));ctx.bezierCurveTo(...point(edv*.92,m.sbp+12),...point(esv*1.2,m.sbp),...point(esv,m.dbp*.9));ctx.lineTo(...point(esv,5));ctx.fill();ctx.stroke();
    if(this.baseline){ctx.strokeStyle='#92a2b6';ctx.setLineDash([4,4]);const b=this.baseline;ctx.strokeRect(x0+b.esv*sx,y0-b.sbp*sy,(b.edv-b.esv)*sx,(b.sbp-5)*sy);ctx.setLineDash([]);ctx.fillStyle='#92a2b6';ctx.fillText('Dashed: baseline envelope',w/2-55,12);}
  }
}
