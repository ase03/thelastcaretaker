export const LIMIT = 1e12;
export type World = Readonly<{x:number;y:number;z:number|null}>;
export type Origin = {x:number;y:number;z:number};
export type Scene = {x:number;y:number|null;z:number};
export type SpatialLayer = "poi"|"memory"|"artifact"|"rare"|"saved-player"|"saved-ship"|"seabed"|"structure"|"cave"|"collision";
export type SpatialRecord = {id:string;world:World;source:string;gameBuild:string;layer:SpatialLayer;visibility:"local"|"public"};
export type POI = {id:string;name:string;world:World;source:string;gameBuild:string;knowledge:'known'|'unknown';accuracy:string;layer:'poi';visibility:'local';referencePath?:string};
export const worldToScene = (p:World,o:Origin):Scene => ({x:(p.x-o.x)/100,y:p.z===null?null:(p.z-o.z)/100,z:(p.y-o.y)/100});
export const sceneToWorld = (p:Scene,o:Origin):World => ({x:p.x*100+o.x,y:p.z*100+o.y,z:p.y===null?null:p.y*100+o.z});
export function atPixel(cx:number,cy:number,span:number,width:number,height:number,px:number,py:number){return {x:cx+(px-width/2)*span/width,y:cy+(py-height/2)*span/width};}
export function zoomAt(cx:number,cy:number,span:number,next:number,width:number,height:number,px:number,py:number){const a=atPixel(cx,cy,span,width,height,px,py);const b=atPixel(cx,cy,next,width,height,px,py);return {x:cx+a.x-b.x,y:cy+a.y-b.y};}
export function gridStep(span:number,width:number){const target=span/Math.max(width,1)*80;const power=10**Math.floor(Math.log10(target));return Math.max(1,[1,2,5,10].find(n=>n*power>=target)!*power);}
export function distanceLabel(ue:number){return ue>=100000?`${ue/100000} км`:ue>=100?`${ue/100} м`:`${ue} см`;}
export const metres=(ue:number)=> (ue/100).toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:8});
export function coordinateLabel(ue:number,step:number){return step>=100000?`${metres(ue/1000)} км`:step>=100?`${metres(ue)} м`:`${ue.toFixed(2)} см`;}
