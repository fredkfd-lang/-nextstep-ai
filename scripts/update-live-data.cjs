const fs = require('fs');

const WORKER = String(process.env.BEROPP_AI_WORKER_URL || '').replace(/\/$/, '');
const SEARCH_PATH = '/ausbildung';
const DETAIL_PATH = '/jobdetails';

function cleanUrl(value){
  try {
    const u = new URL(String(value || ''));
    return /^https?:$/.test(u.protocol) ? u.href : '';
  } catch { return ''; }
}
function encodeRef(ref){
  return Buffer.from(String(ref || ''), 'utf8').toString('base64');
}
async function fetchJson(path, params){
  if(!WORKER) throw new Error('BEROPP_AI_WORKER_URL is not configured.');
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const url = WORKER + path + qs;
  const res = await fetch(url, {headers:{Accept:'application/json','User-Agent':'BerOpp-live-data/2.0'}});
  const text = await res.text();
  if(!res.ok) throw new Error('Worker '+res.status+' for '+url+': '+text.slice(0,300));
  try { return JSON.parse(text); }
  catch { throw new Error('Worker returned non-JSON for '+url+': '+text.slice(0,300)); }
}
async function searchPage(kind,page){
  const params={
    angebotsart:kind==='ausbildung'?'4':'1',
    page:String(page), size:'100',
    veroeffentlichtseit:'100', zeitarbeit:'true'
  };
  const d=await fetchJson(SEARCH_PATH,params);
  return Array.isArray(d.stellenangebote)?d.stellenangebote:[];
}
async function load(kind){
  const all=[],seen=new Set();
  for(let page=1;page<=10;page++){
    const rows=await searchPage(kind,page);
    for(const o of rows){
      const ref=String(o.referenznummer||o.refnr||'');
      const key=ref||[o.beruf,o.stellenangebotsTitel,o.arbeitgeber,
        typeof o.arbeitsort==='object'?o.arbeitsort?.ort:o.arbeitsort].join('|');
      if(seen.has(key)) continue;
      seen.add(key);
      all.push({
        id:'live-'+kind+'-'+(ref||all.length), refnr:ref,
        title:o.beruf||o.stellenangebotsTitel||o.titel||(kind==='ausbildung'?'Ausbildung':'Stellenangebot'),
        company:o.arbeitgeber||o.arbeitgeberName||'Arbeitgeber nicht angegeben',
        place:typeof o.arbeitsort==='object'?(o.arbeitsort.ort||o.arbeitsort.region||'Deutschland'):(o.arbeitsort||o.ort||'Deutschland'),
        start:o.eintrittsdatum||o.beginn||'',
        date:o.aktuelleVeroeffentlichungsdatum||o.veroeffentlichungsdatum||'',
        description:o.stellenangebotsBeschreibung||o.beschreibung||'',
        url:cleanUrl(o.externeUrl||o.externeURL||o.bewerbungUrl||o.bewerbungURL||''),
        type:kind, source:'Bundesagentur für Arbeit'
      });
    }
    if(rows.length<100) break;
  }
  for(let i=0;i<Math.min(80,all.length);i+=10){
    await Promise.all(all.slice(i,i+10).map(async item=>{
      if(!item.refnr||item.url)return;
      try{
        const d=await fetchJson(DETAIL_PATH,{refnr:encodeRef(item.refnr)});
        item.url=cleanUrl(d.externeUrl||d.externeURL||d.bewerbungUrl||d.bewerbungURL||d.applicationUrl||d.applicationURL||'');
      }catch{}
    }));
  }
  return {updatedAt:new Date().toISOString(),source:'Bundesagentur für Arbeit',type:kind,count:all.length,items:all};
}
(async()=>{
  fs.mkdirSync('data',{recursive:true});
  if(!WORKER){
    console.log('BEROPP_AI_WORKER_URL is not configured; existing live-data files are preserved.');
    process.exit(0);
  }
  try{
    const [ausbildung,jobs]=await Promise.all([load('ausbildung'),load('job')]);
    if(ausbildung.count<6||jobs.count<6) throw new Error('Worker returned too few live records: Ausbildung='+ausbildung.count+', Jobs='+jobs.count);
    fs.writeFileSync('data/live-ausbildung.json',JSON.stringify(ausbildung,null,2)+'\n');
    fs.writeFileSync('data/live-jobs.json',JSON.stringify(jobs,null,2)+'\n');
    console.log('Ausbildung: '+ausbildung.count+'; Jobs: '+jobs.count);
  }catch(error){
    console.error(error);
    console.log('Live refresh failed; existing data files are preserved.');
    process.exit(0);
  }
})();
