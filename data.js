// DATOS BASE del Gestor Hostal (reservas Q1/Q2 2026, gastos fijos y variables semilla)
// Los datos que se añaden desde la app viven en localStorage + Firestore, no aquí.
// ═══════════ DATA ═══════════
const ROOMS=['HB 1','HB 2','HB 3','HB 4','HB 5','HB 6','HB 7','HB 8','HB 9'];
// HB2=Matilda's, HB4=Catedral, HB6=Roma, HB8=Venecia, HB9=Murano
const ROOM_NAME={
  'HB 1':'HB 1','HB 2':'HB 2 (Matilda\'s)','HB 3':'HB 3',
  'HB 4':'HB 4 (Catedral)','HB 5':'HB 5','HB 6':'HB 6 (Roma)',
  'HB 7':'HB 7','HB 8':'HB 8 (Venecia)','HB 9':'HB 9 (Murano)'
};
const Q1=[1,2,3];
const ML={1:'Ene',2:'Feb',3:'Mar',4:'Abr',5:'May',6:'Jun',7:'Jul',8:'Ago',9:'Sep',10:'Oct',11:'Nov',12:'Dic'};

// Lee JSON de localStorage sin romper la app si el valor está corrupto
function sj(key,fallback){
  try{const v=JSON.parse(localStorage.getItem(key)||'null');return v===null?fallback:v;}
  catch(e){console.error('localStorage corrupto, se ignora:',key,e);return fallback;}
}

