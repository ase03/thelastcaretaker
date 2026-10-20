<script lang="ts">
 import {loadReferences,displayName,type Reference} from '$lib/map/catalog';
 import {loadWorld,mergeWorld,WORLD_BUILD} from '$lib/map/world';
 let references=$state<Record<string,Reference|null>>({}),failedIcons=$state<Record<string,boolean>>({});
 $effect(()=>{
  const items=localItems,build=snapshot.metadata?.gameBuild;
  references={};let cancelled=false;
  if(build)void loadReferences(items.map(i=>i.definitionId),build,(path,value)=>references[path]=value,()=>!cancelled);
  return()=>{cancelled=true;};
 });
 $effect(()=>{basePois;snapshot;failedIcons={};});
 import '../../app.css';
 import {onMount} from 'svelte';
 import {metres,type POI} from '$lib/map/coordinates';
 import {projectFull,groupSummary,groupMarker,itemMarker,categoryColors,type Snapshot,type Group,type Occurrence} from '$lib/map/snapshot';
 import {readFull,type FullSnapshot} from '$lib/map/full-snapshot';
 import {heightColor,heightTone} from '$lib/map/appearance';
 import {placeLabels} from '$lib/map/labels';
 import type {Frame} from '$lib/map/renderer';
 let host!:HTMLDivElement;type MapEngine=ReturnType<typeof import('$lib/map/renderer').createMap>|ReturnType<typeof import('$lib/map/renderer-3d').createMap3D>;let engine:MapEngine|undefined;
 let mode=$state<'2D'|'3D'>('2D'),hovered=$state<string|undefined>();let generation=0;
 let basePois=$state<POI[]>([]),worldError=$state(''),worldLoading=$state(true);
 let search=$state(''),selected=$state<POI|null>(null),error=$state(''),ready=$state(false),show=$state(true);
 let snapshot=$state<Snapshot>({pois:[],occurrences:[],groups:[],metadata:null}),showFinds=$state(false),localGroup=$state<Group|null>(null),selectedGroup=$state<Group|null>(null),selectedItem=$state<Occurrence|null>(null);
 const pois=$derived(mergeWorld(basePois,snapshot.pois));
 // Keep the complete accepted document and exact source text, separate from its map view.
 let accepted=$state.raw<{full:FullSnapshot;sourceText:string}|null>(null);
 let transition:Promise<void>=Promise.resolve();let importGeneration=0;
 let savedGlobal:{mode:'2D'|'3D';camera:unknown}|null=null;
 const activeGroup=$derived(selectedGroup??(selected?snapshot.groups.find(g=>g.poiId===selected?.id)??null:null));
 const localItems=$derived(localGroup?snapshot.occurrences.filter(i=>localGroup!.occurrenceKeys.includes(i.key)):[]);
 const reference=$derived(selectedItem?references[selectedItem.definitionId]??null:null);
 const referenceStatus=$derived(selectedItem&&references[selectedItem.definitionId]===undefined?'Загрузка справки…':'Точное справочное соответствие отсутствует.');
 const rendered=$derived(localGroup?localItems.map(i=>itemMarker({...i,name:itemName(i)})):[...(show?pois:[]),...(showFinds?snapshot.groups.filter(g=>g.type==='cluster').map(groupMarker):[])]);
 let pointer=$state<{x:number;y:number}|null>(null);let frame=$state<Frame>({markers:[],labels:[],step:'',span:0,cx:0,cy:0,fps:0});
 let measureText = $state<(name:string)=>number>(name=>name.length*7.5);
 const labeledMarkers = $derived(placeLabels(frame.markers,localGroup?selectedItem?.key:selectedGroup?selectedGroup.id:selected?.id,host?.clientWidth??1,host?.clientHeight??1,measureText));
 const filtered=$derived(pois.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||p.componentName?.toLowerCase().includes(search.toLowerCase())||p.id.toLowerCase().includes(search.toLowerCase())));
 onMount(()=>{let cancelled=false;void loadWorld().then(records=>{if(!cancelled)basePois=records;}).catch(e=>{if(!cancelled)worldError=String(e);}).finally(()=>{if(!cancelled)worldLoading=false;});return()=>{cancelled=true;};});
 onMount(()=>{const context=document.createElement('canvas').getContext('2d');if(context){context.font='13px system-ui';const widths=new Map<string,number>();measureText=name=>{if(!widths.has(name))widths.set(name,context.measureText(name).width);return widths.get(name)!;};}let cancelled=false;import('$lib/map/renderer').then(({createMap})=>{if(cancelled)return;try{engine=createMap(host,f=>frame=f,p=>pointer=p);engine.setPOIs(rendered);ready=true;}catch(e){error=`WebGL недоступен: ${String(e)}`;}}).catch(e=>error=String(e));return()=>{cancelled=true;generation++;importGeneration++;engine?.dispose();};});
 async function load(e:Event){
  const input=e.target as HTMLInputElement,file=input.files?.[0];if(!file)return;
  const importTicket=++importGeneration;
  try{
   const text=await file.text(),full=await readFull(text),next=projectFull(full);
   await transition;if(importTicket!==importGeneration)return;
   if(localGroup)await backToMap();if(importTicket!==importGeneration)return;
   accepted={full,sourceText:text};snapshot=next;selected=null;selectedGroup=null;selectedItem=null;
   hovered=undefined;showFinds=false;localGroup=null;savedGlobal=null;search='';error='';engine?.setPOIs(show?pois:[]);syncAppearance();
  }catch(e){if(importTicket===importGeneration)error=String(e);}
  finally{if(importTicket===importGeneration)input.value='';}
 }
 function switchMode(next:'2D'|'3D'){transition=changeMode(next);return transition;}
 async function changeMode(next:'2D'|'3D'){
  if(next===mode||!ready)return;ready=false;const ticket=++generation;
  try{const module=next==='3D'?await import('$lib/map/renderer-3d'):await import('$lib/map/renderer');if(ticket!==generation)return;
   pointer=null;
   const replacement='createMap3D' in module?module.createMap3D(host,f=>frame=f,p=>pointer=p):module.createMap(host,f=>frame=f,p=>pointer=p);
   engine?.dispose();engine=replacement;mode=next;engine.setPOIs(rendered);if(selected)engine.focus(selected);syncAppearance();ready=true;
  }catch(e){error=String(e);ready=true;}
 }
 function syncAppearance(){if(engine&&'setAppearance' in engine)engine.setAppearance(localGroup?selectedItem?.key:selectedGroup?selectedGroup.id:selected?.id,hovered,true);}
 $effect(()=>{selected;selectedItem;selectedGroup;hovered;syncAppearance();});
 let initialOverview=false;
 $effect(()=>{const records=rendered;if(ready){engine?.setPOIs(records,initialOverview||!!localGroup);if(basePois.length)initialOverview=true;}});
 function pick(p:POI){if(localGroup){selectedItem=localItems.find(i=>i.key===p.id)??null;return;}
  const group=snapshot.groups.find(g=>g.id===p.id||g.poiId===p.id);selectedGroup=showFinds?(group??null):null;
  selected=pois.find(i=>i.id===p.id)??null;
 }
 function markerColor(p:POI){if(localGroup){const item=localItems.find(i=>i.key===p.id);return item?categoryColors[item.category]:'#47dce9';}return mode==='3D'?heightColor(p.world.z):'#47dce9';}
 function markerGroup(p:POI){return showFinds&&!localGroup?snapshot.groups.find(g=>g.id===p.id||g.poiId===p.id):undefined;}
 function itemName(item:Occurrence){return displayName(item,references[item.definitionId]);}
 function poiIcon(p:POI){if(localGroup||failedIcons[p.id])return null;return p.icon?`/world-catalog/${p.gameBuild}/${p.icon}`:null;}
 function openGroup(group:Group){transition=enterGroup(group);return transition;}
 async function enterGroup(group:Group){if(!ready||localGroup)return;ready=false;const ticket=++generation;
  try{const {createMap3D}=await import('$lib/map/renderer-3d');if(ticket!==generation)return;
   savedGlobal={mode,camera:engine?.getCamera()};const replacement=createMap3D(host,f=>frame=f,p=>pointer=p);
   engine?.dispose();engine=replacement;localGroup=group;selectedGroup=group;selectedItem=null;hovered=undefined;mode='3D';pointer=null;
   const items=snapshot.occurrences.filter(i=>group.occurrenceKeys.includes(i.key));replacement.setReferenceZ(group.bounds.min.z??0);
   replacement.setColors(Object.fromEntries(items.map(i=>[i.key,categoryColors[i.category]])));replacement.setPOIs(items.map(itemMarker));syncAppearance();ready=true;
  }catch(e){error=String(e);ready=true;}
 }
 async function backToMap(){if(!savedGlobal)return;ready=false;const ticket=++generation,previous=savedGlobal;
  try{const module=previous.mode==='3D'?await import('$lib/map/renderer-3d'):await import('$lib/map/renderer');if(ticket!==generation)return;
   const replacement='createMap3D' in module?module.createMap3D(host,f=>frame=f,p=>pointer=p):module.createMap(host,f=>frame=f,p=>pointer=p);
   engine?.dispose();engine=replacement;localGroup=null;selectedItem=null;hovered=undefined;mode=previous.mode;pointer=null;
   engine.setPOIs([...(show?pois:[]),...(showFinds?snapshot.groups.filter(g=>g.type==='cluster').map(groupMarker):[])]);
   (engine.restoreCamera as (s:unknown)=>void)(previous.camera);savedGlobal=null;syncAppearance();ready=true;
  }catch(e){error=String(e);ready=true;}
 }
