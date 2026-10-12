<script lang="ts">
 import '../../app.css';
 import {onMount} from 'svelte';
 import {parsePOIs,metres,type POI} from '$lib/map/coordinates';
 import type {Frame} from '$lib/map/renderer';
 let host:HTMLDivElement;let engine:ReturnType<typeof import('$lib/map/renderer').createMap>|undefined;
 let pois=$state<POI[]>([]),search=$state(''),selected=$state<POI|null>(null),error=$state(''),ready=$state(false),show=$state(true);
 let pointer=$state<{x:number;y:number}|null>(null);let frame=$state<Frame>({markers:[],labels:[],step:'',span:0,cx:0,cy:0,fps:0});
 const filtered=$derived(pois.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||p.id.toLowerCase().includes(search.toLowerCase())));
 onMount(()=>{let cancelled=false;import('$lib/map/renderer').then(({createMap})=>{if(cancelled)return;try{engine=createMap(host,f=>frame=f,p=>pointer=p);ready=true;}catch(e){error=`WebGL недоступен: ${String(e)}`;}}).catch(e=>error=String(e));return()=>{cancelled=true;engine?.dispose();};});
 async function load(e:Event){const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;try{if(file.size>2000000)throw Error('Файл больше 2 МБ');const next=parsePOIs(JSON.parse(await file.text()));pois=next;selected=null;error='';engine?.setPOIs(next);}catch(e){error=String(e);}(e.target as HTMLInputElement).value='';}
 function pick(p:POI){selected=p;}
</script>
<svelte:head><title>TLC Hub Map</title><meta name="description" content="Координатная карта The Last Caretaker" /></svelte:head>
<div class="map-app">
 <header><div><h1>TLC Hub Map</h1><small>Мировые координаты · UE / сантиметры</small></div><nav><a href="/">Build Optimizer</a><a href="/inventory">Inventory</a><span>Map</span></nav></header>
 <main>
 <aside><label class="import">Импорт известных POI<input type="file" accept=".json,application/json" onchange={load} disabled={!ready}/></label><p class="muted">Файл остаётся в памяти этой страницы. Ничего не отправляется на сервер.</p>
 <input aria-label="Поиск POI" placeholder="Поиск по имени или ID" bind:value={search}/>
 <label><input type="checkbox" bind:checked={show}/> Показать слой POI</label>
 <p>{pois.length} объектов · {filtered.length} найдено</p>
 {#if !pois.length}<p class="empty">Данные не загружены. Импортируйте отфильтрованный JSON известных игровых локаторов.</p>{/if}
 <div class="list">{#each filtered as p (p.id)}<button class:active={selected?.id===p.id} onclick={()=>pick(p)}>{p.name}</button>{/each}</div>
 {#if selected}<section><h2>{selected.name}</h2><p>X: {metres(selected.world.x)} м<br/>Y: {metres(selected.world.y)} м<br/>Z: {selected.world.z===null?'неизвестна':`${metres(selected.world.z)} м`}</p><button onclick={()=>engine?.focus(selected!)}>Центрировать</button><p class="muted">Позиция игрового локатора; не обязательно вход или центр сооружения.</p><details><summary>Происхождение и точность</summary><p>{selected.id}</p><p>Build: {selected.gameBuild}</p><p>{selected.source}</p><p>{selected.accuracy}</p><p>Статус: известен игроку</p></details></section>{/if}
 </aside>
 <div class="viewport" bind:this={host}>
 <div class="toolbar" role="toolbar"><button onclick={()=>engine?.overview()}>Общий вид</button><button aria-label="Увеличить" onclick={()=>engine?.zoom(.5)}>+</button><button aria-label="Уменьшить" onclick={()=>engine?.zoom(2)}>−</button></div>
 {#each frame.labels as l}<span class="grid-label" style:left={`${l.x}px`} style:top={`${l.y}px`}>{l.text}</span>{/each}
 {#if show}{#each frame.markers as m (m.poi.id)}<button class="marker" class:chosen={selected?.id===m.poi.id} style:left={`${m.x}px`} style:top={`${m.y}px`} title={m.poi.name} aria-label={m.poi.name} onclick={()=>pick(m.poi)} onpointerdown={e=>e.stopPropagation()}>●{#if selected?.id===m.poi.id}<span>{m.poi.name}</span>{/if}</button>{/each}{/if}
 <div class="readout">{#if pointer}X {metres(pointer.x)} м · Y {metres(pointer.y)} м{:else}+X вправо · +Y вниз{/if}<br/>Шаг сетки: {frame.step} · ширина вида: {metres(frame.span)} м</div>
 </div></main>
 {#if error}<p role="alert" class="error">{error}</p>{/if}
 <footer>Перетаскивание — перемещение · колесо / тачпад — масштаб у курсора · совпадающие POI доступны в списке. Z=0 — опорная плоскость, не уровень моря.</footer>
</div>
<style>
 .map-app{height:100dvh;display:flex;flex-direction:column;background:#090f1d;color:#d4e7f8}header{display:flex;justify-content:space-between;align-items:center;padding:14px 22px;border-bottom:1px solid #293c54}h1{font-size:1.3rem;margin:0}small,.muted,footer{color:#8ea6bd}nav{display:flex;gap:18px}nav a{color:#73c8eb}main{display:flex;flex:1;min-height:0}aside{width:290px;padding:16px;overflow:auto;background:#101a2a;flex-shrink:0}aside>input{width:100%;margin:14px 0}input,button{background:#17273b;color:#d4e7f8;border:1px solid #34506b;border-radius:5px;padding:8px}button{cursor:pointer}button:hover,.active{background:#245077}.import{display:block}.import input{width:100%;margin-top:8px}.muted,.empty{font-size:.8rem;line-height:1.5}.list{max-height:35vh;overflow:auto;display:grid;gap:4px}.list button{text-align:left}h2{font-size:1rem}section{border-top:1px solid #34506b;margin-top:16px;padding-top:12px}details{font-size:.8rem;overflow-wrap:anywhere}.viewport{flex:1;min-width:0;position:relative;overflow:hidden;touch-action:none;cursor:grab}.viewport:active{cursor:grabbing}.viewport :global(canvas){display:block}.toolbar{position:absolute;right:14px;top:14px;z-index:3;display:flex;gap:6px}.grid-label{position:absolute;pointer-events:none;color:#718ca7;font:10px monospace;white-space:nowrap}.marker{position:absolute;transform:translate(-50%,-50%);padding:2px 5px;border:0;background:transparent;color:#47dce9;font-size:20px;z-index:2}.marker:hover,.chosen{color:#ffd66c;background:#192e44}.marker span{position:absolute;left:22px;top:4px;white-space:nowrap;font-size:12px;background:#101a2a;padding:4px}.readout{position:absolute;bottom:12px;left:12px;background:#101a2ae8;padding:9px;font:12px monospace;pointer-events:none}footer{padding:8px 14px;font-size:.75rem}.error{color:#ffb6a3;padding:8px}@media(max-width:700px){header{padding:10px;gap:8px}nav{font-size:.75rem;gap:8px}main{flex-direction:column-reverse}aside{width:auto;max-height:35vh}.viewport{min-height:40vh}.list{max-height:120px}footer{font-size:.65rem}}
</style>