// RESERVAS Q1 2026 — fuente: Excel (neto/canal/hab) + CSVs OTAs (guest/bruto/com)
// Verificado: totales Booking por mes = Jan 668, Feb 1557.73, Mar 779 ✓
const RESERVAS_BASE = [
  // HB2 (Matilda's) — Booking
  {id:'b-hb2-01',room:'HB 2',guest:'Celia Mazariegos',    ci:'2026-01-30',co:'2026-02-01',canal:'booking',bruto:99,    com:-14.85,neto:79.47},
  {id:'b-hb2-02',room:'HB 2',guest:'Adrian Pardo',        ci:'2026-02-06',co:'2026-02-08',canal:'booking',bruto:108,   com:-16.20,neto:86.70},
  {id:'b-hb2-03',room:'HB 2',guest:'Aitor Del Valle',     ci:'2026-02-13',co:'2026-02-15',canal:'booking',bruto:108,   com:-16.20,neto:86.70},
  {id:'b-hb2-04',room:'HB 2',guest:'Blanco Alex',         ci:'2026-02-27',co:'2026-03-02',canal:'booking',bruto:165,   com:-24.75,neto:132.45},
  {id:'b-hb2-05',room:'HB 2',guest:'Mjose Sánchez',       ci:'2026-02-27',co:'2026-03-01',canal:'booking',bruto:99,    com:-14.85,neto:79.47},
  {id:'b-hb2-06',room:'HB 2',guest:'Mathilde Berenga',    ci:'2026-03-18',co:'2026-03-21',canal:'booking',bruto:150,   com:-22.50,neto:120.42},
  // HB3 — Directo Bizum (largo plazo)
  {id:'d-hb3-01',room:'HB 3',guest:'Inquilino HB3',       ci:'2026-01-01',co:'2026-01-31',canal:'directo', bruto:432,  com:0,neto:432,metodo:'Bizum/Transf'},
  {id:'d-hb3-02',room:'HB 3',guest:'Inquilino HB3',       ci:'2026-02-01',co:'2026-02-28',canal:'directo', bruto:432,  com:0,neto:432,metodo:'Bizum/Transf'},
  {id:'d-hb3-03',room:'HB 3',guest:'Inquilino HB3',       ci:'2026-03-01',co:'2026-03-31',canal:'directo', bruto:432,  com:0,neto:432,metodo:'Bizum/Transf'},
  // HB4 (Catedral) — Directo Bizum
  {id:'d-hb4-01',room:'HB 4',guest:'Inquilino HB4',       ci:'2026-01-01',co:'2026-01-31',canal:'directo', bruto:463,  com:0,neto:463,metodo:'Bizum/Transf'},
  {id:'d-hb4-02',room:'HB 4',guest:'Inquilino HB4',       ci:'2026-02-01',co:'2026-02-28',canal:'directo', bruto:463,  com:0,neto:463,metodo:'Bizum/Transf'},
  {id:'d-hb4-03',room:'HB 4',guest:'Inquilino HB4',       ci:'2026-03-01',co:'2026-03-31',canal:'directo', bruto:463,  com:0,neto:463,metodo:'Bizum/Transf'},
  // HB5 — Directo Bizum
  {id:'d-hb5-01',room:'HB 5',guest:'Inquilino HB5',       ci:'2026-01-01',co:'2026-01-31',canal:'directo', bruto:402,  com:0,neto:402,metodo:'Bizum/Transf'},
  {id:'d-hb5-02',room:'HB 5',guest:'Inquilino HB5',       ci:'2026-02-01',co:'2026-02-28',canal:'directo', bruto:402,  com:0,neto:402,metodo:'Bizum/Transf'},
  {id:'d-hb5-03',room:'HB 5',guest:'Inquilino HB5',       ci:'2026-03-01',co:'2026-03-31',canal:'directo', bruto:402,  com:0,neto:402,metodo:'Bizum/Transf'},
  // HB6 (Roma) — Airbnb
  {id:'a-hb6-01',room:'HB 6',guest:'Luis Vera Hernández', ci:'2026-01-23',co:'2026-01-25',canal:'airbnb',  bruto:108,  com:-3.92,neto:104.08},
  {id:'a-hb6-02',room:'HB 6',guest:'Arwin Harahap',       ci:'2026-02-13',co:'2026-02-15',canal:'airbnb',  bruto:108,  com:-3.92,neto:104.08},
  // HB6 (Roma) — Booking
  {id:'b-hb6-01',room:'HB 6',guest:'Paul Monier',         ci:'2026-01-02',co:'2026-01-04',canal:'booking', bruto:120,  com:-18.00,neto:96.33},
  {id:'b-hb6-02',room:'HB 6',guest:'Noelia Cabel',        ci:'2026-02-06',co:'2026-02-08',canal:'booking', bruto:220,  com:-33.00,neto:176.60},
  {id:'b-hb6-03',room:'HB 6',guest:'Marina Oliver',       ci:'2026-02-06',co:'2026-02-08',canal:'booking', bruto:110,  com:-16.50,neto:88.30},
  {id:'b-hb6-04',room:'HB 6',guest:'Josselyn Ruiz',       ci:'2026-02-13',co:'2026-02-15',canal:'booking', bruto:110,  com:-16.50,neto:88.30},
  {id:'b-hb6-05',room:'HB 6',guest:'Victoria Pérez',      ci:'2026-02-20',co:'2026-02-23',canal:'booking', bruto:165,  com:-24.75,neto:132.45},
  {id:'b-hb6-06',room:'HB 6',guest:'Sandra Hernández',    ci:'2026-03-06',co:'2026-03-09',canal:'booking', bruto:150,  com:-22.50,neto:120.42},
  {id:'b-hb6-07',room:'HB 6',guest:'Winslow Land',        ci:'2026-03-13',co:'2026-03-15',canal:'booking', bruto:100,  com:-15.00,neto:80.28},
  // HB8 (Venecia) — Booking
  {id:'b-hb8-01',room:'HB 8',guest:'Sandra Torrico',      ci:'2026-01-02',co:'2026-01-04',canal:'booking', bruto:110,  com:-16.50,neto:88.30},
  {id:'b-hb8-02',room:'HB 8',guest:'Alba Rebaque',        ci:'2026-01-16',co:'2026-01-18',canal:'booking', bruto:96,   com:-14.40,neto:77.06},
  {id:'b-hb8-03',room:'HB 8',guest:'Leyre Segura',        ci:'2026-02-13',co:'2026-02-15',canal:'booking', bruto:110,  com:-16.50,neto:88.30},
  {id:'b-hb8-04',room:'HB 8',guest:'Rosario Acosta',      ci:'2026-02-21',co:'2026-02-22',canal:'booking', bruto:32.73,com:-4.91, neto:26.27},
  {id:'b-hb8-05',room:'HB 8',guest:'Carneiro Renata',     ci:'2026-02-18',co:'2026-02-22',canal:'booking', bruto:220,  com:-33.00,neto:176.61},
  {id:'b-hb8-06',room:'HB 8',guest:'Eva Martín',          ci:'2026-03-13',co:'2026-03-15',canal:'booking', bruto:90,   com:-13.50,neto:72.25},
  {id:'b-hb8-07',room:'HB 8',guest:'Midori Kouno',        ci:'2026-03-21',co:'2026-03-23',canal:'booking', bruto:100,  com:-15.00,neto:80.28},
  // HB9 (Murano) — Airbnb
  {id:'a-hb9-01',room:'HB 9',guest:'Maria Jose Rodriguez',ci:'2026-02-08',co:'2026-02-28',canal:'airbnb',  bruto:416.25,com:-15.11,neto:401.14},
  {id:'a-hb9-02',room:'HB 9',guest:'Mathilde',            ci:'2026-02-28',co:'2026-04-01',canal:'airbnb',  bruto:162,  com:-5.44, neto:156.56},
  // HB9 (Murano) — Booking
  {id:'b-hb9-01',room:'HB 9',guest:'(sin nombre)',        ci:'2026-01-02',co:'2026-01-05',canal:'booking', bruto:147,  com:-22.05,neto:118.01},
  {id:'b-hb9-02',room:'HB 9',guest:'Juan Blazquez',       ci:'2026-01-16',co:'2026-01-18',canal:'booking', bruto:96,   com:-14.40,neto:77.06},
  {id:'b-hb9-03',room:'HB 9',guest:'Jorge Jiménez',       ci:'2026-02-27',co:'2026-03-01',canal:'booking', bruto:110,  com:-16.50,neto:88.30},
  {id:'b-hb9-04',room:'HB 9',guest:'Javier Hernández',    ci:'2026-03-06',co:'2026-03-08',canal:'booking', bruto:99,   com:-14.85,neto:79.47},
  {id:'b-hb9-05',room:'HB 9',guest:'Alejandra Catala',    ci:'2026-03-19',co:'2026-03-21',canal:'booking', bruto:90,   com:-13.50,neto:72.25},
  // ── Q2 2026 (Abr–Jun) — Airbnb ──
  // Fuente: "Informe de ingresos" Airbnb T2 2026 (PDF resumen). El informe solo da
  // totales por mes (no reserva a reserva), así que se cargan 3 entradas-resumen.
  // Verificado: bruto 1585 · comisión -220,91 · neto 1364,09 (abr 730/661,89 · may 805/654,02 · jun 50/48,18) ✓
  {id:'a-t2-abr',room:'Airbnb T2',guest:'Resumen Airbnb · abril', ci:'2026-04-01',co:'2026-04-30',canal:'airbnb',bruto:730,com:-68.11, neto:661.89,resumen:true},
  {id:'a-t2-may',room:'Airbnb T2',guest:'Resumen Airbnb · mayo',  ci:'2026-05-01',co:'2026-05-31',canal:'airbnb',bruto:805,com:-150.98,neto:654.02,resumen:true},
  {id:'a-t2-jun',room:'Airbnb T2',guest:'Resumen Airbnb · junio', ci:'2026-06-01',co:'2026-06-30',canal:'airbnb',bruto:50, com:-1.82,  neto:48.18, resumen:true},
];

