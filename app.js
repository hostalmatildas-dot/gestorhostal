// LÓGICA del Gestor Hostal — requiere data.js cargado antes.
// ═══════════ MODE (fiscal / real) ═══════════
let IS_REAL = false;

function toggleModeBtn(){
  const sw=document.getElementById('mode-switch');
  sw.checked=!sw.checked;
  setMode(sw.checked);
  // Update bottom nav toggle visuals
  const track=document.getElementById('bn-mode-track');
  const thumb=document.getElementById('bn-mode-thumb');
  const lbl=document.getElementById('bn-mode-lbl');
  if(track) track.style.background=sw.checked?'var(--green)':'var(--blue)';
  if(thumb) thumb.style.transform=sw.checked?'translateX(16px)':'translateX(0)';
  if(lbl){lbl.textContent=sw.checked?'REAL':'FISCAL';lbl.style.color=sw.checked?'var(--green)':'var(--blue)';}
}

function setMode(isReal){
  IS_REAL = isReal;
  document.body.classList.toggle('real-mode', isReal);
  document.getElementById('lbl-fiscal').style.color = isReal ? 'var(--text3)' : 'var(--blue)';
  document.getElementById('lbl-real').style.color   = isReal ? 'var(--green)' : 'var(--text3)';
  // Re-render whatever page is visible
  const pages = ['dashboard','habitaciones','gastos','informe'];
  pages.forEach(id => {
    if(document.getElementById('page-'+id).classList.contains('on')){
      if(id==='dashboard')    renderDashboard();
      if(id==='habitaciones') renderHabs();
      if(id==='gastos')       renderGastos();
      if(id==='informe')      renderInforme();
    }
  });
}

// ═══════════ HELPERS ═══════════
function fn(n){if(!n&&n!==0)return'—';if(n===0)return'—';return new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+'€';}
function fn0(n){return new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0)+'€';}
function pdate(s){return new Date(s+'T00:00:00');}
function getMes(r){return pdate(r.ci).getMonth()+1;}

// Filter reservas by mode: fiscal = only non-private, real = all
function visibleReservas(){ return IS_REAL ? RESERVAS : RESERVAS.filter(r=>!r.privado); }
// Filter gastos_var by mode
function visibleGastosVar(){ return IS_REAL ? GASTOS_VAR : GASTOS_VAR.filter(g=>!g.privado); }
// Gastos fijos: all fijos are always fiscal (they're declared by default)
// Private fijos could exist — filter if privado flag set
function visibleGastosFijos(){ return IS_REAL ? GASTOS_FIJOS : GASTOS_FIJOS.filter(g=>!g.privado); }

function _ma(mes){if(mes==='year')return[1,2,3,4,5,6,7,8,9,10,11,12];if(Array.isArray(mes))return mes;return[mes];}
function ingTotal(mes,field='neto'){const a=_ma(mes);return visibleReservas().filter(r=>a.includes(getMes(r))).reduce((s,r)=>s+(r[field]||0),0);}
function ingByRoom(room,mes,field='neto'){const a=_ma(mes);return visibleReservas().filter(r=>r.room===room&&a.includes(getMes(r))).reduce((s,r)=>s+(r[field]||0),0);}
function comTotal(mes){const a=_ma(mes);return visibleReservas().filter(r=>a.includes(getMes(r))).reduce((s,r)=>s+(r.com||0),0);}
function gFijo(mes){const a=_ma(mes);return visibleGastosFijos().reduce((s,g)=>s+a.reduce((x,m)=>x+(g.m[m]||0),0),0);}
function gVar(mes){const a=_ma(mes);return visibleGastosVar().filter(g=>a.includes(new Date(g.fecha).getMonth()+1)).reduce((s,g)=>s+(g.importe||0),0);}
function gTot(mes){return gFijo(mes)+gVar(mes);}
function neto(mes){return ingTotal(mes,'neto')-gTot(mes);}

// % de ocupación: noches ocupadas / noches disponibles en los meses dados (año 2026).
// Se excluyen las entradas-resumen (p.ej. Airbnb T2), que no van ligadas a una habitación real.
function occNightsRoom(room,mesArr){
  let n=0;
  visibleReservas().forEach(r=>{
    if(r.resumen||r.room!==room)return;
    const ci=pdate(r.ci),co=pdate(r.co);
    mesArr.forEach(m=>{
      const mIni=new Date(2026,m-1,1),mFin=new Date(2026,m,1);
      const ini=ci>mIni?ci:mIni,fin=co<mFin?co:mFin;
      if(fin>ini)n+=Math.round((fin-ini)/86400000);
    });
  });
  return n;
}
function occPct(mes,room){
  const a=_ma(mes),rooms=room?[room]:ROOMS;
  const disp=a.reduce((s,m)=>s+new Date(2026,m,0).getDate(),0)*rooms.length;
  const occ=rooms.reduce((s,rm)=>s+occNightsRoom(rm,a),0);
  return disp?Math.round(occ/disp*100):0;
}

// Period helpers
const PERIOD_DEFS={
  year:{cols:[1,2,3,4,5,6,7,8,9,10,11,12],label:'Año 2026',mes:'year'},
  q1:{cols:[1,2,3],label:'Q1 (Ene–Mar)',mes:[1,2,3]},
  q2:{cols:[4,5,6],label:'Q2 (Abr–Jun)',mes:[4,5,6]},
  q3:{cols:[7,8,9],label:'Q3 (Jul–Sep)',mes:[7,8,9]},
  q4:{cols:[10,11,12],label:'Q4 (Oct–Dic)',mes:[10,11,12]},
};
for(let i=1;i<=12;i++) PERIOD_DEFS[String(i)]={cols:[i],label:{1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre'}[i],mes:[i]};

let curP='q1', habP='q1', gastP='year';
function setGP(p,btn){
  document.querySelectorAll('#gasto-pills .pill').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on'); gastP=p; renderGastos();
}

function bnav(id){
  document.querySelectorAll('.bnav-btn').forEach(b=>b.classList.remove('on'));
  const btn=document.getElementById('bn-'+id);
  if(btn)btn.classList.add('on');
}
function nav(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));
  document.getElementById('page-'+id).classList.add('on');
  if(btn)btn.classList.add('on');
  bnav(id);
  if(id==='dashboard')    renderDashboard();
  if(id==='habitaciones') renderHabs();
  if(id==='gastos')       renderGastos();
  if(id==='informe')      renderInforme();
}
function setPeriod(p,btn){
  document.querySelectorAll('#page-dashboard .pill').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on'); curP=p; renderDashboard();
}
function setHP(p,btn){
  document.querySelectorAll('#hab-pills .pill').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on'); habP=p; renderHabs();
}

// ═══════════ PMS SYNC + RECONCILIACIÓN ═══════════
async function fetchPMSData(){
  const btn=document.getElementById('pms-sync-btn');
  const info=document.getElementById('pms-sync-info');
  btn.textContent='Cargando…'; btn.disabled=true;
  try{
    const r=await fetch(`${PMS_URL}/accounting/reservations?year=2026`);
    if(!r.ok) throw new Error(r.status);
    RESERVAS_PMS=await r.json();
    pmsLastSync=new Date();
    const hh=pmsLastSync.getHours().toString().padStart(2,'0');
    const mm=pmsLastSync.getMinutes().toString().padStart(2,'0');
    info.textContent=`Última sync: ${hh}:${mm} · ${RESERVAS_PMS.length} reservas`;
    if(document.getElementById('page-habitaciones').classList.contains('on')) renderHabs();
    notif(`PMS sincronizado: ${RESERVAS_PMS.length} reservas`);
  }catch(e){
    info.textContent='Error de conexión con PMS';
    notif('No se pudo conectar con el PMS',true);
  }finally{
    btn.textContent='⟳ Sync PMS'; btn.disabled=false;
  }
}

function dayDiff(d1,d2){
  return Math.abs((new Date(d1)-new Date(d2))/86400000);
}

function findPMSMatch(r){
  // Busca reserva PMS para la misma habitación con check-in a ≤1 día de diferencia
  return RESERVAS_PMS.find(p=>p.room===r.room && dayDiff(p.ci,r.ci)<=1);
}

function findAccountingMatch(p){
  // Busca entrada contable para una reserva PMS
  return visibleReservas().find(r=>r.room===p.room && dayDiff(p.ci,r.ci)<=1);
}

function reconcileStatus(r){
  if(!RESERVAS_PMS.length) return null;
  const p=findPMSMatch(r);
  if(!p) return{icon:'🔴',msg:'No encontrada en PMS',color:'var(--red)'};
  const amountOk=!p.bruto||!r.bruto||Math.abs(p.bruto-r.bruto)/Math.max(p.bruto,r.bruto)<0.05;
  const datesOk=dayDiff(p.ci,r.ci)===0&&dayDiff(p.co,r.co)===0;
  if(!amountOk) return{icon:'⚠️',msg:`Importe: PMS €${p.bruto} vs €${r.bruto}`,color:'var(--gold)'};
  if(!datesOk) return{icon:'⚠️',msg:`Fechas PMS: ${p.ci}→${p.co}`,color:'var(--gold)'};
  return{icon:'✅',msg:'Coincide con PMS',color:'var(--green)'};
}

function renderReconBanner(habPeriodMes){
  const banner=document.getElementById('recon-banner');
  if(!RESERVAS_PMS.length){banner.innerHTML='';return;}
  const mesArr=Array.isArray(habPeriodMes)?habPeriodMes:(habPeriodMes==='year'?[1,2,3,4,5,6,7,8,9,10,11,12]:[habPeriodMes]);
  const pmsInPeriod=RESERVAS_PMS.filter(p=>mesArr.includes(new Date(p.ci+'T12:00:00').getMonth()+1));
  const sinRegistrar=pmsInPeriod.filter(p=>!findAccountingMatch(p));
  const conDesajuste=visibleReservas().filter(r=>mesArr.includes(getMes(r))&&(()=>{const s=reconcileStatus(r);return s&&s.icon!=='✅';})());
  const total=sinRegistrar.length+conDesajuste.length;
  if(!total){
    banner.innerHTML=`<div style="background:rgba(90,158,114,.1);border:1px solid var(--green);border-radius:6px;padding:8px 12px;font-size:11px;color:var(--green);margin-bottom:10px">✅ Todo coincide con el PMS para este período</div>`;
    return;
  }
  const items=[];
  if(sinRegistrar.length) items.push(`<b>${sinRegistrar.length}</b> reserva(s) del PMS sin registrar en contabilidad`);
  if(conDesajuste.length) items.push(`<b>${conDesajuste.length}</b> entrada(s) con desajuste de importe o fechas`);
  banner.innerHTML=`<div style="background:rgba(200,168,74,.1);border:1px solid var(--gold);border-radius:6px;padding:8px 12px;font-size:11px;color:var(--gold);margin-bottom:10px">⚠️ ${items.join(' · ')}</div>`;
}

// ═══════════ DASHBOARD ═══════════
function renderDashboard(){
  const pd=PERIOD_DEFS[curP];
  const mes=pd.mes, mL=pd.label;
  document.getElementById('exc-title').textContent='Vista global · '+mL;
  const ing=ingTotal(mes,'bruto'),com=Math.abs(comTotal(mes)),nto=ingTotal(mes,'neto'),gast=gTot(mes),res=nto-gast,ocu=occPct(mes);
  document.getElementById('kpis').innerHTML=`
    <div class="kpi g"><div class="kpi-lbl">Ingresos brutos</div><div class="kpi-val green">${fn0(ing)}</div><div class="kpi-sub">${mL}</div></div>
    <div class="kpi r"><div class="kpi-lbl">Comisiones OTA</div><div class="kpi-val red">${fn0(com)}</div><div class="kpi-sub">Booking + Airbnb</div></div>
    <div class="kpi b"><div class="kpi-lbl">Ingresos netos</div><div class="kpi-val blue">${fn0(nto)}</div><div class="kpi-sub">Tras comisiones</div></div>
    <div class="kpi r"><div class="kpi-lbl">Total gastos</div><div class="kpi-val red">${fn0(gast)}</div><div class="kpi-sub">Fijos + variables</div></div>
    <div class="kpi ${res>=0?'g':'r'}"><div class="kpi-lbl">Resultado neto</div><div class="kpi-val ${res>=0?'green':'red'}">${fn0(res)}</div><div class="kpi-sub">${res>=0?'Beneficio':'Pérdida'}</div></div>
    <div class="kpi o"><div class="kpi-lbl">Ocupación</div><div class="kpi-val gold">${ocu}%</div><div class="kpi-sub">${ROOMS.length} hab. · sin resúmenes</div></div>`;

  // Balance cards: año | Q1 siempre fijo | período seleccionado
  const q1mes=[1,2,3];
  const ingQ1=ingTotal(q1mes,'bruto'),comQ1=Math.abs(comTotal(q1mes)),netoQ1=ingTotal(q1mes,'neto'),gastQ1=gTot(q1mes),resQ1=netoQ1-gastQ1;
  const ingAnual=ingTotal('year','neto'),gastFijosAnual=gFijo('year'),gastVarQ1=gVar(q1mes);
  document.getElementById('bal-cards').innerHTML=`
    <div class="bal-card">
      <div class="bal-card-title"><span class="bal-dot a"></span>Balance anual proyectado</div>
      <div class="bal-r"><span class="bal-k">Ingresos año (bruto)</span><span class="bal-v pos">${fn0(ingTotal('year','bruto'))}</span></div>
      <div class="bal-r"><span class="bal-k">Comisiones OTA año</span><span class="bal-v neg">${fn0(Math.abs(comTotal('year')))}</span></div>
      <div class="bal-r"><span class="bal-k">Ingresos año (neto)</span><span class="bal-v pos">${fn0(ingTotal('year','neto'))}</span></div>
      <div class="bal-r"><span class="bal-k">Gastos fijos año</span><span class="bal-v neg">${fn0(gastFijosAnual)}</span></div>
      <div class="bal-r"><span class="bal-k">Gastos variables conocidos</span><span class="bal-v neg">${fn0(gastVarQ1)}</span></div>
      <div class="bal-neto"><span class="bal-neto-lbl">Resultado anual estimado</span><span class="bal-neto-val ${ingTotal('year','neto')-gastFijosAnual-gastVarQ1>=0?'pos':'neg'}">${fn0(ingTotal('year','neto')-gastFijosAnual-gastVarQ1)}</span></div>
    </div>
    <div class="bal-card">
      <div class="bal-card-title"><span class="bal-dot q"></span>Balance Q1 real</div>
      <div class="bal-r"><span class="bal-k">Ingresos brutos</span><span class="bal-v pos">${fn0(ingQ1)}</span></div>
      <div class="bal-r"><span class="bal-k">Comisiones OTA</span><span class="bal-v neg">${fn0(comQ1)}</span></div>
      <div class="bal-r"><span class="bal-k">Ingresos netos</span><span class="bal-v pos">${fn0(netoQ1)}</span></div>
      <div class="bal-r"><span class="bal-k">Gastos Q1</span><span class="bal-v neg">${fn0(gastQ1)}</span></div>
      <div class="bal-neto"><span class="bal-neto-lbl">Resultado neto Q1</span><span class="bal-neto-val ${resQ1>=0?'pos':'neg'}">${fn0(resQ1)}</span></div>
    </div>
    <div class="bal-card">
      <div class="bal-card-title"><span class="bal-dot m"></span>${mL}</div>
      <div class="bal-r"><span class="bal-k">Ingresos brutos</span><span class="bal-v pos">${fn0(ing)}</span></div>
      <div class="bal-r"><span class="bal-k">Comisiones OTA</span><span class="bal-v neg">${fn0(com)}</span></div>
      <div class="bal-r"><span class="bal-k">Ingresos netos</span><span class="bal-v pos">${fn0(nto)}</span></div>
      <div class="bal-r"><span class="bal-k">Gastos</span><span class="bal-v neg">${fn0(gast)}</span></div>
      <div class="bal-neto"><span class="bal-neto-lbl">Resultado neto</span><span class="bal-neto-val ${res>=0?'pos':'neg'}">${fn0(res)}</span></div>
    </div>`;
  renderExcTable(curP);
}