</script>
<svelte:head><title>TLC Hub Map</title><meta name="description" content="Координатная карта The Last Caretaker" /></svelte:head>
<div class="map-app">
 <header><div><h1>TLC Hub Map</h1><small>Мировые координаты · UE / сантиметры</small></div><nav><a href="/">Build Optimizer</a><a href="/inventory">Inventory</a><span>Map</span></nav></header>
 <main>
 <aside><label class="import">Импорт Full v1 · full.json<input type="file" accept=".json,application/json" onchange={load} disabled={!ready}/></label><p class="muted">Файл остаётся в памяти этой страницы. Ничего не отправляется на сервер.</p>
 {#if snapshot.metadata}<details class="snapshot-info" open><summary>Full v1 · build {snapshot.metadata.gameBuild}</summary><p>{accepted?.full.objects.length} записей · {snapshot.pois.length} POI с подтверждённым знанием в Full</p><p>{snapshot.occurrences.length} находок · {snapshot.groups.length} групп</p><p>Без подтверждённых координат: {snapshot.stats?.missingCoordinates}</p>{#each snapshot.metadata.warnings as warning}<p class="muted">{warning}</p>{/each}<p role="status">Спойлеры: Full содержит координаты кандидатов. Тумблер скрывает их только на карте.</p></details>{/if}
 {#if localGroup}<button onclick={backToMap} disabled={!ready}>Вернуться к карте</button><h2>Локальный 3D · область находок</h2><p class="muted">Левая кнопка — pan · правая — вращение · колесо — zoom. Сенсорный экран: один палец — вращение, два — pan/zoom.</p><p>{groupSummary(localGroup)}</p><p class="muted">Опорная плоскость Z: {metres(localGroup.bounds.min.z??0)} м. Назначение — пространственная гипотеза.</p>
 <div class="list">{#each localItems as item (item.key)}<button class:active={selectedItem?.key===item.key} style:color={categoryColors[item.category]} onclick={()=>selectedItem=item}>{itemName(item)} · {item.quantity}</button>{/each}</div>
 {#if selectedItem}<section><h2>{itemName(selectedItem)}</h2><p>количество: {selectedItem.quantity}</p><details><summary>Техническая информация</summary><p>Слой находок: {selectedItem.category} · качество Full: {selectedItem.quality}</p><p>ID: {selectedItem.key}</p><p>objectPath: {selectedItem.definitionId}</p><p>Raw XYZ: {selectedItem.world.x}, {selectedItem.world.y}, {selectedItem.world.z??'неизвестна'}</p><p>X: {metres(selectedItem.world.x)} м<br/>Y: {metres(selectedItem.world.y)} м<br/>Z: {selectedItem.world.z===null?'неизвестна':metres(selectedItem.world.z)+' м'}</p><p>{selectedItem.source}</p><p>Достоверность: {selectedItem.confidence}</p><p>Ownership: {selectedItem.ownership} · provenance: {selectedItem.provenance}</p></details><button onclick={()=>engine?.focus(itemMarker(selectedItem!))}>Центрировать предмет</button></section>{/if}
 {:else}
 <input aria-label="Поиск POI" placeholder="Поиск по имени или ID" bind:value={search}/>
 <label><input type="checkbox" bind:checked={show}/> Показать слой POI</label>
 <p class="muted">Зелёная обводка — знание подтверждено Full. Без подтверждения знание неизвестно.</p>
 <label><input type="checkbox" bind:checked={showFinds} disabled={!snapshot.groups.length}/> Показать находки</label>
 {#if snapshot.metadata&&!snapshot.groups.length}<p class="muted">Full принят; подходящих для карты находок нет.</p>{:else if snapshot.groups.length&&!showFinds}<p class="muted">Находки присутствуют, скрыты тумблером.</p>{/if}
 <div class="controls-guide" aria-label="Управление картой"><strong>Управление · {mode}</strong>
 <p>Левая кнопка + drag — перемещение</p>
 {#if mode==='3D'}<p>Правая кнопка + drag — вращение и наклон</p>{/if}
 <p>Колесо / тачпад — zoom к курсору, в том числе поверх подписей</p>
 {#if mode==='3D'}<small>Сенсорный экран: один палец — вращение; два — перемещение и zoom.</small>{/if}
 </div>
 {#if mode==='3D'}<div class="height-legend" aria-label="Высота относительно Z=0"><strong>Относительно Z=0</strong><p><span style:color={heightColor(-101)}>●</span> Ниже −1 м · темнее</p><p><span style:color={heightColor(0)}>●</span> От −1 до +1 м · нейтральный</p><p><span style:color={heightColor(101)}>●</span> Выше +1 м · светлее</p><p>◇ Высота неизвестна</p></div>{/if}
 <p>{basePois.length} статических POI · build {WORLD_BUILD}</p><p>{filtered.length} найдено · {pois.filter(p=>p.knowledge==='known').length} известных по Full</p>
 {#if !pois.length}<p class="empty">{worldLoading?'Загрузка статической карты…':'Статические POI не загружены.'}</p>{/if}
 <div class="list">{#each filtered as p (p.id)}<button class:active={selected?.id===p.id} onclick={()=>pick(p)}>{p.name}</button>{/each}</div>
 {#if selected}<section><h2>{selected.name}</h2>{#if selected.componentName}<p class="muted">Подпись локатора: {selected.componentName}</p>{/if}<p>{selected.knowledge==='known'?'Знание подтверждено Full':'Знание игрока неизвестно'}</p><p>X: {metres(selected.world.x)} м<br/>Y: {metres(selected.world.y)} м<br/>Z: {selected.world.z===null?'неизвестна':`${metres(selected.world.z)} м`}</p><button onclick={()=>engine?.focus(selected!)}>Центрировать</button><p class="muted">Позиция игрового локатора; не обязательно вход или центр сооружения.</p><details><summary>Происхождение и точность</summary><p>{selected.id}</p><p>Build: {selected.gameBuild}</p><p>{selected.source}</p><p>{selected.accuracy}</p>{#if selected.definitionPath}<p>LocationAsset: {selected.definitionPath}</p>{/if}<p>Raw XYZ: {selected.world.x}, {selected.world.y}, {selected.world.z}</p></details></section>{/if}
 {#if showFinds&&activeGroup}<section><h2>Область находок</h2><p>{groupSummary(activeGroup)}</p><button onclick={()=>openGroup(activeGroup!)} disabled={!ready}>Показать область в 3D</button></section>{/if}
 {#if showFinds}<div class="list" aria-label="Группы находок">{#each snapshot.groups as g (g.id)}<button onclick={()=>{selectedGroup=g;selected=pois.find(p=>p.id===g.poiId)??null;}}>{'Самостоятельная область'} · {g.occurrenceKeys.length}</button>{/each}</div>{/if}
 {/if}
 {#if selectedItem}<section aria-label="Игровая справка"><h2>Игровая справка</h2><p class="muted">Статические данные определения. Не подтверждают знание игрока, владение или доступность. Build сохранения неизвестен; используется справочный build {snapshot.metadata?.gameBuild}.</p>
 {#if reference}
 <p>{reference.name??'Название не разрешено'}</p>
 {#if reference.icon}<img width="64" height="64" alt={reference.name??'Иконка определения'} src={`/world-catalog/${reference.gameBuild}/${reference.icon}`}/>{/if}
 {#each Object.entries(reference.fields) as [key,value]}<p>{key}: {String(value)}</p>{/each}
 <details><summary>Точное соответствие objectPath</summary>{reference.objectPath}</details>
 {:else}<p role="status">{referenceStatus}</p>{/if}</section>{/if}
 </aside>
 <div class="viewport" bind:this={host}>
 <div class="toolbar" role="toolbar">{#if !localGroup}<button aria-pressed={mode==='2D'} disabled={!ready} onclick={()=>switchMode('2D')}>2D</button><button aria-pressed={mode==='3D'} disabled={!ready} onclick={()=>switchMode('3D')}>3D</button>{:else}<button onclick={backToMap}>Вернуться к карте</button>{/if}<button onclick={()=>engine?.overview()}>Общий вид</button><button aria-label="Увеличить" onclick={()=>engine?.zoom(.5)}>+</button><button aria-label="Уменьшить" onclick={()=>engine?.zoom(2)}>−</button></div>
 {#each frame.labels as l}<span class="grid-label" style:left={`${l.x}px`} style:top={`${l.y}px`}>{l.text}</span>{/each}
 {#each labeledMarkers as m (m.poi.id)}<button class="marker" style:--poi-color={markerColor(m.poi)} data-height={mode==='3D'?heightTone(m.poi.world.z):undefined} class:known={!localGroup&&m.poi.knowledge==='known'} class:finds={!!markerGroup(m.poi)} class:cluster={markerGroup(m.poi)?.type==='cluster'} class:chosen={localGroup?selectedItem?.key===m.poi.id:selected?.id===m.poi.id||selectedGroup?.id===m.poi.id} style:left={`${m.x}px`} style:top={`${m.y}px`} title={markerGroup(m.poi)?groupSummary(markerGroup(m.poi)!):localGroup?`${m.poi.name} · ${localItems.find(i=>i.key===m.poi.id)?.category}`:m.poi.name} aria-label={m.poi.name} onclick={()=>pick(m.poi)} onpointerdown={e=>e.stopPropagation()} onpointerenter={()=>hovered=m.poi.id} onpointerleave={()=>hovered=undefined}>{#if poiIcon(m.poi)}<img class="poi-icon" width="24" height="24" alt="" src={poiIcon(m.poi)!} onerror={()=>failedIcons[m.poi.id]=true}/>{:else}{markerGroup(m.poi)?.type==='cluster'?'◆':mode==='3D'&&m.poi.world.z===null?'◇':'●'}{/if}<span class="poi-label" class:suppressed={!m.label.visible} style:left={`${m.label.dx+12}px`} style:top={`${m.label.dy+14}px`} style:width={`${m.label.width}px`}>{m.poi.name}</span></button>{/each}
 <div class="readout">{#if pointer}X {metres(pointer.x)} м · Y {metres(pointer.y)} м{:else}{localGroup?'Локальный 3D · исходные XYZ':mode==='2D'?'+X вправо · +Y вниз':'3D · курсор на плоскости Z=0'}{/if}<br/>Шаг сетки: {frame.step} · ширина вида: {metres(frame.span)} м</div>
 </div></main>
 {#if worldError}<p role="alert" class="error">{worldError}</p>{/if}
 {#if error}<p role="alert" class="error">{error}</p>{/if}
 <footer>{mode==='3D'?'3D: левая кнопка — перемещение, правая — вращение, колесо — zoom к курсору. ◇ — неизвестная Z.':'2D: перетаскивание — перемещение, колесо / тачпад — zoom у курсора.'} {localGroup?'Предметы доступны в списке. Опорная плоскость — минимальная известная Z группы.':'Совпадающие POI доступны в списке. Z=0 — опорная плоскость, не уровень моря.'}</footer>
</div>
<style>
 .map-app{height:100dvh;display:flex;flex-direction:column;background:#090f1d;color:#d4e7f8}header{display:flex;justify-content:space-between;align-items:center;padding:14px 22px;border-bottom:1px solid #293c54}h1{font-size:1.3rem;margin:0}small,.muted,footer{color:#8ea6bd}nav{display:flex;gap:18px}nav a{color:#73c8eb}main{display:flex;flex:1;min-height:0}aside{width:290px;padding:16px;overflow:auto;background:#101a2a;flex-shrink:0}aside>input{width:100%;margin:14px 0}input,button{background:#17273b;color:#d4e7f8;border:1px solid #34506b;border-radius:5px;padding:8px}button{cursor:pointer}button:hover,.active{background:#245077}.import{display:block}.import input{width:100%;margin-top:8px}.height-legend{font-size:.8rem;line-height:1.5;margin:10px 0}.height-legend p{margin:3px 0}.controls-guide{margin:12px 0;padding:10px;border:1px solid #34506b;border-radius:5px;font-size:.8rem;line-height:1.5}.controls-guide p{margin:4px 0}.muted,.empty{font-size:.8rem;line-height:1.5}.list{max-height:35vh;overflow:auto;display:grid;gap:4px}.list button{text-align:left;overflow-wrap:anywhere}h2{font-size:1rem}section{overflow-wrap:anywhere;border-top:1px solid #34506b;margin-top:16px;padding-top:12px}details{font-size:.8rem;overflow-wrap:anywhere}.viewport{flex:1;min-width:0;position:relative;overflow:hidden;touch-action:none;cursor:grab}.viewport:active{cursor:grabbing}.viewport :global(canvas){display:block}.toolbar{position:absolute;right:14px;top:14px;z-index:3;display:flex;gap:6px}.toolbar button[aria-pressed="true"]{background:#245077}.grid-label{position:absolute;pointer-events:none;color:#718ca7;font:10px monospace;white-space:nowrap}.marker{position:absolute;transform:translate(-50%,-50%);padding:2px 5px;border:0;background:transparent;color:var(--poi-color,#47dce9);font-size:20px;z-index:2}.poi-icon{display:block;object-fit:contain;pointer-events:none}.marker.chosen .poi-icon{outline:2px solid #ffd66c;border-radius:3px}.marker:hover{color:#a5f7ff;background:#192e44;cursor:pointer;text-shadow:0 0 8px #47dce9}.marker.known{outline:1px solid #6ed8a0;border-radius:50%}.marker.finds{outline:1px solid #ffe34a;border-radius:50%}.marker.cluster{color:#b99cff}.marker.chosen,.marker.chosen:hover{color:#ffd66c;background:#192e44}.poi-label{position:absolute;white-space:nowrap;font:13px/20px system-ui;color:#dce4ed;text-align:left;padding:2px 6px;overflow:hidden;text-overflow:ellipsis;border-radius:3px;background:#090f1db8;text-shadow:-1px 0 #090f1d,1px 0 #090f1d,0 -1px #090f1d,0 1px #090f1d;cursor:pointer}.suppressed{display:none}.marker:hover .poi-label{display:block;color:#fff;background:#15263a}.marker.chosen .poi-label,.marker.chosen:hover .poi-label{color:#ffd66c;display:block}.marker:hover,.marker.chosen{z-index:4}.readout{position:absolute;bottom:12px;left:12px;background:#101a2ae8;padding:9px;font:12px monospace;pointer-events:none}footer{padding:8px 14px;font-size:.75rem}.error{color:#ffb6a3;padding:8px}@media(max-width:700px){header{padding:10px;gap:8px}nav{font-size:.75rem;gap:8px}main{flex-direction:column-reverse}aside{width:auto;max-height:35vh}.viewport{min-height:40vh}.list{max-height:120px}footer{font-size:.65rem}}
</style>
