import {json} from '@sveltejs/kit';
import {playerStates} from '$lib/server/player-states';
export const prerender = false;
export async function GET() {
 return json({players:await playerStates.list()},{headers:{'Cache-Control':'no-store'}});
}
