function selectorForItem(itemId=''){
  const escaped=String(itemId).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
  return `[data-item-id="${escaped}"]`;
}

export function captureElementAnchor(element){
  const itemId=element?.dataset?.itemId;
  const top=element?.getBoundingClientRect?.().top;
  if(!itemId||!Number.isFinite(top))return null;
  return {itemId,top};
}

export function restoreElementAnchor(anchor,{root=globalThis.document,win=globalThis.window}={}){
  if(!anchor?.itemId||!Number.isFinite(anchor.top)||!root?.querySelector||!win?.scrollBy)return false;
  const element=root.querySelector(selectorForItem(anchor.itemId));
  const nextTop=element?.getBoundingClientRect?.().top;
  if(!Number.isFinite(nextTop))return false;
  const delta=nextTop-anchor.top;
  if(delta)win.scrollBy({top:delta,left:0,behavior:'instant'});
  return true;
}
