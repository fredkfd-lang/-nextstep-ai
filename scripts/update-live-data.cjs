const fs = require('fs');

const API = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs';
const API_FALLBACK = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/app/jobs';
const DETAIL = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobdetails/';
const KEY = 'jobboerse-jobsuche';

function cleanUrl(value){
  try {
    const u = new URL(String(value || ''));
    return /^https?:$/.test(u.protocol) ? u.href : '';
  } catch { return ''; }
}
function encodeRef(ref){
  return Buffer.from(String(ref || ''), 'utf8').toString('base64');
}
async function fetchJson(url){
  const res = await fetch(url,{headers:{
    'X-API-Key':KEY,
    'Accept':'application/json',
    'User-Agent':'BerOpp-live-data/1.0'
  }});
  const text=await res.text();
  if(!res.ok) throw new Error(`BA ${res.status} for ${url}: ${text.slice(0,300)}`);
  try{return JSON.parse(text);}catch{throw new Error(`BA returned non-JSON for ${url}: ${text.slice(0,300)}`);}
}
async function searchPage(kind,page){
  const angebot=kind==='ausbildung'?'4':'1';
  const params=new URLSearchParams({
    angebotsart:angebot,
    page:String(page),
    size:'100',
    veroeffentlichtseit:'100',
    zeitarbeit:'true'
  });
  let lastErr=null;
  for(const base of [API,API_FALLBACK]){
    try{
      const d=await fetchJson(base+'?'+params.toString());
      const rows=Array.isArray(d.stellenangebote)?d.stellenangebote:[];
      if(rows.length)return rows;
      lastErr=new Error(`BA returned 0 records from ${base}`);
    }catch(e){lastErr=e;}
  }
  if(lastErr) throw lastErr;
  return [];
}
async function load(kind){
  const all=[],seen=new Set();
  for(let page=1;page<=10;page++){
    const rows=await searchPage(kind,page);
    for(const o of rows){
      const ref=String(o.referenznummer||o.refnr||'');
      const key=ref||[o.beruf,o.stellenangebotsTitel,o.arbeitgeber,typeof o.arbeitsort==='object'?o.arbeitsort?.ort:o.arbeitsort].join('|');
      if(seen.has(key))continue;
      seen.add(key);
      all.push({
        id:`live-${kind}-${ref||all.length}`,refnr:ref,
        title:o.beruf||o.stellenangebotsTitel||o.titel||(kind==='ausbildung'?'Ausbildung':'Stellenangebot'),
        company:o.arbeitgeber||o.arbeitgeberName||'Arbeitgeber nicht angegeben',
        place:typeof o.arbeitsort==='object'?(o.arbeitsort.ort||o.arbeitsort.region||'Deutschland'):(o.arbeitsort||o.ort||'Deutschland'),
        start:o.eintrittsdatum||o.beginn||'',date:o.aktuelleVeroeffentlichungsdatum||o.veroeffentlichungsdatum||'',
        description:o.stellenangebotsBeschreibung||o.beschreibung||'',
        url:cleanUrl(o.externeUrl||o.externeURL||o.bewerbungUrl||o.bewerbungURL||''),
        type:kind,source:'Bundesagentur für Arbeit'
      });
    }
    if(rows.length<100)break;
  }
  for(let i=0;i<Math.min(80,all.length);i+=10){
    await Promise.all(all.slice(i,i+10).map(async item=>{
      if(!item.refnr||item.url)return;
      try{
        const d=await fetchJson(DETAIL+encodeURIComponent(encodeRef(item.refnr)));
        item.url=cleanUrl(d.externeUrl||d.externeURL||d.bewerbungUrl||d.bewerbungURL||d.applicationUrl||d.applicationURL||'');
      }catch{}
    }));
  }
  return {updatedAt:new Date().toISOString(),source:'Bundesagentur für Arbeit',type:kind,count:all.length,items:all};
}
(async()=>{
  fs.mkdirSync('data',{recursive:true});
  const [ausbildung,jobs]=await Promise.all([load('ausbildung'),load('job')]);
  if(ausbildung.count<6||jobs.count<6)throw new Error(`BA returned too few live records: Ausbildung=${ausbildung.count}, Jobs=${jobs.count}`);
  fs.writeFileSync('data/live-ausbildung.json',JSON.stringify(ausbildung,null,2)+'\n');
  fs.writeFileSync('data/live-jobs.json',JSON.stringify(jobs,null,2)+'\n');
  console.log(`Ausbildung: ${ausbildung.count}; Jobs: ${jobs.count}`);
})().catch(e=>{console.error(e);process.exit(1)});
