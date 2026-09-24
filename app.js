const $ = (id) => document.getElementById(id);
const fields = ['amazonUrl','title','brand','category','cost','price','condition','fulfillment','notes'];
const els = Object.fromEntries(fields.map(id => [id, $(id)]));
const resultCard = $('resultCard'), profitCard = $('profitCard'), drafts = $('drafts');
let activePlatform = 'facebook';

function money(n){ return Number.isFinite(n) ? `$${n.toFixed(2)}` : '—'; }
function clean(s){ return (s || '').trim(); }
function firstNonEmpty(...xs){ return xs.map(clean).find(Boolean) || ''; }

function extractAsin(url){
  if(!url) return '';
  const patterns = [/\/dp\/([A-Z0-9]{10})/i,/\/gp\/product\/([A-Z0-9]{10})/i,/\/product\/([A-Z0-9]{10})/i,/[?&]asin=([A-Z0-9]{10})/i];
  for(const p of patterns){ const m=url.match(p); if(m) return m[1].toUpperCase(); }
  return '';
}

function updateAmazonHint(){
  const url = clean(els.amazonUrl.value);
  const asin = extractAsin(url);
  $('asinHint').textContent = asin ? `Detected ASIN: ${asin}` : (url ? 'Amazon link saved. ASIN was not detected from this URL format.' : 'Paste a link and the app will detect the ASIN when possible.');
}

function buildFacebook(t, p, condition, fulfillment, notes, brand, category, url){
  const desc = [];
  desc.push(`${t}`);
  desc.push('');
  if(brand) desc.push(`Brand: ${brand}`);
  if(category) desc.push(`Category: ${category}`);
  desc.push(`Condition: ${condition}`);
  if(Number.isFinite(p)) desc.push(`Price: ${money(p)}`);
  if(notes){ desc.push(''); desc.push(notes); }
  desc.push('');
  desc.push(fulfillment || 'Pickup or shipping available.');
  desc.push('Message me if interested.');
  if(url){ desc.push(''); desc.push(`Amazon reference: ${url}`); }
  return desc.join('\n');
}

function buildMercari(t, p, condition, notes, brand, category, url){
  const desc = [];
  desc.push(`${condition} ${t}.`);
  if(notes) desc.push(notes);
  if(brand || category) desc.push([brand && `Brand: ${brand}`, category && `Category: ${category}`].filter(Boolean).join(' • '));
  if(Number.isFinite(p)) desc.push(`Listed price: ${money(p)}.`);
  desc.push('Please review photos/details before purchasing. Ships promptly after purchase.');
  if(url) desc.push(`Amazon reference: ${url}`);
  return desc.join('\n\n');
}

function renderMetrics(c,p){
  const profit = Number.isFinite(c) && Number.isFinite(p) ? p-c : NaN;
  const margin = Number.isFinite(profit) && p > 0 ? (profit/p)*100 : NaN;
  $('mCost').textContent = money(c);
  $('mPrice').textContent = money(p);
  $('mProfit').textContent = money(profit);
  $('mMargin').textContent = Number.isFinite(margin) ? `${margin.toFixed(1)}%` : '—';
  profitCard.hidden = !(Number.isFinite(c) || Number.isFinite(p));
}

function generate(){
  const t = clean(els.title.value) || 'Item for sale';
  const brand = clean(els.brand.value);
  const category = clean(els.category.value);
  const notes = clean(els.notes.value);
  const fulfillment = clean(els.fulfillment.value);
  const url = clean(els.amazonUrl.value);
  const c = parseFloat(els.cost.value);
  const p = parseFloat(els.price.value);
  const condition = els.condition.value;

  $('facebookTitle').value = Number.isFinite(p) ? `${t} - ${money(p)}` : t;
  $('facebookText').value = buildFacebook(t,p,condition,fulfillment,notes,brand,category,url);

  const mt = firstNonEmpty(`${brand ? brand + ' ' : ''}${t}`, t).slice(0,80);
  $('mercariTitle').value = mt;
  $('mercariTitleCount').textContent = mt.length;
  $('mercariText').value = buildMercari(t,p,condition,notes,brand,category,url);

  renderMetrics(c,p);
  resultCard.hidden = false;
  setTab('facebook');
  resultCard.scrollIntoView({behavior:'smooth', block:'start'});
}