function renderExcTable(pKey){
  const pd=PERIOD_DEFS[pKey];
  const cols=pd.cols;
  const isFull=pKey==='year';
  const colSpan=1+cols.length+(isFull?1:0);
  const hasD=c=>c<=3;
  let th=`<thead><tr><th class="L stk" style="min-width:120px">Concepto</th>`;
  cols.forEach(c=>{th+=`<th style="${!hasD(c)?'opacity:.4':''}">` +ML[c]+'</th>';});
  if(isFull)th+=`<th class="ct">TOTAL</th>`;
  th+=`</tr></thead>`;
  let tb=`<tbody>`;
  tb+=`<tr class="sec"><td class="stk" colspan="${colSpan}">▸ INGRESOS</td></tr>`;
  ROOMS.forEach(room=>{
    const vals=cols.map(c=>ingByRoom(room,[c],'bruto'));
    const tot=vals.reduce((a,b)=>a+b,0);
    tb+=`<tr><td class="L stk">${ROOM_NAME[room]}</td>${vals.map(v=>`<td class="${v?'pos':''}">${v?fn(v):''}</td>`).join('')}${isFull?`<td class="ct pos">${tot?fn(tot):''}</td>`:''}</tr>`;
    const comV=cols.map(c=>Math.abs(visibleReservas().filter(r=>r.room===room&&getMes(r)===c).reduce((s,r)=>s+(r.com||0),0)));
    const comT=comV.reduce((a,b)=>a+b,0);
    if(comT>0){tb+=`<tr class="sub"><td class="L stk">↳ comisión OTA</td>${comV.map(v=>`<td class="com">${v?fn(v):''}</td>`).join('')}${isFull?`<td class="ct com">${fn(comT)}</td>`:''}</tr>`;}
  });
  // Reservas-resumen sin habitación concreta (p.ej. informe trimestral Airbnb T2)
  const resR=visibleReservas().filter(r=>!ROOMS.includes(r.room));
  [...new Set(resR.map(r=>r.room))].forEach(rm=>{
    const grp=resR.filter(r=>r.room===rm);
    const vals=cols.map(c=>grp.filter(r=>getMes(r)===c).reduce((s,r)=>s+(r.bruto||0),0));
    const tot=vals.reduce((a,b)=>a+b,0);
    tb+=`<tr><td class="L stk">${rm}</td>${vals.map(v=>`<td class="${v?'pos':''}">${v?fn(v):''}</td>`).join('')}${isFull?`<td class="ct pos">${tot?fn(tot):''}</td>`:''}</tr>`;
    const comV=cols.map(c=>Math.abs(grp.filter(r=>getMes(r)===c).reduce((s,r)=>s+(r.com||0),0)));
    const comT=comV.reduce((a,b)=>a+b,0);
    if(comT>0){tb+=`<tr class="sub"><td class="L stk">↳ comisión OTA</td>${comV.map(v=>`<td class="com">${v?fn(v):''}</td>`).join('')}${isFull?`<td class="ct com">${fn(comT)}</td>`:''}</tr>`;}
  });
  const ibv=cols.map(c=>ingTotal([c],'bruto')),ibT=ibv.reduce((a,b)=>a+b,0);
  const cv=cols.map(c=>Math.abs(comTotal([c]))),cT=cv.reduce((a,b)=>a+b,0);
  const inv=cols.map(c=>ingTotal([c],'neto')),inT=inv.reduce((a,b)=>a+b,0);
  tb+=`<tr class="rowtot"><td class="L stk">TOTAL INGRESOS BRUTOS</td>${ibv.map(v=>`<td class="pos">${fn0(v)}</td>`).join('')}${isFull?`<td class="ct pos">${fn0(ibT)}</td>`:''}</tr>`;
  tb+=`<tr class="sub rowtot"><td class="L stk">↳ comisiones OTA</td>${cv.map(v=>`<td class="com">${v?fn(v):''}</td>`).join('')}${isFull?`<td class="ct com">${cT?fn(cT):''}</td>`:''}</tr>`;
  tb+=`<tr class="netorow"><td class="L stk">INGRESOS NETOS</td>${inv.map(v=>`<td>${fn0(v)}</td>`).join('')}${isFull?`<td class="ct">${fn0(inT)}</td>`:''}</tr>`;
  const gfv=cols.map(c=>gFijo([c])),gfT=gfv.reduce((a,b)=>a+b,0);
  tb+=`<tr class="sec coll-hdr" onclick="toggleRows('gf',this)"><td class="stk" colspan="${colSpan}">▸ GASTOS FIJOS <span style="font-size:9px;color:var(--text3);margin-left:5px" id="lbl-gf">▶ expandir</span></td></tr>`;
  visibleGastosFijos().forEach(g=>{
    const vals=cols.map(c=>g.m[c]||0);
    const tot=cols.reduce((s,c)=>s+(g.m[c]||0),0);
    tb+=`<tr class="coll-detail" data-g="gf"><td class="L stk">${g.n}</td>${vals.map(v=>`<td class="${v?'neg':''}">${v?fn(v):''}</td>`).join('')}${isFull?`<td class="ct neg">${tot?fn(tot):''}</td>`:''}</tr>`;
  });
  tb+=`<tr class="rowtot"><td class="L stk">TOTAL GASTOS FIJOS</td>${gfv.map(v=>`<td class="neg">${fn0(v)}</td>`).join('')}${isFull?`<td class="ct neg">${fn0(gfT)}</td>`:''}</tr>`;
  const gvv=cols.map(c=>gVar([c])),gvT=gvv.reduce((a,b)=>a+b,0);
  tb+=`<tr class="sec coll-hdr" onclick="toggleRows('gv',this)"><td class="stk" colspan="${colSpan}">▸ GASTOS VARIABLES <span style="font-size:9px;color:var(--text3);margin-left:5px" id="lbl-gv">▶ expandir</span></td></tr>`;
  visibleGastosVar().forEach(g=>{
    const gm=new Date(g.fecha).getMonth()+1;
    const vals=cols.map(c=>c===gm?g.importe:0);
    const privBadge=g.privado?` <span style="font-size:9px;color:var(--green);background:var(--green-bg);padding:1px 5px;border-radius:100px">privado</span>`:'';
    tb+=`<tr class="coll-detail" data-g="gv"><td class="L stk">${g.n}${privBadge} <span style="font-size:9px;color:var(--text3)">(${g.fecha})</span></td>${vals.map(v=>`<td class="${v>0?'neg':v<0?'pos':''}">${v?fn(v):''}</td>`).join('')}${isFull?`<td class="ct ${g.importe<0?'pos':'neg'}">${g.importe?fn(g.importe):''}</td>`:''}</tr>`;
  });
  tb+=`<tr class="rowtot"><td class="L stk">TOTAL GASTOS VARIABLES</td>${gvv.map(v=>`<td class="${v?'neg':''}">${v?fn(v):''}</td>`).join('')}${isFull?`<td class="ct neg">${gvT?fn(gvT):''}</td>`:''}</tr>`;
  const gtv=cols.map(c=>gTot([c])),gtT=gtv.reduce((a,b)=>a+b,0);
  const resv=cols.map(c=>ingTotal([c],'neto')-gTot([c])),resT=resv.reduce((a,b)=>a+b,0);
  tb+=`<tr class="grandtot"><td class="L stk">TOTAL GASTOS</td>${gtv.map(v=>`<td class="neg">${fn0(v)}</td>`).join('')}${isFull?`<td class="ct neg">${fn0(gtT)}</td>`:''}</tr>`;
  tb+=`<tr class="grandtot" style="background:rgba(90,158,114,.07)"><td class="L stk" style="color:var(--green);font-family:'Playfair Display',serif;">RESULTADO NETO</td>${resv.map(v=>`<td class="${v>=0?'pos':'neg'}">${fn0(v)}</td>`).join('')}${isFull?`<td class="ct ${resT>=0?'pos':'neg'}">${fn0(resT)}</td>`:''}</tr>`;
  tb+=`</tbody>`;
  document.getElementById('exc').innerHTML=th+tb;
}

function toggleRows(g,tr){
  const rows=document.querySelectorAll(`tr[data-g="${g}"]`);
  const open=rows[0]?.classList.contains('open');
  rows.forEach(r=>r.classList.toggle('open',!open));
  const lbl=document.getElementById('lbl-'+g);
  if(lbl)lbl.textContent=open?'▶ expandir':'▼ contraer';
}

// ═══════════ CALENDAR (Airbnb day-level) ═══════════
const MONTH_SHORT={1:'ENE',2:'FEB',3:'MAR',4:'ABR',5:'MAY',6:'JUN',7:'JUL',8:'AGO',9:'SEP',10:'OCT',11:'NOV',12:'DIC'};

function buildCalendar(containerId, pKey, rooms){
  const pd=PERIOD_DEFS[pKey];
  const meses=pd.cols;
  const firstM=meses[0], lastM=meses[meses.length-1];
  const start=new Date(2026,firstM-1,1);
  const end=new Date(2026,lastM,1);
  const days=Math.round((end-start)/86400000);
  if(!days||!document.getElementById(containerId))return;

  // Build day array
  const dayArr=[];
  for(let i=0;i<days;i++){
    const d=new Date(start.getTime()+i*86400000);
    const dow=d.getDay();
    dayArr.push({d,isWknd:dow===0||dow===6,isMonthStart:d.getDate()===1,n:d.getDate(),m:d.getMonth()+1});
  }

  // Day numbers header
  let html=`<div style="display:flex;margin-bottom:1px;">
    <div style="width:46px;flex-shrink:0"></div>
    <div style="flex:1;display:flex;">`;
  dayArr.forEach(dy=>{
    html+=`<div style="flex:1;min-width:0;text-align:center;font-size:8px;font-weight:600;padding:2px 0;
      color:${dy.isWknd?'var(--gold)':'var(--text3)'};
      background:${dy.isWknd?'var(--wknd)':'transparent'};
      border-left:${dy.isMonthStart&&dy.d.getDate()!==dayArr[0].d.getDate()?'1px solid var(--border2)':'none'};">${dy.n}</div>`;
  });
  html+=`</div></div>`;

  // Month label row
  html+=`<div style="display:flex;margin-bottom:4px;">
    <div style="width:46px;flex-shrink:0"></div>
    <div style="flex:1;position:relative;height:14px;">`;
  dayArr.forEach((dy,i)=>{
    if(dy.isMonthStart){
      const daysInM=dayArr.filter(d2=>d2.m===dy.m).length;
      html+=`<div style="position:absolute;left:${(i/days*100).toFixed(2)}%;width:${(daysInM/days*100).toFixed(2)}%;
        font-size:8px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--text3);">${MONTH_SHORT[dy.m]||''}</div>`;
    }
  });
  html+=`</div></div>`;

  // Rows per room
  const mesArr=meses; // array of month numbers in this period
  rooms.forEach(room=>{
    const rr=visibleReservas().filter(r=>r.room===room&&(mesArr.length===12||mesArr.includes(getMes(r))));
    html+=`<div style="display:flex;align-items:center;margin-bottom:3px;">
      <div style="width:46px;font-size:9px;font-weight:600;color:var(--text2);flex-shrink:0;padding-right:4px;white-space:nowrap;overflow:hidden;">${room}</div>
      <div style="flex:1;height:22px;position:relative;background:var(--surf2);border-radius:3px;overflow:visible;">`;
    // Weekend + month-start bg strips
    dayArr.forEach((dy,i)=>{
      if(dy.isWknd||dy.isMonthStart){
        html+=`<div style="position:absolute;top:0;bottom:0;left:${(i/days*100).toFixed(2)}%;width:${(1/days*100).toFixed(2)}%;
          background:${dy.isWknd?'var(--wknd)':'transparent'};
          border-left:${dy.isMonthStart&&i>0?'1px solid var(--border2)':'none'};
          pointer-events:none;z-index:0;"></div>`;
      }
    });
    // Reservation bars
    rr.forEach(r=>{
      const ci=pdate(r.ci), co=pdate(r.co);
      const cs=ci<start?start:ci;
      const ce=co>end?end:co;
      if(cs>=ce)return;
      const sp=Math.round((cs-start)/86400000);
      const dur=Math.max(1,Math.round((ce-cs)/86400000));
      const left=(sp/days*100).toFixed(2);
      const width=(dur/days*100).toFixed(2);
      const guestShort=r.guest.split(' ')[0];
      const showLbl=dur>2;
      const boc=`<div class="boc">
        <div class="boc-canal ${r.canal}">${r.canal==='booking'?'Booking.com':r.canal==='airbnb'?'Airbnb':'Directo'}</div>
        <div class="boc-guest">${r.guest}</div>
        <div class="boc-dates">${r.ci} → ${r.co}</div>
        <div class="boc-r"><span class="boc-k">Bruto</span><span class="boc-v g">${fn0(r.bruto)}</span></div>
        ${r.com?`<div class="boc-r"><span class="boc-k">Comisión</span><span class="boc-v r">${fn(r.com)}</span></div>`:''}
        <div class="boc-r"><span class="boc-k">Neto</span><span class="boc-v g">${fn0(r.neto)}</span></div>
        ${r.metodo?`<div class="boc-r"><span class="boc-k">Método</span><span class="boc-v">${r.metodo}</span></div>`:''}
        <div class="boc-r"><span class="boc-k">Hab.</span><span class="boc-v">${r.room}</span></div>
        <div class="boc-arrow"></div></div>`;
      html+=`<div class="cal-booking ${r.canal}" style="left:${left}%;width:${width}%;z-index:2;font-size:9px;">${showLbl?guestShort:''}${boc}</div>`;
    });
    html+=`</div></div>`;
  });

  document.getElementById(containerId).innerHTML=html;
}

