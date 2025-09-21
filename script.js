
async function loadProducts(){
  const res = await fetch('products.json');
  const items = await res.json();
  const grid = document.querySelector('#grid');
  grid.className = 'grid';
  grid.innerHTML = '';
  for(const p of items){
    const card = document.createElement('div');
    card.className = 'card';
    const img = document.createElement('img'); img.src = p.image; img.alt = p.title;
    const h = document.createElement('h3'); h.textContent = p.title;
    const d = document.createElement('div'); d.textContent = p.description;
    const price = document.createElement('div'); price.className='price'; price.textContent = `${p.price} ${p.currency}`;
    const btn = document.createElement('a'); btn.className='btn'; btn.textContent='Купить'; btn.href=p.paymentLink; btn.target='_blank';
    card.appendChild(img); card.appendChild(h); card.appendChild(d); card.appendChild(price); card.appendChild(btn);
    grid.appendChild(card);
  }
}
document.addEventListener('DOMContentLoaded', loadProducts);


// === Hellblood modal logic ===
(function(){
  const modal = document.getElementById('productModal');
  if(!modal) return; // if this page doesn't include the modal, skip
  const modalTitle = document.getElementById('hbModalTitle');
  const modalImage = document.getElementById('hbModalImage');
  const modalLong = document.getElementById('hbModalLong');
  const modalItems = document.getElementById('hbModalItems');
  const modalPrice = document.getElementById('hbModalPrice');
  const modalBuy = document.getElementById('hbModalBuy');
  const modalClose = document.querySelector('.hb-close');
  const steamInput = document.getElementById('hbSteamInput');
  const testMode = document.getElementById('hbTestMode');

  let currentProduct = null;

  function openModal(p){
    currentProduct = p;
    modalTitle.textContent = p.title;
    modalImage.src = p.image;
    modalImage.alt = p.title;
    modalLong.textContent = p.longDescription || p.description || '';
    // Build items list (name + qty)
    modalItems.innerHTML = '';
    if(Array.isArray(p.items) && p.items.length){
      document.getElementById('hbItemsWrap').style.display = '';
      for(const it of p.items){
        const li = document.createElement('li');
        const name = document.createElement('span'); name.textContent = it.name || '';
        const qty = document.createElement('span'); qty.textContent = (it.qty !== undefined ? `×${it.qty}` : ''); qty.className='qty';
        li.appendChild(name); li.appendChild(qty);
        modalItems.appendChild(li);
      }
    } else {
      document.getElementById('hbItemsWrap').style.display = 'none';
    }
    modalPrice.textContent = `${p.price} ${p.currency}`;
    modalBuy.href = p.paymentLink || '#';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    if(steamInput) steamInput.focus();
  }

  function closeModal(){
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    currentProduct = null;
  }

  if(modalClose) modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=>{ if(e.target === modal){ closeModal(); }});
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape'){ closeModal(); }});

  // openModal hook: we expose it globally so existing renderers can call it
  window.HB_OPEN_MODAL = openModal;

  // Enhance existing grid cards: remove short descriptions and attach click handler
  function patchGrid(){
    const grid = document.getElementById('grid') || document.querySelector('.grid');
    if(!grid) return;
    grid.querySelectorAll('.card, .product-card').forEach((card)=>{
      const desc = card.querySelector('.desc, .description');
      if(desc) desc.style.display = 'none';
      // Find data from dataset if present
      const json = card.getAttribute('data-product');
      if(json){
        try{
          const p = JSON.parse(json);
          card.addEventListener('click', ()=>openModal(p));
          card.tabIndex = 0;
          card.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); openModal(p); }});
        }catch(e){}
      }
    });
  }
  patchGrid();

  // Build payment link with {steamid} and optional tm=1
  if(modalBuy){
    modalBuy.addEventListener('click', (e)=>{
      if(!currentProduct) return;
      const base = currentProduct.paymentLink || '#';
      let sid = (steamInput && steamInput.value || '').trim();
      if(base.includes('{steamid}')){
        if(!sid){
          e.preventDefault();
          alert('Введи SteamID (или ник), чтобы продолжить.');
          if(steamInput) steamInput.focus();
          return;
        }
      }
      let url = base.replace('{steamid}', encodeURIComponent(sid || 'unknown'));
      if(testMode && testMode.checked){
        const sep = url.includes('?') ? '&' : '?';
        url = url + sep + 'tm=1';
      }
      modalBuy.href = url;
    });
  }

  // Optional: if the site renders products dynamically and calls a known function,
  // you can call window.HB_OPEN_MODAL(product) on card click in your existing renderer.
})();