function setTab(platform){
  activePlatform = platform;
  const fb = platform === 'facebook';
  $('facebookPanel').hidden = !fb;
  $('mercariPanel').hidden = fb;
  $('tabFacebook').classList.toggle('active', fb);
  $('tabMercari').classList.toggle('active', !fb);
}

function currentText(){
  return activePlatform === 'facebook'
    ? `${$('facebookTitle').value}\n\n${$('facebookText').value}`
    : `${$('mercariTitle').value}\n\n${$('mercariText').value}`;
}

async function copyText(text, btn){
  try{ await navigator.clipboard.writeText(text); }
  catch{ const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  const old=btn.textContent; btn.textContent='Copied'; setTimeout(()=>btn.textContent=old,1100);
}

function getDrafts(){ try{return JSON.parse(localStorage.getItem('resellerDraftsV2')||'[]');}catch{return [];} }
function setDrafts(list){ localStorage.setItem('resellerDraftsV2', JSON.stringify(list)); renderDrafts(); }

function saveCurrent(){
  if(resultCard.hidden) generate();
  const item = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    input: Object.fromEntries(fields.map(k=>[k,els[k].value])),
    facebookTitle: $('facebookTitle').value,
    facebookText: $('facebookText').value,
    mercariTitle: $('mercariTitle').value,
    mercariText: $('mercariText').value
  };
  const list=getDrafts(); list.unshift(item); setDrafts(list.slice(0,30));
  $('save').textContent='Saved'; setTimeout(()=>$('save').textContent='Save item',1000);
}

function loadDraft(d){
  for(const k of fields) els[k].value = d.input?.[k] ?? '';
  $('facebookTitle').value = d.facebookTitle || '';
  $('facebookText').value = d.facebookText || '';
  $('mercariTitle').value = d.mercariTitle || '';
  $('mercariText').value = d.mercariText || '';
  $('mercariTitleCount').textContent = $('mercariTitle').value.length;
  renderMetrics(parseFloat(els.cost.value),parseFloat(els.price.value));
  updateAmazonHint();
  resultCard.hidden=false; setTab('facebook');
  window.scrollTo({top:0,behavior:'smooth'});
}

function renderDrafts(){
  const list=getDrafts();
  if(!list.length){ drafts.innerHTML='<p class="muted">No saved items yet.</p>'; return; }
  drafts.innerHTML='';
  list.forEach((d,i)=>{
    const wrap=document.createElement('div'); wrap.className='draft';
    const meta=document.createElement('div'); meta.className='draft-meta';
    const strong=document.createElement('strong'); strong.textContent=d.input?.title || d.facebookTitle || 'Saved item';
    const small=document.createElement('small'); small.textContent = d.input?.price ? `Target ${money(parseFloat(d.input.price))}` : 'Saved listing';
    meta.append(strong,small);
    const btns=document.createElement('div'); btns.className='draft-buttons';
    const open=document.createElement('button'); open.className='secondary'; open.textContent='Open'; open.onclick=()=>loadDraft(d);
    const del=document.createElement('button'); del.className='secondary danger'; del.textContent='Delete'; del.onclick=()=>{const x=getDrafts();x.splice(i,1);setDrafts(x);};
    btns.append(open,del); wrap.append(meta,btns); drafts.appendChild(wrap);
  });
}

els.amazonUrl.addEventListener('input',updateAmazonHint);
$('openAmazon').onclick=()=>{ const u=clean(els.amazonUrl.value); if(u) window.open(u,'_blank','noopener'); else els.amazonUrl.focus(); };
$('generate').onclick=generate;
$('tabFacebook').onclick=()=>setTab('facebook');
$('tabMercari').onclick=()=>setTab('mercari');
$('copyFacebook').onclick=()=>copyText(`${$('facebookTitle').value}\n\n${$('facebookText').value}`,$('copyFacebook'));
$('copyMercari').onclick=()=>copyText(`${$('mercariTitle').value}\n\n${$('mercariText').value}`,$('copyMercari'));
$('mercariTitle').addEventListener('input',()=>{$('mercariTitleCount').textContent=$('mercariTitle').value.length;});
$('shareCurrent').onclick=async()=>{ const text=currentText(); if(navigator.share){ try{await navigator.share({title:'Reseller listing',text});}catch{} } else copyText(text,$('shareCurrent')); };
$('save').onclick=saveCurrent;
$('clear').onclick=()=>{ if(confirm('Delete all saved items?')) setDrafts([]); };

renderDrafts();
updateAmazonHint();
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
