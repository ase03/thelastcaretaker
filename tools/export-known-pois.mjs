// Offline adapter for the already filtered TLC Hub known anchors, never raw saves.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {parsePOIs} from '../src/lib/map/coordinates.ts';
const [input,output,build]=process.argv.slice(2);
if(!input||!output||!/^\d+$/.test(build??''))throw Error('Usage: node --experimental-strip-types tools/export-known-pois.mjs INPUT OUTPUT BUILD');
const target=resolve(output),repo=resolve('.');
if(!relative(repo,target).startsWith('..'))throw Error('Private export must be outside checkout');
const anchors=JSON.parse(readFileSync(input,'utf8').replace(/^\uFEFF/,''));
if(!Array.isArray(anchors)||anchors.length!==50)throw Error('Expected reviewed set of 50 known anchors');
const doc={schemaVersion:1,units:'UE-cm',pois:anchors.map(p=>{
 if(!p.ComponentPath?.startsWith('/Game/Maps/VoyageWorld2.')||!p.Knowledge||!p.CoordinateType?.includes('Unattached root'))throw Error('Unverified locator provenance');
 if(!/Serialized Location discovery|Lazarus/i.test(p.Knowledge))throw Error('Knowledge policy needs review');
 return {id:`${build}:${p.ComponentPath}`,name:p.DisplayName || p.Asset,world:{x:p.Position.X,y:p.Position.Y,z:p.Position.Z??null},source:'TLC Hub reviewed known anchor set; root locator placement',gameBuild:build,knowledge:'known',accuracy:'Static root placement; source numeric precision retained; runtime accuracy not measured',layer:'poi',visibility:'local'};
})};
parsePOIs(doc);writeFileSync(target,JSON.stringify(doc,null,2)+'\n');console.log(`Exported ${doc.pois.length} local-only POI`);

