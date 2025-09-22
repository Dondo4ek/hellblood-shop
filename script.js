console.log('[HELLBLOOD] modal pack v6 loaded');
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

/* v8: beauty pack */
function openModal(p){
  const modal = document.getElementById('product-modal');
  const titleEl = modal.querySelector('#modal-title');
  const imgEl = modal.querySelector('#modal-image');
  const descEl = modal.querySelector('#modal-description');
  const priceEl = modal.querySelector('#modal-price');
  const buyEl = modal.querySelector('#modal-buy');

  titleEl.textContent = p.title || 'Детали набора';
  // Apply tier color from chat_prefix
  const tierColor = (p.chat_prefix && p.chat_prefix.color) ? p.chat_prefix.color : getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#ff2a2a';
  modal.querySelector('.modal-dialog').style.setProperty('--tier', tierColor);
  // Ribbon
  let ribbon = modal.querySelector('.ribbon');
  if(!ribbon){ ribbon = document.createElement('div'); ribbon.className='ribbon'; modal.querySelector('.modal-dialog').appendChild(ribbon); }
  ribbon.innerHTML = '<small>Ранг</small><b>' + (p.chat_prefix && p.chat_prefix.text ? p.chat_prefix.text.replace(/[\[\]]/g,'') : 'HELLBLOOD') + '</b>';
  imgEl.src = p.image || '';
  imgEl.alt = p.title || '';

  // Prefer structured lists if provided
  let html = '';
  // Section: Details
  html += '<div class="section">';
  html += '<div class="section-title">Состав набора<div class="bar"></div></div>';
  if (Array.isArray(p.details)) {
    html += '<ul class="detail-list">';
    html += '<ul>';
    for (const it of p.details) { html += '<li>' + it + '</li>'; }
    html += '</ul>';
  } else if (p.descriptionHtml) {
    html += p.descriptionHtml;
  } else {
    html += '<p>' + (p.description || '') + '</p>';
  }
  
  
  
  // HELLBLOOD perks (sethome / tp / extra) rendering — BEAUTY v8
  if (typeof p.sethome_count === 'number' || (typeof p.tp_cooldown_sec === 'number' && typeof p.tp_time_sec === 'number') ||
      typeof p.backpack_slots === 'number' || typeof p.smelt_multiplier === 'number' || typeof p.recycler_multiplier === 'number' ||
      typeof p.repair_discount_percent === 'number' || typeof p.gather_bonus_percent === 'number' || p.daily_kit_name){
    html += '<div class="perks">';
    html += '<h4 class="perks-title">Привилегии HELLBLOOD</h4>';
    html += '<div class="perks-grid">';
    if (typeof p.sethome_count === 'number'){ html += '<div class="perk-card"><div class="perk-icon">⌂</div><div class="perk-text"><b>/sethome</b>: ' + p.sethome_count + ' слота</div></div>'; }
    if (typeof p.tp_cooldown_sec === 'number' && typeof p.tp_time_sec === 'number'){ html += '<div class="perk-card"><div class="perk-icon">↯</div><div class="perk-text"><b>/tp</b>: кд ' + p.tp_cooldown_sec + 'с • время ' + p.tp_time_sec + 'с</div></div>'; }
    if (typeof p.backpack_slots === 'number'){ html += '<div class="perk-card"><div class="perk-icon">🎒</div><div class="perk-text"><b>Рюкзак</b>: ' + p.backpack_slots + ' слотов</div></div>'; }
    if (typeof p.smelt_multiplier === 'number'){ html += '<div class="perk-card"><div class="perk-icon">🔥</div><div class="perk-text"><b>Плавка</b>: x' + p.smelt_multiplier + '</div></div>'; }
    if (typeof p.recycler_multiplier === 'number'){ html += '<div class="perk-card"><div class="perk-icon">♺</div><div class="perk-text"><b>Переработчик</b>: x' + p.recycler_multiplier + '</div></div>'; }
    if (typeof p.repair_discount_percent === 'number'){ html += '<div class="perk-card"><div class="perk-icon">⚙️</div><div class="perk-text"><b>Ремонт</b>: -' + p.repair_discount_percent + '%</div></div>'; }
    if (typeof p.gather_bonus_percent === 'number'){ html += '<div class="perk-card"><div class="perk-icon">⛏</div><div class="perk-text"><b>Добыча</b>: +' + p.gather_bonus_percent + '%</div></div>'; }
    if (p.daily_kit_name){ html += '<div class="perk-card"><div class="perk-icon">⏳</div><div class="perk-text"><b>Ежедневка</b>: /kit ' + p.daily_kit_name + '</div></div>'; }
    html += '</div>'; /* perks-grid */
    html += '</div>'; /* perks */
  }



  
  // HELLBLOOD chat prefix
  if (p.chat_prefix && p.chat_prefix.text){
    const pref = p.chat_prefix;
    html += '<div class="perks">';
    html += '<h4 class="perks-title">Чат-префикс</h4>';
    html += '<div class="perk"><span class="prefix" style="background:'+(pref.color||'#333')+';color:#fff">'+pref.text+'</span></div>';
    html += '</div>';
  }

  html += '</div>'; /* end section */
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
