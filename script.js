async function loadProducts(){
  const res = await fetch('products.json');
  const items = await res.json();
  const grid = document.querySelector('#grid');
  grid.className = 'grid';
  grid.innerHTML = '';
  for (const p of items){
    const card = document.createElement('div');
    card.className = 'card';

    const img = document.createElement('img');
    img.src = p.image;
    img.alt = p.title || '';
    card.appendChild(img);

    const h = document.createElement('h3');
    h.textContent = p.title || '';
    card.appendChild(h);

    // No description on card (per requirement)

    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = (p.price !== undefined ? p.price : '') + (p.currency ? (' ' + p.currency) : '');
    card.appendChild(price);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const btn = document.createElement('a');
    btn.className = 'btn';
    btn.textContent = 'Купить';
    if (p.paymentLink) btn.href = p.paymentLink;
    btn.target = '_blank';
    // prevent opening modal when clicking Buy
    btn.addEventListener('click', (e)=>{ e.stopPropagation(); });
    actions.appendChild(btn);

    card.appendChild(actions);

    // Open modal when clicking anywhere on the card
    card.addEventListener('click', ()=> openModal(p));

    grid.appendChild(card);
  }
}

function openModal(p){
  const modal = document.getElementById('product-modal');
  const titleEl = modal.querySelector('#modal-title');
  const imgEl = modal.querySelector('#modal-image');
  const descEl = modal.querySelector('#modal-description');
  const priceEl = modal.querySelector('#modal-price');
  const buyEl = modal.querySelector('#modal-buy');

  titleEl.textContent = p.title || 'Детали набора';
  imgEl.src = p.image || '';
  imgEl.alt = p.title || '';

  // Prefer structured lists if provided
  let html = '';
  if (Array.isArray(p.details)) {
    html += '<ul>';
    for (const it of p.details) { html += '<li>' + it + '</li>'; }
    html += '</ul>';
  } else if (p.descriptionHtml) {
    html += p.descriptionHtml;
  } else {
    html += '<p>' + (p.description || '') + '</p>';
  }
  
  // HELLBLOOD perks (sethome / tp) rendering
  if (typeof p.sethome_count === 'number' || (typeof p.tp_cooldown_sec === 'number' && typeof p.tp_time_sec === 'number')){
    html += '<div class="perks">';
    html += '<h4 class="perks-title">Привилегии HELLBLOOD</h4>';
    if (typeof p.sethome_count === 'number'){
      html += '<div class="perk"><span class="badge">/sethome</span><div><b>/sethome</b>: ' + p.sethome_count + ' слота</div></div>';
    }
    if (typeof p.tp_cooldown_sec === 'number' && typeof p.tp_time_sec === 'number'){
      html += '<div class="perk"><span class="badge">/tp</span><div><b>/tp</b>: перезарядка ' + p.tp_cooldown_sec + ' сек • время ' + p.tp_time_sec + ' сек</div></div>';
    }
    html += '</div>';
  }

  
  // HELLBLOOD chat prefix
  if (p.chat_prefix && p.chat_prefix.text){
    const pref = p.chat_prefix;
    html += '<div class="perks">';
    html += '<h4 class="perks-title">Чат-префикс</h4>';
    html += '<div class="perk"><span class="prefix" style="background:'+(pref.color||'#333')+';color:#fff">'+pref.text+'</span></div>';
    html += '</div>';
  }

  descEl.innerHTML = html;

  priceEl.textContent = (p.price !== undefined ? p.price : '') + (p.currency ? (' ' + p.currency) : '');
  if (p.paymentLink) { buyEl.href = p.paymentLink; } else { buyEl.removeAttribute('href'); }

  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  const bodyEl = modal.querySelector('.modal-body');
  updateScrollShadows(bodyEl);
  bodyEl.addEventListener('scroll', ()=> updateScrollShadows(bodyEl));
  const buyEl2 = modal.querySelector('#modal-buy');
  if (buyEl2) buyEl2.focus();
  window.__hb_untrap && window.__hb_untrap();
  window.__hb_untrap = trapFocus(modal.querySelector('.modal-dialog'));
}

function closeModal(){
  const modal = document.getElementById('product-modal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  if (window.__hb_untrap){ window.__hb_untrap(); window.__hb_untrap = null; }
}

// Delegate close actions
document.addEventListener('click', (e)=>{
  const modal = document.getElementById('product-modal');
  if (!modal) return;
  const isCloseButton = e.target.classList && e.target.classList.contains('modal-close');
  if (isCloseButton) { closeModal(); return; }

  if (modal.classList.contains('show')){
    const dialog = modal.querySelector('.modal-dialog');
    if (dialog && !dialog.contains(e.target) && modal.contains(e.target)){
      closeModal();
    }
  }
});

document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape') closeModal();
});

document.addEventListener('DOMContentLoaded', loadProducts);


/* ===== HELLBLOOD E: UX Core (focus trap, scroll shadows, Enter-to-buy) ===== */
function updateScrollShadows(bodyEl){
  const atTop = bodyEl.scrollTop <= 1;
  const atBottom = bodyEl.scrollHeight - bodyEl.scrollTop - bodyEl.clientHeight <= 1;
  bodyEl.classList.toggle('scrolled-top', atTop);
  bodyEl.classList.toggle('scrolled-bottom', atBottom);
}

function trapFocus(container){
  const focusable = container.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  function onKey(e){
    if(e.key === 'Tab'){
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
    if(e.key === 'Enter'){
      const buy = container.querySelector('#modal-buy');
      if (buy) buy.click();
    }
  }
  container.addEventListener('keydown', onKey);
  return ()=> container.removeEventListener('keydown', onKey);
}
