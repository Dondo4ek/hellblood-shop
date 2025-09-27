const el = (sel, root=document)=>root.querySelector(sel);
const els = (sel, root=document)=>Array.from(root.querySelectorAll(sel));

const CATEGORY_TITLES = {
  "kits":"КИТЫ",
  "weapons":"ОРУЖИЕ",
  "components":"КОМПОНЕНТЫ",
  "electric":"ЭЛЕКТРИКА",
  "quarries":"КАРЬЕРЫ",
  "uncategorized":"ДРУГОЕ"
};
const BLOCK_ORDER = ["kits","weapons","components","electric","quarries","uncategorized"];

async function loadProducts(){
  const res = await fetch('products.json');
  if(!res.ok) throw new Error('products.json not found in /shop/');
  return await res.json();
}

function normalizeImagePath(path){
  if(!path) return '';
  if(path.startsWith('img/')) return path; // local /shop/img/...
  if(!path.includes('/')) return path;     // local kit-*.png
  return path;
}

function formatPrice(price, currency){
  return `${price} ${currency || ''}`.trim();
}

function makeTab(key, label){
  const btn = document.createElement('button');
  btn.className = 'tab';
  btn.dataset.key = key;
  btn.textContent = label;
  return btn;
}

function cardHTML(p){
  const img = normalizeImagePath(p.image);
  const price = formatPrice(p.price, p.currency);
  const details = (p.description || '').toString();
  const payment = p.paymentLink || '#';
  return `
  <div class="card" data-id="${p.id}" data-title="${p.title.toLowerCase()}">
    <div class="thumb">${img ? `<img src="${img}" alt="${p.title}">` : ''}</div>
    <div class="card-body">
      <div class="card-title">${p.title}</div>
      <div class="card-desc">${details}</div>
      <div class="price">${price}</div>
      <a class="buy" href="${payment}" target="_blank" rel="noopener">КУПИТЬ</a>
    </div>
  </div>`;
}

async function main(){
  const products = await loadProducts();

  const byCat = {};
  for(const p of products){
    const key = (p.category || 'uncategorized').toLowerCase();
    (byCat[key] ||= []).push(p);
  }
  for(const key in byCat){
    byCat[key].sort((a,b)=>a.title.localeCompare(b.title, 'ru', {sensitivity:'base'}));
  }

  const tabsWrap = el('.tabs');
  const allTab = makeTab('all','ВСЁ');
  tabsWrap.append(allTab);
  for(const key of BLOCK_ORDER){
    if(byCat[key]?.length){
      tabsWrap.append(makeTab(key, CATEGORY_TITLES[key] || key.toUpperCase()));
    }
  }

  const search = el('.search');
  const sort = el('.sort');
  sort.innerHTML = '<option value="title">По названию</option><option value="price">По цене</option>';
  const grid = el('.grid');
  const counter = el('.counter');

  function render(activeKey='all'){
    els('.tab', tabsWrap).forEach(t=>t.classList.toggle('active', t.dataset.key===activeKey));

    let items = activeKey==='all' ? products.slice() : (byCat[activeKey] || []).slice();

    const q = (search.value || '').trim().toLowerCase();
    if(q){
      items = items.filter(p => (p.title||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q));
    }

    const mode = sort.value;
    if(mode==='title'){
      items.sort((a,b)=>a.title.localeCompare(b.title, 'ru', {sensitivity:'base'}));
    } else if(mode==='price'){
      items.sort((a,b)=>(a.price??0)-(b.price??0));
    }

    grid.innerHTML = items.map(cardHTML).join('');
    counter.textContent = `Показано: ${items.length}`;
  }

  tabsWrap.addEventListener('click', (e)=>{
    const btn = e.target.closest('.tab'); if(!btn) return;
    render(btn.dataset.key);
  });
  search.addEventListener('input', ()=>{
    const active = el('.tab.active')?.dataset.key || 'all';
    render(active);
  });
  sort.addEventListener('change', ()=>{
    const active = el('.tab.active')?.dataset.key || 'all';
    render(active);
  });

  render('kits');
  const kitsTab = els('.tab', tabsWrap).find(t=>t.dataset.key==='kits');
  if(kitsTab){ kitsTab.classList.add('active'); } else { els('.tab', tabsWrap)[0].classList.add('active'); }
}

main().catch(err=>{
  console.error(err);
  el('.grid').innerHTML = '<div style="padding:20px;color:#f55">Ошибка: products.json не найден в /shop/. Файлы должны быть внутри /shop/.</div>';
});