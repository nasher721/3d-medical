import { loadOrganAssets } from './organ-assets.js';
import { mat4Multiply, mat4Perspective, mat4LookAt, mat4Identity, projectPoint, clamp } from './math3d.js';

// Anatomical organ meshes are loaded from a local GLB. Teaching vessel routes
// share particle centerlines; physiological animation only updates uniforms.
const TAU=Math.PI*2;
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const scale=(a,s)=>a.map(v=>v*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const normalize=a=>scale(a,1/(Math.hypot(...a)||1));
const RED=[.80,.19,.19],BLUE=[.12,.38,.83];
const ANCHORS={brain:[1.0,3.6,.15],lungs:[-2.55,1.45,.15],heart:[.78,.28,.8],kidneys:[1.85,-1.55,.15]};
const VIEWS={whole:{target:[0,.5,0],distance:10.5},heart:{target:[.04,.32,.35],distance:3.8},lungs:{target:[0,.8,0],distance:8.7},brain:{target:[0,3.50,0],distance:3.8},kidneys:{target:[0,-1.98,0],distance:6.2},systemic:{target:[0,.25,0],distance:11.5}};

// Code-owned adult teaching topology, independent of licensed surface meshes.
export const CEREBRAL_TEACHING_GRAPH = Object.freeze({
  nodes: Object.freeze([
    'left-internal-carotid', 'right-internal-carotid', 'left-aca', 'right-aca',
    'anterior-communicating', 'left-mca', 'right-mca', 'left-pca', 'right-pca',
    'left-posterior-communicating', 'right-posterior-communicating', 'basilar',
    'left-vertebral', 'right-vertebral', 'aca-capillary-bed', 'mca-capillary-bed',
    'pca-capillary-bed', 'dural-venous-sinuses', 'internal-jugular-return',
  ]),
  edges: Object.freeze([
    ['left-internal-carotid', 'left-aca'], ['right-internal-carotid', 'right-aca'],
    ['left-aca', 'anterior-communicating'], ['anterior-communicating', 'right-aca'],
    ['left-internal-carotid', 'left-mca'], ['right-internal-carotid', 'right-mca'],
    ['left-internal-carotid', 'left-posterior-communicating'], ['right-internal-carotid', 'right-posterior-communicating'],
    ['left-posterior-communicating', 'left-pca'], ['right-posterior-communicating', 'right-pca'],
    ['left-vertebral', 'basilar'], ['right-vertebral', 'basilar'], ['basilar', 'left-pca'], ['basilar', 'right-pca'],
    ['left-aca', 'aca-capillary-bed'], ['right-aca', 'aca-capillary-bed'], ['left-mca', 'mca-capillary-bed'],
    ['right-mca', 'mca-capillary-bed'], ['left-pca', 'pca-capillary-bed'], ['right-pca', 'pca-capillary-bed'],
    ['aca-capillary-bed', 'dural-venous-sinuses'], ['mca-capillary-bed', 'dural-venous-sinuses'],
    ['pca-capillary-bed', 'dural-venous-sinuses'], ['dural-venous-sinuses', 'internal-jugular-return'],
  ]),
  labels: Object.freeze({
    'left-internal-carotid': 'Left internal carotid artery',
    'right-internal-carotid': 'Right internal carotid artery',
    'left-aca': 'Left anterior cerebral artery (ACA)',
    'right-aca': 'Right anterior cerebral artery (ACA)',
    'anterior-communicating': 'Anterior communicating artery (ACom)',
    'left-mca': 'Left middle cerebral artery (MCA)',
    'right-mca': 'Right middle cerebral artery (MCA)',
    'left-pca': 'Left posterior cerebral artery (PCA)',
    'right-pca': 'Right posterior cerebral artery (PCA)',
    'left-posterior-communicating': 'Left posterior communicating artery (PCom)',
    'right-posterior-communicating': 'Right posterior communicating artery (PCom)',
    basilar: 'Basilar artery',
    'left-vertebral': 'Left vertebral artery',
    'right-vertebral': 'Right vertebral artery',
    'aca-capillary-bed': 'ACA territory — schematic capillary bed',
    'mca-capillary-bed': 'MCA territory — schematic capillary bed',
    'pca-capillary-bed': 'PCA territory — schematic capillary bed',
    'dural-venous-sinuses': 'Dural venous sinuses — schematic venous return',
    'internal-jugular-return': 'Internal jugular venous return',
  }),
});

export const ANATOMICAL_ROUTE_COLLECTIONS = Object.freeze({
  arterial: Object.freeze(CEREBRAL_TEACHING_GRAPH.edges.slice(0, 20).map(([from, to]) => `${from}->${to}`)),
  venous: Object.freeze(CEREBRAL_TEACHING_GRAPH.edges.slice(20).map(([from,to])=>`${from}->${to}`)),
  urine: Object.freeze(['collecting-ducts->calyces', 'calyces->renal-pelvis', 'renal-pelvis->ureter', 'ureter->bladder', 'bladder->outlet']),
});

// Schematic basal arterial topology: +X is patient left, +Y superior, +Z anterior.
// The circle lies transversely below the cerebrum; these are not segmented vessels.
// Shared endpoints close the circle, and territory beds remain schematic summaries.
export const CEREBRAL_NODE_POSITIONS = Object.freeze({
  'left-internal-carotid':[.28,3.43,.35], 'right-internal-carotid':[-.28,3.43,.35],
  'left-aca':[.12,3.45,.52], 'right-aca':[-.12,3.45,.52],
  'anterior-communicating':[0,3.45,.54],
  'left-mca':[.67,3.47,.28], 'right-mca':[-.67,3.47,.28],
  'left-pca':[.24,3.41,-.10], 'right-pca':[-.24,3.41,-.10],
  'left-posterior-communicating':[.28,3.42,.12], 'right-posterior-communicating':[-.28,3.42,.12],
  // Source pons reaches Z +.195; its ventral surface faces anterior, not negative Z.
  basilar:[0,3.43,.24], 'left-vertebral':[.12,2.94,.24], 'right-vertebral':[-.12,2.94,.24],
  'aca-capillary-bed':[0,4.04,.70], 'mca-capillary-bed':[-.98,3.85,.63],
  'pca-capillary-bed':[.91,3.14,.64], 'dural-venous-sinuses':[0,4.25,.50],
  'internal-jugular-return':[1.10,2.94,.32],
});
export const URINE_NODE_POSITIONS = Object.freeze({
  'collecting-ducts':[1.48,-1.37,.48],calyces:[1.30,-1.57,.48],
  'renal-pelvis':[1.08,-1.78,.44],ureter:[1.00,-2.26,.32],
  bladder:[0,-2.70,.20],outlet:[0,-3.03,.20],
});
const URINE_LABELS={'collecting-ducts':'Collecting ducts (schematic)',calyces:'Renal calyces',
  'renal-pelvis':'Renal pelvis',ureter:'Ureter',bladder:'Bladder',outlet:'Urine outlet'};

export const ORGAN_OPACITY_KEYS = Object.freeze(['brain', 'lungs', 'kidneys']);
export const ORGAN_LABELS = Object.freeze({brain:'Brain',lungs:'Lungs',kidneys:'Kidneys',heart:'Heart'});

export const CIRCLE_OF_WILLIS_EDGES = Object.freeze([
  ['left-internal-carotid', 'left-aca'], ['right-internal-carotid', 'right-aca'],
  ['left-aca', 'anterior-communicating'], ['anterior-communicating', 'right-aca'],
  ['left-internal-carotid', 'left-posterior-communicating'], ['left-posterior-communicating', 'left-pca'],
  ['right-internal-carotid', 'right-posterior-communicating'], ['right-posterior-communicating', 'right-pca'],
  ['left-vertebral', 'basilar'], ['right-vertebral', 'basilar'], ['basilar', 'left-pca'], ['basilar', 'right-pca'],
]);

export function graphIsConnected(nodes, edges) {
  const seen = new Set([nodes[0]]), pending = [nodes[0]];
  while (pending.length) {
    const node = pending.pop();
    for (const [from, to] of edges) for (const next of from === node ? [to] : to === node ? [from] : []) if (!seen.has(next)) { seen.add(next); pending.push(next); }
  }
  return seen.size === nodes.length;
}

function geometry(){return {position:[],normal:[]};}
function triangle(g,a,b,c,na,nb,nc){
  if(dot(cross(sub(b,a),sub(c,a)),na)<0){[b,c]=[c,b];[nb,nc]=[nc,nb];}
  g.position.push(...a,...b,...c);g.normal.push(...na,...nb,...nc);
}
function curve(points,steps=12){
  const out=[];
  for(let k=0;k<points.length-1;k++){
    const p0=points[Math.max(0,k-1)],p1=points[k],p2=points[k+1],p3=points[Math.min(points.length-1,k+2)];
    for(let j=0;j<steps;j++){const t=j/steps,t2=t*t,t3=t2*t;out.push(p1.map((v,i)=>.5*(2*v+(-p0[i]+p2[i])*t+(2*p0[i]-5*v+4*p2[i]-p3[i])*t2+(-p0[i]+3*v-3*p2[i]+p3[i])*t3)));}
  }
  out.push([...points.at(-1)]);return out;
}
function tube(g,points,radius,sides=8){
  const rings=[];let previousNormal=null;
  for(let k=0;k<points.length;k++){
    const tangent=normalize(sub(points[Math.min(points.length-1,k+1)],points[Math.max(0,k-1)]));
    let normal=previousNormal?normalize(sub(previousNormal,scale(tangent,dot(previousNormal,tangent)))):normalize(cross(tangent,Math.abs(tangent[1])>.85?[1,0,0]:[0,1,0]));
    if(Math.hypot(...normal)<.1)normal=[1,0,0];previousNormal=normal;
    const binormal=normalize(cross(tangent,normal)),ring=[];
    for(let j=0;j<sides;j++){const a=j/sides*TAU,n=add(scale(normal,Math.cos(a)),scale(binormal,Math.sin(a)));ring.push({p:add(points[k],scale(n,radius)),n});}rings.push(ring);
  }
  for(let k=0;k<rings.length-1;k++)for(let j=0;j<sides;j++){const a=rings[k][j],b=rings[k][(j+1)%sides],c=rings[k+1][(j+1)%sides],d=rings[k+1][j];triangle(g,a.p,b.p,c.p,a.n,b.n,c.n);triangle(g,a.p,c.p,d.p,a.n,c.n,d.n);}
}
function ellipsoid(center,radii,rings=10,segments=16){
  const g=geometry();
  for(let r=0;r<rings;r++)for(let s=0;s<segments;s++){
    const a=Math.PI*r/rings,b=Math.PI*(r+1)/rings,c=TAU*s/segments,d=TAU*(s+1)/segments;
    const point=t=>[center[0]+radii[0]*Math.sin(t[0])*Math.cos(t[1]),center[1]+radii[1]*Math.cos(t[0]),center[2]+radii[2]*Math.sin(t[0])*Math.sin(t[1])];
    const normal=t=>normalize([Math.sin(t[0])*Math.cos(t[1])/radii[0],Math.cos(t[0])/radii[1],Math.sin(t[0])*Math.sin(t[1])/radii[2]]);
    const q=[[a,c],[a,d],[b,d],[b,c]],p=q.map(point),n=q.map(normal);
    triangle(g,p[0],p[1],p[2],n[0],n[1],n[2]);triangle(g,p[0],p[2],p[3],n[0],n[2],n[3]);
  }
  return g;
}
function compile(gl,type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(`3D shader initialization failed: ${message}`);}return shader;}
function program(gl,vertex,fragment){const p=gl.createProgram(),vs=compile(gl,gl.VERTEX_SHADER,vertex),fs=compile(gl,gl.FRAGMENT_SHADER,fragment);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('Could not link the 3D graphics program.');return p;}
// Model matrices contain translation and diagonal scale only; reciprocal scale
// is their inverse-transpose normal transform, including nonuniform respiration.
const vertexShader=`attribute vec3 position;attribute vec3 normal;uniform mat4 viewProjection;uniform mat4 model;varying vec3 vNormal;varying vec3 vWorld;void main(){vec4 world=model*vec4(position,1.0);vWorld=world.xyz;vNormal=normalize(normal/vec3(model[0][0],model[1][1],model[2][2]));gl_Position=viewProjection*world;}`;
const fragmentShader=`precision mediump float;
varying vec3 vNormal; varying vec3 vWorld;
uniform vec3 color; uniform vec3 eye;
uniform float alpha; uniform float glass; uniform float emissive; uniform float tissue;
void main(){
  vec3 n=normalize(vNormal), v=normalize(eye-vWorld);
  vec3 light=normalize(vec3(-3.0,5.0,5.0));
  float key=max(dot(n,light),0.0);
  float wrap=max((dot(n,light)+.35)/1.35,0.0);
  float fill=max(dot(n,normalize(vec3(4.0,1.0,-2.0))),0.0);
  float rim=pow(1.0-abs(dot(n,v)),3.0);
  float spec=pow(max(dot(n,normalize(light+v)),0.0),mix(42.0,28.0,tissue));
  // Subtle multi-scale pigmentation avoids a plastic, perfectly uniform surface.
  float grain=sin(vWorld.x*113.0+sin(vWorld.z*81.0))*sin(vWorld.y*127.0+sin(vWorld.x*57.0));
  float mottling=sin(vWorld.x*21.0+sin(vWorld.y*17.0))*sin(vWorld.z*26.0+vWorld.y*13.0);
  vec3 base=color*(1.0+tissue*(.025*grain+.055*mottling));
  vec3 lit=base*(.24+mix(key,wrap,tissue)*.78+fill*.18);
  lit+=vec3(1.0,.88,.79)*spec*mix(.30,.19,tissue);
  lit+=mix(vec3(.25,.48,.66),base*.28,tissue)*rim*.20+base*emissive;
  float opacity=mix(alpha,alpha*(.24+.76*rim),glass);
  gl_FragColor=vec4(lit,opacity);
}`;
const particleVertex=`attribute vec3 position;attribute vec3 color;attribute float size;uniform mat4 viewProjection;uniform float dpr;varying vec3 vColor;void main(){gl_Position=viewProjection*vec4(position,1.0);gl_PointSize=size*dpr;vColor=color;}`;
const particleFragment=`precision mediump float;varying vec3 vColor;void main(){float d=length(gl_PointCoord-vec2(.5))*2.0;if(d>1.0)discard;float glow=pow(1.0-d,1.6);gl_FragColor=vec4(vColor+vec3(.35)*pow(glow,4.0),glow*.95);}`;

