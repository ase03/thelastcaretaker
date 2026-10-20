import {json, type RequestHandler} from '@sveltejs/kit';
import {playerStates, requestBytes, StateError} from '$lib/server/player-states';
export const prerender = false;
const headers = {'Cache-Control':'no-store'};
export const GET:RequestHandler = async ({params}) => {
 try {
  const state = await playerStates.get(params.steamId64!);
  if (!state) return json({error:'Player state not found'},{status:404,headers});
  return new Response(state.bytes.toString('utf8'),{headers:{...headers,'Content-Type':'application/json; charset=utf-8',ETag:state.etag}});
 } catch (e) {
  if (e instanceof StateError) return json({error:e.message},{status:e.status,headers});
  throw e;
 }
};
export const PUT:RequestHandler = async ({params,request}) => {
 try {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')
   throw new StateError(415,'Expected application/json');
  const result = await playerStates.put(params.steamId64!,await requestBytes(request),{
   match:request.headers.get('if-match'), none:request.headers.get('if-none-match')
  });
  return json({status:'published'},{status:result.created?201:200,headers:{...headers,ETag:result.etag}});
 } catch (e) {
  if (e instanceof StateError) return json({error:e.message},{status:e.status,headers});
  throw e;
 }
};
