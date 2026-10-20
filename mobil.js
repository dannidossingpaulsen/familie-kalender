import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const cfg=window.FAMILY_CONFIG||{}, $=id=>document.getElementById(id), zone='Europe/Copenhagen';
const configured=/^https:\/\/.+\.supabase\.co$/.test(cfg.supabaseUrl||'')&&cfg.supabaseKey&&!cfg.supabaseKey.startsWith('INDSAET_');
const db=configured?createClient(cfg.supabaseUrl,cfg.supabaseKey):null;
const state={view:'week',anchor:todayKey(),selected:todayKey(),active:new Set(['Danni','Cathrine','Familie']),remote:[],shift:[]};
const fmt=(opt)=>new Intl.DateTimeFormat('da-DK',{timeZone:zone,...opt});
const dayFmt=fmt({weekday:'long',day:'numeric',month:'long'}), monthFmt=fmt({month:'long',year:'numeric'}),clockFmt=fmt({hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function key(d){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;}
function todayKey(){return key(new Date());}
function add(k,n){const [y,m,d]=k.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10);}
function asDate(k){return new Date(`${k}T12:00:00Z`);}
function monday(k){const d=asDate(k).getUTCDay();return add(k,-((d+6)%7));}
function monthStart(k){return k.slice(0,7)+'-01';}
function addMonth(k,n){const [y,m]=k.split('-').map(Number);return new Date(Date.UTC(y,m-1+n,1)).toISOString().slice(0,10);}
function dateAt(k,t){const [y,m,d]=k.split('-').map(Number),[h,min]=t.split(':').map(Number);const guess=Date.UTC(y,m-1,d,h,min);const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess)).map(x=>[x.type,x.value]));const shown=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);return new Date(guess+(guess-shown)).toISOString();}
function person(e){if(e.shift)return e.person;if(cfg.familyCalendarId&&e.calendar_id===cfg.familyCalendarId)return 'Familie';const id=String(e.calendar_id||'').toLowerCase();if(/familie|family/.test(id))return 'Familie';return e.person==='Danni'?'Danni':'Cathrine';}
function norm(s){return String(s||'').toLocaleLowerCase('da-DK').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
function overlap(a,b){return Math.max(0,Math.min(Date.parse(a.ends_at),Date.parse(b.ends_at))-Math.max(Date.parse(a.starts_at),Date.parse(b.starts_at)));}
function same(a,b){if(a.all_day!==b.all_day)return false;const pa=person(a),pb=person(b);if(pa!==pb)return false;
 if(a.shift!==b.shift){const s=a.shift?a:b, r=a.shift?b:a;
   if(s.all_day)return norm(s.title)===norm(r.title)&&key(new Date(s.starts_at))===key(new Date(r.starts_at));
   const dur=Date.parse(s.ends_at)-Date.parse(s.starts_at);if(!dur||overlap(s,r)/dur<.8)return false;
   const startDiff=Math.abs(Date.parse(s.starts_at)-Date.parse(r.starts_at))/60000;
   if(s.kind==='nat')return startDiff<=90 && /vagt|nat|arbejd|22[:.]45/i.test(r.title||'');
   return startDiff<=45 && (/vagt|arbejd|job|redaktion/i.test(r.title||'')||Math.abs(Date.parse(s.ends_at)-Date.parse(r.ends_at))<30*60000);
 }
 return norm(a.title)===norm(b.title)&&norm(a.title).length>2&&Math.abs(Date.parse(a.starts_at)-Date.parse(b.starts_at))<60000&&Math.abs(Date.parse(a.ends_at)-Date.parse(b.ends_at))<60000;
}
function allEvents(){const result=state.remote.filter(x=>!x.deleted_at).map(x=>({...x,shift:false}));for(const s of state.shift){if(!result.some(r=>same(s,r)))result.push(s);}return result;}
function covers(e,k){if(e.all_day){const a=key(new Date(e.starts_at)),b=key(new Date(Date.parse(e.ends_at)-1));return k>=a&&k<=b;}const a=key(new Date(e.starts_at)),b=key(new Date(Date.parse(e.ends_at)-1));return k>=a&&k<=b;}
function entries(k){const seen=[];return allEvents().filter(e=>state.active.has(person(e))&&covers(e,k)).sort((a,b)=>Number(b.all_day)-Number(a.all_day)||Date.parse(a.starts_at)-Date.parse(b.starts_at)).filter(e=>{if(seen.some(x=>same(x,e)))return false;seen.push(e);return true;});}
function eventTime(e,k){if(e.all_day)return 'Hele dagen';const a=key(new Date(e.starts_at)),b=key(new Date(Date.parse(e.ends_at)-1));if(a===k&&b===k)return `${clockFmt.format(new Date(e.starts_at))}–${clockFmt.format(new Date(e.ends_at))}`;if(a===k)return `Fra ${clockFmt.format(new Date(e.starts_at))}`;if(b===k)return `Til ${clockFmt.format(new Date(e.ends_at))}`;return 'Hele dagen';}
function emojiFor(e){const s=norm(e.title);if(/fodbold|boldtraening|kamp|staevne/.test(s))return '⚽';if(/fodsel|birthday/.test(s))return '🎂';if(/fest|bryllup|julefrokost|festival/.test(s))return '🎉';if(/ferie|sommerhus|rejse/.test(s))return '🏖️';if(/nat(te)?vagt/.test(s))return '🌙';if(/laege|tandlaege|sygehus|fysio/.test(s))return '🩺';if(/skole|institution|foraldre/.test(s))return '🎒';return '';}
function titleFor(e){const em=emojiFor(e);return em?em+' '+(e.title||'Uden titel'):(e.title||'Uden titel');}
function dayBlock(k,items=entries(k)){const date=asDate(k),isToday=k===todayKey();return `<section class="day ${isToday?'today':''}"><div class="day-head">${esc(dayFmt.format(date))}${isToday?'<small>I dag</small>':''}</div><div class="entries">${items.length?items.map(e=>`<div class="entry ${person(e).toLowerCase()}"><div class="time">${esc(eventTime(e,k))}</div><div class="stripe"></div><div><strong>${esc(titleFor(e))}</strong><small>${esc(person(e))}${e.shift?' · Vagtplan':''}${e.location?' · '+esc(e.location):''}</small></div></div>`).join(''):'<div class="empty">Ingen aftaler</div>'}</div></section>`;}
function monthDays(k){const first=monthStart(k),start=monday(first),next=addMonth(first,1);let n=0;while(add(start,n)<next)n+=7;return Array.from({length:n},(_,i)=>add(start,i));}
function render(){const v=state.view,k=state.anchor,month=monthStart(k);document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===v));document.querySelectorAll('[data-person]').forEach(b=>b.classList.toggle('selected',state.active.has(b.dataset.person)));
 let dates=[];if(v==='day'){dates=[k];$('period').textContent=dayFmt.format(asDate(k));}else if(v==='week'){const mon=monday(k);dates=Array.from({length:7},(_,i)=>add(mon,i));$('period').textContent=`${fmt({day:'numeric',month:'short'}).format(asDate(mon))} – ${fmt({day:'numeric',month:'short',year:'numeric'}).format(asDate(add(mon,6)))}`;}else{dates=monthDays(k);$('period').textContent=monthFmt.format(asDate(month));}
 if(v!=='month'){$('calendar').innerHTML=dates.map(d=>dayBlock(d)).join('');return;}
 const grid=['M','T','O','T','F','L','S'].map(s=>`<div class="week-label">${s}</div>`).join('')+dates.map(d=>{const es=entries(d),visible=es.slice(0,2).map(e=>`<span class="mini-event ${person(e).toLowerCase()}" title="${esc(titleFor(e))}">${esc(titleFor(e))}</span>`).join('');const extra=es.length>2?`<span class="mini-event more">+${es.length-2}</span>`:'';return `<button class="cell ${d.slice(0,7)!==month.slice(0,7)?'outside':''} ${d===todayKey()?'today-cell':''} ${d===state.selected?'selected-day':''}" data-date="${d}" aria-label="${esc(dayFmt.format(asDate(d)))}"><span class="num">${+d.slice(-2)}</span>${visible}${extra}</button>`;}).join('');
 $('calendar').innerHTML=`<div class="month-grid">${grid}</div><div class="month-hint">Tryk på en dato for at se alle aftaler</div><div class="month-detail">${dayBlock(state.selected)}</div>`;
}
function shifts(){return (window.FAMILY_SHIFTS||[]).map(s=>{const endDate=s.next_day?add(s.date,1):s.date;return {...s,shift:true,starts_at:dateAt(s.date,s.start||'00:00'),ends_at:dateAt(s.all_day?add(s.date,1):endDate,s.end||'00:00'),all_day:!!s.all_day};});}
async function load(){if(!db)return;const k=todayKey(),from=addMonth(monthStart(k),-6),to=addMonth(monthStart(k),8);const {data,error}=await db.from('family_calendar_events').select('person,calendar_id,title,location,starts_at,ends_at,all_day,deleted_at,external_id').is('deleted_at',null).lt('starts_at',`${to}T00:00:00Z`).gt('ends_at',`${from}T00:00:00Z`).order('starts_at',{ascending:true}).limit(1000);if(error){$('status').textContent='Kalenderaftaler kunne ikke hentes: '+error.message;return;}state.remote=data||[];$('status').textContent='';$('updated').textContent='Senest hentet '+clockFmt.format(new Date());render();}
async function init(){state.shift=shifts();if(!configured){$('login').classList.remove('hide');$('loginError').textContent='Supabase-nøglen mangler i config.js';return;}const {data:{session}}=await db.auth.getSession();show(!!session);db.auth.onAuthStateChange((_e,s)=>show(!!s));}
let signed=false;function show(ok){$('login').classList.toggle('hide',ok);$('app').classList.toggle('hide',!ok);if(ok&&!signed){signed=true;render();load();}if(!ok)signed=false;}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginError').textContent='';const {error}=await db.auth.signInWithPassword({email:$('email').value,password:$('password').value});if(error)$('loginError').textContent='Login mislykkedes: '+error.message;});
$('logout').addEventListener('click',()=>db.auth.signOut());
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;state.selected=state.anchor;render();}));
$('prev').addEventListener('click',()=>move(-1));$('next').addEventListener('click',()=>move(1));function move(n){state.anchor=state.view==='month'?addMonth(state.anchor,n):add(state.anchor,n*(state.view==='week'?7:1));state.selected=state.anchor;render();}
$('today').addEventListener('click',()=>{state.anchor=todayKey();state.selected=state.anchor;render();});
$('filters').addEventListener('click',e=>{const b=e.target.closest('[data-person]');if(!b)return;const p=b.dataset.person;state.active.has(p)?state.active.delete(p):state.active.add(p);render();});
$('calendar').addEventListener('click',e=>{const b=e.target.closest('[data-date]');if(!b)return;state.selected=b.dataset.date;render();document.querySelector('.month-detail')?.scrollIntoView({behavior:'smooth',block:'nearest'});});
setInterval(()=>{if(signed)render();},60000);setInterval(()=>{if(signed)load();},300000);init();

if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});}
