import { loadRegisteredVasculature } from './vascular-registration.js';
import { SYSTEMIC_VASCULAR_ROUTES } from './vascular-routes.js';
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
// Approximate base-to-apex direction for the heart's long axis (patient-left,
// anteroinferior tilt), used to drive apex torsion independent of how the
// tissue's bounding box happens to be oriented. Schematic, not measured.
const HEART_TWIST_AXIS=Object.freeze(normalize([.22,-1,.32]));
const ANCHORS={brain:[1.0,3.6,.15],lungs:[-2.55,1.45,.15],heart:[.78,.28,.8],kidneys:[1.85,-1.55,.15]};
const VIEWS={whole:{target:[0,.5,0],distance:10.5},heart:{target:[.04,.32,.35],distance:3.8},lungs:{target:[0,.8,0],distance:8.7},brain:{target:[0,3.50,0],distance:3.8},kidneys:{target:[0,-1.98,0],distance:6.2},systemic:{target:[0,.25,0],distance:11.5}};

// Code-owned adult teaching topology, independent of licensed surface meshes.
export const CEREBRAL_TEACHING_GRAPH = Object.freeze({
  nodes: Object.freeze([
    'left-internal-carotid', 'right-internal-carotid', 'left-aca', 'right-aca',
    'anterior-communicating', 'left-mca', 'right-mca', 'left-pca', 'right-pca',
    'left-posterior-communicating', 'right-posterior-communicating', 'basilar',
    'left-vertebral', 'right-vertebral', 'vertebrobasilar-junction',
    'left-aca-capillary-bed', 'right-aca-capillary-bed',
    'left-mca-capillary-bed', 'right-mca-capillary-bed',
    'left-pca-capillary-bed', 'right-pca-capillary-bed',
    'superior-sagittal-sinus', 'straight-sinus', 'left-transverse-sinus',
    'right-transverse-sinus', 'left-sigmoid-sinus', 'right-sigmoid-sinus',
    'left-internal-jugular-return', 'right-internal-jugular-return',
    // Legacy aggregate ids remain visible for saved sessions and label consumers.
    'aca-capillary-bed', 'mca-capillary-bed', 'pca-capillary-bed',
    'dural-venous-sinuses', 'internal-jugular-return',
  ]),
  edges: Object.freeze([
    ['left-internal-carotid', 'left-aca'], ['right-internal-carotid', 'right-aca'],
    ['left-aca', 'anterior-communicating'], ['anterior-communicating', 'right-aca'],
    ['left-internal-carotid', 'left-mca'], ['right-internal-carotid', 'right-mca'],
    ['left-internal-carotid', 'left-posterior-communicating'], ['right-internal-carotid', 'right-posterior-communicating'],
    ['left-posterior-communicating', 'left-pca'], ['right-posterior-communicating', 'right-pca'],
    ['left-vertebral', 'vertebrobasilar-junction'], ['right-vertebral', 'vertebrobasilar-junction'], ['vertebrobasilar-junction', 'basilar'], ['basilar', 'left-pca'], ['basilar', 'right-pca'],
    ['left-aca', 'left-aca-capillary-bed'], ['right-aca', 'right-aca-capillary-bed'],
    ['left-mca', 'left-mca-capillary-bed'], ['right-mca', 'right-mca-capillary-bed'],
    ['left-pca', 'left-pca-capillary-bed'], ['right-pca', 'right-pca-capillary-bed'],
    ['left-aca-capillary-bed', 'superior-sagittal-sinus'], ['right-aca-capillary-bed', 'superior-sagittal-sinus'],
    ['left-mca-capillary-bed', 'left-transverse-sinus'], ['right-mca-capillary-bed', 'right-transverse-sinus'],
    ['left-pca-capillary-bed', 'left-transverse-sinus'], ['right-pca-capillary-bed', 'right-transverse-sinus'],
    ['superior-sagittal-sinus', 'confluence-of-sinuses'], ['straight-sinus', 'confluence-of-sinuses'],
    ['confluence-of-sinuses', 'left-transverse-sinus'], ['confluence-of-sinuses', 'right-transverse-sinus'],
    ['left-transverse-sinus', 'left-sigmoid-sinus'], ['right-transverse-sinus', 'right-sigmoid-sinus'],
    ['left-sigmoid-sinus', 'left-internal-jugular-return'], ['right-sigmoid-sinus', 'right-internal-jugular-return'],
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
    'vertebrobasilar-junction': 'Vertebrobasilar junction',
    'left-aca-capillary-bed': 'Left ACA territory — schematic capillary bed',
    'right-aca-capillary-bed': 'Right ACA territory — schematic capillary bed',
    'left-mca-capillary-bed': 'Left MCA territory — schematic capillary bed',
    'right-mca-capillary-bed': 'Right MCA territory — schematic capillary bed',
    'left-pca-capillary-bed': 'Left PCA territory — schematic capillary bed',
    'right-pca-capillary-bed': 'Right PCA territory — schematic capillary bed',
    'superior-sagittal-sinus': 'Superior sagittal sinus', 'straight-sinus': 'Straight sinus', 'confluence-of-sinuses': 'Confluence of sinuses',
    'left-transverse-sinus': 'Left transverse sinus', 'right-transverse-sinus': 'Right transverse sinus',
    'left-sigmoid-sinus': 'Left sigmoid sinus', 'right-sigmoid-sinus': 'Right sigmoid sinus',
    'left-internal-jugular-return': 'Left internal jugular venous return',
    'right-internal-jugular-return': 'Right internal jugular venous return',
    'aca-capillary-bed': 'ACA territories — schematic capillary bed',
    'mca-capillary-bed': 'MCA territories — schematic capillary bed',
    'pca-capillary-bed': 'PCA territories — schematic capillary bed',
    'dural-venous-sinuses': 'Dural venous sinuses',
    'internal-jugular-return': 'Internal jugular veins',
  }),
});