// ═══════════ HABITACIONES ═══════════
function renderHabs(){
  const pd=PERIOD_DEFS[habP];
  const mes=pd.mes, mL=pd.label;
  document.getElementById('gt-head').textContent=`Ocupación ${mL} · Todas las habitaciones`;
  buildCalendar('cal-global', habP, ROOMS);
  renderReconBanner(mes);
  const hasPMS=RESERVAS_PMS.length>0;
  // Accordion
  document.getElementById('hab-list').innerHTML=ROOMS.map(room=>{
    const mesArr=mes==='year'?[1,2,3,4,5,6,7,8,9,10,11,12]:Array.isArray(mes)?mes:[mes];
    const rr=visibleReservas().filter(r=>r.room===room&&mesArr.includes(getMes(r)));
    const tb=rr.reduce((s,r)=>s+r.bruto,0),tn=rr.reduce((s,r)=>s+r.neto,0),tc=rr.reduce((s,r)=>s+(r.com||0),0);
    const badges=[...new Set(rr.map(r=>r.canal))].map(c=>`<span class="badge ${c}">${c==='booking'?'Booking':c==='airbnb'?'Airbnb':'Directo'}</span>`).join('');
    const rid=room.replace(/\s/g,'_');

    // Reservas PMS sin entrada contable para esta habitación y período
    const pmsSinRegistrar=hasPMS?RESERVAS_PMS.filter(p=>
      p.room===room &&
      mesArr.includes(new Date(p.ci+'T12:00:00').getMonth()+1) &&
      !findAccountingMatch(p)
    ):[];

    // Alerta en cabecera de habitación
    const roomAlerts=rr.filter(r=>{const s=reconcileStatus(r);return s&&s.icon!=='✅';});
    const alertBadge=(roomAlerts.length||pmsSinRegistrar.length)
      ?`<span style="font-size:9px;background:rgba(200,168,74,.2);color:var(--gold);padding:1px 6px;border-radius:100px">⚠️ ${roomAlerts.length+pmsSinRegistrar.length}</span>`:'';

    const pmsHeader=hasPMS?'<th style="text-align:center">PMS</th>':'';
    const resTable=(rr.length||pmsSinRegistrar.length)?`<div style="overflow-x:auto;border-top:1px solid var(--border)"><table class="res-tbl"><thead><tr><th>Huésped</th><th>Canal</th><th>Entrada</th><th>Salida</th><th>Bruto</th><th>Comisión</th><th>Neto</th>${pmsHeader}<th style="width:52px"></th></tr></thead><tbody>
      ${rr.map(r=>{
        const isExtra=RESERVAS_EXTRA.some(x=>x.id===r.id);
        const privBadge=r.privado?` <span style="font-size:9px;color:var(--green);background:var(--green-bg);padding:1px 5px;border-radius:100px">priv.</span>`:'';
        const actions=isExtra
          ?`<td style="white-space:nowrap"><button onclick="editIngreso('${r.id}')" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:13px;padding:0 3px" title="Editar">✎</button><button onclick="delIngreso('${r.id}')" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:14px;padding:0 3px" title="Eliminar">×</button></td>`
          :`<td style="font-size:9px;color:var(--text3);text-align:center">OTA</td>`;
        const st=reconcileStatus(r);
        const pmsCell=hasPMS?(st?`<td style="text-align:center;font-size:13px" title="${st.msg}">${st.icon}</td>`:'<td></td>'):'';
        return`<tr><td>${r.guest}${privBadge}</td><td><span class="badge ${r.canal}">${r.canal==='booking'?'Booking':r.canal==='airbnb'?'Airbnb':'Directo'}</span></td><td>${r.ci}</td><td>${r.co}</td><td style="color:var(--green)">${fn0(r.bruto)}</td><td style="color:var(--red)">${r.com?fn(r.com):'—'}</td><td style="color:var(--green)">${fn0(r.neto)}</td>${pmsCell}${actions}</tr>`;
      }).join('')}
      ${pmsSinRegistrar.map(p=>`<tr style="background:rgba(200,168,74,.06)"><td style="color:var(--gold)">${p.guest} <span style="font-size:9px;opacity:.7">·PMS</span></td><td><span class="badge ${p.canal}">${p.canal==='booking'?'Booking':p.canal==='airbnb'?'Airbnb':'Directo'}</span></td><td style="color:var(--gold)">${p.ci}</td><td style="color:var(--gold)">${p.co}</td><td style="color:var(--gold)">${p.bruto?fn0(p.bruto):'—'}</td><td>—</td><td>—</td>${hasPMS?'<td style="text-align:center;font-size:11px;color:var(--gold)" title="En PMS pero sin registrar en contabilidad">🟡</td>':''}<td style="font-size:9px;color:var(--gold);text-align:center">Sin reg.</td></tr>`).join('')}
    </tbody></table></div>`:`<div style="padding:10px 14px;font-size:11px;color:var(--text3);font-style:italic">Sin reservas registradas en ${mL}</div>`;
    return`<div class="hab-wrap">
      <div class="hab-hdr" onclick="toggleHab('${rid}')">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><div class="hab-name">${ROOM_NAME[room]}</div><div style="display:flex;gap:3px">${badges}</div><span style="font-size:10px;color:var(--text3)">${rr.length} res.</span>${alertBadge}</div>
        <div class="hab-stats">
          <div class="hs"><div class="hs-lbl">Ocup.</div><div class="hs-val" style="color:var(--blue)">${occPct(mes,room)?occPct(mes,room)+'%':'—'}</div></div>
          <div class="hs"><div class="hs-lbl">Bruto</div><div class="hs-val" style="color:var(--green)">${tb?fn0(tb):'—'}</div></div>
          <div class="hs"><div class="hs-lbl">Com.</div><div class="hs-val" style="color:var(--red)">${tc?fn(tc):'—'}</div></div>
          <div class="hs"><div class="hs-lbl">Neto</div><div class="hs-val" style="color:var(--gold)">${tn?fn0(tn):'—'}</div></div>
          <span style="font-size:11px;color:var(--text3);margin-left:4px" id="arr-h-${rid}">▼</span>
        </div>
      </div>
      <div class="hab-body" id="hab-${rid}">${resTable}</div>
    </div>`;
  }).join('');
}

function toggleHab(rid){
  const b=document.getElementById('hab-'+rid);
  const a=document.getElementById('arr-h-'+rid);
  const o=b.classList.toggle('open');
  if(a)a.style.transform=o?'rotate(180deg)':'';
}

// ═══════════ GASTOS ═══════════
function renderGastos(){
  const pd=PERIOD_DEFS[gastP];
  const Q1m=pd.cols;
  const mLabel=pd.label;
  const gt=document.getElementById('gastos-title');
  if(gt)gt.textContent='Gastos · '+mLabel;
  const gfT=visibleGastosFijos().reduce((s,g)=>s+Q1m.reduce((a,m)=>a+(g.m[m]||0),0),0);
  const gvAll=visibleGastosVar();
  const gvT=gvAll.filter(g=>Q1m.includes(new Date(g.fecha).getMonth()+1)).reduce((s,g)=>s+(g.importe||0),0);
  document.getElementById('tot-f').textContent=fn0(gfT);
  document.getElementById('tot-v').textContent=fn0(gvT);
  const MN={1:'Ene',2:'Feb',3:'Mar',4:'Abr',5:'May',6:'Jun',7:'Jul',8:'Ago',9:'Sep',10:'Oct',11:'Nov',12:'Dic'};
  let fH=`<div class="tscroll"><table class="gtbl"><thead><tr>
    <th>Concepto</th><th>Cat.</th>${Q1m.map(m=>`<th>${MN[m]}</th>`).join('')}<th>Total</th><th style="width:60px"></th>
  </tr></thead><tbody>`;
  visibleGastosFijos().forEach(g=>{
    const tot=Q1m.reduce((s,m)=>s+(g.m[m]||0),0);
    const sysBadge=g.sys?`<span style="font-size:9px;color:var(--text3);margin-left:4px">sistema</span>`:'';
    fH+=`<tr>
      <td><span class="edit-link" onclick="editFijo('${g.id}')">${g.n}</span>${sysBadge}</td>
      <td><span class="tag f">${g.cat}</span></td>
      ${Q1m.map(m=>`<td class="${g.m[m]?'neg':''}">${g.m[m]?fn(g.m[m]):''}</td>`).join('')}
      <td class="neg" style="font-weight:700">${tot?fn(tot):''}</td>
      <td style="white-space:nowrap">
        <button onclick="editFijo('${g.id}')" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:13px;padding:0 3px" title="Editar">✎</button>
        <button onclick="delFijo('${g.id}')" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:14px;padding:0 3px" title="Eliminar">×</button>
      </td>
    </tr>`;
  });
  fH+=`<tr class="tot-r"><td colspan="2">TOTAL</td>${Q1m.map(m=>`<td class="neg">${fn(visibleGastosFijos().reduce((s,g)=>s+(g.m[m]||0),0))}</td>`).join('')}<td class="neg">${fn(gfT)}</td><td></td></tr></tbody></table></div>`;
  document.getElementById('body-f').innerHTML=fH;
  // Variables: shown by month like fijos
  const vHtml=renderGastosByMonth();
  document.getElementById('body-v').innerHTML=vHtml;
  const conc={};
  visibleGastosFijos().forEach(g=>{Q1m.forEach(m=>{if(g.m[m])conc[g.cat]=(conc[g.cat]||0)+(g.m[m]||0);});});
  gvAll.filter(g=>Q1m.includes(new Date(g.fecha).getMonth()+1)&&g.importe>0).forEach(g=>{conc[g.cat]=(conc[g.cat]||0)+g.importe;});
  const totC=Object.values(conc).reduce((a,b)=>a+b,0),sorted=Object.entries(conc).sort((a,b)=>b[1]-a[1]),maxV=sorted[0]?.[1]||1;
  const CC={fiscal:'#c8a84a',financiero:'#4a82a8',inmueble:'#7a9a5a',suministros:'#bf5f4a',tecnologia:'#8a72b0',limpieza:'#5a9a8a',lavanderia:'#7a6a9a',mantenimiento:'#8a7a5a',otros:'#6a7a8a'};
  const ct=document.getElementById('conc-title');if(ct)ct.textContent='Por concepto · '+mLabel;
  document.getElementById('conc-bars').innerHTML=sorted.map(([cat,val])=>`<div class="br-row"><span class="br-lbl">${cat}</span><div class="br-track"><div class="br-fill" style="width:${(val/maxV*100).toFixed(1)}%;background:${CC[cat]||'#6a7a8a'}"></div></div><span class="br-val">${fn(val)}</span><span class="br-pct">${(val/totC*100).toFixed(0)}%</span></div>`).join('');
  document.getElementById('tot-c').textContent=fn(totC);
}
function toggleG(id){document.getElementById('body-'+id).classList.toggle('open');document.getElementById('arr-'+id).classList.toggle('open');}
function delGasto(i){if(!confirm('¿Eliminar?'))return;GASTOS_VAR.splice(i,1);localStorage.setItem('gv5',JSON.stringify(GASTOS_VAR));renderGastos();renderDashboard();notif('Gasto eliminado');}

// ═══════════ MODALES ═══════════
let _gMet='bizum',_gTipo='v',_canal='booking',_iMet='booking/airbnb';
// ═══════════ RECURRING + PHOTO + EDIT ═══════════
let _recur='none', _editId=null, _fotoData=null;

