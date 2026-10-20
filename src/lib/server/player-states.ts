import {createHash, randomUUID} from 'node:crypto';
import {mkdir, readFile, readdir, rename, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {readFull, type FullSnapshot} from '../map/full-snapshot.ts';

export const BODY_LIMIT = 64 * 1024 * 1024;
export class StateError extends Error {
 status:number;
 constructor(status:number, message:string) { super(message); this.status=status; }
}
const etag = (bytes:Uint8Array) => `"${createHash('sha256').update(bytes).digest('hex')}"`;
export function playerId(id:string) {
 if (!/^\d{17}$/.test(id)) throw new StateError(400,'Invalid SteamID64');
 return id;
}
export class PlayerStates {
 private writes = new Map<string,Promise<unknown>>();
 private directory:string;
 private replace:typeof rename;
 constructor(directory:string, replace = rename) { this.directory=directory; this.replace=replace; }
 async get(id:string) {
  playerId(id);
  try {
   const bytes = await readFile(join(this.directory,`${id}.json`));
   const full = await readFull(bytes.toString('utf8'));
   if (full.metadata.steamId64 !== id) throw new Error('Stored SteamID mismatch');
   return {bytes, full, etag:etag(bytes)};
  } catch (e) {
   if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
   throw e;
  }
 }
 async list() {
  let names:string[];
  try { names = await readdir(this.directory); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []; throw e; }
  const players = [];
  for (const name of names.sort()) {
   if (!/^\d{17}\.json$/.test(name)) continue;
   const state = await this.get(name.slice(0,-5));
   if (state) {
    const m = state.full.metadata;
    players.push({steamId64:m.steamId64, generation:m.generation, snapshotId:m.snapshotId, sourceTimestampNs:m.source.timestampNs});
   }
  }
  return players;
 }
 async put(id:string, bytes:Uint8Array, condition:{match:string|null; none:string|null}) {
  playerId(id);
  if (bytes.byteLength > BODY_LIMIT) throw new StateError(413,'Full exceeds 64 MiB');
  // Own the request bytes before awaiting validation or another writer.
  const body = Buffer.from(bytes);
  let full:FullSnapshot;
  try { full = await readFull(new TextDecoder('utf-8',{fatal:true}).decode(body)); }
  catch (e) { throw new StateError(422,String(e)); }
  if (full.metadata.steamId64 !== id) throw new StateError(400,'URL and Full SteamID differ');
  const previous = this.writes.get(id) ?? Promise.resolve();
  const task = previous.catch(()=>{}).then(async()=>{
   const current = await this.get(id), tag = etag(body), m = full.metadata;
   if (current?.etag === tag) return {created:false, etag:tag};
   if (current) {
    const old = current.full.metadata;
    if (m.generation === old.generation)
     throw new StateError(409,'Identity reused with different bytes');
    const time = BigInt(m.source.timestampNs), oldTime = BigInt(old.source.timestampNs);
    if (time < oldTime || time === oldTime && m.source.sha256 !== old.source.sha256)
     throw new StateError(409,'Older or ambiguous save source');
    if (condition.match !== current.etag) throw new StateError(412,'Published Full changed');
   } else if (condition.none !== '*') throw new StateError(412,'Use If-None-Match: * to create');
   await mkdir(this.directory,{recursive:true});
   const temporary = join(this.directory,`.${id}-${randomUUID()}.tmp`);
   try {
    await writeFile(temporary,body,{flag:'wx'});
    await this.replace(temporary,join(this.directory,`${id}.json`));
   } finally { await rm(temporary,{force:true}); }
   return {created:!current, etag:tag};
  });
  this.writes.set(id,task);
  try { return await task; }
  finally { if (this.writes.get(id) === task) this.writes.delete(id); }
 }
}
export const playerStates = new PlayerStates(process.env.PLAYER_STATES_DIR ?? join(process.cwd(),'data/player-states'));

export async function requestBytes(request:Request):Promise<Uint8Array> {
 const length = request.headers.get('content-length');
 if (length && (!/^\d+$/.test(length) || BigInt(length) > BigInt(BODY_LIMIT))) throw new StateError(413,'Full exceeds 64 MiB');
 if (!request.body) throw new StateError(400,'Missing Full');
 const reader = request.body.getReader(), chunks:Uint8Array[] = [];
 let size = 0;
 try {
  for (;;) {
   const {done,value} = await reader.read(); if (done) break;
   size += value.byteLength;
   if (size > BODY_LIMIT) { await reader.cancel(); throw new StateError(413,'Full exceeds 64 MiB'); }
   chunks.push(value);
  }
 } finally { reader.releaseLock(); }
 return Buffer.concat(chunks,size);
}
