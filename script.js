
async function loadProducts(){
  const res = await fetch('products.json');
  const items = await res.json();
  const grid = document.querySelector('#grid');
  grid.innerHTML = '';
  for(const p of items){
    const card = document.createElement('div');
    card.className = 'card';
    const img = document.createElement('img'); img.src = p.image || 'assets/vip-berserk.png';
    const content = document.createElement('div'); content.className = 'content';
    const h = document.createElement('h3'); h.textContent = p.title;
    const d = document.createElement('div'); d.className = 'desc'; d.textContent = p.description;
    const row = document.createElement('div'); row.className = 'row';
    const price = document.createElement('div'); price.className = 'price'; price.textContent = `${p.price} ${p.currency||'RUB'}`;
    const btn = document.createElement('a'); btn.className='btn'; btn.textContent='Купить'; btn.href=p.paymentLink; btn.target='_blank'; btn.rel='noopener';
    row.appendChild(price); row.appendChild(btn);
    content.appendChild(h); content.appendChild(d); content.appendChild(row);
    card.appendChild(img); card.appendChild(content);
    grid.appendChild(card);
  }
}
document.addEventListener('DOMContentLoaded', loadProducts);