const cerebralVenousEdge = ([from, to]) => /sinus|jugular/.test(from) || /sinus|jugular/.test(to);
export const ANATOMICAL_ROUTE_COLLECTIONS = Object.freeze({
  arterial: Object.freeze(CEREBRAL_TEACHING_GRAPH.edges.filter(edge => !cerebralVenousEdge(edge)).map(([from, to]) => `${from}->${to}`)),
  venous: Object.freeze(CEREBRAL_TEACHING_GRAPH.edges.filter(cerebralVenousEdge).map(([from,to])=>`${from}->${to}`)),
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
  basilar:[0,3.43,.24], 'left-vertebral':[.12,2.94,.24], 'right-vertebral':[-.12,2.94,.24], 'vertebrobasilar-junction':[0,3.16,.24],
  'left-aca-capillary-bed':[.25,4.08,.68], 'right-aca-capillary-bed':[-.25,4.08,.68],
  'left-mca-capillary-bed':[.72,3.86,.42], 'right-mca-capillary-bed':[-.72,3.86,.42],
  'left-pca-capillary-bed':[.42,3.85,-.85], 'right-pca-capillary-bed':[-.42,3.85,-.85],
  'superior-sagittal-sinus':[0,4.48,.05], 'straight-sinus':[0,3.88,-.55], 'confluence-of-sinuses':[0,3.66,-.70],
  'left-transverse-sinus':[.55,3.55,-.66], 'right-transverse-sinus':[-.55,3.55,-.66],
  'left-sigmoid-sinus':[.42,3.18,-.34], 'right-sigmoid-sinus':[-.42,3.18,-.34],
  'left-internal-jugular-return':[.35,3.00,-.18], 'right-internal-jugular-return':[-.35,3.00,-.18],
  // Kept as non-rendered aggregate label anchors for compatibility.
  'aca-capillary-bed':[0,4.04,.70], 'mca-capillary-bed':[0,3.85,.63],
  'pca-capillary-bed':[0,3.14,-.04], 'dural-venous-sinuses':[0,4.30,.05],
  'internal-jugular-return':[0,2.82,.18],
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
// A separate, optional twist deformation (apex torsion) is applied in object
// space before this model matrix, so it composes with that diagonal scale
// instead of requiring a full inverse-transpose normal matrix.
const vertexShader=`attribute vec3 position;attribute vec3 normal;
uniform mat4 viewProjection;uniform mat4 model;
uniform float twistEnabled;uniform float twistAngle;uniform vec3 twistAxis;uniform vec3 twistCenter;uniform float twistHalfExtent;
varying vec3 vNormal;varying vec3 vWorld;
vec3 rotateAboutAxis(vec3 v,vec3 axis,float angle){float c=cos(angle),s=sin(angle);return v*c+cross(axis,v)*s+axis*dot(axis,v)*(1.0-c);}
void main(){
  vec3 localPosition=position,localNormal=normal;
  if(twistEnabled>0.5){
    // Torsion ramps linearly with signed distance along the long axis from its
    // pivot, so the apex rotates more than the base -- a real myocardial twist,
    // not a rigid rotation of the whole chamber.
    vec3 offset=position-twistCenter;
    float h=clamp(dot(offset,twistAxis)/twistHalfExtent,-1.0,1.0);
    float angle=twistAngle*h;
    localPosition=rotateAboutAxis(offset,twistAxis,angle)+twistCenter;
    localNormal=rotateAboutAxis(normal,twistAxis,angle);
  }
  vec4 world=model*vec4(localPosition,1.0);
  vWorld=world.xyz;
  vNormal=normalize(localNormal/vec3(model[0][0],model[1][1],model[2][2]));
  gl_Position=viewProjection*world;
}`;
const fragmentShader=`precision mediump float;
varying vec3 vNormal; varying vec3 vWorld;
uniform vec3 color; uniform vec3 eye;
uniform float alpha; uniform float glass; uniform float emissive; uniform float tissue;
uniform float clipEnabled; uniform vec3 clipNormal; uniform float clipDistance;
void main(){
  if(clipEnabled>0.5 && dot(vWorld,clipNormal)>clipDistance) discard;
  // Cross-section mode disables face culling so the cut opens into an interior
  // wall instead of a hole; that back-facing wall is shaded as solid cut tissue.
  bool cut=clipEnabled>0.5 && !gl_FrontFacing;
  vec3 n=normalize(vNormal); if(cut)n=-n;
  vec3 v=normalize(eye-vWorld);
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
  if(cut)base=mix(base,vec3(.58,.15,.13),.5);
  vec3 lit=base*(.24+mix(key,wrap,tissue)*.78+fill*.18);
  lit+=vec3(1.0,.88,.79)*spec*mix(.30,.19,tissue);
  lit+=mix(vec3(.25,.48,.66),base*.28,tissue)*rim*.20+base*emissive;
  float opacity=cut?1.0:mix(alpha,alpha*(.24+.76*rim),glass);
  gl_FragColor=vec4(lit,opacity);
}`;
const particleVertex=`attribute vec3 position;attribute vec3 color;attribute float size;uniform mat4 viewProjection;uniform float dpr;varying vec3 vColor;void main(){gl_Position=viewProjection*vec4(position,1.0);gl_PointSize=size*dpr;vColor=color;}`;
const particleFragment=`precision mediump float;varying vec3 vColor;void main(){float d=length(gl_PointCoord-vec2(.5))*2.0;if(d>1.0)discard;float glow=pow(1.0-d,1.6);gl_FragColor=vec4(vColor+vec3(.35)*pow(glow,4.0),glow*.95);}`;

export class AnatomyRenderer {
  constructor(canvas,{onSelect,onReady,onError}={}){
    this.canvas=canvas;this.onSelect=onSelect;this.gl=canvas.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:true,preserveDrawingBuffer:true});
    if(!this.gl)throw new Error('WebGL is not available in this browser.');
    this.assets=[];this.routes=[];this.routeGraph=CEREBRAL_TEACHING_GRAPH;this.routeCollections=ANATOMICAL_ROUTE_COLLECTIONS;this.listeners=[];this.time=0;this.flowPhase=0;this.heartPhase=0;this.view='whole';this.colorMode='oxygenation';this.layers={particles:true,labels:true,vessels:true,transparent:false,opacity:{brain:1,lungs:1,kidneys:1}};this.clip={enabled:false,axis:'x',t:.5,flip:false};this.metrics={hr:72,co:5,map:88,cvp:6,spo2:98,svo2:70,edv:120,ef:58,lungWater:0,svr:1300,renalFlow:1000,brainFlow:50,respiratoryRate:16};
    const gl=this.gl;this.uintIndices=gl.getExtension('OES_element_index_uint');this.program=program(gl,vertexShader,fragmentShader);this.pointProgram=program(gl,particleVertex,particleFragment);this.uniforms={};
    for(const key of ['viewProjection','model','color','eye','alpha','glass','emissive','tissue','clipEnabled','clipNormal','clipDistance','twistEnabled','twistAngle','twistAxis','twistCenter','twistHalfExtent'])this.uniforms[key]=gl.getUniformLocation(this.program,key);
    this.attributes={position:gl.getAttribLocation(this.program,'position'),normal:gl.getAttribLocation(this.program,'normal')};
    this.pointUniforms={viewProjection:gl.getUniformLocation(this.pointProgram,'viewProjection'),dpr:gl.getUniformLocation(this.pointProgram,'dpr')};
    this.pointAttributes={position:gl.getAttribLocation(this.pointProgram,'position'),color:gl.getAttribLocation(this.pointProgram,'color'),size:gl.getAttribLocation(this.pointProgram,'size')};
    this._buildVessels();this._buildGrid();this._buildThorax();this._buildParticles();this.resetCamera();this._bindEvents();
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();
    this.assetController=new AbortController();
    this.cerebralPositions=CEREBRAL_NODE_POSITIONS;
    this.ready=this._loadOrgans().then(()=>loadRegisteredVasculature(this)).then(()=>{if(!this.destroyed)onReady?.();}).catch(error=>{if(!this.destroyed)onError?.(error);});
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
    if(options?.tissue&&(options.animationOrgan||options.id)==='heart'){
      // The projected half-extent of an axis-aligned bounding box along a unit
      // direction is exact (sum of |axis_i| * half-size_i), so this stays
      // correct for any heart tissue source -- an imported single-mesh heart
      // or a procedural chamber shell -- without needing the mesh's own axes
      // to align with the anatomical long axis.
      let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
      for(let i=0;i<g.position.length;i+=3){
        const x=g.position[i],y=g.position[i+1],z=g.position[i+2];
        if(x<minX)minX=x; if(x>maxX)maxX=x;
        if(y<minY)minY=y; if(y>maxY)maxY=y;
        if(z<minZ)minZ=z; if(z>maxZ)maxZ=z;
      }
      const half=[(maxX-minX)/2,(maxY-minY)/2,(maxZ-minZ)/2],axis=HEART_TWIST_AXIS;
      asset.twist=true;asset.twistAxis=axis;
      asset.twistHalfExtent=Math.max(.08,Math.abs(axis[0])*half[0]+Math.abs(axis[1])*half[1]+Math.abs(axis[2])*half[2]);
    }
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
    this.organManifest=manifest;
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
      if(options)this._asset(mesh,{...options,sourceName:mesh.name,center:packagedCenter,tissue:true});
    }
  }
  _buildFallbackOrgans(){
    const shells=[['brain',[0,3.62,0],[1.18,.78,.78],[.72,.56,.54]],['lungs',[-1.68,1.13,0],[.72,1.52,.90],[.68,.43,.43]],['lungs',[1.68,1.13,0],[.72,1.52,.90],[.68,.43,.43]],['kidneys',[-1.32,-1.59,.08],[.45,.76,.40],[.49,.20,.16]],['kidneys',[1.32,-1.59,.08],[.45,.76,.40],[.49,.20,.16]]];
    const [brainShell,...restShells]=shells;
    const buildShell=([id,center,radii,color])=>{
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
        }
        g.position[i]=center[0]+x*radii[0];g.position[i+1]=center[1]+y*radii[1];g.position[i+2]=center[2]+z*radii[2];
      }
      // Recompute face normals after deformation; do not retain ellipsoid normals.
      for(let i=0;i<g.position.length;i+=9){const a=g.position.slice(i,i+3),b=g.position.slice(i+3,i+6),c=g.position.slice(i+6,i+9),n=normalize(cross(sub(b,a),sub(c,a)));for(let v=0;v<3;v++)for(let axis=0;axis<3;axis++)g.normal[i+v*3+axis]=n[axis];}
      this._asset(g,{id,center,color,tissue:true,procedural:true});
    };
    buildShell(brainShell);
    this._buildFallbackHeart();
    restShells.forEach(buildShell);
  }
  // Four independently animated chamber shells replace the single fallback
  // heart ellipsoid, so schematic previews (no licensed mesh available) still
  // show atrial-kick/ventricular-systole timing and right-vs-left contraction
  // differences, not just one blob scaling in and out. Positions are a
  // schematic approximation of adult cardiac chamber arrangement, not source
  // anatomy.
  _buildFallbackHeart(){
    const center=[.04,.42,.35];
    const chamberColor={ra:[.50,.20,.30],rv:[.53,.19,.26],la:[.62,.21,.19],lv:[.60,.18,.16]};
    const chambers=[
      {chamber:'ra',offset:[-.30,.32,-.16],radii:[.40,.42,.36]},
      {chamber:'rv',offset:[-.20,-.18,.26],radii:[.46,.56,.42]},
      {chamber:'la',offset:[.32,.34,-.20],radii:[.38,.40,.34]},
      {chamber:'lv',offset:[.20,-.24,.10],radii:[.52,.64,.48]},
    ];
    for(const {chamber,offset,radii} of chambers){
      const chamberCenter=add(center,offset);
      this._asset(ellipsoid(chamberCenter,radii,18,28),{id:'heart',chamber,center:chamberCenter,color:chamberColor[chamber],tissue:true,procedural:true});
    }
  }
  // A schematic diaphragm dome and a handful of rib hoops give respiration a
  // visible driver: the dome descends on inspiration (the lungs' own scale
  // pulse no longer floats free of any cause), and the rib hoops widen
  // slightly with chest-wall expansion. Purely illustrative geometry, shown
  // alongside licensed organ meshes or the procedural fallback alike.
  _buildThorax(){
    // A shallow cap of the same ellipsoid formula used elsewhere (rings near
    // a=0, its "north pole") forms an upward dome: apex near y=-.10, rim near
    // y=-.54, sitting below the lung bases and the heart's inferior border.
    const domeCenter=[0,-.70,.05],domeRadii=[2.55,.60,1.15],capAngle=1.3,rings=8,segments=32,g=geometry();
    for(let r=0;r<rings;r++)for(let s=0;s<segments;s++){
      const a=capAngle*r/rings,b=capAngle*(r+1)/rings,c=TAU*s/segments,d=TAU*(s+1)/segments;
      const point=t=>[domeCenter[0]+domeRadii[0]*Math.sin(t[0])*Math.cos(t[1]),domeCenter[1]+domeRadii[1]*Math.cos(t[0]),domeCenter[2]+domeRadii[2]*Math.sin(t[0])*Math.sin(t[1])];
      const normal=t=>normalize([Math.sin(t[0])*Math.cos(t[1])/domeRadii[0],Math.cos(t[0])/domeRadii[1],Math.sin(t[0])*Math.sin(t[1])/domeRadii[2]]);
      const q=[[a,c],[a,d],[b,d],[b,c]],p=q.map(point),n=q.map(normal);
      triangle(g,p[0],p[1],p[2],n[0],n[1],n[2]);triangle(g,p[0],p[2],p[3],n[0],n[2],n[3]);
    }
    this._asset(g,{id:'diaphragm',center:domeCenter,color:[.62,.30,.26],tissue:true});
    this._buildRibcage();
  }
  _buildRibcage(){
    const hoops=[[1.62,1.35,.62,.55],[1.18,1.55,.72,.85],[.70,1.62,.80,1],[.15,1.55,.78,1],[-.35,1.30,.68,.9]];
    const segments=40,g=geometry();
    for(const [y,rx,rz,squeeze] of hoops){
      const points=[];
      for(let k=0;k<segments;k++){const a=TAU*k/segments;points.push([rx*Math.cos(a)*squeeze,y,rz*Math.sin(a)]);}
      for(let k=0;k<segments;k++){const a=points[k],b=points[(k+1)%segments];g.position.push(...a,...b);g.normal.push(0,1,0,0,1,0);}
    }
    this._asset(g,{id:'ribcage',center:[0,.5,.1],color:[.78,.74,.66],lines:true});
  }
  _route(points,{radius=.065,oxygenated=true,group='systemic',flow=1,particles=true,id='vessels',color,name,semantic,territory}={}){
    if(this.registeredVasculature&&group==='urine')points=points.map(p=>this._registeredUrinePoint(p));
    const path=curve(points,10),g=geometry();tube(g,path,radius,radius>.08?12:8);const asset=this._asset(g,{id,color:color??(oxygenated?RED:BLUE),oxygenated,group,radius,name,semantic:semantic??(id==='urine'?'urine':group==='pulmonary'?(oxygenated?'venous':'arterial'):oxygenated?'arterial':'venous'),territory});
    if(particles){const distances=[0];for(let i=1;i<path.length;i++)distances.push(distances[i-1]+Math.hypot(...sub(path[i],path[i-1])));this.routes.push({path,distances,length:distances.at(-1),oxygenated,group,flow,radius,asset,name,semantic:asset.semantic,territory});}
  }
  _buildVessels(){
    for(const {points,...options} of SYSTEMIC_VASCULAR_ROUTES)this._route(points,options);
    this._buildCerebralRoutes();
    this._buildUrineRoutes();
  }
  _buildCerebralRoutes(){
    const cerebralRoutePoints=(from,to)=>{
      const a=CEREBRAL_NODE_POSITIONS[from], b=CEREBRAL_NODE_POSITIONS[to];
      const side=from.startsWith('left-')||to.startsWith('left-')?1:-1;
      if(from.endsWith('-aca')&&to.endsWith('capillary-bed'))return [a,[side*.10,3.68,.72],[side*.16,3.96,.78],b];
      if(from.endsWith('-mca')&&to.endsWith('capillary-bed'))return [a,[side*.73,3.60,.31],[side*.76,3.74,.36],b];
      if(from.endsWith('-pca')&&to.endsWith('capillary-bed'))return [a,[side*.38,3.42,-.38],[side*.51,3.63,-.71],b];
      if(from.includes('sagittal'))return [a,[0,4.42,-.38],[0,4.07,-.78],b];
      if(from.includes('straight'))return [a,[0,3.76,-.62],b];
      if(from.includes('confluence'))return [a,[side*.30,3.60,-.70],b];
      if(from.includes('transverse'))return [a,[side*.58,3.42,-.61],[side*.52,3.28,-.47],b];
      if(from.includes('sigmoid'))return [a,[side*.46,3.08,-.30],b];
      return [a,b];
    };
    CEREBRAL_TEACHING_GRAPH.edges.forEach(([from,to])=>{
      const semantic=cerebralVenousEdge([from,to])?'venous':'arterial';
      const territory=['aca','mca','pca'].find(t=>from.includes(t)||to.includes(t));
      this._route(cerebralRoutePoints(from,to),{
        radius:from.includes('capillary-bed')||to.includes('capillary-bed')?.014:semantic==='venous'?.023:.026,group:'brain',semantic,oxygenated:semantic==='arterial',
        name:`${from}->${to}`,territory,flow:.55,
      });
    });
    // Common carotid and vertebral inflows remain separate until the ipsilateral
    // circle of Willis; no cervical route crosses the midline.
    this._route([[-.43,2.30,.08],[-.35,2.62,.20],CEREBRAL_NODE_POSITIONS['right-internal-carotid']],{radius:.045,group:'brain',name:'-1-carotid-inflow'});
    this._route([[.12,2.30,-.08],[.18,2.62,.20],CEREBRAL_NODE_POSITIONS['left-internal-carotid']],{radius:.045,group:'brain',name:'1-carotid-inflow'});
    this._route([[-.80,2.15,-.12],[-.32,2.58,.16],CEREBRAL_NODE_POSITIONS['right-vertebral']],{radius:.032,group:'brain',name:'right-vertebral-inflow'});
    this._route([[.72,2.15,-.26],[.30,2.58,.16],CEREBRAL_NODE_POSITIONS['left-vertebral']],{radius:.032,group:'brain',name:'left-vertebral-inflow'});
    this._route([CEREBRAL_NODE_POSITIONS['left-internal-jugular-return'],[.65,2.28,.22],[.65,1.98,.22]],{radius:.047,group:'brain',oxygenated:false,name:'left-jugular-systemic-return'});
    this._route([CEREBRAL_NODE_POSITIONS['right-internal-jugular-return'],[-.65,2.28,.22],[-.65,1.98,.22]],{radius:.047,group:'brain',oxygenated:false,name:'right-jugular-systemic-return'});
  }
  _registeredUrinePoint(point){
    if(!this.registrationOffsets)return point;
    const offset=this.registrationOffsets[point[0]<0?'kidney-right':'kidney-left'];
    const weight=clamp((point[1]+2.70)/1.15,0,1);
    return point.map((v,i)=>v+offset[i]*weight+(i===0?this.registrationOffsets.brain[0]*(1-weight):0));
  }
  _buildUrineRoutes(){
    for(const side of [-1,1])for(const edge of ANATOMICAL_ROUTE_COLLECTIONS.urine){
      const [from,to]=edge.split('->');
      // A single shared bladder outlet; both ureters converge at the same node.
      if(side<0&&from==='bladder')continue;
      const point=name=>URINE_NODE_POSITIONS[name].map((v,i)=>i===0?v*side:v);
      this._route([point(from),point(to)],{radius:.029,group:'urine',id:'urine',semantic:'urine',name:`${side}:${edge}`,color:[.88,.76,.26],flow:.45});
    }
    this._asset(ellipsoid(this._registeredUrinePoint(URINE_NODE_POSITIONS.bladder),[.20,.18,.13]),{id:'urine',group:'urine',semantic:'urine',color:[.88,.76,.26],name:'bladder-reservoir'});
  }
  _buildGrid(){const g=geometry();for(let i=-12;i<=12;i++){g.position.push(i*.55,-3.25,-6,i*.55,-3.25,6,-6,-3.25,i*.55,6,-3.25,i*.55);for(let n=0;n<4;n++)g.normal.push(0,1,0);}this._asset(g,{id:'grid',color:[.15,.32,.44],lines:true});}
  _buildParticles(){
    this.particles=[];this.routes.filter(route=>!route.asset.superseded).forEach((route,index)=>{const count=Math.max(3,Math.round(route.length*(route.radius>.05?11:4)));for(let j=0;j<count;j++)this.particles.push({route,phase:(j+.37*Math.sin(index*7+j))/count,size:route.radius>.05?4.2:2.8});});
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
    for(const [key,center]of Object.entries(centers)){const offset=this.registrationOffsets?.[key==='lungs'?'lung-right':key==='kidneys'?'kidney-left':key]||[0,0,0];const p=projectPoint(this.vp,add(center,offset),rect.width,rect.height),d=Math.hypot(p[0]-x,p[1]-y);if(d<best){best=d;id=key;}if(key==='lungs'||key==='kidneys'){const otherOffset=this.registrationOffsets?.[key==='lungs'?'lung-left':'kidney-right']||[0,0,0];const q=projectPoint(this.vp,add([-center[0],center[1],center[2]],otherOffset),rect.width,rect.height),dd=Math.hypot(q[0]-x,q[1]-y);if(dd<best){best=dd;id=key;}}}if(id)this.onSelect?.(id);
  }
  _color(asset){
    if(asset.id==='urine')return asset.color;if(asset.id!=='vessels')return asset.color;const m=this.metrics;
    if(this.colorMode==='pressure'){const p=asset.oxygenated?(asset.group==='pulmonary'?Math.max(10,m.cvp+5):m.map):asset.group==='pulmonary'?m.cvp+4+m.co*m.pvr/80:m.cvp;return mix([.12,.35,.88],[1,.33,.24],clamp(p/130,0,1));}
    if(this.colorMode==='flow'){const local=asset.group==='renal'?(m.renalFlow??900)/900:asset.group==='brain'?(m.brainFlow??50)/50:1;return mix([.12,.30,.48],[.48,1,.72],clamp(m.co/8*local,0,1));}
    return mix([.08,.28,.77],[.95,.22,.20],clamp(((asset.oxygenated?m.spo2:m.svo2)/100-.78)/.20,0,1));
  }
  _model(asset){
    if(!asset.center){const model=mat4Identity();if(asset.registrationOffset)for(let i=0;i<3;i++)model[12+i]=asset.registrationOffset[i];return model;}
    const m=this.metrics;let s=1,sy=1,translateY=0;
    const breathPhase=this.time*(m.respiratoryRate||16)/60*TAU;
    if((asset.animationOrgan||asset.id)==='heart'){
      const edvScale=Math.cbrt(clamp((m.edv||120)/120,.7,1.5));
      const isAtrium=asset.chamber==='ra'||asset.chamber==='la',isRight=asset.chamber==='rv'||asset.chamber==='ra';
      // The atrial "kick" is a short, fixed-timing contraction late in diastole,
      // just before the next ventricular systole; ventricular contraction is
      // driven by the same sin^3 pulse (`this.beat`) already used for particle
      // flow timing. Short-axis (radial) contraction dominates real ejection,
      // while the base-apex long axis shortens more modestly -- nonuniform
      // scale, not the isotropic pulse this replaces.
      const cyclePos=((this.heartPhase||0)%1+1)%1,atrialStart=.82,atrialSpan=.18;
      const atrialBump=cyclePos>atrialStart?Math.sin(Math.PI*(cyclePos-atrialStart)/atrialSpan)**2:0;
      const bump=isAtrium?atrialBump:this.beat;
      s=edvScale*(1-(isAtrium?.16:.12)*bump);
      sy=edvScale*(1-(isAtrium?.05:.035)*bump);
      if(isRight){const congestion=1+clamp((m.cvp-6)/90,0,.2);s*=congestion;sy*=congestion;}
      // Apex rotation (torsion): the left ventricle twists during systole and
      // untwists into early diastole; applied as a vertex-space deformation in
      // the shader (see twist* uniforms below), not folded into this scale.
      asset.twistAngle=isAtrium?0:(asset.chamber==='rv'?.07:asset.chamber==='lv'?.16:.13)*this.beat;
    }
    if(asset.id==='lungs'){s=1+.025*Math.sin(breathPhase)+clamp((m.lungWater||0)/150,0,.13);sy=1+(s-1)*.6;}
    if(asset.id==='ribcage'){s=1+.018*Math.sin(breathPhase);}
    if(asset.id==='diaphragm')translateY=-.32*Math.sin(breathPhase);
    if(asset.id==='brain'){
      const icp=m.icp??5,cpp=m.cpp??70;
      // Elevated ICP reflects reduced intracranial compliance (Monro-Kellie
      // doctrine): the same cardiac-cycle arterial inflow produces a visibly
      // larger pulsatile volume swing as compliance worsens, while a falling
      // CPP damps the swing as pulsatile inflow itself falls. A small chronic
      // "swelling" term is a schematic proxy for sustained intracranial
      // hypertension, not a volumetric edema model.
      const compliancePulse=clamp(icp/20,.15,1.8),perfusionGate=clamp(cpp/60,.15,1);
      const chronicSwelling=1+clamp((icp-12)/160,0,.035);
      s=chronicSwelling*(1+.006*compliancePulse*perfusionGate*this.beat);sy=s;
    }
    const c=asset.center,out=mat4Identity();out[0]=s;out[5]=sy;out[10]=s;out[12]=c[0]*(1-s);out[13]=c[1]*(1-sy)+translateY;out[14]=c[2]*(1-s);if(asset.registrationOffset)for(let i=0;i<3;i++)out[12+i]+=asset.registrationOffset[i];return out;
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
    gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    // A cutaway plane needs both mesh faces visible; every organ/vessel asset is a
    // watertight (or single-sleeve) shell, so the depth test alone still resolves
    // the correct nearest surface outside the discarded half.
    if(this.clip.enabled)gl.disable(gl.CULL_FACE);else{gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);}
    gl.depthMask(true);gl.useProgram(this.program);gl.uniformMatrix4fv(this.uniforms.viewProjection,false,this.vp);gl.uniform3fv(this.uniforms.eye,eye);
    const axisIndex={x:0,y:1,z:2}[this.clip.axis];
    // The plane's world position tracks the current camera target/distance so the
    // 0-100 slider always spans roughly the visible extent of whatever view is active.
    const clipRange=Math.max(this.distance*.6,1.5),clipWorld=this.target[axisIndex]-clipRange+this.clip.t*2*clipRange;
    const clipSign=this.clip.flip?-1:1,clipNormal=[0,0,0];clipNormal[axisIndex]=clipSign;
    this._clipPlane=this.clip.enabled?{normal:clipNormal,distance:clipSign*clipWorld}:null;
    gl.uniform1f(this.uniforms.clipEnabled,this.clip.enabled?1:0);gl.uniform3fv(this.uniforms.clipNormal,clipNormal);gl.uniform1f(this.uniforms.clipDistance,clipSign*clipWorld);
    const draw=asset=>{
      if(asset.superseded)return;
      // Urine geometry is its own semantic collection, but shares the renal camera.
      
      if((asset.id==='vessels'||asset.id==='urine')&&!this.layers.vessels)return;
      if((asset.id==='vessels'||asset.id==='urine')&&!['whole','systemic'].includes(this.view)){const group={heart:'heart',lungs:'pulmonary',brain:'brain',kidneys:'renal'}[this.view];if(asset.group!==group&&!(this.view==='kidneys'&&asset.group==='urine'))return;}if(asset.id==='grid'&&this.view!=='whole'&&this.view!=='systemic')return;
      // The diaphragm/ribcage are a respiration context, not an organ; they
      // share the lungs' zoomed view in addition to the whole-body views.
      const thoraxContext=(asset.id==='diaphragm'||asset.id==='ribcage')&&this.view==='lungs';
      if(!(this.view==='whole'||this.view==='systemic'||this.view===asset.id||asset.id==='vessels'||asset.id==='urine'||thoraxContext))return;
      let alpha=asset.id==='grid'?.27:asset.id==='ribcage'?.5:1,glass=0;if(asset.tissue){if(this.clip.enabled){alpha=1;glass=0;}else{const opacity=this.layers.opacity?.[asset.id]??1;alpha=opacity;glass=opacity<.999?.18:0;}}if(asset.id==='vessels'||asset.id==='urine')alpha=1;
      for(const key of ['position','normal']){gl.bindBuffer(gl.ARRAY_BUFFER,asset.buffers[key]);gl.enableVertexAttribArray(this.attributes[key]);gl.vertexAttribPointer(this.attributes[key],3,gl.FLOAT,false,0,0);}
      gl.uniformMatrix4fv(this.uniforms.model,false,this._model(asset));
      if(asset.twist){gl.uniform1f(this.uniforms.twistEnabled,1);gl.uniform1f(this.uniforms.twistAngle,asset.twistAngle||0);gl.uniform3fv(this.uniforms.twistAxis,asset.twistAxis);gl.uniform3fv(this.uniforms.twistCenter,asset.center);gl.uniform1f(this.uniforms.twistHalfExtent,asset.twistHalfExtent||1);}
      else gl.uniform1f(this.uniforms.twistEnabled,0);
      let color=this._color(asset);if(asset.id==='lungs'&&(this.metrics.lungWater||0)>2)color=mix(color,[.55,.40,.40],clamp(this.metrics.lungWater/15,0,.65));gl.uniform3fv(this.uniforms.color,color);gl.uniform1f(this.uniforms.alpha,alpha);gl.uniform1f(this.uniforms.glass,glass);gl.uniform1f(this.uniforms.emissive,asset.id==='vessels'?.10:0);gl.uniform1f(this.uniforms.tissue,asset.tissue?1:0);if(asset.indexType){gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,asset.buffers.indices);gl.drawElements(gl.TRIANGLES,asset.count,asset.indexType,0);}else gl.drawArrays(asset.lines?gl.LINES:gl.TRIANGLES,0,asset.count);
    };
    // Cross-section mode always renders organs solid; sorted translucency and an
    // open cutaway are not composed together.
    const translucent=a=>a.tissue&&!this.clip.enabled&&(this.layers.opacity?.[a.id]??1)<1;
    this.assets.filter(a=>a.id!=='vessels'&&a.id!=='urine'&&!translucent(a)).forEach(draw);
    this.assets.filter(a=>a.id==='vessels'||a.id==='urine').forEach(draw);
    gl.depthMask(false);
    this.assets.filter(translucent).sort((a,b)=>Math.hypot(...sub(b.center,eye))-Math.hypot(...sub(a.center,eye))).forEach(draw);
    if(this.layers.particles)this._drawParticles();gl.depthMask(true);
  }
  _drawParticles(){
    const gl=this.gl,a=this.particleArrays;
    this.particles.forEach((particle,index)=>{
      
      const r=particle.route,t=((particle.phase+(r.phase||0))%1+1)%1,dist=t*r.length;
      let lo=0,hi=r.distances.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(r.distances[mid]<dist)lo=mid;else hi=mid;}
      const f=(dist-r.distances[lo])/(r.distances[hi]-r.distances[lo]||1),p=mix(r.path[lo],r.path[hi],f),color=this._color(r.asset);for(let k=0;k<3;k++){a.position[index*3+k]=p[k]+(r.asset.registrationOffset?.[k]||0);a.color[index*3+k]=Math.min(1,color[k]*1.35+.12);}const group={heart:'heart',lungs:'pulmonary',brain:'brain',kidneys:'renal'}[this.view];let visible=(!group||r.group===group||(this.view==='kidneys'&&r.group==='urine'));
      if(visible&&this._clipPlane){const n=this._clipPlane.normal,d=a.position[index*3]*n[0]+a.position[index*3+1]*n[1]+a.position[index*3+2]*n[2];if(d>this._clipPlane.distance)visible=false;}
      a.size[index]=visible?particle.size:0;
    });
    gl.useProgram(this.pointProgram);gl.uniformMatrix4fv(this.pointUniforms.viewProjection,false,this.vp);gl.uniform1f(this.pointUniforms.dpr,this.dpr);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.disable(gl.CULL_FACE);
    for(const key of ['position','color','size']){gl.bindBuffer(gl.ARRAY_BUFFER,this.particleBuffers[key]);gl.bufferSubData(gl.ARRAY_BUFFER,0,a[key]);gl.enableVertexAttribArray(this.pointAttributes[key]);gl.vertexAttribPointer(this.pointAttributes[key],key==='size'?1:3,gl.FLOAT,false,0,0);}gl.drawArrays(gl.POINTS,0,this.particles.length);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);for(const key of ['position','color','size'])gl.disableVertexAttribArray(this.pointAttributes[key]);
  }
  setView(view){if(!VIEWS[view])return;this.view=view;this.resetCamera();if(this.assetSource?.startsWith('local-surface-bundle'))this.canvas.dispatchEvent(new CustomEvent('anatomy-assets-ready',{bubbles:true,detail:{detailed:true,registered:this.registeredVasculature,provenanceBlocked:this.assetSource.endsWith('provenance-blocked')}}));}
  setLayers(layers){for(const key of ['particles','labels','vessels','transparent'])if(typeof layers[key]==='boolean')this.layers[key]=layers[key];if(layers.opacity&&typeof layers.opacity==='object')for(const key of ORGAN_OPACITY_KEYS)if(Number.isFinite(layers.opacity[key]))this.layers.opacity[key]=clamp(layers.opacity[key],0,1);}
  setColorMode(mode){if(['oxygenation','pressure','flow'].includes(mode))this.colorMode=mode;}
  // Cutaway cross-section plane; t=0..1 slides between the two extremes of the
  // current view's visible span along the chosen world axis.
  setClip({enabled,axis,t,flip}={}){
    if(typeof enabled==='boolean')this.clip.enabled=enabled;
    if(axis==='x'||axis==='y'||axis==='z')this.clip.axis=axis;
    if(Number.isFinite(t))this.clip.t=clamp(t,0,1);
    if(typeof flip==='boolean')this.clip.flip=flip;
  }
  resetCamera(){const view=VIEWS[this.view||'whole'];this.target=[...view.target];if(this.registrationOffsets){const key={brain:'brain',heart:'heart',lungs:'lung-left',kidneys:'kidney-left'}[this.view];if(key)this.target=this.target.map((v,i)=>v+this.registrationOffsets[key][i]);if(['lungs','kidneys'].includes(this.view))this.target[0]=-.22;}this.distance=this.registeredVasculature&&['whole','systemic'].includes(this.view)?13.5:view.distance;this.yaw=-.035;this.pitch=.04;this._fitCamera();}
  _fitCamera(){
    const aspect=(this.canvas.clientWidth||600)/(this.canvas.clientHeight||600);
    const widths=this.registeredVasculature?{whole:6.4,systemic:6.4,heart:2.1,brain:2.6,lungs:3.8,kidneys:3.2}:{whole:7,systemic:7,heart:2.1,brain:3.2,lungs:5.8,kidneys:4.4};
    const distance=this.registeredVasculature?({whole:13.5,systemic:13.5,lungs:6.2,kidneys:5}[this.view]||VIEWS[this.view].distance):VIEWS[this.view].distance;
    this.distance=Math.max(distance,widths[this.view]/(2*Math.tan(22*Math.PI/180)*aspect));
    if(this.view==='brain')this.target[0]=(this.canvas.clientWidth>600?.45:0)+(this.registrationOffsets?.brain?.[0]||0);
  }
  resize(){const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(rect.width*this.dpr);this.canvas.height=Math.round(rect.height*this.dpr);this.projection=mat4Perspective(44*Math.PI/180,rect.width/rect.height,.1,60);this._fitCamera();}
  getLabels(){
    if(!this.vp)return[];
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight;
    const project=(id,text,position,organ,kind='organ')=>{
      if(this.registrationOffsets){const key=organ==='brain'?'brain':organ==='lungs'?(position[0]<0?'lung-right':'lung-left'):organ==='kidneys'?(position[0]<0?'kidney-right':'kidney-left'):organ;const offset=this.registrationOffsets[key];if(offset)position=position.map((v,i)=>v+offset[i]);}
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
      labels=[project('pulmonary-bed',this.registeredVasculature?'Source pulmonary arteries and veins':'Pulmonary vessels → schematic capillary bed',[-1.85,1.1,.3],'lungs','anatomy'),
        project('pulmonary-flow',`Pulmonary blood flow: ${status(this.metrics.co,'L/min')}`,[1.85,1.1,.3],'lungs','flow')];
    }
    // A stable, numbered key is inspectable without placing long names over vessels.
    return labels.map((label,index)=>({...label,index:index+1,x:.02,y:.12+index*.035,visible:this.layers.labels}));
  }
  destroy(){this.destroyed=true;this.assetController.abort();this.resizeObserver.disconnect();for(const[type,fn,options]of this.listeners)this.canvas.removeEventListener(type,fn,options);for(const asset of this.assets)for(const buffer of Object.values(asset.buffers))this.gl.deleteBuffer(buffer);for(const buffer of Object.values(this.particleBuffers))this.gl.deleteBuffer(buffer);this.gl.deleteProgram(this.program);this.gl.deleteProgram(this.pointProgram);}
}
