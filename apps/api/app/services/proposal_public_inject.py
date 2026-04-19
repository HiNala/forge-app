"""Inject proposal interactivity into published HTML (scripts allowed only at read time — W-02)."""

# ruff: noqa: E501
from __future__ import annotations

import json


def inject_proposal_public_runtime(
    html: str,
    *,
    api_base: str,
    org_slug: str,
    page_slug: str,
) -> str:
    """Append JS before </body> — pairs with `render_proposal_html` (no stored scripts)."""
    cfg = json.dumps(
        {
            "api": api_base.rstrip("/"),
            "org": org_slug,
            "page": page_slug,
        },
        ensure_ascii=True,
    )
    # Proposal forms POST JSON to API; CORS must allow the marketing app origin.
    js = (
        "(function(){var C="
        + cfg
        + r""";
function api(p){return C.api+p;}
function qs(sel){return document.querySelector(sel);}
function showModal(on){var m=qs("#forge-q-modal");if(!m)return;if(on){m.classList.remove("forge-hidden");}else{m.classList.add("forge-hidden");}}
function bind(){
 var root=document.body;
 if(!root||root.getAttribute("data-forge-proposal-root")!=="1")return;
 var ag=qs(".forge-accept-grid");
 var locked=ag&&ag.getAttribute("data-locked")==="true";
 fetch(api("/p/"+encodeURIComponent(C.org)+"/"+encodeURIComponent(C.page)+"/proposal/view"),{method:"POST",headers:{"Accept":"application/json"}}).catch(function(){});
 document.querySelectorAll("[data-forge-question-trigger]").forEach(function(btn){
  btn.addEventListener("click",function(){
   var sec=btn.getAttribute("data-forge-question-trigger")||"";
   var h=qs("#forge-q-section");if(h)h.value=sec;showModal(true);
  });
 });
 var qc=qs("#forge-q-cancel");if(qc)qc.addEventListener("click",function(){showModal(false);});
 var qsnd=qs("#forge-q-send");if(qsnd)qsnd.addEventListener("click",function(){
  var em=qs("#forge-q-email"),tx=qs("#forge-q-text"),sr=qs("#forge-q-section");
  var body={asker_email:(em&&em.value)||"",question:(tx&&tx.value)||"",section_ref:(sr&&sr.value)||""};
  fetch(api("/p/"+encodeURIComponent(C.org)+"/"+encodeURIComponent(C.page)+"/proposal/question"),{
   method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},
   body:JSON.stringify(body)}).then(function(r){if(r.ok){showModal(false);alert("Question sent.");}});
 });
 var kinds=document.querySelectorAll("input[name=forge-acc-kind]");
 var tw=qs("#forge-typed-wrap"),dw=qs("#forge-draw-wrap");
 function syncKind(){
  var v="click_to_accept";
  kinds.forEach(function(r){if(r.checked)v=r.value;});
  if(tw)tw.classList.toggle("forge-hidden",v!=="typed");
  if(dw)dw.classList.toggle("forge-hidden",v!=="drawn");
 }
 kinds.forEach(function(r){r.addEventListener("change",syncKind);});syncKind();
 var canvas=qs("#forge-sig-pad"),ctx=canvas&&canvas.getContext("2d"),draw=false,lx=0,ly=0;
 function cpos(ev){
  var r=canvas.getBoundingClientRect(),x=(ev.clientX!==undefined?ev.clientX:ev.touches[0].clientX)-r.left;
  var y=(ev.clientY!==undefined?ev.clientY:ev.touches[0].clientY)-r.top;return{x:x,y:y};
 }
 if(canvas&&ctx){
  canvas.addEventListener("mousedown",function(e){draw=true;lx=cpos(e).x;ly=cpos(e).y;});
  canvas.addEventListener("mousemove",function(e){if(!draw)return;var p=cpos(e);ctx.strokeStyle="#111";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(p.x,p.y);ctx.stroke();lx=p.x;ly=p.y;});
  window.addEventListener("mouseup",function(){draw=false;});
  canvas.addEventListener("touchstart",function(e){e.preventDefault();draw=true;lx=cpos(e).x;ly=cpos(e).y;},{passive:false});
  canvas.addEventListener("touchmove",function(e){e.preventDefault();if(!draw)return;var p=cpos(e);ctx.strokeStyle="#111";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(p.x,p.y);ctx.stroke();lx=p.x;ly=p.y;},{passive:false});
  canvas.addEventListener("touchend",function(){draw=false;});
 }
 var clr=qs("#forge-sig-clear");if(clr&&canvas&&ctx)clr.addEventListener("click",function(){ctx.clearRect(0,0,canvas.width,canvas.height);});
 var acc=qs("#forge-acc-submit");
 if(acc&&!locked)acc.addEventListener("click",function(){
  var nm=qs("#forge-acc-name"),em=qs("#forge-acc-email"),ph=qs("#forge-acc-phone"),ack=qs("#forge-acc-ack");
  var vKind="click_to_accept";kinds.forEach(function(r){if(r.checked)vKind=r.value;});
  if(ack&&!ack.checked){alert("Please confirm you have read and agree.");return;}
  var sig=null;if(vKind==="typed"){var t=qs("#forge-typed-sig");sig=t?t.value:"";}
  if(vKind==="drawn"&&canvas){try{sig=canvas.toDataURL("image/png");}catch(e){sig=null;}}
  var payload={name:nm?nm.value:"",email:em?em.value:"",phone:ph?ph.value:null,signature_kind:vKind,signature_data:sig};
  fetch(api("/p/"+encodeURIComponent(C.org)+"/"+encodeURIComponent(C.page)+"/proposal/accept"),{
   method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},
   body:JSON.stringify(payload)}).then(function(r){return r.json().then(function(j){return{ok:r.ok,j:j};});}).then(function(x){
    if(x.ok)alert("Accepted — thank you. "+(x.j&&x.j.proposal_number||""));else alert((x.j&&x.j.detail)||"Could not accept");
   });
 });
 var dsub=qs("#forge-dec-submit"),dw2=qs("#forge-dec-wrap"),dconf=qs("#forge-dec-confirm");
 if(dsub&&dw2&&!locked)dsub.addEventListener("click",function(){dw2.classList.remove("forge-hidden");});
 if(dconf&&!locked)dconf.addEventListener("click",function(){
  var rs=qs("#forge-dec-reason");
  fetch(api("/p/"+encodeURIComponent(C.org)+"/"+encodeURIComponent(C.page)+"/proposal/decline"),{
   method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},
   body:JSON.stringify({reason:rs?rs.value:null})}).then(function(r){if(r.ok){alert("Declined.");location.reload();}});
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);else bind();
})();"""
    )
    snippet = f"<script>\n{js}\n</script>"
    low = html.lower()
    idx = low.rfind("</body>")
    if idx == -1:
        return html + snippet
    return html[:idx] + snippet + html[idx:]