function setRecur(r,btn){
  _recur=r;
  document.querySelectorAll('#rpills .rpill').forEach(p=>p.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('g-range-wrap').style.display=(r==='none')?'none':'block';
}
// ── Helpers de justificante (imagen / PDF / OCR) ──────────────────────────
function fileToDataUrl(blob){
  return new Promise(resolve=>{const reader=new FileReader();reader.onload=ev=>resolve(ev.target.result);reader.readAsDataURL(blob);});
}
// Comprime cualquier imagen a JPEG ≤900px (works con HEIC en Safari iOS)
async function imageToJpeg(blob){
  try{
    const bitmap=await createImageBitmap(blob);
    const MAX=900;
    const canvas=document.createElement('canvas');
    let w=bitmap.width,h=bitmap.height;
    if(w>MAX||h>MAX){const r=Math.min(MAX/w,MAX/h);w=Math.round(w*r);h=Math.round(h*r);}
    canvas.width=w;canvas.height=h;
    canvas.getContext('2d').drawImage(bitmap,0,0,w,h);
    return canvas.toDataURL('image/jpeg',0.88);
  }catch(e){
    return fileToDataUrl(blob); // fallback
  }
}
// Carga pdf.js bajo demanda (igual patrón que jsPDF en exportPDF)
let _pdfjsLoading=null;
function loadPdfJs(){
  if(window.pdfjsLib)return Promise.resolve();
  if(_pdfjsLoading)return _pdfjsLoading;
  _pdfjsLoading=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload=()=>{try{window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';}catch(e){}resolve();};
    s.onerror=()=>reject(new Error('No se pudo cargar el lector de PDF'));
    document.head.appendChild(s);
  });
  return _pdfjsLoading;
}
// Rasteriza la primera página de un PDF (dataURL) a JPEG dataURL → así se incrusta en el informe
async function pdfToImage(pdfDataUrl){
  await loadPdfJs();
  const b64=pdfDataUrl.split(',')[1];
  const raw=atob(b64);
  const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const pdf=await window.pdfjsLib.getDocument({data:bytes}).promise;
  const page=await pdf.getPage(1);
  const MAX=1100;
  let vp=page.getViewport({scale:2});
  const big=Math.max(vp.width,vp.height);
  if(big>MAX)vp=page.getViewport({scale:2*MAX/big});
  const canvas=document.createElement('canvas');
  canvas.width=vp.width;canvas.height=vp.height;
  await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
  return canvas.toDataURL('image/jpeg',0.85);
}
// Convierte un archivo (imagen o PDF) al JPEG dataURL que se guarda como justificante
async function fileToJustificante(file){
  const isPDF=file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf');
  return isPDF ? pdfToImage(await fileToDataUrl(file)) : imageToJpeg(file);
}
// Contraseña de la app (se pide una vez y se guarda solo en este navegador)
function getAppSecret(){
  let s=localStorage.getItem('appSecret');
  if(!s){ s=(prompt('Contraseña de la app (para usar la IA):')||'').trim(); if(s)localStorage.setItem('appSecret',s); }
  return s;
}
// Llama a la IA a través de nuestro proxy en Netlify (la clave vive en el servidor, no aquí).
// URL absoluta para que funcione igual desde GitHub Pages, Netlify o en local.
const PROXY_URL='https://gestorhostal-proxy.netlify.app/api/anthropic';
async function anthropicRequest(payload){
  const r=await fetch(PROXY_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json','x-app-secret':getAppSecret()},
    body:JSON.stringify(payload)
  });
  if(r.status===401){ localStorage.removeItem('appSecret'); throw new Error('Contraseña incorrecta · vuelve a intentarlo'); }
  if(!r.ok){ const e=await r.json().catch(()=>({})); throw new Error('API '+r.status+': '+(e.error?.message||'')); }
  return r.json();
}
// OCR — una sola lectura Haiku sobre la imagen; devuelve el objeto parsed o lanza error
async function ocrDocument(imageDataUrl){
  const base64=imageDataUrl.split(',')[1];
  const data=await anthropicRequest({
    model:'claude-haiku-4-5-20251001',
    max_tokens:200,
    messages:[{role:'user',content:[
      {type:'image',source:{type:'base64',media_type:'image/jpeg',data:base64}},
      {type:'text',text:'Analiza este documento/ticket/factura. Responde SOLO JSON sin markdown:\n{"concepto":"nombre comercio o descripción","importe":0.00,"fecha":"YYYY-MM-DD","categoria":"suministros|mantenimiento|limpieza|tecnologia|fiscal|financiero|inmueble|otros","metodo":"tarjeta|metalico|transferencia|bizum"}\nUsa null si no puedes leer un campo.'}
    ]}]
  });
  let txt=(data.content&&data.content[0]&&data.content[0].text||'').replace(/```json|```/g,'').trim();
  const jsonMatch=txt.match(/\{[\s\S]*\}/);
  if(!jsonMatch)throw new Error('No JSON: '+txt.slice(0,80));
  return JSON.parse(jsonMatch[0]);
}
// Rellena el formulario de gasto con lo extraído; devuelve la lista de campos rellenados
function fillGastoForm(parsed){
  let filled=[];
  if(parsed.concepto&&parsed.concepto!=='null'){document.getElementById('g-con').value=parsed.concepto;filled.push('concepto');}
  if(parsed.importe&&parsed.importe!==null){document.getElementById('g-imp').value=parsed.importe;filled.push('importe');}
  if(parsed.fecha&&parsed.fecha!=='null'&&parsed.fecha!=='YYYY-MM-DD'){document.getElementById('g-fecha').value=parsed.fecha;filled.push('fecha');}
  if(parsed.categoria&&parsed.categoria!=='null'){document.getElementById('g-cat').value=parsed.categoria;filled.push('categoría');}
  if(parsed.metodo&&parsed.metodo!=='null'){
    const pill=document.querySelector(`#mpills-g .mpill[data-m="${parsed.metodo}"]`);
    if(pill){document.querySelectorAll('#mpills-g .mpill').forEach(p=>p.classList.remove('on'));pill.classList.add('on');_gMet=parsed.metodo;filled.push('método');}
  }
  return filled;
}

function previewFoto(inp){
  if(!inp.files||!inp.files[0])return;
  const file=inp.files[0];
  const spin=document.getElementById('ocr-spinner');
  const res=document.getElementById('ocr-result');
  const lbl=document.getElementById('photo-lbl-text');
  const prev=document.getElementById('foto-preview');
  if(spin)spin.style.display='block';
  if(res)res.style.display='none';
  if(lbl)lbl.style.display='none';
  const oldPh=document.querySelector('#photo-drop .pdf-placeholder');if(oldPh)oldPh.remove();

  (async()=>{
    try{
      // PDF y foto acaban siendo una imagen JPEG → se puede previsualizar e incrustar en el informe
      const compressed=await fileToJustificante(file);
      if(prev){prev.src=compressed;prev.style.display='block';}
      _fotoData=compressed;
      const parsed=await ocrDocument(compressed);
      if(spin)spin.style.display='none';
      const filled=fillGastoForm(parsed);
      if(res){
        res.style.display='block';
        res.textContent=filled.length?'✓ Extraído: '+filled.join(', ')+' · Revisa antes de guardar':'Documento leído pero sin datos reconocibles';
        res.style.background=filled.length?'var(--green-bg)':'var(--surf3)';
        res.style.color=filled.length?'var(--green)':'var(--text3)';
      }
    }catch(err){
      if(spin)spin.style.display='none';
      if(res){
        res.style.display='block';
        res.textContent='Error: '+err.message;
        res.style.background='var(--surf3)';res.style.color='var(--red)';
      }
    }
  })();
}

// ── Importar carpeta por lotes ────────────────────────────────────────────
let _batch=[];
async function importFolder(inp){
  const files=Array.from(inp.files||[]).filter(f=>{
    const n=f.name.toLowerCase();
    if(n.startsWith('.')||n==='thumbs.db'||n.endsWith('.ds_store'))return false;
    return f.type.startsWith('image/')||/\.(pdf|heic|heif|jpe?g|png|webp)$/.test(n);
  });
  inp.value='';
  if(!files.length){notif('No hay imágenes ni PDF en la carpeta');return;}
  _batch=files.map(f=>({file:f,name:f.name,foto:null,parsed:{categoria:'otros',metodo:'bizum'},incluir:true,estado:'pendiente',error:null}));
  openBatchModal();
  renderBatchProgress(0,_batch.length);
  let idx=0,done=0;
  const CONC=Math.min(3,_batch.length);
  async function worker(){
    while(idx<_batch.length){
      const it=_batch[idx++];
      try{
        it.foto=await fileToJustificante(it.file);
        const p=await ocrDocument(it.foto);
        it.parsed={
          concepto:(p.concepto&&p.concepto!=='null')?p.concepto:'',
          importe:(p.importe&&p.importe!==null)?p.importe:'',
          fecha:(p.fecha&&p.fecha!=='null'&&p.fecha!=='YYYY-MM-DD')?p.fecha:'',
          categoria:(p.categoria&&p.categoria!=='null')?p.categoria:'otros',
          metodo:(p.metodo&&p.metodo!=='null')?p.metodo:'bizum'
        };
        it.estado='ok';
      }catch(e){
        it.estado='error';it.error=e.message;
      }
      renderBatchProgress(++done,_batch.length);
    }
  }
  await Promise.all(Array.from({length:CONC},()=>worker()));
  renderBatchTable();
}

function openBatchModal(){
  document.getElementById('batch-list').innerHTML='';
  document.getElementById('batch-actions').style.display='none';
  document.getElementById('mbg-batch').classList.add('open');
}
function renderBatchProgress(done,total){
  const p=document.getElementById('batch-progress');
  if(!p)return;
  if(done<total){p.style.display='block';p.textContent=`⏳ Leyendo ${done} de ${total} documentos…`;}
  else{p.style.display='none';}
}
function renderBatchTable(){
  const cats=['limpieza','lavanderia','mantenimiento','suministros','tecnologia','fiscal','financiero','inmueble','otros'];
  const mets=['bizum','transferencia','tarjeta','metalico','cripto','wise'];
  const esc=s=>String(s||'').replace(/"/g,'&quot;');
  let h='';
  _batch.forEach((it,i)=>{
    const incompleto=!it.parsed.importe||!it.parsed.fecha||!it.parsed.concepto;
    let aviso='';
    if(it.estado==='error')aviso=`<div style="font-size:10px;color:var(--red);margin-top:4px">⚠ No se pudo leer (${esc(it.error)}) · rellena a mano</div>`;
    else if(incompleto)aviso=`<div style="font-size:10px;color:var(--gold);margin-top:4px">⚠ Faltan datos · revísalos</div>`;
    h+=`<div style="display:flex;gap:10px;padding:10px 0;border-top:1px solid var(--border2)">
      <div style="flex:0 0 54px">${it.foto?`<img src="${it.foto}" style="width:54px;height:54px;object-fit:cover;border-radius:6px;cursor:pointer" onclick="showBatchFoto(${i})">`:'<div style="width:54px;height:54px;display:flex;align-items:center;justify-content:center;background:var(--surf3);border-radius:6px">📄</div>'}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;gap:6px;margin-bottom:5px">
          <input class="fi" style="flex:1;min-width:0" placeholder="Concepto" value="${esc(it.parsed.concepto)}" oninput="_batch[${i}].parsed.concepto=this.value">
          <input class="fi" type="number" step="0.01" style="width:88px" placeholder="€" value="${it.parsed.importe||''}" oninput="_batch[${i}].parsed.importe=this.value">
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <input class="fi" type="date" style="flex:0 0 138px" value="${it.parsed.fecha||''}" oninput="_batch[${i}].parsed.fecha=this.value">
          <select class="fs" style="flex:1;min-width:90px" onchange="_batch[${i}].parsed.categoria=this.value">${cats.map(c=>`<option value="${c}" ${it.parsed.categoria===c?'selected':''}>${c}</option>`).join('')}</select>
          <select class="fs" style="flex:1;min-width:90px" onchange="_batch[${i}].parsed.metodo=this.value">${mets.map(m=>`<option value="${m}" ${it.parsed.metodo===m?'selected':''}>${m}</option>`).join('')}</select>
        </div>
        ${aviso}
        <div style="font-size:9px;color:var(--text3);margin-top:3px">${esc(it.name)}</div>
      </div>
      <label style="flex:0 0 auto;display:flex;align-items:center"><input type="checkbox" ${it.incluir?'checked':''} onchange="_batch[${i}].incluir=this.checked;updateBatchCount()"></label>
    </div>`;
  });
  document.getElementById('batch-list').innerHTML=h;
  document.getElementById('batch-actions').style.display='flex';
  updateBatchCount();
}
function updateBatchCount(){
  const n=_batch.filter(it=>it.incluir).length;
  const el=document.getElementById('batch-count');if(el)el.textContent='('+n+')';
}
function showBatchFoto(i){
  const it=_batch[i];if(!it||!it.foto)return;
  const w=window.open('','_blank');
  w.document.write(`<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${it.foto}" style="max-width:100%;max-height:100vh;object-fit:contain"></body></html>`);
}
function saveBatch(){
  let added=0,skipped=0;
  _batch.filter(it=>it.incluir).forEach(it=>{
    const fecha=it.parsed.fecha;
    const importe=parseFloat(it.parsed.importe);
    const concepto=(it.parsed.concepto||'').trim();
    if(!fecha||isNaN(importe)||!concepto){skipped++;return;}
    GASTOS_VAR.push({
      id:'v'+Date.now()+Math.random().toString(36).slice(2),
      n:concepto,cat:it.parsed.categoria||'otros',fecha,importe,
      metodo:it.parsed.metodo||'bizum',tipo:'v',privado:false,foto:it.foto||null,recur:'none'
    });
    added++;
  });
  localStorage.setItem('gv5',JSON.stringify(GASTOS_VAR));
  closeModals();
  if(document.getElementById('page-gastos').classList.contains('on'))renderGastos();
  renderDashboard();
  _batch=[];
  notif(added+' gastos añadidos'+(skipped?' · '+skipped+' sin datos, no guardados':''));
}

// Expand recurring gasto into multiple GV entries
function expandRecur(base, recur, desde, hasta){
  const entries=[];
  if(recur==='none'){ entries.push(base); return entries; }
  const [dy,dm]=desde.split('-').map(Number);
  const [hy,hm]=hasta.split('-').map(Number);
  let y=dy,m=dm;
  const step={monthly:1, quarterly:3, '4monthly':4, annual:12}[recur]||1;
  while(y<hy||(y===hy&&m<=hm)){
    const mm=String(m).padStart(2,'0');
    const daysInM=new Date(y,m,0).getDate();
    entries.push({...base, id:'v'+Date.now()+Math.random().toString(36).slice(2),
      fecha:`${y}-${mm}-01`, recur, recurGroup:base.id});
    m+=step; if(m>12){m-=12;y++;}
    if(entries.length>60)break; // safety
  }
  return entries;
}

function saveGasto(){
  const fecha=document.getElementById('g-fecha').value;
  const importe=parseFloat(document.getElementById('g-imp').value);
  const concepto=document.getElementById('g-con').value.trim();
  const cat=document.getElementById('g-cat').value;
  const privado=document.getElementById('g-privado').checked;
  const desde=document.getElementById('g-desde')?.value||'2026-01';
  const hasta=document.getElementById('g-hasta')?.value||'2026-12';
  if(!fecha||isNaN(importe)||!concepto){alert('Rellena todos los campos');return;}
  const base={id:_editId||'v'+Date.now(),n:concepto,cat,fecha,importe,metodo:_gMet,tipo:_gTipo,privado,foto:_fotoData||null,recur:_recur};
  if(_editId){
    // Edit mode: replace existing
    const idx=GASTOS_VAR.findIndex(g=>g.id===_editId);
    if(idx>-1){GASTOS_VAR[idx]=base;}
  } else {
    // New: expand if recurring
    const entries=expandRecur(base,_recur,desde,hasta);
    GASTOS_VAR.push(...entries);
  }
  localStorage.setItem('gv5',JSON.stringify(GASTOS_VAR));
  closeModals();
  if(document.getElementById('page-gastos').classList.contains('on'))renderGastos();
  renderDashboard();
  notif('Gasto guardado'+(privado?' · solo para mí':'')+(_recur!=='none'?` · recurrente ${_recur}`:''));
  _editId=null;_fotoData=null;
}

function editGasto(id){
  const g=GASTOS_VAR.find(x=>x.id===id);
  if(!g)return;
  _editId=id;
  document.getElementById('g-fecha').value=g.fecha;
  document.getElementById('g-imp').value=g.importe;
  document.getElementById('g-con').value=g.n;
  document.getElementById('g-cat').value=g.cat;
  document.getElementById('g-privado').checked=!!g.privado;
  document.querySelectorAll('.tipo-pill').forEach(p=>p.classList.remove('on'));
  document.querySelector(`.tipo-pill[onclick="setTipo('${g.tipo||'v'}',this)"]`)?.classList.add('on');
  _gTipo=g.tipo||'v';
  document.querySelectorAll('#mpills-g .mpill').forEach(p=>p.classList.remove('on'));
  document.querySelector(`#mpills-g .mpill[data-m="${g.metodo}"]`)?.classList.add('on');
  _gMet=g.metodo||'bizum';
  if(g.foto){
    _fotoData=g.foto;
    const img=document.getElementById('foto-preview');
    img.src=g.foto;img.style.display='block';
    document.querySelector('#photo-drop .photo-lbl').style.display='none';
  }
  const gt=document.querySelector('#mbg-gasto .modal-title');if(gt)gt.textContent='Editar gasto';
  document.getElementById('mbg-gasto').classList.add('open');
}

function delIngreso(id){
  if(!confirm('¿Eliminar este ingreso?'))return;
  const idx=RESERVAS_EXTRA.findIndex(x=>x.id===id);
  if(idx>-1) RESERVAS_EXTRA.splice(idx,1);
  RESERVAS=[...RESERVAS_BASE,...RESERVAS_EXTRA];
  localStorage.setItem('ing_extra',JSON.stringify(RESERVAS_EXTRA));
  renderHabs(); renderDashboard();
  notif('Ingreso eliminado');
}

function editIngreso(id){
  // Find in RESERVAS_EXTRA
  const r=RESERVAS_EXTRA.find(x=>x.id===id);
  if(!r)return;
  _editIngId=id;
  document.getElementById('i-ci').value=r.ci;
  document.getElementById('i-co').value=r.co;
  document.getElementById('i-room').value=r.room;
  document.getElementById('i-guest').value=r.guest;
  document.getElementById('i-bruto').value=r.bruto;
  document.getElementById('i-com').value=Math.abs(r.com||0);
  document.getElementById('i-neto').value=r.neto;
  document.getElementById('i-privado').checked=!!r.privado;
  _canal=r.canal;
  document.querySelectorAll('#mbg-ing .tipo-pill').forEach(p=>p.classList.remove('on'));
  document.querySelector(`#mbg-ing .tipo-pill[onclick="setCanal('${r.canal}',this)"]`)?.classList.add('on');
  const ingTitle=document.getElementById('ing-modal-title');if(ingTitle)ingTitle.textContent='Editar ingreso';
  document.getElementById('mbg-ing').classList.add('open');
}
let _editIngId=null, _ingRecur=false;
function setIngRecur(isRecur,btn){
  _ingRecur=isRecur;
  document.querySelectorAll('#ing-recur-pills .tipo-pill').forEach(p=>p.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('i-range-wrap').style.display=isRecur?'block':'none';
  document.getElementById('i-dates-wrap').style.display=isRecur?'none':'block';
}

function saveIngreso(){
  const room=document.getElementById('i-room').value;
  const guest=document.getElementById('i-guest').value.trim()||'Inquilino';
  const bruto=parseFloat(document.getElementById('i-bruto').value)||0;
  const com=-(parseFloat(document.getElementById('i-com').value)||0);
  const neto=parseFloat(document.getElementById('i-neto').value)||(bruto+com);
  const privado=document.getElementById('i-privado').checked;
  if(!bruto){alert('Introduce el importe bruto');return;}
  let toAdd=[];
  if(_ingRecur&&!_editIngId){
    // Monthly range mode
    const desde=document.getElementById('i-desde').value;
    const hasta=document.getElementById('i-hasta').value;
    if(!desde||!hasta){alert('Indica el rango de fechas');return;}
    const [dy,dm]=desde.split('-').map(Number);
    const [hy,hm]=hasta.split('-').map(Number);
    let y=dy,m=dm;
    while(y<hy||(y===hy&&m<=hm)){
      const daysInM=new Date(y,m,0).getDate();
      const mm=String(m).padStart(2,'0');
      toAdd.push({id:'e'+Date.now()+Math.random().toString(36).slice(2),
        room,guest,ci:`${y}-${mm}-01`,co:`${y}-${mm}-${daysInM}`,
        canal:_canal,bruto,com,neto,metodo:_iMet,privado,recur:'monthly'});
      m++; if(m>12){m=1;y++;}
      if(toAdd.length>60)break;
    }
    if(!toAdd.length){alert('El rango no contiene meses válidos');return;}
  } else {
    const ci=document.getElementById('i-ci').value;
    const co=document.getElementById('i-co').value;
    if(!ci||!co){alert('Indica las fechas de entrada y salida');return;}
    const r={id:_editIngId||'e'+Date.now(),room,guest,ci,co,canal:_canal,bruto,com,neto,metodo:_iMet,privado};
    if(_editIngId){
      const idx=RESERVAS_EXTRA.findIndex(x=>x.id===_editIngId);
      if(idx>-1)RESERVAS_EXTRA[idx]=r; else RESERVAS_EXTRA.push(r);
      RESERVAS=[...RESERVAS_BASE,...RESERVAS_EXTRA];
      localStorage.setItem('ing_extra',JSON.stringify(RESERVAS_EXTRA));
      closeModals();renderDashboard();
      if(document.getElementById('page-habitaciones').classList.contains('on'))renderHabs();
      notif('Ingreso actualizado'+(privado&&!IS_REAL?' · activa modo REAL para verlo':''));
      _editIngId=null;
      return;
    }
    toAdd=[r];
  }
  RESERVAS_EXTRA.push(...toAdd);
  RESERVAS=[...RESERVAS_BASE,...RESERVAS_EXTRA];
  localStorage.setItem('ing_extra',JSON.stringify(RESERVAS_EXTRA));
  closeModals();
  renderDashboard();
  if(document.getElementById('page-habitaciones').classList.contains('on'))renderHabs();
  const privMsg=privado&&!IS_REAL?' · activa modo REAL para verlo':'';
  notif(toAdd.length+' ingreso'+(toAdd.length>1?'s':'')+' guardado'+(toAdd.length>1?'s':'')+(privado?' · solo para mí':'')+privMsg);
  _editIngId=null;
}

// ═══════════ IMPORTAR RESERVAS (archivo) Y CONCILIAR CON PMS ═══════════
let _recon=[];

// Carga SheetJS bajo demanda (mismo patrón que pdf.js / jsPDF)
let _xlsxLoading=null;
function loadSheetJS(){
  if(window.XLSX)return Promise.resolve();
  if(_xlsxLoading)return _xlsxLoading;
  _xlsxLoading=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload=resolve;s.onerror=()=>reject(new Error('No se pudo cargar el lector de Excel'));
    document.head.appendChild(s);
  });
  return _xlsxLoading;
}

