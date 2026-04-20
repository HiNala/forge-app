"""Inject slot-picker runtime for published pages that include data-forge-slot-picker (W-01)."""

from __future__ import annotations

# Minimal interactive picker: uses window.__FORGE_TRACK_CONFIG__ from forge-track.js bootstrap.
# ruff: noqa: E501
_BOOKING_JS = r"""
(function forgeSlotPicker(){
  var C=window.__FORGE_TRACK_CONFIG__;
  if(!C||!C.apiBase)return;
  var root=document.querySelector("[data-forge-slot-picker]");
  if(!root)return;
  var form=root.closest("form");
  var dur=parseInt(root.getAttribute("data-duration")||"30",10)||30;
  var submitBtn=form?form.querySelector(".forge-submit"):null;
  var hidHold=root.querySelector('input[name="hold_id"]');
  var hidForge=root.querySelector('input[name="forge_hold_id"]');
  var hidSlot=root.querySelector('input[name="__selected_slot"]');
  var tzEl=root.querySelector(".forge-slot-tz-hint");
  var strip=root.querySelector(".forge-slot-date-strip");
  var times=root.querySelector(".forge-slot-times");
  var status=root.querySelector(".forge-slot-status");
  var selEl=root.querySelector(".forge-slot-selected");
  var api=C.apiBase;
  var org=C.org;
  var page=C.page;
  function pth(suf){return api+"/p/"+encodeURIComponent(org)+"/"+encodeURIComponent(page)+suf;}
  var today=new Date();
  today.setHours(0,0,0,0);
  var slotPayload=[];
  var calTz="UTC";
  var selectedDate=today;
  var heldId=null;

  try{
    var tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"local";
    if(tzEl)tzEl.textContent="Times shown in your local zone ("+tz+").";
  }catch(e){}

  function isoD(d){
    var y=d.getFullYear(),m=1+d.getMonth(),da=d.getDate();
    return y+"-"+(m<10?"0":"")+m+"-"+(da<10?"0":"")+da;
  }
  function padSlot(isoStart,isoEnd){
    if(!hidSlot)return;
    hidSlot.value=JSON.stringify({start:isoStart,end:isoEnd});
  }
  function setSubmit(on){
    if(submitBtn){
      submitBtn.disabled=!on;
      submitBtn.setAttribute("aria-disabled",on?"false":"true");
    }
  }
  setSubmit(false);

  function loadSlots(cb){
    var d0=new Date(today);
    var d1=new Date(d0);d1.setDate(d1.getDate()+14);
    var q="?date_from="+isoD(d0)+"&date_to="+isoD(d1)+"&duration="+encodeURIComponent(String(dur));
    fetch(pth("/availability")+q,{credentials:"same-origin"}).then(function(r){return r.ok?r.json():{slots:[]};}).then(function(j){
      calTz=j.calendar_timezone||"UTC";
      slotPayload=Array.isArray(j.slots)?j.slots:[];
      cb();
    }).catch(function(){slotPayload=[];cb();});
  }

  function slotsForDay(d){
    var out=[];
    var ds=isoD(d);
    for(var i=0;i<slotPayload.length;i++){
      var s=slotPayload[i];if(!s||!s.start)continue;
      var t=Date.parse(s.start);if(isNaN(t))continue;
      var dd=new Date(t);if(isoD(dd)===ds)out.push(s);
    }
    out.sort(function(a,b){return Date.parse(a.start)-Date.parse(b.start);});
    return out;
  }

  function renderTimes(){
    if(!times)return;
    times.innerHTML="";
    var list=slotsForDay(selectedDate);
    var lim=Math.min(list.length,12);
    for(var i=0;i<lim;i++){(function(sl){
      var dt=new Date(Date.parse(sl.start));
      var label=dt.toLocaleString(undefined,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
      var btn=document.createElement("button");
      btn.type="button";
      btn.className="forge-slot-btn";
      btn.textContent=dt.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
      btn.setAttribute("aria-label","Book "+label);
      btn.addEventListener("click",function(){selectSlot(sl);});
      times.appendChild(btn);
    })(list[i]);}
    if(list.length>12&&status){
      status.textContent=list.length+" times — showing first 12.";
    }else if(status&&list.length===0){status.textContent="No times this day.";}
  }

  function renderStrip(){
    if(!strip)return;
    strip.innerHTML="";
    for(var i=0;i<14;i++){
      var d=new Date(today);d.setDate(d.getDate()+i);
      var b=document.createElement("button");
      b.type="button";
      b.className="forge-slot-day"+(isoD(d)===isoD(selectedDate)?" is-active":"");
      b.textContent=(d.getMonth()+1)+"/"+d.getDate();
      b.setAttribute("role","tab");
      b.setAttribute("aria-selected",isoD(d)===isoD(selectedDate)?"true":"false");
      (function(dd){
        b.addEventListener("click",function(){selectedDate=dd;renderStrip();renderTimes();});
      })(d);
      strip.appendChild(b);
    }
    var na=document.createElement("button");
    na.type="button";na.textContent="Next available";
    na.addEventListener("click",function(){
      var best=null;
      for(var i=0;i<slotPayload.length;i++){
        var s=slotPayload[i];if(!s||!s.start)continue;
        var t=Date.parse(s.start);if(isNaN(t))continue;
        var dd=new Date(t);dd.setHours(0,0,0,0);
        if(!best||dd<best)best=dd;
      }
      if(best){selectedDate=best;renderStrip();renderTimes();}
      else if(status)status.textContent="No open slots in the next two weeks.";
    });
    strip.appendChild(na);
  }

  function selectSlot(sl){
    fetch(pth("/availability/hold"),{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({slot_start:sl.start,slot_end:sl.end}),
      credentials:"same-origin"
    }).then(function(r){
      if(r.status===409){
        if(status)status.textContent="That time was just taken — pick another.";
        loadSlots(function(){renderTimes();});
        return null;
      }
      return r.ok?r.json():null;
    }).then(function(j){
      if(!j||!j.hold_id)return;
      heldId=j.hold_id;
      if(hidHold)hidHold.value=heldId;
      if(hidForge)hidForge.value=heldId;
      padSlot(sl.start,sl.end);
      setSubmit(true);
      var dt=new Date(Date.parse(sl.start));
      var pretty=dt.toLocaleString(undefined,{weekday:"long",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
      if(selEl)selEl.textContent="Selected: "+pretty;
      root.classList.add("forge-slot-has-hold");
      if(status)status.textContent="";
    }).catch(function(){if(status)status.textContent="Could not hold that slot.";});
  }

  loadSlots(function(){renderStrip();renderTimes();});
})();
"""


def inject_booking_slot_runtime(html: str) -> str:
    """Append slot-picker script when the stored HTML references the picker root."""
    if "data-forge-slot-picker" not in html.lower():
        return html
    if "forgeSlotPicker" in html:
        return html
    snippet = f"<script>\n{_BOOKING_JS}\n</script>"
    low = html.lower()
    idx = low.rfind("</body>")
    if idx == -1:
        return html + snippet
    return html[:idx] + snippet + html[idx:]