export class AnatomyRenderer {
  constructor(canvas,{onSelect,onReady,onError}={}){
    this.canvas=canvas;this.onSelect=onSelect;this.gl=canvas.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true});
    if(!this.gl)throw new Error('WebGL is not available in this browser.');
    this.assets=[];this.routes=[];this.routeGraph=CEREBRAL_TEACHING_GRAPH;this.routeCollections=ANATOMICAL_ROUTE_COLLECTIONS;this.listeners=[];this.time=0;this.flowPhase=0;this.heartPhase=0;this.view='whole';this.colorMode='oxygenation';this.layers={particles:true,labels:true,vessels:true,transparent:false,opacity:{brain:1,lungs:1,kidneys:1}};this.metrics={hr:72,co:5,map:88,cvp:6,spo2:98,svo2:70,edv:120,ef:58,lungWater:0,svr:1300,renalFlow:1000,brainFlow:50,respiratoryRate:16};
    const gl=this.gl;this.uintIndices=gl.getExtension('OES_element_index_uint');this.program=program(gl,vertexShader,fragmentShader);this.pointProgram=program(gl,particleVertex,particleFragment);this.uniforms={};
    for(const key of ['viewProjection','model','color','eye','alpha','glass','emissive','tissue'])this.uniforms[key]=gl.getUniformLocation(this.program,key);
    this.attributes={position:gl.getAttribLocation(this.program,'position'),normal:gl.getAttribLocation(this.program,'normal')};
    this.pointUniforms={viewProjection:gl.getUniformLocation(this.pointProgram,'viewProjection'),dpr:gl.getUniformLocation(this.pointProgram,'dpr')};
    this.pointAttributes={position:gl.getAttribLocation(this.pointProgram,'position'),color:gl.getAttribLocation(this.pointProgram,'color'),size:gl.getAttribLocation(this.pointProgram,'size')};
    this._buildVessels();this._buildGrid();this._buildParticles();this.resetCamera();this._bindEvents();
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();
    this.assetController=new AbortController();
    this.ready=this._loadOrgans().then(()=>{if(!this.destroyed)onReady?.();}).catch(error=>{if(!this.destroyed)onError?.(error);});
  }
  _asset(g,options){
    const gl=this.gl;
    let indices=g.indices;
    if(indices&&g.position.length/3>65536&&!this.uintIndices){
      // WebGL 1 devices without 32-bit element indices retain the compatible path.
      const expanded={position:new Float32Array(indices.length*3),normal:new Float32Array(indices.length*3)};
      for(let i=0;i<indices.length;i++)for(let axis=0;axis<3;axis++)for(const key of ['position','normal'])expanded[key][i*3+axis]=g[key][indices[i]*3+axis];
      g=expanded;indices=null;
    }
    const asset={...options,count:indices?.length??g.position.length/3,buffers:{},model:mat4Identity()};
    for(const key of ['position','normal']){asset.buffers[key]=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,asset.buffers[key]);gl.bufferData(gl.ARRAY_BUFFER,g[key] instanceof Float32Array?g[key]:new Float32Array(g[key]),gl.STATIC_DRAW);}
    if(indices){
      const small=g.position.length/3<=65536;
      asset.indexType=small?gl.UNSIGNED_SHORT:gl.UNSIGNED_INT;
      asset.buffers.indices=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,asset.buffers.indices);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,small?new Uint16Array(indices):indices,gl.STATIC_DRAW);
    }
    this.assets.push(asset);return asset;
  }
  async _loadOrgans(){
    let manifest;
    try {
      const response=await fetch(new URL('../assets/organs/manifest.json',import.meta.url),{signal:this.assetController.signal});
      manifest=response.ok?await response.json():[];
    } catch { this.assetSource='schematic-fallback';this._buildFallbackOrgans();return; }
    const expectedNames=['brain','heart','kidney-left','kidney-right','lung-left','lung-right'];
    const manifestValid=Array.isArray(manifest)&&manifest.length===expectedNames.length&&
      expectedNames.every(name=>manifest.some(record=>record?.name===name));
    if(!manifestValid){this.assetSource='schematic-fallback-invalid-manifest';this._buildFallbackOrgans();return;}
    // The local educational preview may render the existing detailed mesh while
    // unresolved provenance still blocks release packaging. The release gate is
    // enforced separately by build.js and assertAssetReleaseAllowed().
    const provenanceBlocked=manifest.some(record=>record?.derivativeReleaseAllowed!==true||record?.provenanceStatus!=='reviewed');
    let meshes;
    try { meshes=await loadOrganAssets(new URL('../assets/organs/anatomy.glb',import.meta.url),{signal:this.assetController.signal}); }
    catch (error) {
      if (this.destroyed || this.assetController.signal.aborted) return;
      this.assetSource='schematic-fallback';this._buildFallbackOrgans();
      return;
    }
    this.assetSource=provenanceBlocked?'local-surface-bundle-provenance-blocked':'local-surface-bundle';
    this.canvas.dispatchEvent(new CustomEvent('anatomy-assets-ready',{bubbles:true,detail:{detailed:true,provenanceBlocked}}));
    if(this.destroyed)return;
    const organs={
      brain:{id:'brain',color:[.72,.56,.54],center:[0,3.62,0]},
      heart:{id:'heart',color:[.57,.20,.18],center:[.04,.42,.35]},
      'lung-right':{id:'lungs',color:[.68,.43,.43],center:[-1.68,1.13,0],side:-1},
      'lung-left':{id:'lungs',color:[.68,.43,.43],center:[1.68,1.13,0],side:1},
      'kidney-right':{id:'kidneys',color:[.49,.20,.16],center:[-1.32,-1.59,.08],side:-1},
      'kidney-left':{id:'kidneys',color:[.49,.20,.16],center:[1.32,-1.59,.08],side:1},
    };
    for(const name of Object.keys(organs))if(!meshes.some(mesh=>mesh.name===name))throw new Error(`Missing anatomical mesh: ${name}`);
    for(const mesh of meshes){
      const options=organs[mesh.name];
      const center=manifest.find(record=>record.name===mesh.name)?.center;
      const packagedCenter=Array.isArray(center)&&center.length===3&&center.every(Number.isFinite)?center:options?.center;
      if(options)this._asset(mesh,{...options,center:packagedCenter,tissue:true});
    }
  }
  _buildFallbackOrgans(){
    const shells=[['brain',[0,3.62,0],[1.18,.78,.78],[.72,.56,.54]],['heart',[.04,.42,.35],[.72,.88,.65],[.57,.20,.18]],['lungs',[-1.68,1.13,0],[.72,1.52,.90],[.68,.43,.43]],['lungs',[1.68,1.13,0],[.72,1.52,.90],[.68,.43,.43]],['kidneys',[-1.32,-1.59,.08],[.45,.76,.40],[.49,.20,.16]],['kidneys',[1.32,-1.59,.08],[.45,.76,.40],[.49,.20,.16]]];
    for(const [id,center,radii,color] of shells){
      const g=ellipsoid(center,radii,24,40),side=Math.sign(center[0]);
      for(let i=0;i<g.position.length;i+=3){
        let x=(g.position[i]-center[0])/radii[0],y=(g.position[i+1]-center[1])/radii[1],z=(g.position[i+2]-center[2])/radii[2];
        if(id==='brain'){
          // Midline fissure plus shallow gyri distinguish the schematic hemispheres.
          const fold=1+.035*Math.sin(y*20+z*9)*Math.sin(x*24);
          y*=fold;z*=fold*(1-.16*Math.exp(-x*x/ .007));
        }else if(id==='kidneys'){
          // Medial hilar indentation produces a bean silhouette on either side.
          x+=side*.48*Math.exp(-y*y/ .13)*Math.max(0,-x*side);
          z*=1-.20*Math.exp(-y*y/ .13)*Math.max(0,-x*side);
        }else if(id==='lungs'){
          x*=.88-.20*y; y+=.10*x*x;
          x+=side*.10*y;
        }else if(id==='heart'){x*=.88+.18*y;x+=.16*y;}
        g.position[i]=center[0]+x*radii[0];g.position[i+1]=center[1]+y*radii[1];g.position[i+2]=center[2]+z*radii[2];
      }
      // Recompute face normals after deformation; do not retain ellipsoid normals.
      for(let i=0;i<g.position.length;i+=9){const a=g.position.slice(i,i+3),b=g.position.slice(i+3,i+6),c=g.position.slice(i+6,i+9),n=normalize(cross(sub(b,a),sub(c,a)));for(let v=0;v<3;v++)for(let axis=0;axis<3;axis++)g.normal[i+v*3+axis]=n[axis];}
      this._asset(g,{id,center,color,tissue:true,procedural:true});
    }
  }
  _route(points,{radius=.065,oxygenated=true,group='systemic',flow=1,particles=true,id='vessels',color,name,semantic,territory}={}){
    const path=curve(points,10),g=geometry();tube(g,path,radius,radius>.08?12:8);const asset=this._asset(g,{id,color:color??(oxygenated?RED:BLUE),oxygenated,group,radius,name,semantic:semantic??(id==='urine'?'urine':group==='pulmonary'?(oxygenated?'venous':'arterial'):oxygenated?'arterial':'venous'),territory});
    if(particles){const distances=[0];for(let i=1;i<path.length;i++)distances.push(distances[i-1]+Math.hypot(...sub(path[i],path[i-1])));this.routes.push({path,distances,length:distances.at(-1),oxygenated,group,flow,radius,asset,name,semantic:asset.semantic,territory});}
  }
  _buildVessels(){
    const LV=[.43,.86,.18],RA=[-.47,.94,.22],RV=[-.26,.5,.77],LA=[.42,1.04,.10];
    this._route([LV,[.50,1.57,.33],[.31,2.08,.26],[-.12,2.10,.03],[-.27,1.66,-.38],[.25,.80,-.47],[.31,-.60,-.40],[.30,-2.65,-.24]],{radius:.115});
    this._route([[-.31,-2.65,-.15],[-.37,-1.35,-.2],[-.40,.16,-.23],RA],{radius:.135,oxygenated:false});
    for(const side of [-1,1]){
      this._route([RV,[-.13,1.23,.88],[side*.65,1.72,.48],[side*1.43,1.58,.2]],{radius:.09,oxygenated:false,group:'pulmonary'});
      this._route([[side*1.58,.65,.18],[side*.98,.99,.09],LA],{radius:.071,oxygenated:true,group:'pulmonary'});
      for(let j=0;j<6;j++){
        const y=.05+j*.43,outer=side*(1.86+.16*Math.sin(j)),z=.22+.15*Math.cos(j);
        this._route([[side*1.43,1.58,.2],[side*1.61,(1.58+y)/2,.16],[outer,y,z]],{radius:.027,oxygenated:false,group:'pulmonary',flow:.35});
        this._route([[outer+.045*side,y-.045,z],[side*1.72,(y+.65)/2,.26],[side*1.58,.65,.18]],{radius:.020,oxygenated:true,group:'pulmonary',flow:.32});
        for(let branch=0;branch<3;branch++){const end=[outer+side*(.17+branch*.06),y+(branch-1)*.15,z+.07*Math.sin(branch+j)];this._route([[outer,y,z],end],{radius:.009,oxygenated:false,group:'pulmonary',flow:.14,particles:false});this._route([end,[outer+.045*side,y-.045,z]],{radius:.008,oxygenated:true,group:'pulmonary',flow:.14,particles:false});}
      }
      this._route([[.31,-1.15,-.37],[side*.76,-1.30,.07],[side*1.10,-1.51,.23]],{radius:.059,group:'renal',flow:.55});
      this._route([[side*1.08,-1.64,.26],[side*.66,-1.70,.05],[-.37,-1.35,-.2]],{radius:.071,oxygenated:false,group:'renal',flow:.55});
      for(let j=0;j<5;j++){
        const bed=[side*(1.35+.18*Math.sin(j)),-1.20-j*.14,.34];
        this._route([[side*1.10,-1.51,.23],bed],{radius:.014,group:'renal',name:`${side}-renal-capillary-in-${j}`,flow:.20});
        this._route([bed,[side*1.08,-1.64,.26]],{radius:.012,group:'renal',oxygenated:false,name:`${side}-renal-capillary-return-${j}`,flow:.20});
      }
      this._route([[.30,-2.65,-.24],[side*.87,-2.83,-.13],[side*1.60,-2.74,.02],[side*1.91,-2.29,.03]],{radius:.065,flow:.65});
      this._route([[side*1.91,-2.29,.03],[side*1.67,-2.95,-.20],[side*.62,-3.01,-.29],[-.31,-2.65,-.15]],{radius:.077,oxygenated:false,flow:.65});
    }
    this._route([RA,[-.56,.56,.58],RV],{radius:.076,oxygenated:false,group:'heart'});this._route([LA,[.44,.62,.35],LV],{radius:.075,group:'heart'});this._buildCerebralRoutes();this._buildUrineRoutes();
  }
  _buildCerebralRoutes(){
    CEREBRAL_TEACHING_GRAPH.edges.forEach(([from,to],index)=>{
      const semantic=index>=20?'venous':'arterial';
      const territory=['aca','mca','pca'].find(t=>from.includes(t)||to.includes(t));
      this._route([CEREBRAL_NODE_POSITIONS[from],CEREBRAL_NODE_POSITIONS[to]],{
        radius:index>=14?.016:.026,group:'brain',semantic,oxygenated:semantic==='arterial',
        name:`${from}->${to}`,territory,flow:.55,
      });
    });
    for(const side of [-1,1])this._route([[.12,2.10,.12],[side*.35,2.59,.24],CEREBRAL_NODE_POSITIONS[side<0?'right-internal-carotid':'left-internal-carotid']],{radius:.045,group:'brain',name:`${side}-carotid-inflow`});
    this._route([CEREBRAL_NODE_POSITIONS['internal-jugular-return'],[.85,2.48,.12],[-.47,.94,.22]],{radius:.047,group:'brain',oxygenated:false,name:'jugular-systemic-return'});
    for(const name of ['aca-capillary-bed','mca-capillary-bed','pca-capillary-bed']){
      const center=CEREBRAL_NODE_POSITIONS[name];
      for(let j=0;j<3;j++)this._route([add(center,[-.10,j*.035,0]),add(center,[.10,j*.035,0])],{radius:.009,group:'brain',name:`${name}-${j}`,territory:name.slice(0,3),flow:.15});
    }
  }
  _buildUrineRoutes(){
    for(const side of [-1,1])for(const edge of ANATOMICAL_ROUTE_COLLECTIONS.urine){
      const [from,to]=edge.split('->');
      // A single shared bladder outlet; both ureters converge at the same node.
      if(side<0&&from==='bladder')continue;
      const point=name=>URINE_NODE_POSITIONS[name].map((v,i)=>i===0?v*side:v);
      this._route([point(from),point(to)],{radius:.029,group:'urine',id:'urine',semantic:'urine',name:`${side}:${edge}`,color:[.88,.76,.26],flow:.45});
    }
    this._asset(ellipsoid(URINE_NODE_POSITIONS.bladder,[.20,.18,.13]),{id:'urine',group:'urine',semantic:'urine',color:[.88,.76,.26],name:'bladder-reservoir'});
  }
  _buildGrid(){const g=geometry();for(let i=-12;i<=12;i++){g.position.push(i*.55,-3.25,-6,i*.55,-3.25,6,-6,-3.25,i*.55,6,-3.25,i*.55);for(let n=0;n<4;n++)g.normal.push(0,1,0);}this._asset(g,{id:'grid',color:[.15,.32,.44],lines:true});}
  _buildParticles(){
    this.particles=[];this.routes.forEach((route,index)=>{const count=Math.max(3,Math.round(route.length*(route.radius>.05?11:4)));for(let j=0;j<count;j++)this.particles.push({route,phase:(j+.37*Math.sin(index*7+j))/count,size:route.radius>.05?4.2:2.8});});
    const gl=this.gl,count=this.particles.length;this.particleArrays={position:new Float32Array(count*3),color:new Float32Array(count*3),size:new Float32Array(count)};this.particleBuffers={};for(const key of ['position','color','size']){this.particleBuffers[key]=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.particleBuffers[key]);gl.bufferData(gl.ARRAY_BUFFER,this.particleArrays[key],gl.DYNAMIC_DRAW);}
  }
  _bindEvents(){
    const on=(type,fn,options)=>{this.canvas.addEventListener(type,fn,options);this.listeners.push([type,fn,options]);};
    on('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};this.canvas.setPointerCapture(e.pointerId);});
    on('pointermove',e=>{if(!this.drag)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;this.drag.moved ||= Math.hypot(e.clientX-this.drag.startX,e.clientY-this.drag.startY)>4;this.yaw-=dx*.007;this.pitch=clamp(this.pitch+dy*.005,-.75,.9);this.drag.x=e.clientX;this.drag.y=e.clientY;});
    on('pointerup',e=>{if(this.drag&&!this.drag.moved)this._pick(e);this.drag=null;});on('pointercancel',()=>this.drag=null);on('lostpointercapture',()=>this.drag=null);
    on('wheel',e=>{e.preventDefault();this.distance=clamp(this.distance*Math.exp(e.deltaY*.001),3,24);},{passive:false});
    on('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')this.yaw-=.1;if(e.key==='ArrowRight')this.yaw+=.1;if(e.key==='ArrowUp')this.pitch=clamp(this.pitch+.1,-.75,.9);if(e.key==='ArrowDown')this.pitch=clamp(this.pitch-.1,-.75,.9);if(e.key==='+')this.distance=clamp(this.distance-.5,3,24);if(e.key==='-')this.distance=clamp(this.distance+.5,3,24);}});
    on('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;this.canvas.dispatchEvent(new CustomEvent('graphics-reload-needed'));});
  }
  _pick(event){
    if(!this.vp)return;const rect=this.canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top,centers={brain:[0,3.62,0],lungs:[-1.68,1.13,0],heart:[.04,.42,.55],kidneys:[1.32,-1.59,.08]};let best=65,id=null;
    for(const [key,center]of Object.entries(centers)){const p=projectPoint(this.vp,center,rect.width,rect.height),d=Math.hypot(p[0]-x,p[1]-y);if(d<best){best=d;id=key;}if(key==='lungs'||key==='kidneys'){const q=projectPoint(this.vp,[-center[0],center[1],center[2]],rect.width,rect.height),dd=Math.hypot(q[0]-x,q[1]-y);if(dd<best){best=dd;id=key;}}}if(id)this.onSelect?.(id);
  }
  _color(asset){
    if(asset.id==='urine')return asset.color;if(asset.id!=='vessels')return asset.color;const m=this.metrics;
    if(this.colorMode==='pressure'){const p=asset.oxygenated?(asset.group==='pulmonary'?Math.max(10,m.cvp+5):m.map):asset.group==='pulmonary'?m.cvp+4+m.co*m.pvr/80:m.cvp;return mix([.12,.35,.88],[1,.33,.24],clamp(p/130,0,1));}
    if(this.colorMode==='flow'){const local=asset.group==='renal'?(m.renalFlow??900)/900:asset.group==='brain'?(m.brainFlow??50)/50:1;return mix([.12,.30,.48],[.48,1,.72],clamp(m.co/8*local,0,1));}
    return mix([.08,.28,.77],[.95,.22,.20],clamp(((asset.oxygenated?m.spo2:m.svo2)/100-.78)/.20,0,1));
  }
  _model(asset){
    if(!asset.center)return mat4Identity();const m=this.metrics;let s=1,sy=1;
    if(asset.id==='heart'){s=Math.cbrt(clamp((m.edv||120)/120,.7,1.5))*(1-.065*this.beat);if(asset.chamber==='rv'||asset.chamber==='ra')s*=1+clamp((m.cvp-6)/90,0,.2);sy=s;}
    if(asset.id==='lungs'){s=1+.025*Math.sin(this.time*(m.respiratoryRate||16)/60*TAU)+clamp((m.lungWater||0)/150,0,.13);sy=1+(s-1)*.6;}
    const c=asset.center,out=mat4Identity();out[0]=s;out[5]=sy;out[10]=s;out[12]=c[0]*(1-s);out[13]=c[1]*(1-sy);out[14]=c[2]*(1-s);return out;
  }
  _routeRate(route){
    if(route.semantic==='urine')return clamp((this.metrics.urineOutput??60)/60,0,3);
    if(route.group==='brain'){
      const fraction={aca:.25,mca:.5,pca:.25}[route.territory];
      return fraction&&this.metrics.cerebralTerritories?clamp((this.metrics.cerebralTerritories[route.territory]??0)/(50*fraction),0,3):clamp((this.metrics.brainFlow??50)/50,0,3);
    }
    if(route.group==='renal')return clamp((this.metrics.renalFlow??900)/900,0,3);
    return clamp(this.metrics.co/5,0,3);
  }
  update(metrics,dt=0){
    if(this.destroyed||this.contextLost)return;
    Object.assign(this.metrics,metrics);const elapsed=Number.isFinite(dt)?Math.max(0,dt):0;
    this.time+=elapsed;this.heartPhase+=elapsed*this.metrics.hr/60;this.beat=Math.pow(Math.max(0,Math.sin(this.heartPhase*TAU)),3);
    for(const r of this.routes)r.phase=((r.phase||0)+elapsed*.44*r.flow*this._routeRate(r)/r.length)%1;
    this._draw();
  }
  // Synchronize only while the app is genuinely loading. Never stall live frames.
  finishPreparationFrame(){if(!this.destroyed&&!this.contextLost)this.gl.finish();}
  _draw(){
    const gl=this.gl;if(!this.projection)return;const cp=Math.cos(this.pitch),eye=[this.target[0]+Math.sin(this.yaw)*cp*this.distance,this.target[1]+Math.sin(this.pitch)*this.distance,this.target[2]+Math.cos(this.yaw)*cp*this.distance];this.vp=mat4Multiply(this.projection,mat4LookAt(eye,this.target));
    gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.depthMask(true);gl.useProgram(this.program);gl.uniformMatrix4fv(this.uniforms.viewProjection,false,this.vp);gl.uniform3fv(this.uniforms.eye,eye);
    const draw=asset=>{
      // Urine geometry is its own semantic collection, but shares the renal camera.
      
      if((asset.id==='vessels'||asset.id==='urine')&&!this.layers.vessels)return;
      if((asset.id==='vessels'||asset.id==='urine')&&!['whole','systemic'].includes(this.view)){const group={heart:'heart',lungs:'pulmonary',brain:'brain',kidneys:'renal'}[this.view];if(asset.group!==group&&!(this.view==='kidneys'&&asset.group==='urine'))return;}if(asset.id==='grid'&&this.view!=='whole'&&this.view!=='systemic')return;
      if(!(this.view==='whole'||this.view==='systemic'||this.view===asset.id||asset.id==='vessels'||asset.id==='urine'))return;
      let alpha=asset.id==='grid'?.27:1,glass=0;if(asset.tissue){const opacity=this.layers.opacity?.[asset.id]??1;alpha=opacity;glass=opacity<.999?.18:0;}if(asset.id==='vessels'||asset.id==='urine')alpha=1;
      for(const key of ['position','normal']){gl.bindBuffer(gl.ARRAY_BUFFER,asset.buffers[key]);gl.enableVertexAttribArray(this.attributes[key]);gl.vertexAttribPointer(this.attributes[key],3,gl.FLOAT,false,0,0);}
      gl.uniformMatrix4fv(this.uniforms.model,false,this._model(asset));let color=this._color(asset);if(asset.id==='lungs'&&(this.metrics.lungWater||0)>2)color=mix(color,[.55,.40,.40],clamp(this.metrics.lungWater/15,0,.65));gl.uniform3fv(this.uniforms.color,color);gl.uniform1f(this.uniforms.alpha,alpha);gl.uniform1f(this.uniforms.glass,glass);gl.uniform1f(this.uniforms.emissive,asset.id==='vessels'?.10:0);gl.uniform1f(this.uniforms.tissue,asset.tissue?1:0);if(asset.indexType){gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,asset.buffers.indices);gl.drawElements(gl.TRIANGLES,asset.count,asset.indexType,0);}else gl.drawArrays(asset.lines?gl.LINES:gl.TRIANGLES,0,asset.count);
    };
    this.assets.filter(a=>a.id!=='vessels'&&a.id!=='urine'&&!(a.tissue&&(this.layers.opacity?.[a.id]??1)<1)).forEach(draw);
    this.assets.filter(a=>a.id==='vessels'||a.id==='urine').forEach(draw);
    gl.depthMask(false);
    this.assets.filter(a=>a.tissue&&(this.layers.opacity?.[a.id]??1)<1).sort((a,b)=>Math.hypot(...sub(b.center,eye))-Math.hypot(...sub(a.center,eye))).forEach(draw);
    if(this.layers.particles)this._drawParticles();gl.depthMask(true);
  }
  _drawParticles(){
    const gl=this.gl,a=this.particleArrays;
    this.particles.forEach((particle,index)=>{
      
      const r=particle.route,t=((particle.phase+(r.phase||0))%1+1)%1,dist=t*r.length;
      let lo=0,hi=r.distances.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(r.distances[mid]<dist)lo=mid;else hi=mid;}
      const f=(dist-r.distances[lo])/(r.distances[hi]-r.distances[lo]||1),p=mix(r.path[lo],r.path[hi],f),color=this._color(r.asset);for(let k=0;k<3;k++){a.position[index*3+k]=p[k];a.color[index*3+k]=Math.min(1,color[k]*1.35+.12);}const group={heart:'heart',lungs:'pulmonary',brain:'brain',kidneys:'renal'}[this.view];const visible=(!group||r.group===group||(this.view==='kidneys'&&r.group==='urine'));a.size[index]=visible?particle.size:0;
    });
    gl.useProgram(this.pointProgram);gl.uniformMatrix4fv(this.pointUniforms.viewProjection,false,this.vp);gl.uniform1f(this.pointUniforms.dpr,this.dpr);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.disable(gl.CULL_FACE);
    for(const key of ['position','color','size']){gl.bindBuffer(gl.ARRAY_BUFFER,this.particleBuffers[key]);gl.bufferSubData(gl.ARRAY_BUFFER,0,a[key]);gl.enableVertexAttribArray(this.pointAttributes[key]);gl.vertexAttribPointer(this.pointAttributes[key],key==='size'?1:3,gl.FLOAT,false,0,0);}gl.drawArrays(gl.POINTS,0,this.particles.length);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);for(const key of ['position','color','size'])gl.disableVertexAttribArray(this.pointAttributes[key]);
  }
  setView(view){if(!VIEWS[view])return;this.view=view;this.resetCamera();if(this.assetSource?.startsWith('local-surface-bundle'))this.canvas.dispatchEvent(new CustomEvent('anatomy-assets-ready',{bubbles:true,detail:{detailed:true,provenanceBlocked:this.assetSource.endsWith('provenance-blocked')}}));}
  setLayers(layers){for(const key of ['particles','labels','vessels','transparent'])if(typeof layers[key]==='boolean')this.layers[key]=layers[key];if(layers.opacity&&typeof layers.opacity==='object')for(const key of ORGAN_OPACITY_KEYS)if(Number.isFinite(layers.opacity[key]))this.layers.opacity[key]=clamp(layers.opacity[key],0,1);}
  setColorMode(mode){if(['oxygenation','pressure','flow'].includes(mode))this.colorMode=mode;}
  resetCamera(){const view=VIEWS[this.view||'whole'];this.target=[...view.target];this.distance=view.distance;this.yaw=-.035;this.pitch=.04;this._fitCamera();}
  _fitCamera(){const aspect=(this.canvas.clientWidth||600)/(this.canvas.clientHeight||600);const width={whole:7,systemic:7,heart:2.1,brain:3.2,lungs:5.8,kidneys:4.4}[this.view];this.distance=Math.max(VIEWS[this.view].distance,width/(2*Math.tan(22*Math.PI/180)*aspect));if(this.view==='brain')this.target[0]=this.canvas.clientWidth>600?.45:0;}
  resize(){const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(rect.width*this.dpr);this.canvas.height=Math.round(rect.height*this.dpr);this.projection=mat4Perspective(44*Math.PI/180,rect.width/rect.height,.1,60);this._fitCamera();}
  getLabels(){
    if(!this.vp)return[];
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight;
    const project=(id,text,position,organ,kind='organ')=>{
      const q=projectPoint(this.vp,position,w,h);
      return{id,text,organ,kind,x:q[0]/w,y:q[1]/h,anchorX:q[0]/w,anchorY:q[1]/h,
        visible:this.layers.labels&&q[2]>-1&&q[2]<1};
    };
    if(['whole','systemic','heart'].includes(this.view))return Object.entries(ANCHORS)
      .filter(([id])=>this.view!=='heart'||id==='heart').map(([id,p])=>project(id,ORGAN_LABELS[id],p,id));
    const status=(value,unit)=>`${Number.isFinite(value)?value.toFixed(1):'0.0'} ${unit} · ${value<=.01?'■ No flow':value<1?'▰ Low flow':'→ Flow'}`;
    let labels=[];
    if(this.view==='brain'){
      labels=CEREBRAL_TEACHING_GRAPH.nodes.map(id=>project(id,CEREBRAL_TEACHING_GRAPH.labels[id],CEREBRAL_NODE_POSITIONS[id],'brain','anatomy'));
      labels.push(project('brain-flow',`Cerebral proxy: ${status(this.metrics.brainFlow,'mL/100 g/min')}`,[0,3.5,.84],'brain','flow'));
    }else if(this.view==='kidneys'){
      labels=Object.entries(URINE_NODE_POSITIONS).map(([id,p])=>project(id,URINE_LABELS[id],p,'kidneys','anatomy'));
      labels.push(project('renal-bed',`Schematic renal blood bed: ${status(this.metrics.renalFlow,'mL/min')}`,[-1.40,-1.50,.3],'kidneys','flow'));
      labels.push(project('urine-flow',`Separate urine outflow: ${status(this.metrics.urineOutput,'mL/h')}`,[-.35,-3.03,.20],'kidneys','flow'));
    }else if(this.view==='lungs'){
      labels=[project('pulmonary-bed','Pulmonary vessels → schematic capillary bed',[-1.85,1.1,.3],'lungs','anatomy'),
        project('pulmonary-flow',`Pulmonary blood flow: ${status(this.metrics.co,'L/min')}`,[1.85,1.1,.3],'lungs','flow')];
    }
    // A stable, numbered key is inspectable without placing long names over vessels.
    return labels.map((label,index)=>({...label,index:index+1,x:.02,y:.12+index*.035,visible:this.layers.labels}));
  }
  destroy(){this.destroyed=true;this.assetController.abort();this.resizeObserver.disconnect();for(const[type,fn,options]of this.listeners)this.canvas.removeEventListener(type,fn,options);for(const asset of this.assets)for(const buffer of Object.values(asset.buffers))this.gl.deleteBuffer(buffer);for(const buffer of Object.values(this.particleBuffers))this.gl.deleteBuffer(buffer);this.gl.deleteProgram(this.program);this.gl.deleteProgram(this.pointProgram);}
}