// Extrae el texto de TODAS las páginas de un PDF (mejor que rasterizar para listados)
async function pdfToText(dataUrl){
  await loadPdfJs();
  const raw=atob(dataUrl.split(',')[1]);
  const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const pdf=await window.pdfjsLib.getDocument({data:bytes}).promise;
  let txt='';
  for(let p=1;p<=pdf.numPages;p++){
    const page=await pdf.getPage(p);
    const c=await page.getTextContent();
    txt+=c.items.map(it=>it.str).join(' ')+'\n';
  }
  return txt;
}

// Convierte cualquier archivo (Excel/CSV/PDF/imagen) en lo que enviaremos a la IA
async function fileToReservasPayload(file){
  const n=file.name.toLowerCase();
  if(/\.(xlsx|xls)$/.test(n)){
    await loadSheetJS();
    const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array'});
    let txt='';
    wb.SheetNames.forEach(sn=>{txt+='# Hoja: '+sn+'\n'+window.XLSX.utils.sheet_to_csv(wb.Sheets[sn])+'\n';});
    return {kind:'text',text:txt};
  }
  if(/\.(csv|tsv|txt)$/.test(n))return {kind:'text',text:await file.text()};
  if(n.endsWith('.pdf')||file.type==='application/pdf')return {kind:'text',text:await pdfToText(await fileToDataUrl(file))};
  return {kind:'image',dataUrl:await imageToJpeg(file)};
}

// IA (Haiku): devuelve un array de reservas normalizadas desde el contenido del archivo
async function aiExtractReservas(payload){
  const instr='Extrae TODAS las reservas de este documento (Booking, Airbnb o reservas directas). Responde SOLO un JSON array, sin markdown. Cada elemento:\n{"guest":"nombre huésped","ci":"YYYY-MM-DD","co":"YYYY-MM-DD","canal":"booking|airbnb|directo","bruto":0.00,"com":0.00,"neto":0.00}\nci=entrada/check-in, co=salida/check-out. bruto=importe total antes de comisión. com=comisión (número positivo). neto=lo que recibe el hostal. Usa null si un dato no aparece. Deduce el canal según el origen del documento. Si no hay reservas, responde [].';
  const content = payload.kind==='image'
    ? [{type:'image',source:{type:'base64',media_type:'image/jpeg',data:payload.dataUrl.split(',')[1]}},{type:'text',text:instr}]
    : [{type:'text',text:'Contenido del archivo:\n'+String(payload.text||'').slice(0,14000)},{type:'text',text:instr}];
  const data=await anthropicRequest({model:'claude-haiku-4-5-20251001',max_tokens:2500,messages:[{role:'user',content}]});
  const txt=(data.content&&data.content[0]&&data.content[0].text||'').replace(/```json|```/g,'').trim();
  const m=txt.match(/\[[\s\S]*\]/);
  if(!m)return [];
  const arr=JSON.parse(m[0]);
  return Array.isArray(arr)?arr:[];
}

function _normCanal(c){c=(c||'').toLowerCase();if(c.includes('book'))return 'booking';if(c.includes('air'))return 'airbnb';return 'directo';}
function _cleanName(s){return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim();}
function _guestSim(a,b){a=_cleanName(a);b=_cleanName(b);if(!a||!b)return false;const fa=a.split(' ')[0],fb=b.split(' ')[0];return a===b||a.includes(b)||b.includes(a)||(!!fa&&fa===fb);}

// Compara una reserva del archivo contra el PMS y devuelve un estado
function reconAgainstPMS(f){
  if(!RESERVAS_PMS.length)return{icon:'⚪',msg:'Sincroniza el PMS para comparar',color:'var(--text3)',p:null};
  const cand=RESERVAS_PMS.filter(p=>f.ci&&p.ci&&dayDiff(p.ci,f.ci)<=2);
  const p=cand.find(x=>_guestSim(x.guest,f.guest))||cand[0]||null;
  if(!p)return{icon:'🔴',msg:'No está en el PMS',color:'var(--red)',p:null};
  const amountOk=!p.bruto||!f.bruto||Math.abs(p.bruto-f.bruto)/Math.max(p.bruto,f.bruto)<0.05;
  const datesOk=dayDiff(p.ci,f.ci)===0&&(!f.co||!p.co||dayDiff(p.co,f.co)===0);
  if(!amountOk)return{icon:'⚠️',msg:`Importe difiere: PMS ${fn0(p.bruto)} vs archivo ${fn0(f.bruto)}`,color:'var(--gold)',p};
  if(!datesOk)return{icon:'⚠️',msg:`Fechas difieren: PMS ${p.ci}→${p.co||'?'}`,color:'var(--gold)',p};
  return{icon:'✅',msg:'Coincide con PMS',color:'var(--green)',p};
}

function openReconModal(){
  document.getElementById('recon-list').innerHTML='';
  document.getElementById('recon-actions').style.display='none';
  const p=document.getElementById('recon-progress');p.style.display='block';p.textContent='⏳ Preparando…';
  document.getElementById('mbg-recon').classList.add('open');
}

async function importReconFiles(inp){
  const files=Array.from(inp.files||[]);inp.value='';
  if(!files.length)return;
  openReconModal();
  const prog=document.getElementById('recon-progress');
  if(!RESERVAS_PMS.length){prog.textContent='⏳ Sincronizando PMS…';try{await fetchPMSData();}catch(e){}}
  _recon=[];let done=0;
  for(const file of files){
    prog.style.display='block';prog.textContent=`⏳ Leyendo ${file.name} (${++done}/${files.length})…`;
    try{
      const arr=await aiExtractReservas(await fileToReservasPayload(file));
      arr.forEach(x=>{
        const bruto=parseFloat(x.bruto)||0;
        const com=x.com!=null?-Math.abs(parseFloat(x.com)||0):0;
        const neto=x.neto!=null&&x.neto!==''?parseFloat(x.neto):(bruto+com);
        const f={guest:x.guest||'—',ci:x.ci||'',co:x.co||'',canal:_normCanal(x.canal),bruto,com,neto,src:file.name,incluir:true};
        f.recon=reconAgainstPMS(f);
        f.incluir=f.recon.icon!=='✅';
        _recon.push(f);
      });
    }catch(e){
      _recon.push({guest:'⚠️ '+file.name,ci:'',co:'',canal:'',bruto:0,com:0,neto:0,src:file.name,incluir:false,recon:{icon:'❌',msg:e.message,color:'var(--red)',p:null}});
    }
  }
  prog.style.display='none';
  renderReconTable();
}

