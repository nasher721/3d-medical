// Normal adult major-vessel topology in the exploded teaching frame.
// +X patient left, +Y superior, +Z anterior. These are authored centerlines,
// not segmented vessels; distal microcirculation is explicitly schematic.
const root=[.12,.91,.38], ra=[-.40,.72,.22], la=[.20,.77,-.16];
const archRight=[-.10,1.77,.20], archMiddle=[.12,1.88,-.08], archLeft=[.37,1.77,-.29];
const descending=[.34,1.40,-.48], renalLeft=[.30,-1.32,-.40], renalRight=[.30,-1.50,-.40];
const bifurcation=[.24,-2.44,-.38], cavalConfluence=[-.30,-2.60,-.23];
const svc=[-.43,1.62,.22], pulmonarySplit=[.03,1.30,.30];
const routes=[];
function vessel(name, points, radius, group='systemic', oxygenated=true, extra={}) {
  routes.push({name,points,radius,group,oxygenated,
    semantic:group==='pulmonary'?(oxygenated?'venous':'arterial'):(oxygenated?'arterial':'venous'),...extra});
}
vessel('ascending-aorta',[root,[-.04,1.27,.42],archRight],.105);
vessel('aortic-arch',[archRight,archMiddle,archLeft,descending],.105);
vessel('descending-aorta',[descending,[.30,.30,-.48],renalLeft,renalRight,bifurcation],.095);
const brachiocephalic=[-.43,2.04,.12];
vessel('brachiocephalic-trunk',[archRight,brachiocephalic],.060);
vessel('right-common-carotid',[brachiocephalic,[-.43,2.30,.08]],.037);
vessel('left-common-carotid',[archMiddle,[.12,2.30,-.08]],.037);
vessel('right-subclavian',[brachiocephalic,[-.80,2.15,-.12],[-1.18,2.05,-.18]],.046);
vessel('left-subclavian',[archLeft,[.72,2.15,-.26],[1.18,2.05,-.18]],.046);
vessel('superior-vena-cava',[svc,[-.43,1.10,.22],ra],.105,'systemic',false);
vessel('inferior-vena-cava',[cavalConfluence,[-.30,-1.57,-.23],[-.30,-1.39,-.23],[-.30,-.30,-.23],ra],.12,'systemic',false);
for(const side of [-1,1]) {
  const label=side<0?'right':'left';
  vessel(`${label}-brachiocephalic-vein`,[[side*.65,1.98,.22],...(side>0?[[.10,1.77,.40]]:[]),svc],.064,'systemic',false);
  vessel(`${label}-subclavian-vein`,[[side*1.18,2.05,.04],[side*.65,1.98,.22]],.052,'systemic',false);
  // Distal limbs are outside this organ-only model; no artery-to-vein U-turn.
  vessel(`${label}-common-iliac-artery`,[bifurcation,[side*.61,-2.71,-.35]],.058);
  vessel(`${label}-external-iliac-artery`,[[side*.61,-2.71,-.35],[side*.92,-3.10,-.15]],.044);
  vessel(`${label}-internal-iliac-artery`,[[side*.61,-2.71,-.35],[side*.54,-2.93,-.58]],.032);
  vessel(`${label}-external-iliac-vein`,[[side*.82,-3.10,-.31],[side*.50,-2.80,-.48]],.057,'systemic',false);
  vessel(`${label}-internal-iliac-vein`,[[side*.40,-2.96,-.64],[side*.50,-2.80,-.48]],.038,'systemic',false);
  vessel(`${label}-common-iliac-vein`,[[side*.50,-2.80,-.48],cavalConfluence],.068,'systemic',false);

  const renalY=side<0?-1.68:-1.50;
  const arteryHilum=[side*1.02,renalY,.02], veinHilum=[side*1.02,renalY+.06,.17];
  vessel(`${label}-renal-artery`,[side<0?renalRight:renalLeft,[side*.66,renalY,-.36],arteryHilum],.042,'renal');
  vessel(`${label}-renal-vein`,[veinHilum,...(side>0?[[.30,renalY+.09,-.11]]:[]),[-.30,renalY+.11,-.23]],.055,'renal',false);
  for(let j=0;j<5;j++) {
    const bed=[side*(1.27+.13*Math.sin(j*Math.PI/4)),renalY+.37-j*.18,.18];
    vessel(`${label}-renal-segmental-${j}`,[arteryHilum,[side*1.17,bed[1],.04],bed],.013,'renal',true,{flow:.2});
    vessel(`${label}-renal-venous-${j}`,[bed,[side*1.18,bed[1],.20],veinHilum],.014,'renal',false,{flow:.2});
  }
}
// Pulmonary trunk is anterior to the aortic root; RPA travels posterior to
// ascending aorta/SVC, whereas LPA passes toward the superior left hilum.
vessel('pulmonary-trunk',[[-.22,.65,.70],[-.18,1.15,.66],pulmonarySplit],.10,'pulmonary',false);
for(const side of [-1,1]) {
  const label=side<0?'right':'left',hilum=[side*1.12,side<0?1.16:1.36,-.10];
  vessel(`${label}-pulmonary-artery`,[pulmonarySplit,[side*.62,hilum[1],-.12],hilum],.071,'pulmonary',false);
  const upperVein=[side*1.10,1.00,.15], lowerVein=[side*1.12,.48,-.04];
  vessel(`${label}-superior-pulmonary-vein`,[upperVein,[side*.65,.88,.04],la],.049,'pulmonary',true);
  vessel(`${label}-inferior-pulmonary-vein`,[lowerVein,[side*.65,.56,-.17],la],.049,'pulmonary',true);
  // Lobes and hilar tributaries, with tissue-contained schematic terminal beds.
  const beds=side<0?[[1.65,2.06,-.08],[1.75,1.40,.38],[1.75,.83,.53],[1.75,.25,-.16],[1.60,.67,-.62]]:
    [[1.64,2.08,-.10],[1.72,1.38,.40],[1.68,.91,.52],[1.80,.21,-.19],[1.60,.67,-.60]];
  beds.forEach((p,j)=>{
    const bed=[p[0]*side,p[1],p[2]], vein=j<3?upperVein:lowerVein;
    vessel(`${label}-pulmonary-segmental-${j}`,[hilum,[side*1.37,(hilum[1]+bed[1])/2,bed[2]*.6],bed],.022,'pulmonary',false,{flow:.3});
    vessel(`${label}-pulmonary-tributary-${j}`,[bed,[side*1.43,(vein[1]+bed[1])/2,bed[2]+.07],vein],.021,'pulmonary',true,{flow:.3});
  });
}
// Epicardial supply: LAD in anterior interventricular groove, circumflex in
// left AV groove, RCA in right AV groove. Venous return enters coronary sinus.
const leftMain=[.32,.76,.43],apex=[.45,-.05,.67],sinus=[.10,.37,-.22];
vessel('left-main-coronary',[root,[.25,.88,.35],leftMain],.025,'heart');
vessel('left-anterior-descending',[leftMain,[.16,.47,.92],[.29,.17,.91],apex],.021,'heart');
vessel('left-circumflex',[leftMain,[.60,.65,.40],[.59,.44,.06],sinus],.020,'heart');
vessel('right-coronary-artery',[root,[-.30,.68,.66],[-.56,.40,.60],[-.39,.23,.05],[-.08,.25,-.16]],.023,'heart');
vessel('right-marginal-artery',[[-.56,.40,.60],[-.27,.05,.72],apex],.014,'heart');
vessel('great-cardiac-vein',[apex,[.35,.23,.94],[.23,.48,.94],[.63,.58,.36],sinus],.024,'heart',false);
vessel('coronary-sinus',[sinus,[-.19,.42,-.17],ra],.035,'heart',false);

export const SYSTEMIC_VASCULAR_ROUTES=Object.freeze(routes.map(r=>Object.freeze({...r,points:Object.freeze(r.points.map(p=>Object.freeze([...p])))})));
