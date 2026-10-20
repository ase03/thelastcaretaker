import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectReferences} from '../tools/catalog-view.mjs';
test('reference projection omits placements, unresolved icons and unobserved defaults',()=>{
 const item={objectPath:'/Game/Item.Item',data:{Type:'VoyageItem',Properties:{Name:{TableId:'/Game/Text.Text',Key:'name'},Weight:0,Icon:{ObjectPath:'/Game/Icon.0'}}}};
 const c={schema:'tlc-world-catalog/1',gameBuild:'25982825',objects:[item,
  {objectPath:'/Game/Text.Text',data:{Type:'StringTable',StringTable:{KeysToEntries:{name:'Original name'}}}},
  {objectPath:'/Game/Icon.Icon',data:{Type:'Texture2D'}},
  {objectPath:'/Game/Actor.Actor',data:{Type:'VoyageLocatorActor',Properties:{Position:[1,2,3]}}}],
  images:[{textureObjectPath:'/Game/Icon.Icon',file:'images/Icon.png',mipIndex:0}]};
 assert.deepEqual(selectReferences(c),[{schema:'tlc-map-reference/1',gameBuild:'25982825',objectPath:item.objectPath,name:'Original name',icon:null,fields:{Weight:0}}]);
 item.bindings=[{fieldPath:'/Properties/Icon',targetObjectPath:'/Game/Icon.Icon'}];
 assert.equal(selectReferences(c)[0].icon,'images/Icon.png');
 c.images[0].file='images/../private.png';assert.equal(selectReferences(c)[0].icon,null);
 c.objects.push(item);assert.throws(()=>selectReferences(c),/Duplicate/);
});