let RESERVAS_EXTRA = sj('ing_extra',[]);
let RESERVAS = [...RESERVAS_BASE, ...RESERVAS_EXTRA];

let RESERVAS_PMS = [];
let pmsLastSync = null;
const PMS_URL = 'https://web-production-10bda.up.railway.app';

// GASTOS FIJOS — 12 meses
// Comunidad sólo en GF (eliminada de GV), luz en GF, Club Innova, Claude en GF
const GASTOS_FIJOS_DEFAULT=[
  {id:'gf01',n:'Autónomos',              cat:'fiscal',      sys:true, m:{1:301.63,2:301.63,3:301.63,4:301.63,5:301.63,6:301.63,7:301.63,8:301.63,9:301.63,10:301.63,11:301.63,12:301.63}},
  {id:'gf02',n:'Hipoteca',               cat:'financiero',  sys:true, m:{1:376.58,2:376.58,3:376.58,4:376.58,5:376.58,6:376.58,7:376.58,8:376.58,9:376.58,10:376.58,11:376.58,12:376.58}},
  {id:'gf03',n:'Comunidad',              cat:'inmueble',    sys:true, m:{1:17.98,2:17.98,3:17.98,4:17.98,5:17.98,6:17.98,7:17.98,8:17.98,9:17.98,10:17.98,11:17.98,12:17.98}},
  {id:'gf04',n:'Seguro',                 cat:'inmueble',    sys:true, m:{1:0,2:443.63,3:0,4:0,5:0,6:0,7:0,8:0,9:0,10:0,11:0,12:0}},
  {id:'gf05',n:'IBI Anual',              cat:'fiscal',      sys:true, m:{1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0,9:620.76,10:0,11:0,12:0}},
  // Luz: importes REALES de las facturas Reazziona, por MES DE PAGO (criterio de caja de
  // Glenda, 14-jul-2026: el gasto cuenta cuando se paga — igual que archiva la gestora).
  // Reazziona emite ~5 días después de cerrar el mes de consumo:
  //   feb 553.82  consumo ene
  //   mar 483.88  consumo feb
  //   abr 348.81  consumo mar  BAR-SCV-2026/003698 (emitida 07/04)
  //   may 164.26  consumo abr  BAR-SCV-2026/006205 (emitida 05/05)
  //   jun 176.90  consumo may  BAR-SCV-2026/010534 (emitida 05/06)
  //   jul 126.74  consumo jun  BAR-SCV-2026/014899 (emitida 03/07 → T3)
  // ENE a 0: la factura del consumo de dic-2025 (pagada en enero) está pendiente de
  // descargar de Reazziona. Ago en adelante SIN valor: cada mes con su factura real
  // (foto del ticket + pill "Fijo recurrente"). NUNCA estimar.
  {id:'gf06',n:'Luz (Octopus/Reazziona)',cat:'suministros', sys:true, m:{1:0,2:553.82,3:483.88,4:348.81,5:164.26,6:176.90,7:126.74,8:0,9:0,10:0,11:0,12:0}},
  {id:'gf07',n:'WiFi (Simyo/Digi)',      cat:'suministros', sys:true, m:{1:27.99,2:27.99,3:12,4:12,5:12,6:12,7:12,8:12,9:12,10:12,11:12,12:12}},
  {id:'gf08',n:'IMOU (cámaras)',         cat:'tecnologia',  sys:true, m:{1:3.49,2:3.49,3:3.49,4:3.49,5:3.49,6:3.49,7:3.49,8:3.49,9:3.49,10:3.49,11:3.49,12:3.49}},
  {id:'gf09',n:'ProtonVPN',              cat:'tecnologia',  sys:true, m:{1:9.99,2:9.99,3:9.99,4:9.99,5:9.99,6:9.99,7:9.99,8:9.99,9:9.99,10:9.99,11:9.99,12:9.99}},
  {id:'gf10',n:'ChatGPT',                cat:'tecnologia',  sys:true, m:{1:20,2:20,3:20,4:20,5:20,6:20,7:20,8:20,9:20,10:20,11:20,12:20}},
  {id:'gf11',n:'ONE&ONE (hosting)',      cat:'tecnologia',  sys:true, m:{1:1.21,2:1.21,3:1.21,4:1.21,5:1.21,6:1.21,7:1.21,8:1.21,9:1.21,10:1.21,11:1.21,12:1.21}},
  // Club Innova IA (Learn2Lead LLC): ene factura nº710 (03/01), feb pago recurrente confirmado
  // por la titular (factura pendiente de localizar), mar recibo nº768 (04/03). Baja del
  // servicio desde abril → resto del año a 0; la fila se retira en 2027.
  {id:'gf12',n:'Club Innova IA',         cat:'tecnologia',  sys:true, m:{1:20,2:20,3:20,4:0,5:0,6:0,7:0,8:0,9:0,10:0,11:0,12:0}},
  {id:'gf13',n:'Claude Pro (anual/12)',  cat:'tecnologia',  sys:true, m:{1:15,2:15,3:15,4:15,5:15,6:15,7:15,8:15,9:15,10:15,11:15,12:15}},
];
// Merge system defaults with user-added/edited fijos from localStorage
function loadGastosFijos(){
  const saved=sj('gf6',null);
  if(!saved) return GASTOS_FIJOS_DEFAULT.slice();
  // Keep system ones, merge with user-deleted flags and user-added entries
  const deletedIds=new Set(sj('gf_deleted',[]));
  const userAdded=saved.filter(g=>!g.sys);
  const systemFiltered=GASTOS_FIJOS_DEFAULT.filter(g=>!deletedIds.has(g.id));
  // Merge user edits to system entries
  return [...systemFiltered.map(g=>{
    const edit=saved.find(s=>s.id===g.id);
    return edit?{...g,...edit}:g;
  }), ...userAdded];
}
let GASTOS_FIJOS=loadGastosFijos();
function saveGastosFijos(){localStorage.setItem('gf6',JSON.stringify(GASTOS_FIJOS));}

