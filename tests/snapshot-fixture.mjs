import {createHash} from 'node:crypto';
export const idFor=source=>'TLCScanner:v1:'+createHash('sha256').update(source).digest('hex');
export function fullFromPois(pois=[]){
 return {schema:'tlc-full-snapshot/1',representation:'full',metadata:{
  steamId64:'00000000000000001',generation:'0'.repeat(32),snapshotId:'0'.repeat(64),
  coordinateSystem:'Unreal world XYZ',units:'centimetres',unitsPerMetre:100,
  usability:'offline-selective; game-session-binding-unverified',installedBuildCompatibility:'unverified-executable',
  source:{name:'synthetic.sav',size:'0',timestampNs:'18446744073709551615',sha256:'0'.repeat(64)},
  dependencies:{},coverage:{inventory:{selectedRecords:0,rawRecords:0}},reviewedMetadataBuild:'synthetic',
  saveSteamBuild:'unknown',saveHeader:{},saveScalars:{},limitations:['Partial synthetic evidence']},
  objects:[],pois:pois.map(p=>({Asset:p.id,DisplayName:p.name,Knowledge:'Serialized Location discovery',
   CoordinateType:'Unattached root component RelativeLocation = static actor world position',Position:{X:p.world.x,Y:p.world.y,Z:p.world.z ?? 0}})),
  states:{playerStateProbe:null,moduleResourceObservations:null},provenance:{}};
}
export function fixture(){
 const d=fullFromPois([{id:'p',name:'Known test POI',world:{x:0,y:0,z:-100}}]);
 d.objects=[{sourceRecord:'item-high',xyz:[100,200,15000],category:'Memory',quality:'Unknown',units:1,scannerCategory:'Memory'},
  {sourceRecord:'item-low',xyz:[100,200,-5000],category:'Other',quality:'Rare',units:3,scannerCategory:'Rare'}].map(o=>({...o,
  id:idFor(o.sourceRecord),actorId:'18446744073709551615',itemIdentity:{assetType:null,assetName:o.sourceRecord},
  sourceContext:{actorName:'SyntheticActor'},positionType:'Saved actor Transform; world-space corroborated by spatial cell',
  confidence:'Confirmed within selective contract',storage:'Physical world item',
  coordinateObservation:{value:{x:o.xyz[0],y:o.xyz[1],z:o.xyz[2]},source:'Synthetic evidence',coordinateSpace:'unknown; no parent/world conversion asserted',
   units:'centimetres',confirmation:'world-space corroborated by spatial cell',worldMarkerEligible:false}}));
 d.metadata.coverage={inventory:{selectedRecords:2,rawRecords:2},scanner:{candidates:{Memory:1,Rare:1},inRadius:{Memory:1,Rare:1},excluded:{}}};
 return d;
}
