
async function loadProducts(){
  const res = await fetch('products.json');
  const items = await res.json();
  const grid = document.querySelector('#grid');
  grid.innerHTML = '';
  for(const p of items){
    const card = document.createElement('div');
    card.className = 'card';
    const img = document.createElement('img'); img.src = p.image;
    const h = document.createElement('h3'); h.textContent = p.title;
    const d = document.createElement('div'); d.textContent = p.description;
    const price = document.createElement('div'); price.innerHTML = `<b>${p.price} ${p.currency}</b>`;
    const btn = document.createElement('a'); btn.className='btn'; btn.textContent='Купить'; btn.href=p.paymentLink; btn.target='_blank';
    card.appendChild(img); card.appendChild(h); card.appendChild(d); card.appendChild(price); card.appendChild(btn);
    grid.appendChild(card);
  }
}
document.addEventListener('DOMContentLoaded', loadProducts);