function renderReconTable(){
  const box=document.getElementById('recon-list');
  if(!_recon.length){box.innerHTML='<div style="padding:16px;text-align:center;color:var(--text3);font-size:12px">No se detectaron reservas en los archivos.</div>';document.getElementById('recon-actions').style.display='none';return;}
  const okCount=_recon.filter(f=>f.recon.icon==='✅').length;
  const difCount=_recon.filter(f=>f.recon.icon==='⚠️').length;
  const noCount=_recon.filter(f=>f.recon.icon==='🔴').length;
  let h=`<div style="font-size:11px;margin-bottom:8px">Detectadas <b>${_recon.length}</b> reservas · <span style="color:var(--green)">✅ ${okCount} coinciden</span> · <span style="color:var(--gold)">⚠️ ${difCount} con diferencias</span> · <span style="color:var(--red)">🔴 ${noCount} no están en PMS</span></div>`;
  h+='<table class="ex" style="width:100%;font-size:11px"><thead><tr><th></th><th>Huésped</th><th>Entrada</th><th>Salida</th><th>Canal</th><th>Bruto</th><th>Estado vs PMS</th></tr></thead><tbody>';
  _recon.forEach((f,i)=>{
    const cb=f.recon.icon==='❌'?'':`<input type="checkbox" ${f.incluir?'checked':''} onchange="_recon[${i}].incluir=this.checked">`;
    h+=`<tr><td>${cb}</td><td>${f.guest}</td><td>${f.ci||'—'}</td><td>${f.co||'—'}</td><td>${f.canal||'—'}</td><td>${f.bruto?fn0(f.bruto):'—'}</td><td style="color:${f.recon.color}">${f.recon.icon} ${f.recon.msg}</td></tr>`;
  });
  h+='</tbody></table>';
  if(RESERVAS_PMS.length){
    const faltan=RESERVAS_PMS.filter(p=>!_recon.some(f=>f.ci&&p.ci&&dayDiff(p.ci,f.ci)<=2&&_guestSim(p.guest,f.guest)));
    if(faltan.length){
      h+=`<div style="margin-top:12px;padding:8px 12px;background:rgba(191,95,74,.1);border:1px solid var(--red);border-radius:6px;font-size:11px;color:var(--red)"><b>${faltan.length}</b> reserva(s) en el PMS que NO aparecen en tus archivos:<br>`+faltan.map(p=>`· ${p.guest||'—'} (${p.ci||'—'}${p.room?' · '+p.room:''}${p.bruto?' · '+fn0(p.bruto):''})`).join('<br>')+'</div>';
    }
  }
  box.innerHTML=h;
  document.getElementById('recon-actions').style.display='flex';
}

function importSelectedRecon(){
  const sel=_recon.filter(f=>f.incluir&&f.bruto);
  if(!sel.length){notif('No hay reservas seleccionadas');return;}
  let added=0;
  sel.forEach(f=>{
    const dup=RESERVAS.some(r=>r.ci===f.ci&&Math.abs((r.bruto||0)-f.bruto)<0.5&&_guestSim(r.guest,f.guest));
    if(dup)return;
    RESERVAS_EXTRA.push({id:'e'+Date.now()+Math.random().toString(36).slice(2),room:(f.recon.p&&f.recon.p.room)||'Sin asignar',guest:f.guest,ci:f.ci,co:f.co||f.ci,canal:f.canal,bruto:f.bruto,com:f.com,neto:f.neto,metodo:f.canal==='directo'?'Bizum/Transf':'OTA'});
    added++;
  });
  RESERVAS=[...RESERVAS_BASE,...RESERVAS_EXTRA];
  localStorage.setItem('ing_extra',JSON.stringify(RESERVAS_EXTRA));
  closeModals();renderDashboard();
  if(document.getElementById('page-habitaciones').classList.contains('on'))renderHabs();
  notif(added?`${added} reserva(s) importada(s)`:'Sin nuevas (ya estaban registradas)');
}

function openGastoModal(){
  _editId=null;_fotoData=null;
  document.getElementById('g-fecha').value=new Date().toISOString().slice(0,10);
  document.getElementById('g-imp').value='';
  document.getElementById('g-con').value='';
  document.getElementById('g-privado').checked=false;
  const img=document.getElementById('foto-preview');
  if(img){img.src='';img.style.display='none';}
  const lbl=document.querySelector('#photo-drop .photo-lbl');
  if(lbl)lbl.style.display='';
  const ft=document.getElementById('g-foto');
  if(ft)ft.value='';
  // Reset recurrencia
  document.querySelectorAll('#rpills .rpill').forEach(p=>p.classList.remove('on'));
  document.querySelector('#rpills .rpill[data-r="none"]')?.classList.add('on');
  _recur='none';
  document.getElementById('g-range-wrap').style.display='none';
  document.querySelector('#mbg-gasto .modal-title').textContent='Añadir gasto';
  document.getElementById('mbg-gasto').classList.add('open');
}
function openIngModal(){
  _editIngId=null;
  _ingRecur=false;
  _canal='directo';
  _iMet='bizum';
  const ci=document.getElementById('i-ci');
  if(ci)ci.value=new Date().toISOString().slice(0,10);
  const co=document.getElementById('i-co');if(co)co.value='';
  document.getElementById('i-guest').value='';
  document.getElementById('i-bruto').value='';
  document.getElementById('i-com').value='';
  document.getElementById('i-neto').value='';
  document.getElementById('i-privado').checked=false;
  // Reset canal pills
  document.querySelectorAll('#mbg-ing .tipo-pill').forEach((p,i)=>{
    p.classList.remove('on');
    if(i===2) p.classList.add('on'); // Directo por defecto
  });
  // Reset método cobro pills
  document.querySelectorAll('#mpills-i .mpill').forEach((p,i)=>{
    p.classList.remove('on');
    if(i===1) p.classList.add('on'); // Bizum por defecto
  });
  // Reset recur pills
  document.querySelectorAll('#ing-recur-pills .tipo-pill').forEach((p,i)=>p.classList.toggle('on',i===0));
  document.getElementById('i-range-wrap').style.display='none';
  document.getElementById('i-dates-wrap').style.display='block';
  const mt=document.getElementById('ing-modal-title');
  if(mt)mt.textContent='Añadir ingreso';
  document.getElementById('mbg-ing').classList.add('open');
}

function renderGastosByMonth(){
  // GV shown by month (like fijos)
  const Q1m=PERIOD_DEFS[gastP].cols;
  const MN={1:'Ene',2:'Feb',3:'Mar',4:'Abr',5:'May',6:'Jun',7:'Jul',8:'Ago',9:'Sep',10:'Oct',11:'Nov',12:'Dic'};
  const byMonth={};
  Q1m.forEach(m=>byMonth[m]=[]);
  GASTOS_VAR.forEach((g,i)=>{
    const gm=new Date(g.fecha).getMonth()+1;
    if(Q1m.includes(gm)) byMonth[gm].push({g,i});
  });
  let html='<div style="overflow-x:auto"><table class="gtbl"><thead><tr><th>Mes</th><th>Concepto</th><th>Tipo</th><th>Cat.</th><th>Método</th><th>Importe</th><th></th></tr></thead><tbody>';
  Q1m.forEach(m=>{
    const items=byMonth[m];
    if(!IS_REAL) items.forEach(({g})=>{if(g.privado)return;}); // filter
    const visible=IS_REAL?items:items.filter(({g})=>!g.privado);
    if(!visible.length)return;
    visible.forEach(({g,i},j)=>{
      const prTag=g.privado?` <span style="font-size:9px;color:var(--green);background:var(--green-bg);padding:1px 5px;border-radius:100px">privado</span>`:'';
      const fotoTag=g.foto?` <span style="font-size:9px;cursor:pointer;color:var(--gold)" onclick="showFoto('${g.id}')" title="Ver justificante">📷</span>`:'';
      html+=`<tr style="${g.privado?'opacity:.8':''}">
        <td style="font-weight:700;color:var(--text3)">${j===0?MN[m]:''}</td>
        <td><span class="edit-link" onclick="editGasto('${g.id}')">${g.n}</span>${prTag}${fotoTag}</td>
        <td><span class="tag ${g.tipo||'v'}">${g.tipo==='f'?'Fijo':'Var'}</span></td>
        <td style="font-size:10px;color:var(--text2)">${g.cat}</td>
        <td style="font-size:10px;color:var(--text2)">${g.metodo}</td>
        <td class="${g.importe<0?'pos':'neg'}">${fn(g.importe)}</td>
        <td style="white-space:nowrap"><button onclick="editGasto('${g.id}')" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:13px;padding:0 3px" title="Editar">✎</button><button onclick="delGasto(${i})" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:14px;padding:0 3px" title="Eliminar">×</button></td>
      </tr>`;
    });
  });
  const tot=visibleGastosVar().filter(g=>Q1m.includes(new Date(g.fecha).getMonth()+1)).reduce((s,g)=>s+(g.importe||0),0);
  html+=`<tr class="tot-r"><td colspan="5">TOTAL ${IS_REAL?'(real)':'(fiscal)'}</td><td class="neg">${fn(tot)}</td><td></td></tr>`;
  html+='</tbody></table></div>';
  return html;
}

function showFoto(id){
  const g=GASTOS_VAR.find(x=>x.id===id);
  if(!g||!g.foto)return;
  const w=window.open('','_blank','width=600,height=400');
  w.document.write(`<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${g.foto}" style="max-width:100%;max-height:100vh;object-fit:contain"></body></html>`);
}


function setTipo(t,btn){_gTipo=t;document.querySelectorAll('.tipo-pill').forEach(p=>{p.classList.remove('on');});btn.classList.add('on');}
function setCanal(c,btn){_canal=c;document.querySelectorAll('#mbg-ing .tipo-pill').forEach(p=>p.classList.remove('on'));btn.classList.add('on');}
function calcCom(){const b=parseFloat(document.getElementById('i-bruto').value)||0;const pct=_canal==='booking'?0.15:_canal==='airbnb'?0.03:0;const com=(b*pct).toFixed(2);document.getElementById('i-com').value=com;document.getElementById('i-neto').value=(b-com).toFixed(2);}
function calcNeto(){const b=parseFloat(document.getElementById('i-bruto').value)||0;const c=parseFloat(document.getElementById('i-com').value)||0;document.getElementById('i-neto').value=(b-c).toFixed(2);}
function pickMet(el,group,varName){document.querySelectorAll('#'+group+' .mpill').forEach(p=>p.classList.remove('on'));el.classList.add('on');if(varName==='g')_gMet=el.dataset.m;else _iMet=el.dataset.m;}
function closeModals(){document.querySelectorAll('.mbg').forEach(m=>m.classList.remove('open'));}


// ═══════════ INFORME ═══════════
let infP='q1';
function setInfPeriod(p,btn){
  document.querySelectorAll('#inf-pills .pill').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  infP=p;
  renderInforme();
}

