import {readFull, type FullSnapshot} from './full-snapshot.ts';
import {projectFull, type Snapshot} from './snapshot.ts';

// File imports and server selections share one sequence, including validation
// and map transitions. A slow previous response can never replace the selection.
export function fullSourceLoader(callbacks:{
 reset:(current:()=>boolean)=>Promise<void>;
 accept:(value:{full:FullSnapshot;sourceText:string;source:string;snapshot:Snapshot},current:()=>boolean)=>Promise<void>;
 error:(message:string)=>void;
 busy:(value:boolean)=>void;
}) {
 let sequence=0;
 return {
  cancel(){sequence++;},
  async load(read:()=>Promise<string>, source:string, clear=false, steamId?:string) {
   const ticket=++sequence, current=()=>ticket===sequence;
   callbacks.busy(true);
   try {
    if(clear)await callbacks.reset(current);
    if(!current())return;
    const sourceText=await read(), full=await readFull(sourceText);
    if(steamId && full.metadata.steamId64!==steamId)throw Error('SteamID ответа не совпадает с выбранным игроком');
    if(!current())return;
    await callbacks.accept({full,sourceText,source,snapshot:projectFull(full)},current);
   }catch(e){if(current())callbacks.error(String(e));}
   finally{if(current())callbacks.busy(false);}
  }
 };
}
