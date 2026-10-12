<script lang="ts">
 import '../../app.css';
 import {onMount} from 'svelte';
 import {parsePOIs,metres,type POI} from '$lib/map/coordinates';
 import {placeLabels} from '$lib/map/labels';
 import type {Frame} from '$lib/map/renderer';
 let host!:HTMLDivElement;type MapEngine=ReturnType<typeof import('$lib/map/renderer').createMap>|ReturnType<typeof import('$lib/map/renderer-3d').createMap3D>;let engine:MapEngine|undefined;
 let mode=$state<'2D'|'3D'>('2D'),hovered=$state<string|undefined>();let generation=0;
 let pois=$state<POI[]>([]),search=$state(''),selected=$state<POI|null>(null),error=$state(''),ready=$state(false),show=$state(true);
 let pointer=$state<{x:number;y:number}|null>(null);let frame=$state<Frame>({markers:[],labels:[],step:'',span:0,cx:0,cy:0,fps:0});
 let measureText = $state<(name:string)=>number>(name=>name.length*7.5);
 const labeledMarkers = $derived(placeLabels(frame.markers,selected?.id,host?.clientWidth??1,host?.clientHeight??1,measureText));
 const filtered=$derived(pois.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||p.id.toLowerCase().includes(search.toLowerCase())));
 onMount(()=>{const context=document.createElement('canvas').getContext('2d');if(context){context.font='13px system-ui';const widths=new Map<string,number>();measureText=name=>{if(!widths.has(name))widths.set(name,context.measureText(name).width);return widths.get(name)!;};}let cancelled=false;import('$lib/map/renderer').then(({createMap})=>{if(cancelled)return;try{engine=createMap(host,f=>frame=f,p=>pointer=p);ready=true;}catch(e){error=`WebGL недоступен: ${String(e)}`;}}).catch(e=>error=String(e));return()=>{cancelled=true;generation++;engine?.dispose();};});
 async function load(e:Event){const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;try{if(file.size>2000000)throw Error('Файл больше 2 МБ');const next=parsePOIs(JSON.parse(await file.text()));pois=next;selected=null;error='';engine?.setPOIs(next);}catch(e){error=String(e);}(e.target as HTMLInputElement).value='';}
 async function switchMode(next:'2D'|'3D'){
  if(next===mode||!ready)return;ready=false;const ticket=++generation;
  try{const module=next==='3D'?await import('$lib/map/renderer-3d'):await import('$lib/map/renderer');if(ticket!==generation)return;
   pointer=null;
   const replacement='createMap3D' in module?module.createMap3D(host,f=>frame=f,p=>pointer=p):module.createMap(host,f=>frame=f,p=>pointer=p);
   engine?.dispose();engine=replacement;mode=next;engine.setPOIs(pois);if(selected)engine.focus(selected);syncAppearance();ready=true;
  }catch(e){error=String(e);ready=true;}
 }
 function syncAppearance(){if(engine&&'setAppearance' in engine)engine.setAppearance(selected?.id,hovered,show);}
 $effect(()=>{selected;hovered;show;syncAppearance();});
 function pick(p:POI){selected=p;}
