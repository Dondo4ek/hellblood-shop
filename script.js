
async function loadProducts(){
  const res = await fetch('products.json');
  const items = await res.json();
  const grid = document.querySelector('#grid');
  grid.innerHTML = '';
  for(const p of items){
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    card.setAttribute('role','button');
    card.setAttribute('aria-label', p.title);
    const img = document.createElement('img'); img.src = p.image; img.alt = p.title;
    const content = document.createElement('div'); content.className = 'content';
    const h = document.createElement('h3'); h.textContent = p.title;
    const row = document.createElement('div'); row.className = 'row';
    const price = document.createElement('div'); price.className='price'; price.textContent = `${p.price} ${p.currency}`;
    const btn = document.createElement('a'); btn.className='btn'; btn.textContent='Купить'; btn.href=p.paymentLink || '#'; btn.target='_blank';
    row.appendChild(price); row.appendChild(btn);
    content.appendChild(h); content.appendChild(row);
    card.appendChild(img); card.appendChild(content);
    card.addEventListener('click', ()=>openModal(p));
    card.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); openModal(p); }});
    grid.appendChild(card);
  }
}
document.addEventListener('DOMContentLoaded', loadProducts);

// Modal logic
const modal = document.getElementById('productModal');
const modalTitle = document.getElementById('modalTitle');
const modalImage = document.getElementById('modalImage');
const modalLong = document.getElementById('modalLong');
const modalItems = document.getElementById('modalItems');
const modalPrice = document.getElementById('modalPrice');
const modalBuy = document.getElementById('modalBuy');
const modalClose = document.querySelector('.close');
const steamInput = document.getElementById('steamInput');
const testMode = document.getElementById('testMode');
let currentProduct = null;

function openModal(p){
  currentProduct = p;
  modalTitle.textContent = p.title;
  modalImage.src = p.image;
  modalImage.alt = p.title;
  modalLong.textContent = p.longDescription || p.description || '';
  modalItems.innerHTML = '';
  if(Array.isArray(p.items) && p.items.length){
    for(const it of p.items){
      const li = document.createElement('li');
      const name = document.createElement('span'); name.textContent = it.name || '';
      const qty = document.createElement('span'); qty.textContent = (it.qty !== undefined ? `×${it.qty}` : ''); qty.className='qty';
      li.appendChild(name); li.appendChild(qty);
      modalItems.appendChild(li);
    }
    document.getElementById('itemsWrap').style.display = '';
  } else {
    document.getElementById('itemsWrap').style.display = 'none';
  }
  modalPrice.textContent = `${p.price} ${p.currency}`;
  modalBuy.href = p.paymentLink || '#';
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
  steamInput.focus();
}

function closeModal(){
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
  currentProduct = null;
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e)=>{ if(e.target === modal){ closeModal(); }});
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape'){ closeModal(); }});

// Build link with {steamid} and optional tm=1
modalBuy.addEventListener('click', (e)=>{
  if(!currentProduct) return;
  const base = currentProduct.paymentLink || '#';
  let sid = (steamInput.value || '').trim();
  if(base.includes('{steamid}')){
    if(!sid){
      e.preventDefault();
      alert('Введи SteamID (или ник), чтобы продолжить.');
      steamInput.focus();
      return;
    }
  }
  let url = base.replace('{steamid}', encodeURIComponent(sid || 'unknown'));
  if(testMode.checked){
    const sep = url.includes('?') ? '&' : '?';
    url = url + sep + 'tm=1';
  }
  modalBuy.href = url;
});