// GASTOS VARIABLES — fuente: gastos_1t.xlsx
// Eliminados: persianas, reembolso IONOS, batidora Carrefour 36€, cuota comunidad (está en fijos), luz (en fijos)
let GASTOS_VAR = sj('gv5',null) || [
  {id:'gv01',n:'Compras bazar',               cat:'suministros',   fecha:'2026-02-13',importe:7.94,  metodo:'metalico',tipo:'v'},
  {id:'gv02',n:'Lavadora + transporte Milar', cat:'mantenimiento', fecha:'2026-01-30',importe:304,   metodo:'tarjeta', tipo:'v'},
  {id:'gv03',n:'Compras Lidl',                cat:'suministros',   fecha:'2026-02-17',importe:47.43, metodo:'tarjeta', tipo:'v'},
  {id:'gv04',n:'Gasóleo A',                   cat:'suministros',   fecha:'2026-01-12',importe:33.72, metodo:'tarjeta', tipo:'v'},
  {id:'gv05',n:'Batidora Carrefour (Feb)',     cat:'suministros',   fecha:'2026-02-25',importe:27.99, metodo:'tarjeta', tipo:'v'},
  {id:'gv06',n:'Pintura Titan',               cat:'mantenimiento', fecha:'2026-03-30',importe:53.20, metodo:'tarjeta', tipo:'v'},
  {id:'gv07',n:'Bazar China',                 cat:'suministros',   fecha:'2026-01-29',importe:5.25,  metodo:'metalico',tipo:'v'},
  {id:'gv08',n:'Candado Miniso',              cat:'suministros',   fecha:'2026-01-08',importe:2.99,  metodo:'metalico',tipo:'v'},
  {id:'gv09',n:'Alcachofa ducha',             cat:'mantenimiento', fecha:'2026-02-06',importe:3.50,  metodo:'metalico',tipo:'v'},
  {id:'gv10',n:'Claude créditos API',         cat:'tecnologia',    fecha:'2026-03-27',importe:6.05,  metodo:'tarjeta', tipo:'v'},
];

