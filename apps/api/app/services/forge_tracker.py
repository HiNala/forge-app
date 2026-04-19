"""Inject first-party analytics bootstrap into published HTML (Mission 06)."""

# ruff: noqa: E501
from __future__ import annotations

import json
from typing import Any


def _cfg_json(cfg: dict[str, Any]) -> str:
    return json.dumps(cfg, separators=(",", ":"), ensure_ascii=True)


def inject_forge_tracker(
    html: str,
    *,
    api_base: str,
    org_slug: str,
    page_slug: str,
    page_id: str,
    page_type: str,
) -> str:
    """Append tracker before ``</body>`` (stored HTML remains script-free)."""
    cfg = _cfg_json(
        {
            "apiBase": api_base.rstrip("/"),
            "org": org_slug,
            "page": page_slug,
            "pageId": page_id,
            "pageType": page_type,
        }
    )
    # fmt: off
    js = (
        "(function(){var C="
        + cfg
        + r""";
var B=C.apiBase+'/p/'+encodeURIComponent(C.org)+'/'+encodeURIComponent(C.page)+'/track';
var Q=[],T=null,FS=false,FSUB=false,DONE=false,MX=0;
function cid(k){var m=document.cookie.match(new RegExp('(?:^|; )'+k+'=([^;]*)'));return m?decodeURIComponent(m[1]):'';}
function scid(k,v,sec){document.cookie=k+'='+encodeURIComponent(v)+';path=/;max-age='+sec+';SameSite=Lax';}
function vid(){var x=cid('forge_vid');if(!x){x=(crypto.randomUUID&&crypto.randomUUID())||('v'+Math.random().toString(36).slice(2));scid('forge_vid',x,31536000);}return x;}
function sid(){var x=cid('forge_sid'),t=Date.now(),p=parseInt(cid('forge_sla')||'0',10)||0;if(!x||t-p>1800000){x=(crypto.randomUUID&&crypto.randomUUID())||('s'+Math.random().toString(36).slice(2));scid('forge_sid',x,86400);}scid('forge_sla',String(t),86400);return x;}
function push(ev,md){Q.push({event_type:ev,metadata:md||{},visitor_id:vid(),session_id:sid()});sched();}
function sched(){if(T)return;T=setTimeout(function(){T=null;flush();},3000);}
function flush(){if(!Q.length)return;var batch=Q.splice(0,10);try{var p=JSON.stringify({events:batch});if(navigator.sendBeacon)navigator.sendBeacon(B,new Blob([p],{type:'application/json'}));else fetch(B,{method:'POST',headers:{'Content-Type':'application/json'},body:p,keepalive:true});}catch(e){}}
function unload(){if(DONE)return;DONE=true;if(FS&&!FSUB)push('form_abandon',{});if(MX>0)push('scroll_depth',{scroll_pct:Math.round(MX)});flush();}
window.addEventListener('beforeunload',unload);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')unload();});
push('page_view',{page_type:C.pageType,page_id:C.pageId});
var io=new IntersectionObserver(function(es){es.forEach(function(e){var el=e.target,se=el._fs;if(!se)se=el._fs={v:false,t:0};if(e.isIntersecting){se.v=true;if(!se.t)se.t=Date.now();}else if(se.v){var d=se.t?Date.now()-se.t:0;push('section_dwell',{section_id:el.getAttribute('data-forge-section')||'',dwell_ms:d});se.v=false;se.t=0;}});},{threshold:0.2});
document.querySelectorAll('[data-forge-section]').forEach(function(el){io.observe(el);});
document.addEventListener('click',function(ev){var t=ev.target.closest('[data-forge-cta]');if(t)push('cta_click',{target:t.getAttribute('data-forge-cta')||'cta'});var a=ev.target.closest('[data-forge-proposal-accept]');if(a)push('proposal_accept',{});var d=ev.target.closest('[data-forge-proposal-decline]');if(d)push('proposal_decline',{});},true);
document.addEventListener('scroll',function(){var h=document.documentElement,s=(h.scrollTop+h.clientHeight)/Math.max(h.scrollHeight,1)*100;if(s>MX)MX=s;},{passive:true});
document.querySelectorAll('form').forEach(function(form){
form.addEventListener('focusin',function(e){if(e.target&&e.target.name&&!FS){FS=true;push('form_start',{});}},true);
form.addEventListener('focusout',function(e){var t=e.target;if(t&&t.name)push('form_field_touch',{field:String(t.name)});},true);
form.addEventListener('submit',function(ev){var act=form.getAttribute('action')||'';var u=act.indexOf('http')===0?act:(C.apiBase+act);ev.preventDefault();var fd=new FormData(form);fetch(u,{method:'POST',body:fd,headers:{'Accept':'application/json'}}).then(function(r){if(r.ok){FSUB=true;flush();}});});
});
})();"""
    )
    # fmt: on
    snippet = f"<script>\n{js}\n</script>"
    low = html.lower()
    idx = low.rfind("</body>")
    if idx == -1:
        return html + snippet
    return html[:idx] + snippet + html[idx:]
