
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
    const d = document.createElement('div'); d.className = 'desc'; d.textContent = p.description;
    const row = document.createElement('div'); row.className = 'row';
    const price = document.createElement('div'); price.className='price'; price.textContent = `${p.price} ${p.currency}`;
    const btn = document.createElement('a'); btn.className='btn'; btn.textContent='Купить'; btn.href=p.paymentLink; btn.target='_blank';
    row.appendChild(price); row.appendChild(btn);
    content.appendChild(h); content.appendChild(d); content.appendChild(row);
    card.appendChild(img); card.appendChild(content);
    card.addEventListener('click', ()=>openModal(p));
    card.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); openModal(p); }});
    grid.appendChild(card);
  }
}
document.addEventListener('DOMContentLoaded', loadProducts);

const modal = document.getElementById('productModal');
const modalTitle = document.getElementById('modalTitle');
const modalImage = document.getElementById('modalImage');
const modalDescription = document.getElementById('modalDescription');
const modalPrice = document.getElementById('modalPrice');
const modalBuy = document.getElementById('modalBuy');
const modalClose = document.querySelector('.close');

function openModal(p){
  modalTitle.textContent = p.title;
  modalImage.src = p.image;
  modalImage.alt = p.title;
  modalDescription.textContent = p.description;
  modalPrice.textContent = `${p.price} ${p.currency}`;
  modalBuy.href = p.paymentLink || '#';
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
}

function closeModal(){
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e)=>{ if(e.target === modal){ closeModal(); }});
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape'){ closeModal(); }});
