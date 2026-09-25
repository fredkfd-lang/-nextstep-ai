import fs from 'node:fs';

const API = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs';
const DETAIL = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobdetails/';
const KEY = 'jobboerse-jobsuche';

function cleanUrl(value){
  try { const u = new URL(String(value || '')); return /^https?:$/.test(u.protocol) ? u.href : ''; }
  catch { return ''; }
}
async function fetchJson(url){
  const res = await fetch(url, {headers:{'X-API-Key':KEY,Accept:'application/json'}});
  if(!res.ok) throw new Error(`BA ${res.status}`);
  return res.json();
}
async function load(kind){
  const all=[],seen=new Set(),angebot=kind==='ausbildung'?'4':'1';
  for(let page=1;page<=5;page++){
    const p=new URLSearchParams({angebotsart:angebot,page:String(page),size:'100',pav:'false',veroeffentlichtseit:'60',zeitarbeit:'true',was:kind==='ausbildung'?'Ausbildung':'Job'});
    const d=await fetchJson(API+'?'+p);
    const rows=Array.isArray(d.stellenangebote)?d.stellenangebote:[];
    for(const o of rows){
      const ref=String(o.refnr||o.referenznummer||'');
      const key=ref||[o.beruf,o.arbeitgeber,o.arbeitsort?.ort].join('|');
      if(seen.has(key)) continue; seen.add(key);
      all.push({
        id:`live-${kind}-${ref||all.length}`,refnr:ref,
        title:o.beruf||o.stellenangebotsTitel||o.titel||(kind==='ausbildung'?'Ausbildung':'Stellenangebot'),
        company:o.arbeitgeber||o.arbeitgeberName||'Arbeitgeber nicht angegeben',
        place:typeof o.arbeitsort==='object'?(o.arbeitsort.ort||o.arbeitsort.region||'Deutschland'):(o.arbeitsort||o.ort||'Deutschland'),
        start:o.eintrittsdatum||o.beginn||'',date:o.aktuelleVeroeffentlichungsdatum||'',
        description:o.stellenangebotsBeschreibung||o.beschreibung||'',
        url:cleanUrl(o.externeUrl||o.externeURL||o.bewerbungUrl||o.bewerbungURL||''),
        type:kind,source:'Bundesagentur für Arbeit'
      });
    }
    if(rows.length<100) break;
  }
  for(let i=0;i<Math.min(60,all.length);i+=10){
    await Promise.all(all.slice(i,i+10).map(async item=>{
      if(!item.refnr||item.url)return;
      try{
        const d=await fetchJson(DETAIL+encodeURIComponent(item.refnr));
        item.url=cleanUrl(d.externeUrl||d.externeURL||d.bewerbungUrl||d.bewerbungURL||d.applicationUrl||d.applicationURL||'');
      }catch{}
    }));
  }
  return {updatedAt:new Date().toISOString(),source:'Bundesagentur für Arbeit',type:kind,count:all.length,items:all};
}
(async()=>{
  fs.mkdirSync('data',{recursive:true});
  const [ausbildung,jobs]=await Promise.all([load('ausbildung'),load('job')]);
  fs.writeFileSync('data/live-ausbildung.json',JSON.stringify(ausbildung,null,2)+'\n');
  fs.writeFileSync('data/live-jobs.json',JSON.stringify(jobs,null,2)+'\n');
  console.log(`Ausbildung: ${ausbildung.count}; Jobs: ${jobs.count}`);
})().catch(e=>{console.error(e);process.exit(1)});
