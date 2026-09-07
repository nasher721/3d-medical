import { loadOrganAssets } from './organ-assets.js';

export function sourceRegistrationOffsets(manifest) {
  const heart=manifest.find(r=>r.name==='heart');
  if(!heart?.sourceBounds || !Number.isFinite(heart.normalizedTransform?.scale))throw new Error('Missing source registration');
  const origin=heart.sourceBounds.min.map((v,i)=>(v+heart.sourceBounds.max[i])/2);
  return Object.fromEntries(manifest.map(r=>{
    if(!r.sourceBounds || r.normalizedTransform?.scale!==heart.normalizedTransform.scale)throw new Error('Inconsistent source registration');
    const offset=r.center.map((v,i)=>((r.sourceBounds.min[i]+r.sourceBounds.max[i])/2-origin[i])*heart.normalizedTransform.scale+heart.center[i]-v);
    if(!offset.every(Number.isFinite))throw new Error('Invalid source registration');
    return [r.name,offset];
  }));
}

// A terminal section estimate is only used for the short illustrative neck
// connectors. It never changes the source mesh or claims a segmented centerline.
function superiorTerminal(mesh) {
  let top=-Infinity;
  for(let i=1;i<mesh.position.length;i+=3)top=Math.max(top,mesh.position[i]);
  const sum=[0,0,0];let count=0;
  for(let i=0;i<mesh.position.length;i+=3)if(mesh.position[i+1]>top-.035){
    for(let a=0;a<3;a++)sum[a]+=mesh.position[i+a];count++;
  }
  return sum.map(v=>v/count);
}

export async function loadRegisteredVasculature(renderer) {
  if(!renderer.organManifest||renderer.registeredVasculature)return;
  let rollback;
  try {
    const response=await fetch(new URL('../assets/organs/vascular-manifest.json',import.meta.url),{signal:renderer.assetController.signal});
    if(!response.ok)return;
    const manifest=await response.json();
    const meshes=await loadOrganAssets(new URL('../assets/organs/vasculature.glb',import.meta.url),{signal:renderer.assetController.signal});
    if(renderer.destroyed||renderer.assetController.signal.aborted)return;
    const offsets=sourceRegistrationOffsets(renderer.organManifest);
    if(!Array.isArray(manifest)||!manifest.length||meshes.length!==manifest.length)throw new Error('Vascular manifest mismatch');
    for(const mesh of meshes) {
      const record=manifest.find(r=>r.name===mesh.name);
      if(!record||!['systemic','renal','pulmonary','heart','brain'].includes(record.group)||typeof record.oxygenated!=='boolean'||!['arterial','venous'].includes(record.semantic))throw new Error('Invalid vascular metadata');
      if(record.normalizedTransform?.scale!==renderer.organManifest.find(r=>r.name==='heart').normalizedTransform.scale)throw new Error('Vascular source scale mismatch');
    }
    const previous={assets:[...renderer.assets],routes:[...renderer.routes],particleBuffers:renderer.particleBuffers,
      particles:renderer.particles,particleArrays:renderer.particleArrays,registrationOffsets:renderer.registrationOffsets,
      flags:renderer.assets.map(a=>({asset:a,superseded:a.superseded,registrationOffset:a.registrationOffset}))};
    rollback=()=>{
      for(const a of renderer.assets)if(!previous.assets.includes(a))for(const buffer of Object.values(a.buffers||{}))renderer.gl.deleteBuffer(buffer);
      if(renderer.particleBuffers!==previous.particleBuffers)for(const buffer of Object.values(renderer.particleBuffers||{}))renderer.gl.deleteBuffer(buffer);
      Object.assign(renderer,{assets:previous.assets,routes:previous.routes,particleBuffers:previous.particleBuffers,
        particles:previous.particles,particleArrays:previous.particleArrays,registrationOffsets:previous.registrationOffsets,registeredVasculature:false});
      for(const {asset,superseded,registrationOffset} of previous.flags){asset.superseded=superseded;asset.registrationOffset=registrationOffset;}
    };
    renderer.registrationOffsets=offsets;
    // Source surfaces replace the authored major tubes atomically after parsing.
    for(const asset of renderer.assets) {
      if(asset.tissue)asset.registrationOffset=offsets[asset.sourceName];
      if(asset.id==='vessels') {
        if(asset.group==='brain'&&!/inflow|systemic-return/.test(asset.name||''))asset.registrationOffset=offsets.brain;
        else asset.superseded=true;
      }
      if(asset.id==='urine')asset.superseded=true;
    }
    for(const mesh of meshes) {
      const record=manifest.find(r=>r.name===mesh.name);
      const motion=record.group==='heart'?{animationOrgan:'heart',center:renderer.organManifest.find(r=>r.name==='heart').center}:{};
      renderer._asset(mesh,{...record,...motion,id:'vessels',sourceVessel:true,color:record.oxygenated?[.80,.19,.19]:[.12,.38,.83]});
    }
    renderer.registeredVasculature=true;
    renderer._buildUrineRoutes();
    // Source common carotids and jugulars meet the illustrative intracranial
    // network through short, named connectors. Internal/external carotid
    // bifurcation and cervical vertebral courses remain schematic.
    const findMesh=(side,kind)=>meshes.find(m=>m.name===`${side}-${kind}`);
    for(const side of ['left','right']) {
      const carotid=findMesh(side,'common-carotid'),jugular=findMesh(side,'internal-jugular');
      const positions=renderer.cerebralPositions;
      const shift=p=>p.map((v,i)=>v+offsets.brain[i]);
      if(carotid&&positions)renderer._route([superiorTerminal(carotid),shift(positions[`${side}-internal-carotid`])],{name:`${side}-registered-carotid-connector`,group:'brain',radius:.025});
      if(jugular&&positions)renderer._route([shift(positions[`${side}-internal-jugular-return`]),superiorTerminal(jugular)],{name:`${side}-registered-jugular-connector`,group:'brain',radius:.035,oxygenated:false});
      const subclavian=findMesh(side,'subclavian');
      if(subclavian&&positions){
        const start=superiorTerminal(subclavian),end=shift(positions[`${side}-vertebral`]);
        renderer._route([start,[end[0],(start[1]+end[1])/2,end[2]-.10],end],{name:`${side}-registered-vertebral-connector`,group:'brain',radius:.018});
      }
    }
    // Rebuild particle buffers for retained schematic routes only; do not send
    // particles through guessed centerlines outside the segmented source vessels.
    renderer._buildParticles();
    renderer.resetCamera();
    renderer.canvas.dispatchEvent(new CustomEvent('anatomy-assets-ready',{bubbles:true,detail:{detailed:true,registered:true,provenanceBlocked:manifest.some(r=>r.derivativeReleaseAllowed!==true)}}));
    rollback=null;
    if(previous.particleBuffers!==renderer.particleBuffers)for(const buffer of Object.values(previous.particleBuffers))renderer.gl.deleteBuffer(buffer);
    for(const asset of renderer.assets.filter(a=>a.superseded))for(const buffer of Object.values(asset.buffers||{}))renderer.gl.deleteBuffer(buffer);
    renderer.assets=renderer.assets.filter(a=>!a.superseded);
    renderer.routes=renderer.routes.filter(r=>!r.asset.superseded);
  } catch(error) {
    rollback?.();
    if(renderer.destroyed||renderer.assetController.signal.aborted)return;
    renderer.vascularAssetError=error.message;
    // The existing named teaching network remains usable if the extra bundle
    // is unavailable. The harness exposes this state for verification.
  }
}