</script>
<svelte:head><title>TLC Hub Map</title><meta name="description" content="Координатная карта The Last Caretaker" /></svelte:head>
<div class="map-app">
 <header><div><h1>TLC Hub Map</h1><small>Мировые координаты · UE / сантиметры</small></div><nav><a href="/">Build Optimizer</a><a href="/inventory">Inventory</a><span>Map</span></nav></header>
 <main>
 <aside><label class="import">Импорт известных POI<input type="file" accept=".json,application/json" onchange={load} disabled={!ready}/></label><p class="muted">Файл остаётся в памяти этой страницы. Ничего не отправляется на сервер.</p>
 <input aria-label="Поиск POI" placeholder="Поиск по имени или ID" bind:value={search}/>
 <label><input type="checkbox" bind:checked={show}/> Показать слой POI</label>
 <div class="controls-guide" aria-label="Управление картой"><strong>Управление · {mode}</strong>
 <p>Левая кнопка + drag — перемещение</p>
 {#if mode==='3D'}<p>Правая кнопка + drag — вращение и наклон</p>{/if}
 <p>Колесо / тачпад — zoom к курсору, в том числе поверх подписей</p>
 {#if mode==='3D'}<small>Сенсорный экран: один палец — вращение; два — перемещение и zoom.</small>{/if}
 </div>
 <p>{pois.length} объектов · {filtered.length} найдено</p>
 {#if !pois.length}<p class="empty">Данные не загружены. Импортируйте отфильтрованный JSON известных игровых локаторов.</p>{/if}
 <div class="list">{#each filtered as p (p.id)}<button class:active={selected?.id===p.id} onclick={()=>pick(p)}>{p.name}</button>{/each}</div>
 {#if selected}<section><h2>{selected.name}</h2><p>X: {metres(selected.world.x)} м<br/>Y: {metres(selected.world.y)} м<br/>Z: {selected.world.z===null?'неизвестна':`${metres(selected.world.z)} м`}</p><button onclick={()=>engine?.focus(selected!)}>Центрировать</button><p class="muted">Позиция игрового локатора; не обязательно вход или центр сооружения.</p><details><summary>Происхождение и точность</summary><p>{selected.id}</p><p>Build: {selected.gameBuild}</p><p>{selected.source}</p><p>{selected.accuracy}</p><p>Статус: известен игроку</p></details></section>{/if}
 </aside>
 <div class="viewport" bind:this={host}>
 <div class="toolbar" role="toolbar"><button aria-pressed={mode==='2D'} disabled={!ready} onclick={()=>switchMode('2D')}>2D</button><button aria-pressed={mode==='3D'} disabled={!ready} onclick={()=>switchMode('3D')}>3D</button><button onclick={()=>engine?.overview()}>Общий вид</button><button aria-label="Увеличить" onclick={()=>engine?.zoom(.5)}>+</button><button aria-label="Уменьшить" onclick={()=>engine?.zoom(2)}>−</button></div>
 {#each frame.labels as l}<span class="grid-label" style:left={`${l.x}px`} style:top={`${l.y}px`}>{l.text}</span>{/each}
 {#if show}{#each labeledMarkers as m (m.poi.id)}<button class="marker" class:chosen={selected?.id===m.poi.id} style:left={`${m.x}px`} style:top={`${m.y}px`} title={m.poi.name} aria-label={m.poi.name} onclick={()=>pick(m.poi)} onpointerdown={e=>e.stopPropagation()} onpointerenter={()=>hovered=m.poi.id} onpointerleave={()=>hovered=undefined}>{mode==='3D'&&m.poi.world.z===null?'◇':'●'}<span class="poi-label" class:suppressed={!m.label.visible} style:left={`${m.label.dx+12}px`} style:top={`${m.label.dy+14}px`} style:width={`${m.label.width}px`}>{m.poi.name}</span></button>{/each}{/if}
 <div class="readout">{#if pointer}X {metres(pointer.x)} м · Y {metres(pointer.y)} м{:else}{mode==='2D'?'+X вправо · +Y вниз':'3D · курсор на плоскости Z=0'}{/if}<br/>Шаг сетки: {frame.step} · ширина вида: {metres(frame.span)} м</div>
 </div></main>
 {#if error}<p role="alert" class="error">{error}</p>{/if}
 <footer>{mode==='3D'?'3D: левая кнопка — перемещение, правая — вращение, колесо — zoom к курсору. ◇ — неизвестная Z.':'2D: перетаскивание — перемещение, колесо / тачпад — zoom у курсора.'} Совпадающие POI доступны в списке. Z=0 — опорная плоскость, не уровень моря.</footer>
</div>
<style>
 .map-app{height:100dvh;display:flex;flex-direction:column;background:#090f1d;color:#d4e7f8}header{display:flex;justify-content:space-between;align-items:center;padding:14px 22px;border-bottom:1px solid #293c54}h1{font-size:1.3rem;margin:0}small,.muted,footer{color:#8ea6bd}nav{display:flex;gap:18px}nav a{color:#73c8eb}main{display:flex;flex:1;min-height:0}aside{width:290px;padding:16px;overflow:auto;background:#101a2a;flex-shrink:0}aside>input{width:100%;margin:14px 0}input,button{background:#17273b;color:#d4e7f8;border:1px solid #34506b;border-radius:5px;padding:8px}button{cursor:pointer}button:hover,.active{background:#245077}.import{display:block}.import input{width:100%;margin-top:8px}.controls-guide{margin:12px 0;padding:10px;border:1px solid #34506b;border-radius:5px;font-size:.8rem;line-height:1.5}.controls-guide p{margin:4px 0}.muted,.empty{font-size:.8rem;line-height:1.5}.list{max-height:35vh;overflow:auto;display:grid;gap:4px}.list button{text-align:left}h2{font-size:1rem}section{border-top:1px solid #34506b;margin-top:16px;padding-top:12px}details{font-size:.8rem;overflow-wrap:anywhere}.viewport{flex:1;min-width:0;position:relative;overflow:hidden;touch-action:none;cursor:grab}.viewport:active{cursor:grabbing}.viewport :global(canvas){display:block}.toolbar{position:absolute;right:14px;top:14px;z-index:3;display:flex;gap:6px}.toolbar button[aria-pressed="true"]{background:#245077}.grid-label{position:absolute;pointer-events:none;color:#718ca7;font:10px monospace;white-space:nowrap}.marker{position:absolute;transform:translate(-50%,-50%);padding:2px 5px;border:0;background:transparent;color:#47dce9;font-size:20px;z-index:2}.marker:hover{color:#a5f7ff;background:#192e44;cursor:pointer;text-shadow:0 0 8px #47dce9}.marker.chosen,.marker.chosen:hover{color:#ffd66c;background:#192e44}.poi-label{position:absolute;white-space:nowrap;font:13px/20px system-ui;color:#dce4ed;text-align:left;padding:2px 6px;overflow:hidden;text-overflow:ellipsis;border-radius:3px;background:#090f1db8;text-shadow:-1px 0 #090f1d,1px 0 #090f1d,0 -1px #090f1d,0 1px #090f1d;cursor:pointer}.suppressed{display:none}.marker:hover .poi-label{display:block;color:#fff;background:#15263a}.marker.chosen .poi-label,.marker.chosen:hover .poi-label{color:#ffd66c;display:block}.marker:hover,.marker.chosen{z-index:4}.readout{position:absolute;bottom:12px;left:12px;background:#101a2ae8;padding:9px;font:12px monospace;pointer-events:none}footer{padding:8px 14px;font-size:.75rem}.error{color:#ffb6a3;padding:8px}@media(max-width:700px){header{padding:10px;gap:8px}nav{font-size:.75rem;gap:8px}main{flex-direction:column-reverse}aside{width:auto;max-height:35vh}.viewport{min-height:40vh}.list{max-height:120px}footer{font-size:.65rem}}
</style>
