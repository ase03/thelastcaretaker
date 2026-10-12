import * as THREE from 'three';
import {atPixel,zoomAt,gridStep,distanceLabel,coordinateLabel,worldToScene,LIMIT,type POI} from './coordinates';
export type Frame={markers:{poi:POI;x:number;y:number}[];labels:{text:string;x:number;y:number}[];step:string;span:number;cx:number;cy:number;fps:number};
export function createMap(host:HTMLElement,update:(f:Frame)=>void,cursor:(p:{x:number;y:number}|null)=>void){
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setClearColor('#090f1d');renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.prepend(renderer.domElement);
 const scene=new THREE.Scene(), camera=new THREE.OrthographicCamera();camera.up.set(0,0,-1);
 const material=new THREE.LineBasicMaterial({color:0xffffff,vertexColors:true});let geometry=new THREE.BufferGeometry();const lines=new THREE.LineSegments(geometry,material);scene.add(lines);
 let cx=0,cy=0,span=2000000,width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight),pois:POI[]=[],disposed=false,dirty=true,drag:{x:number;y:number;cx:number;cy:number}|null=null,raf=0;
 let last=performance.now(),frames=0,fps=0;
 const origin={x:cx,y:cy,z:0};
 const bound=()=>{cx=Math.max(-LIMIT+span,Math.min(LIMIT-span,cx));cy=Math.max(-LIMIT+span,Math.min(LIMIT-span,cy));dirty=true;};
 const local=(e:MouseEvent)=>{const r=host.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 function move(e:PointerEvent){const p=local(e);if(drag){cx=drag.cx-(p.x-drag.x)*span/width;cy=drag.cy-(p.y-drag.y)*span/width;bound();}cursor(atPixel(cx,cy,span,width,height,p.x,p.y));}
 function down(e:PointerEvent){if(e.button!==0||(e.target as HTMLElement).closest('button'))return;const p=local(e);drag={...p,cx,cy};host.setPointerCapture(e.pointerId);}
 function up(){drag=null;}
 function wheel(e:WheelEvent){e.preventDefault();const p=local(e);const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?height:1);const next=Math.max(10,Math.min(1e9,span*Math.exp(Math.max(-1,Math.min(1,delta*.0015)))));const anchor=zoomAt(cx,cy,span,next,width,height,p.x,p.y);cx=anchor.x;cy=anchor.y;span=next;bound();cursor(atPixel(cx,cy,span,width,height,p.x,p.y));}
 host.addEventListener('pointerdown',down);host.addEventListener('pointermove',move);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',up);host.addEventListener('wheel',wheel,{passive:false});
 const leave=()=>cursor(null);host.addEventListener('pointerleave',leave);
 const resize=new ResizeObserver(()=>{width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);renderer.setSize(width,height);dirty=true;});resize.observe(host);
 function draw(){if(disposed)return;raf=requestAnimationFrame(draw);if(!dirty)return;dirty=false;
 origin.x=cx;origin.y=cy;camera.left=-span/200;camera.right=span/200;camera.top=span*height/width/200;camera.bottom=-camera.top;camera.near=.01;camera.far=1000;camera.position.set(0,100,0);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
 const step=gridStep(span,width),minor=Math.max(1,step/5),halfY=span*height/width/2,vertices:number[]=[],labels:Frame['labels']=[];
 for(let mx=Math.ceil((cx-span/2)/minor)*minor;mx<=cx+span/2;mx+=minor){const sx=(mx-cx)/100;vertices.push(sx,0,-halfY/100,sx,0,halfY/100);}
 for(let my=Math.ceil((cy-halfY)/minor)*minor;my<=cy+halfY;my+=minor){const sz=(my-cy)/100;vertices.push(-span/200,0,sz,span/200,0,sz);}
 const minorCount=vertices.length;
 for(let x=Math.ceil((cx-span/2)/step)*step;x<=cx+span/2;x+=step){const s=worldToScene({x,y:cy,z:0},origin);vertices.push(s.x,0,-halfY/100,s.x,0,halfY/100);labels.push({text:`X ${coordinateLabel(x,step)}`,x:(x-cx)*width/span+width/2,y:14});}
 for(let y=Math.ceil((cy-halfY)/step)*step;y<=cy+halfY;y+=step){const s=worldToScene({x:cx,y,z:0},origin);vertices.push(-span/200,0,s.z,span/200,0,s.z);labels.push({text:`Y ${coordinateLabel(y,step)}`,x:8,y:(y-cy)*width/span+height/2});}
 geometry.dispose();geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));const colors=vertices.map((_,i)=>{const color=new THREE.Color(i<minorCount?0x172638:0x34506b);return i%3===0?color.r:i%3===1?color.g:color.b;});geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));lines.geometry=geometry;
 renderer.render(scene,camera);frames++;const now=performance.now();if(now-last>500){fps=frames*1000/(now-last);frames=0;last=now;}
 const markers=pois.map(poi=>({poi,x:(poi.world.x-cx)*width/span+width/2,y:(poi.world.y-cy)*width/span+height/2})).filter(p=>p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height);
 update({markers,labels,step:distanceLabel(step),span,cx,cy,fps});
 }
 draw();
 const overview=()=>{if(pois.length){const xs=pois.map(p=>p.world.x),ys=pois.map(p=>p.world.y);cx=(Math.min(...xs)+Math.max(...xs))/2;cy=(Math.min(...ys)+Math.max(...ys))/2;span=Math.max(10000,(Math.max(...xs)-Math.min(...xs))*1.3,(Math.max(...ys)-Math.min(...ys))*width/height*1.3);}else{cx=cy=0;span=2000000;}bound();};
 return {setPOIs(p:POI[]){pois=p;overview();},overview,focus(p:POI){cx=p.world.x;cy=p.world.y;bound();},zoom(factor:number){span=Math.max(10,Math.min(1e9,span*factor));bound();},dispose(){disposed=true;cancelAnimationFrame(raf);resize.disconnect();host.removeEventListener('pointerdown',down);host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',up);host.removeEventListener('wheel',wheel);host.removeEventListener('pointerleave',leave);geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
}