function renderInforme(){
  const pd=PERIOD_DEFS[infP];
  const Q1m=pd.cols;
  const mLabel=pd.label;
  // Update mode badge
  const mb=document.getElementById('inf-mode-badge');
  if(mb){mb.textContent=IS_REAL?'REAL':'FISCAL';mb.style.color=IS_REAL?'var(--green)':'var(--blue)';}
  const MN={1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre'};
  let h=`<thead><tr><th>Concepto</th>${Q1m.map(m=>`<th>${MN[m]}</th>`).join('')}<th>TOTAL ${mLabel}</th></tr></thead><tbody>`;
  const ncols=Q1m.length+2;
  h+=`<tr class="sec"><td colspan="${ncols}">▸ INGRESOS</td></tr>`;
  [{l:'Booking.com — precio cobrado',c:'booking',f:'bruto'},
   {l:'  Comision Booking',c:'booking',f:'com',isCom:true},
   {l:'Airbnb — precio cobrado',c:'airbnb',f:'bruto'},
   {l:'  Comision Airbnb',c:'airbnb',f:'com',isCom:true},
   {l:'Directo (Bizum / Transf)',c:'directo',f:'neto'},
  ].forEach(r=>{
    const ms=Q1m.map(m=>visibleReservas().filter(x=>getMes(x)===m&&x.canal===r.c).reduce((s,x)=>s+(x[r.f]||0),0));
    const tot=ms.reduce((a,b)=>a+b,0);
    h+=`<tr ${r.isCom?'style="opacity:.7"':''}><td ${r.isCom?'style="padding-left:14px;font-size:10px;color:var(--text3)"':''}>${r.l}</td>${ms.map(v=>`<td class="${r.isCom?'neg dim':v?'pos':''}">${v?fn(Math.abs(v)):''}</td>`).join('')}<td class="${r.isCom?'neg':tot?'pos':''}">${tot?fn(Math.abs(tot)):''}</td></tr>`;
  });
  const ibT=ingTotal(Q1m,'bruto'),cA=Math.abs(comTotal(Q1m)),inT=ingTotal(Q1m,'neto');
  h+=`<tr class="tot"><td>TOTAL INGRESOS BRUTOS</td>${Q1m.map(m=>`<td class="pos">${fn0(ingTotal([m],'bruto'))}</td>`).join('')}<td class="pos">${fn0(ibT)}</td></tr>`;
  h+=`<tr class="tot"><td style="padding-left:12px;font-size:10px">↳ comisiones OTA</td>${Q1m.map(m=>`<td class="neg dim">${Math.abs(comTotal([m]))?fn(Math.abs(comTotal([m]))):''}</td>`).join('')}<td class="neg">${cA?fn(cA):''}</td></tr>`;
  h+=`<tr class="tot" style="background:var(--green-bg)"><td style="color:var(--green)">INGRESOS NETOS</td>${Q1m.map(m=>`<td class="pos">${fn0(ingTotal([m],'neto'))}</td>`).join('')}<td class="pos">${fn0(inT)}</td></tr>`;
  h+=`<tr class="sec"><td colspan="${ncols}">▸ GASTOS FIJOS</td></tr>`;
  visibleGastosFijos().forEach(g=>{const tot=Q1m.reduce((s,m)=>s+(g.m[m]||0),0);h+=`<tr><td>${g.n}</td>${Q1m.map(m=>`<td class="${g.m[m]?'neg':''}">${g.m[m]?fn(g.m[m]):''}</td>`).join('')}<td class="neg">${tot?fn(tot):''}</td></tr>`;});
  const gfT=gFijo(Q1m);  // uses visibleGastosFijos() internally
  h+=`<tr class="tot"><td>SUBTOTAL GASTOS FIJOS</td>${Q1m.map(m=>`<td class="neg">${fn(gFijo([m]))}</td>`).join('')}<td class="neg">${fn(gfT)}</td></tr>`;
  h+=`<tr class="sec"><td colspan="${ncols}">▸ GASTOS VARIABLES</td></tr>`;
  visibleGastosVar().forEach(g=>{const gm=new Date(g.fecha).getMonth()+1;h+=`<tr><td>${g.n} <span class="dim">(${g.fecha})</span></td>${Q1m.map(m=>`<td class="${m===gm&&g.importe>0?'neg':m===gm&&g.importe<0?'pos':''}">${m===gm&&g.importe?fn(g.importe):''}</td>`).join('')}<td class="${g.importe<0?'pos':'neg'}">${g.importe?fn(g.importe):''}</td></tr>`;});
  const gvT=gVar(Q1m);
  h+=`<tr class="tot"><td>SUBTOTAL GASTOS VARIABLES</td>${Q1m.map(m=>`<td class="${gVar([m])?'neg':''}">${gVar([m])?fn(gVar([m])):''}</td>`).join('')}<td class="${gvT<0?'pos':'neg'}">${gvT?fn(gvT):''}</td></tr>`;
  const gT=gfT+gvT,res=inT-gT;
  h+=`<tr class="sec"><td colspan="${ncols}">▸ RESULTADO</td></tr>`;
  h+=`<tr class="tot"><td>TOTAL GASTOS</td>${Q1m.map(m=>`<td class="neg">${fn0(gTot([m]))}</td>`).join('')}<td class="neg">${fn0(gT)}</td></tr>`;
  h+=`<tr class="tot" style="background:rgba(200,168,74,.07)"><td style="font-family:'Playfair Display',serif;font-size:13px;color:var(--gold)">RESULTADO NETO</td>${Q1m.map(m=>{const n=ingTotal([m],'neto')-gTot([m]);return`<td class="${n>=0?'pos':'neg'}">${fn0(n)}</td>`;}).join('')}<td class="${res>=0?'gold':'neg'}" style="font-size:13px">${fn0(res)}</td></tr>`;
  h+=`</tbody>`;document.getElementById('inf-tbl').innerHTML=h;
}

function exportCSV(){
  const Q1m=PERIOD_DEFS[infP].cols;
  const mLabel=PERIOD_DEFS[infP].label;
  const MN={1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre'};
  const fv=v=>v?String(v.toFixed(2)):'';
  const q=s=>{s=String(s);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
  let csv=`\uFEFFConcepto,${Q1m.map(m=>MN[m]).join(',')},${q('Total '+mLabel)}\n--- INGRESOS ---${','.repeat(Q1m.length+1)}\n`;
  [{l:'Booking bruto',c:'booking',f:'bruto'},{l:'Comisión Booking',c:'booking',f:'com',abs:true},
   {l:'Airbnb bruto',c:'airbnb',f:'bruto'},{l:'Comisión Airbnb',c:'airbnb',f:'com',abs:true},{l:'Directo',c:'directo',f:'neto'}
  ].forEach(r=>{const ms=Q1m.map(m=>visibleReservas().filter(x=>getMes(x)===m&&x.canal===r.c).reduce((s,x)=>s+(x[r.f]||0),0));const fn2=v=>r.abs?fv(Math.abs(v)):fv(v);csv+=`${r.l},${ms.map(fn2).join(',')},${fn2(ms.reduce((a,b)=>a+b,0))}\n`;});
  csv+=`INGRESOS NETOS,${Q1m.map(m=>fv(ingTotal([m],'neto'))).join(',')},${fv(ingTotal(Q1m,'neto'))}\n--- GASTOS FIJOS ---,,,,\n`;
  visibleGastosFijos().forEach(g=>{const ms=Q1m.map(m=>fv(g.m[m]||0));csv+=`${q(g.n)},${ms.join(',')},${fv(Q1m.reduce((s,m)=>s+(g.m[m]||0),0))}\n`;});
  csv+=`--- GASTOS VARIABLES ---,,,,\n`;
  visibleGastosVar().forEach(g=>{const gm=new Date(g.fecha).getMonth()+1;csv+=`${q(g.n)},${Q1m.map(m=>m===gm?fv(g.importe):'').join(',')},${fv(g.importe)}\n`;});
  csv+=`TOTAL GASTOS,${Q1m.map(m=>fv(gTot([m]))).join(',')},${fv(gTot(Q1m))}\nRESULTADO NETO,${Q1m.map(m=>fv(ingTotal([m],'neto')-gTot([m]))).join(',')},${fv(ingTotal(Q1m,'neto')-gTot(Q1m))}\n`;
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));a.download=`hostal_matildas_${infP}_2026.csv`;a.click();notif('CSV exportado');
}

// ═══════════ GASTOS FIJOS CRUD ═══════════
let _editFijoId=null, _fijoDist='monthly';

function setFijoDist(dist, btn){
  _fijoDist=dist;
  document.querySelectorAll('#fijo-dist-pills .tipo-pill').forEach(p=>p.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('f-single-wrap').style.display=(dist==='custom')?'none':'block';
  document.getElementById('f-months-apply-wrap').style.display=(dist==='total')?'block':'none';
  document.getElementById('f-custom-wrap').style.display=(dist==='custom')?'block':'none';
  const lbl=document.getElementById('f-importe-lbl');
  if(lbl) lbl.textContent=dist==='monthly'?'Importe mensual (€)':'Total anual (€)';
}

function openFijoModal(id){
  _editFijoId=id||null;
  _fijoDist='monthly';
  document.getElementById('fijo-modal-title').textContent=id?'Editar gasto fijo':'Añadir gasto fijo';
  document.getElementById('f-nombre').value='';
  document.getElementById('f-importe').value='';
  document.getElementById('f-importe-puntual').value='';
  document.querySelectorAll('#fijo-dist-pills .tipo-pill').forEach((p,i)=>{p.classList.toggle('on',i===0);});
  document.getElementById('f-single-wrap').style.display='block';
  document.getElementById('f-months-apply-wrap').style.display='none';
  document.getElementById('f-custom-wrap').style.display='none';
  // Uncheck all month checkboxes
  for(let m=1;m<=12;m++){const cb=document.getElementById('fm-'+m);if(cb)cb.checked=false;}
  if(id){
    const g=GASTOS_FIJOS.find(x=>x.id===id);
    if(g){
      document.getElementById('f-nombre').value=g.n;
      document.getElementById('f-cat').value=g.cat||'otros';
      // Detect distribution type
      const vals=Object.values(g.m);
      const nonZero=vals.filter(v=>v>0);
      const allSame=nonZero.length>0&&nonZero.every(v=>Math.abs(v-nonZero[0])<0.01);
      if(allSame&&nonZero.length===12){
        _fijoDist='monthly';
        document.getElementById('f-importe').value=nonZero[0];
        document.querySelectorAll('#fijo-dist-pills .tipo-pill')[0].classList.add('on');
        document.querySelectorAll('#fijo-dist-pills .tipo-pill')[1].classList.remove('on');
        document.querySelectorAll('#fijo-dist-pills .tipo-pill')[2].classList.remove('on');
      } else if(allSame&&nonZero.length<12){
        _fijoDist='total';
        document.getElementById('f-importe-puntual').value=nonZero[0];
        setFijoDist('total',document.querySelectorAll('#fijo-dist-pills .tipo-pill')[1]);
        for(let m=1;m<=12;m++){if(g.m[m]){const cb=document.getElementById('fm-'+m);if(cb)cb.checked=true;}}
      } else {
        setFijoDist('custom',document.querySelectorAll('#fijo-dist-pills .tipo-pill')[2]);
        for(let m=1;m<=12;m++){const inp=document.getElementById('fcm-'+m);if(inp)inp.value=g.m[m]||'';}
      }
    }
  }
  document.getElementById('mbg-fijo').classList.add('open');
}
function editFijo(id){ openFijoModal(id); }

function delFijo(id){
  const g=GASTOS_FIJOS.find(x=>x.id===id);
  if(!g)return;
  const msg=g.sys?`¿Eliminar "${g.n}" de los gastos fijos?\n\nEs un gasto del sistema, puedes recuperarlo reseteando.`:`¿Eliminar "${g.n}"?`;
  if(!confirm(msg))return;
  if(g.sys){
    const deleted=sj('gf_deleted',[]);
    if(!deleted.includes(id)) deleted.push(id);
    localStorage.setItem('gf_deleted',JSON.stringify(deleted));
  }
  const idx=GASTOS_FIJOS.findIndex(x=>x.id===id);
  if(idx>-1) GASTOS_FIJOS.splice(idx,1);
  saveGastosFijos();
  renderGastos(); renderDashboard();
  notif('Gasto fijo eliminado');
}

function saveFijo(){
  const nombre=document.getElementById('f-nombre').value.trim();
  const cat=document.getElementById('f-cat').value;
  if(!nombre){alert('Indica un nombre');return;}
  let meses={};
  if(_fijoDist==='monthly'){
    const v=parseFloat(document.getElementById('f-importe').value)||0;
    if(!v){alert('Indica el importe mensual');return;}
    for(let m=1;m<=12;m++) meses[m]=v;
  } else if(_fijoDist==='total'){
    const v=parseFloat(document.getElementById('f-importe-puntual').value)||0;
    if(!v){alert('Indica el importe por pago');return;}
    let anyChecked=false;
    for(let m=1;m<=12;m++){
      const cb=document.getElementById('fm-'+m);
      if(cb&&cb.checked){meses[m]=v;anyChecked=true;}else{meses[m]=0;}
    }
    if(!anyChecked){alert('Selecciona al menos un mes');return;}
  } else {
    for(let m=1;m<=12;m++){
      const inp=document.getElementById('fcm-'+m);
      meses[m]=parseFloat(inp?.value)||0;
    }
    if(!Object.values(meses).some(v=>v>0)){alert('Introduce al menos un valor');return;}
  }
  if(_editFijoId){
    const idx=GASTOS_FIJOS.findIndex(x=>x.id===_editFijoId);
    if(idx>-1) GASTOS_FIJOS[idx]={...GASTOS_FIJOS[idx],n:nombre,cat,m:meses};
  } else {
    GASTOS_FIJOS.push({id:'gf'+Date.now(),n:nombre,cat,m:meses,sys:false});
  }
  saveGastosFijos();
  closeModals();
  renderGastos(); renderDashboard();
  notif(_editFijoId?'Gasto fijo actualizado':'Gasto fijo añadido');
  _editFijoId=null;
}

async function exportPDF(){
  notif('Generando PDF...');
  try{
    // Load jsPDF
    if(!window.jspdf){
      await new Promise((res,rej)=>{
        const s=document.createElement('script');
        s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload=res;s.onerror=()=>rej(new Error('No se pudo cargar el generador de PDF (sin conexión)'));
        document.head.appendChild(s);
      });
    }
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    const pd=PERIOD_DEFS[infP];
    const Q1m=pd.cols;
    const MN={1:'Enero',2:'Febrero',3:'Marzo',4:'Abril',5:'Mayo',6:'Junio',7:'Julio',8:'Agosto',9:'Septiembre',10:'Octubre',11:'Noviembre',12:'Diciembre'};
    const mNames=Q1m.map(m=>MN[m]);
    const mLabel=pd.label;
    const mode=IS_REAL?'REAL':'FISCAL';
    const W=210,M=15;

    // Header
    doc.setFillColor(13,13,11);
    doc.rect(0,0,W,28,'F');
    doc.setTextColor(200,168,74);
    doc.setFontSize(18);
    doc.setFont('helvetica','bold');
    doc.text("Hostal Matilda's",M,12);
    doc.setFontSize(10);
    doc.setFont('helvetica','normal');
    doc.setTextColor(154,150,144);
    doc.text('Informe Gestora · '+mLabel+' · Modo '+mode,M,19);
    doc.text('Generado: '+new Date().toLocaleDateString('es-ES'),M,25);
    doc.setTextColor(0,0,0);

    let y=35;
    const lineH=6;
    const colW=(W-2*M-40)/(Q1m.length+1);

    function drawHeader(title){
      doc.setFillColor(37,36,32);
      doc.rect(M,y,W-2*M,6,'F');
      doc.setTextColor(154,150,144);
      doc.setFontSize(8);
      doc.setFont('helvetica','bold');
      doc.text(title.toUpperCase(),M+2,y+4);
      doc.setTextColor(0,0,0);
      y+=7;
    }

    const LH=3.8; // altura por línea (mm), usada tanto al dibujar como al avanzar la fila
    function drawRow(label,vals,total,color,indent){
      doc.setFontSize(8);
      doc.setFont('helvetica',color?'bold':'normal');
      // Parte el concepto en líneas; recorta a máx. 2 líneas con «…» para mantener la tabla compacta
      let lines=doc.splitTextToSize((indent?'  ':'')+label,38);
      if(lines.length>2){lines=lines.slice(0,2);lines[1]=lines[1].replace(/\s*\S{0,1}$/,'')+'…';}
      const rowH=Math.max(lineH,lines.length*LH+1.4);
      if(y+rowH>285){doc.addPage();y=15;}
      if(color){doc.setTextColor(...color);}else{doc.setTextColor(60,60,60);}
      // Dibuja línea a línea con interlineado LH fijo para que coincida con rowH (evita solapes)
      lines.forEach((ln,li)=>doc.text(ln,M,y+3.5+li*LH));
      vals.forEach((v,i)=>{
        const x=M+40+i*colW;
        if(v){doc.text(fn0(v).replace('€',''),x+colW-2,y+3.5,{align:'right'});}
      });
      if(total!==null){doc.text(fn0(total).replace('€',''),W-M-2,y+3.5,{align:'right'});}
      doc.setTextColor(0,0,0);
      y+=rowH;
    }

    // Column headers
    doc.setFillColor(22,22,20);
    doc.rect(M,y,W-2*M,6,'F');
    doc.setTextColor(200,168,74);
    doc.setFontSize(7);
    doc.setFont('helvetica','bold');
    doc.text('Concepto',M+2,y+4);
    mNames.forEach((mn,i)=>doc.text(mn,(M+40+i*colW)+colW-2,y+4,{align:'right'}));
    doc.text('TOTAL',W-M-2,y+4,{align:'right'});
    doc.setTextColor(0,0,0);
    y+=7;

    // INGRESOS
    drawHeader('>> INGRESOS');
    const canales=[
      {l:'Booking.com (bruto)',c:'booking',f:'bruto'},
      {l:'↳ Comisión Booking',c:'booking',f:'com',indent:true,neg:true},
      {l:'Airbnb (bruto)',c:'airbnb',f:'bruto'},
      {l:'↳ Comisión Airbnb',c:'airbnb',f:'com',indent:true,neg:true},
      {l:'Directo (Bizum/Transf.)',c:'directo',f:'neto'},
    ];
    canales.forEach(r=>{
      const vals=Q1m.map(m=>visibleReservas().filter(x=>getMes(x)===m&&x.canal===r.c).reduce((s,x)=>s+(x[r.f]||0),0));
      const tot=vals.reduce((a,b)=>a+b,0);
      if(tot)drawRow(r.l,vals.map(v=>Math.abs(v)||null),Math.abs(tot)||null,r.neg?[191,95,74]:null,r.indent);
    });
    const ibT=ingTotal(Q1m,'bruto');
    const cA=Math.abs(comTotal(Q1m));
    const inT=ingTotal(Q1m,'neto');
    drawRow('TOTAL INGRESOS BRUTOS',Q1m.map(m=>ingTotal([m],'bruto')),ibT,[90,158,114]);
    drawRow('  Comisiones OTA',Q1m.map(m=>Math.abs(comTotal([m]))||null),cA||null,[191,95,74],true);
    drawRow('INGRESOS NETOS',Q1m.map(m=>ingTotal([m],'neto')),inT,[90,158,114]);
    y+=2;

    // GASTOS FIJOS
    drawHeader('>> GASTOS FIJOS');
    visibleGastosFijos().forEach(g=>{
      const vals=Q1m.map(m=>g.m[m]||null);
      const tot=Q1m.reduce((s,m)=>s+(g.m[m]||0),0);
      if(tot)drawRow(g.n,vals,tot,[191,95,74]);
    });
    const gfT=gFijo(Q1m);
    drawRow('SUBTOTAL GASTOS FIJOS',Q1m.map(m=>gFijo([m])),gfT,[191,95,74]);
    y+=2;

    // GASTOS VARIABLES
    drawHeader('>> GASTOS VARIABLES');
    visibleGastosVar().forEach(g=>{
      const gm=new Date(g.fecha).getMonth()+1;
      if(!Q1m.includes(gm))return;
      const vals=Q1m.map(m=>m===gm?g.importe:null);
      drawRow(g.n,vals,g.importe,[191,95,74]);
    });
    const gvT=gVar(Q1m);
    drawRow('SUBTOTAL GASTOS VARIABLES',Q1m.map(m=>gVar([m])),gvT,[191,95,74]);
    y+=2;

    // RESULTADO
    drawHeader('>> RESULTADO');
    const gT=gfT+gvT;
    drawRow('TOTAL GASTOS',Q1m.map(m=>gTot([m])),gT,[191,95,74]);
    const res=inT-gT;
    if(y+7>285){doc.addPage();y=15;}
    if(res>=0){doc.setFillColor(230,244,235);}else{doc.setFillColor(247,230,226);}
    doc.rect(M,y,W-2*M,7,'F');
    drawRow('RESULTADO NETO',Q1m.map(m=>{const n=ingTotal([m],'neto')-gTot([m]);return n;}),res,res>=0?[90,158,114]:[191,95,74]);

    // JUSTIFICANTES — new page with photos
    const gastosFoto=visibleGastosVar().filter(g=>g.foto&&Q1m.includes(new Date(g.fecha).getMonth()+1));
    if(gastosFoto.length){
      doc.addPage();
      doc.setFillColor(13,13,11);
      doc.rect(0,0,W,15,'F');
      doc.setTextColor(200,168,74);
      doc.setFontSize(13);
      doc.setFont('helvetica','bold');
      doc.text('Justificantes · '+mLabel,M,10);
      doc.setTextColor(0,0,0);
      let jy=20;
      for(const g of gastosFoto){
        if(jy>240){doc.addPage();jy=15;}
        doc.setFontSize(8);
        doc.setFont('helvetica','bold');
        doc.setTextColor(60,60,60);
        const jLines=doc.splitTextToSize(g.n+' — '+g.fecha+' — '+fn(g.importe),W-2*M);
        doc.text(jLines,M,jy);
        jy+=jLines.length*3.6+1;
        try{
          if(g.foto&&(g.foto.startsWith('data:image')||g.foto.startsWith('data:application/octet'))){
            const imgType=g.foto.includes('jpeg')?'JPEG':'PNG';
            // Escala manteniendo proporción dentro de una caja máx. 80×90 mm
            const maxW=80,maxH=90;let iw=maxW,ih=maxH;
            try{const p=doc.getImageProperties(g.foto);const r=Math.min(maxW/p.width,maxH/p.height);iw=p.width*r;ih=p.height*r;}catch(_){ih=60;}
            if(jy+ih>285){doc.addPage();jy=15;}
            doc.addImage(g.foto,imgType,M,jy,iw,ih,'','FAST');
            jy+=ih+5;
          } else if(g.foto.startsWith('data:application/pdf')){
            doc.setFontSize(8);
            doc.setTextColor(154,150,144);
            doc.text('[Adjunto PDF — ver archivo original]',M,jy+5);
            jy+=12;
          }
        }catch(e){jy+=5;}
        jy+=4;
      }
    }

    doc.save('hostal_matildas_informe_'+infP+'_2026.pdf');
    notif('PDF generado ✓');
  }catch(e){
    console.error('PDF error:',e);
    notif('Error generando PDF: '+e.message);
  }
}

function notif(msg,isErr){const n=document.getElementById('notif');n.textContent=(isErr?'✕ ':'✓ ')+msg;n.classList.toggle('err',!!isErr);n.classList.add('on');setTimeout(()=>n.classList.remove('on'),isErr?5000:3000);}

// ═══════════ COPIA DE SEGURIDAD ═══════════
function backupExport(){
  const data={version:1,fecha:new Date().toISOString(),
    ing_extra:RESERVAS_EXTRA,gv5:GASTOS_VAR,gf6:GASTOS_FIJOS,gf_deleted:sj('gf_deleted',[])};
  const blob=new Blob([JSON.stringify(data,null,1)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='copia_gestor_hostal_'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  URL.revokeObjectURL(a.href);
  notif('Copia de seguridad descargada');
}
function backupImport(inp){
  const f=inp.files&&inp.files[0]; if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const d=JSON.parse(rd.result);
      if(!d||typeof d!=='object'||(!Array.isArray(d.ing_extra)&&!Array.isArray(d.gv5)&&!Array.isArray(d.gf6)))
        throw new Error('el archivo no parece una copia del gestor');
      if(!confirm('¿Reemplazar los datos actuales con la copia del '+((d.fecha||'').slice(0,10)||'¿?')+'? El cambio también se sincroniza a los demás dispositivos.'))return;
      if(Array.isArray(d.gf_deleted))localStorage.setItem('gf_deleted',JSON.stringify(d.gf_deleted));
      if(Array.isArray(d.ing_extra)){RESERVAS_EXTRA=d.ing_extra;RESERVAS=[...RESERVAS_BASE,...RESERVAS_EXTRA];localStorage.setItem('ing_extra',JSON.stringify(RESERVAS_EXTRA));}
      if(Array.isArray(d.gv5)){GASTOS_VAR=d.gv5;localStorage.setItem('gv5',JSON.stringify(GASTOS_VAR));}
      if(Array.isArray(d.gf6)){GASTOS_FIJOS.length=0;GASTOS_FIJOS.push(...d.gf6);localStorage.setItem('gf6',JSON.stringify(GASTOS_FIJOS));}
      renderDashboard();renderGastos();
      notif('Copia restaurada');
    }catch(e){notif('No se pudo importar: '+e.message,true);}
    finally{inp.value='';}
  };
  rd.readAsText(f);
}

function resetFijos(){
  if(!confirm('¿Restaurar los gastos fijos del sistema? Perderás las eliminaciones pero no los que hayas añadido.'))return;
  localStorage.removeItem('gf_deleted');
  localStorage.removeItem('gf6');
  GASTOS_FIJOS.length=0;
  GASTOS_FIJOS.push(...loadGastosFijos());
  renderGastos(); renderDashboard();
  notif('Gastos fijos del sistema restaurados');
}

// ═══════════ FIREBASE SYNC ═══════════
const _fb={
  apiKey:"AIzaSyCNWeJtTV9ZQ9hOJWIO59OO-TBUBHt6xbA",
  authDomain:"gestor-hostal.firebaseapp.com",
  projectId:"gestor-hostal",
  storageBucket:"gestor-hostal.firebasestorage.app",
  messagingSenderId:"757250291767",
  appId:"1:757250291767:web:c0de75a7a70b7ff875e7b2"
};
let _db=null,_syncEnabled=false,_syncing=false;

// ── Login de sincronización ──
// Mientras las reglas de Firestore estén abiertas no se pide nada.
// Cuando estén protegidas (exigen usuario), al detectar "permiso denegado" se pide
// email/contraseña con un <form> real (no prompt()) para que el navegador pueda
// ofrecer guardarla y autorrellenarla la próxima vez; además Firebase guarda la sesión.
let _auth=null,_signInFn=null,_loginResolve=null;
async function initAuth(app){
  const m=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  _auth=m.getAuth(app);
  _signInFn=m.signInWithEmailAndPassword;
  await m.setPersistence(_auth,m.browserLocalPersistence);
  // Espera a que Firebase restaure la sesión guardada en este navegador (si la hay)
  await new Promise(res=>{const un=m.onAuthStateChanged(_auth,()=>{un();res();});});
}
function askLogin(){
  if(_auth&&_auth.currentUser)return Promise.resolve(true);
  if(!_auth||!_signInFn)return Promise.resolve(false);
  return new Promise(resolve=>{
    _loginResolve=resolve;
    document.getElementById('login-email').value=localStorage.getItem('syncEmail')||'';
    document.getElementById('login-pass').value='';
    document.getElementById('login-error').style.display='none';
    document.getElementById('mbg-login').classList.add('open');
  });
}
function cancelLogin(){
  document.getElementById('mbg-login').classList.remove('open');
  if(_loginResolve){_loginResolve(false);_loginResolve=null;}
}
async function submitLogin(ev){
  ev.preventDefault();
  const email=document.getElementById('login-email').value.trim();
  const pass=document.getElementById('login-pass').value;
  const errEl=document.getElementById('login-error');
  try{
    await _signInFn(_auth,email,pass);
    localStorage.setItem('syncEmail',email);
    document.getElementById('mbg-login').classList.remove('open');
    notif('Sincronización conectada');
    if(_loginResolve){_loginResolve(true);_loginResolve=null;}
  }catch(e){
    errEl.textContent='Email o contraseña incorrectos';
    errEl.style.display='block';
  }
  return false;
}

async function initFirebase(){
  try{
    const {initializeApp}=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const {getFirestore,doc,setDoc,getDoc}=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const app=initializeApp(_fb);
    _db=getFirestore(app);
    await initAuth(app);
    _syncEnabled=true;
    const sd=document.getElementById('sync-dot');
    if(sd){sd.style.display='inline-block';sd.style.background='var(--gold)';}
    // Generate unique device ID if not exists
    if(!localStorage.getItem('_deviceId')){
      localStorage.setItem('_deviceId','dev_'+Math.random().toString(36).slice(2));
    }
    const _deviceId=localStorage.getItem('_deviceId');

    // Load from Firebase first
    const ref=doc(_db,'hostal','datos');
    let snap=null;
    try{ snap=await getDoc(ref); }
    catch(e){
      // Reglas protegidas → pedir login y reintentar
      if(e.code==='permission-denied'&&await askLogin()) snap=await getDoc(ref);
      else throw e;
    }
    if(snap.exists()){
      _syncing=true;
      const d=snap.data();
      if(d.ing_extra){RESERVAS_EXTRA=d.ing_extra;RESERVAS=[...RESERVAS_BASE,...RESERVAS_EXTRA];localStorage.setItem('ing_extra',JSON.stringify(RESERVAS_EXTRA));}
      if(d.gv5){GASTOS_VAR=d.gv5;localStorage.setItem('gv5',JSON.stringify(GASTOS_VAR));}
      if(d.gf6){GASTOS_FIJOS.length=0;GASTOS_FIJOS.push(...d.gf6);localStorage.setItem('gf6',JSON.stringify(GASTOS_FIJOS));}
      _syncing=false;
    }
    renderDashboard();
    if(sd)sd.style.background='var(--green)';

    // POLLING every 15s instead of onSnapshot (works with all browsers/blockers)
    async function pollFirebase(){
      if(!_syncEnabled||!_db||_syncing)return;
      try{
        const {doc,getDoc}=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
        const psnap=await getDoc(doc(_db,'hostal','datos'));
        if(!psnap.exists())return;
        const d=psnap.data();
        if(d.writtenBy===_deviceId)return; // our own write, skip
        _syncing=true;
        let changed=false;
        if(d.ing_extra&&JSON.stringify(d.ing_extra)!==JSON.stringify(RESERVAS_EXTRA)){RESERVAS_EXTRA=d.ing_extra;RESERVAS=[...RESERVAS_BASE,...RESERVAS_EXTRA];localStorage.setItem('ing_extra',JSON.stringify(RESERVAS_EXTRA));changed=true;}
        if(d.gv5&&JSON.stringify(d.gv5)!==JSON.stringify(GASTOS_VAR)){GASTOS_VAR=d.gv5;localStorage.setItem('gv5',JSON.stringify(GASTOS_VAR));changed=true;}
        if(d.gf6&&JSON.stringify(d.gf6)!==JSON.stringify(GASTOS_FIJOS)){GASTOS_FIJOS.length=0;GASTOS_FIJOS.push(...d.gf6);localStorage.setItem('gf6',JSON.stringify(GASTOS_FIJOS));changed=true;}
        _syncing=false;
        if(changed){
          ['dashboard','habitaciones','gastos','informe'].forEach(id=>{
            if(document.getElementById('page-'+id).classList.contains('on')){
              if(id==='dashboard')renderDashboard();
              if(id==='habitaciones')renderHabs();
              if(id==='gastos')renderGastos();
              if(id==='informe')renderInforme();
            }
          });
          notif('🔄 Sincronizado');
        }
      }catch(e){_syncing=false;}
    }
    // Los datos se meten pocas veces al día: comprobar cambios cada 5 min y al volver a la pestaña
    setInterval(pollFirebase, 300000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)pollFirebase();});
  }catch(e){
    console.error('Firebase:',e);
    _syncEnabled=false;
    const sd=document.getElementById('sync-dot');
    if(sd){sd.style.display='inline-block';sd.style.background='var(--red)';sd.title='Sin sincronizar';}
    if(e&&e.code==='permission-denied')notif('Sin login: los cambios se quedan solo en este dispositivo',true);
    renderDashboard();
  }
}

async function syncToFirebase(){
  if(!_syncEnabled||!_db||_syncing)return;
  try{
    const {doc,setDoc}=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const ts=Date.now();
    const deviceId=localStorage.getItem('_deviceId')||'unknown';
    localStorage.setItem('_lastSync',String(ts));
    await setDoc(doc(_db,'hostal','datos'),{
      ing_extra:RESERVAS_EXTRA,
      gv5:GASTOS_VAR,
      gf6:GASTOS_FIJOS,
      gf_deleted:sj('gf_deleted',[]),
      updated:ts,
      writtenBy:deviceId
    });
  }catch(e){console.error('Sync error:',e);}
}

// Auto-sync on every localStorage write — but not during incoming sync
(function(){
  const orig=localStorage.setItem.bind(localStorage);
  localStorage.setItem=function(k,v){
    orig(k,v);
    if(!_syncing&&['ing_extra','gv5','gf6','gf_deleted'].includes(k))syncToFirebase();
  };
})();

initFirebase();
