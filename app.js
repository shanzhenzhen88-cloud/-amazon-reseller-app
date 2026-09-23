const $ = (id) => document.getElementById(id);
const title = $('title'), cost = $('cost'), price = $('price'), condition = $('condition'), notes = $('notes');
const resultCard = $('resultCard'), result = $('result'), stats = $('stats'), drafts = $('drafts');

function money(n){return Number.isFinite(n) ? `$${n.toFixed(2)}` : '—'}
function buildDraft(){
  const t = title.value.trim() || 'Item for sale';
  const p = parseFloat(price.value);
  const c = parseFloat(cost.value);
  const extra = notes.value.trim();
  const lines = [t, '', `Condition: ${condition.value}`, Number.isFinite(p) ? `Price: ${money(p)}` : '', extra, '', 'Pickup or shipping available. Message me if interested.'].filter(Boolean);
  result.value = lines.join('\n');
  const profit = Number.isFinite(p) && Number.isFinite(c) ? p-c : NaN;
  const margin = Number.isFinite(profit) && p>0 ? (profit/p)*100 : NaN;
  stats.textContent = `Cost: ${money(c)}   •   Price: ${money(p)}   •   Est. gross profit: ${money(profit)}${Number.isFinite(margin) ? `   •   Margin: ${margin.toFixed(1)}%` : ''}`;
  resultCard.hidden = false;
  resultCard.scrollIntoView({behavior:'smooth', block:'start'});
}

function getDrafts(){try{return JSON.parse(localStorage.getItem('resellerDrafts')||'[]')}catch{return []}}
function setDrafts(list){localStorage.setItem('resellerDrafts', JSON.stringify(list)); renderDrafts()}
function renderDrafts(){
  const list=getDrafts();
  if(!list.length){drafts.innerHTML='<p class="muted">No saved drafts yet.</p>'; return}
  drafts.innerHTML='';
  list.forEach((d,i)=>{
    const wrap=document.createElement('div'); wrap.className='draft';
    const strong=document.createElement('strong'); strong.textContent=d.title || 'Draft';
    const p=document.createElement('p'); p.textContent=d.text;
    const b=document.createElement('button'); b.className='secondary'; b.textContent='Delete'; b.onclick=()=>{const x=getDrafts();x.splice(i,1);setDrafts(x)};
    wrap.append(strong,p,b); drafts.appendChild(wrap);
  });
}

$('generate').onclick=buildDraft;
$('copy').onclick=async()=>{await navigator.clipboard.writeText(result.value); $('copy').textContent='Copied'; setTimeout(()=>$('copy').textContent='Copy',1200)};
$('share').onclick=async()=>{if(navigator.share){await navigator.share({title:title.value||'Listing',text:result.value})}else{await navigator.clipboard.writeText(result.value);alert('Copied to clipboard')}};
$('save').onclick=()=>{const list=getDrafts();list.unshift({title:title.value.trim(),text:result.value,date:Date.now()});setDrafts(list.slice(0,20))};
$('clear').onclick=()=>{if(confirm('Delete all saved drafts?')) setDrafts([])};
renderDrafts();
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
