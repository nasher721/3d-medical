export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export function mat4Identity() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
export function mat4Multiply(a,b) { const o=new Float32Array(16); for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3]; return o; }
export function mat4Perspective(fovy,aspect,near,far) { const f=1/Math.tan(fovy/2), nf=1/(near-far), o=new Float32Array(16); o[0]=f/aspect;o[5]=f;o[10]=(far+near)*nf;o[11]=-1;o[14]=2*far*near*nf; return o; }
export function mat4LookAt(eye,target,up=[0,1,0]) { let zx=eye[0]-target[0],zy=eye[1]-target[1],zz=eye[2]-target[2],l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;let xx=up[1]*zz-up[2]*zy,xy=up[2]*zx-up[0]*zz,xz=up[0]*zy-up[1]*zx;l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;const yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx,o=mat4Identity();o[0]=xx;o[1]=yx;o[2]=zx;o[4]=xy;o[5]=yy;o[6]=zy;o[8]=xz;o[9]=yz;o[10]=zz;o[12]=-(xx*eye[0]+xy*eye[1]+xz*eye[2]);o[13]=-(yx*eye[0]+yy*eye[1]+yz*eye[2]);o[14]=-(zx*eye[0]+zy*eye[1]+zz*eye[2]);return o; }
export function mat4Translation(x,y,z){const o=mat4Identity();o[12]=x;o[13]=y;o[14]=z;return o;}
export function mat4Scale(x,y,z){const o=mat4Identity();o[0]=x;o[5]=y;o[10]=z;return o;}
export function mat4RotationY(a){const c=Math.cos(a),s=Math.sin(a),o=mat4Identity();o[0]=c;o[2]=-s;o[8]=s;o[10]=c;return o;}
export function mat4RotationX(a){const c=Math.cos(a),s=Math.sin(a),o=mat4Identity();o[5]=c;o[6]=s;o[9]=-s;o[10]=c;return o;}
export function transformPoint(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
export function projectPoint(m,p,w,h){const x=m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],y=m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],z=m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14],q=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15]||1;return [(x/q*.5+.5)*w,(1-(y/q*.5+.5))*h,z/q];}
