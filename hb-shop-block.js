class HBShopBlock extends HTMLElement{
  constructor(){
    super();
    this.attachShadow({mode:'open'});
    this._data = [];
    this._byCat = {};
    this._blockOrder = (this.getAttribute('categories') || 'kits,weapons,components,electric,quarries,uncategorized')
                          .split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
    this._titles = { kits:'КИТЫ', weapons:'ОРУЖИЕ', components:'КОМПОНЕНТЫ', electric:'ЭЛЕКТРИКА', quarries:'КАРЬЕРЫ', uncategorized:'ДРУГОЕ', all:'ВСЁ' };
    this._modalId = this.getAttribute('modal') || 'product-modal';

    // === Styles (high-contrast) ===
    this._style = `
      *{box-sizing:border-box} :host{display:block}
      .wrap{background:#1a1a1a;color:#e6e6e6;border:1px solid #333;border-radius:14px;overflow:hidden}
      .head{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px;background:#111;border-bottom:1px solid #222}
      .tabs{display:flex;gap:8px;flex-wrap:wrap}
      .tab{padding:8px 10px;border:1px solid #444;border-radius:10px;background:#222;cursor:pointer;user-select:none;font:600 14px/1 system-ui;color:#eee}
      .tab.active{border-color:#ff3333;box-shadow:0 0 0 1px #ff3333 inset;color:#ff3333}
      .controls{display:flex;gap:8px;flex-wrap:wrap}
      input[type=search],select{padding:8px 10px;border-radius:10px;border:1px solid #444;background:#222;color:#eee}
      .counter{font-size:12px;color:#bbb;padding:0 10px}
      .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding:12px}
      .card{background:#2a2a2a;border:1px solid #333;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;transition:0.2s;cursor:pointer}
      .card:hover{border-color:var(--hb-accent);transform:translateY(-1px)}
      .thumb{width:100%;aspect-ratio:16/10;display:flex;align-items:center;justify-content:center;background:#191919;border-bottom:1px solid #333}
      .thumb img{max-width:85%;max-height:85%;object-fit:contain;filter:drop-shadow(0 2px 8px rgba(0,0,0,.6))}
      .body{padding:10px 12px;display:flex;flex-direction:column;gap:6px}
      .title{font:700 15px/1.2 system-ui;color:#ff3333}
      .desc{color:#ccc;font:400 13px/1.3 system-ui;min-height:2.6em}
      .price{font:800 14px/1 system-ui;color:#fff}
      .cta{display:flex;gap:8px;margin-top:auto}
      .more{flex:1;display:inline-block;text-align:center;padding:8px 10px;border-radius:10px;background:#2d2d2d;color:#eee;text-decoration:none;border:1px solid #444}
      .buy{flex:1;display:inline-block;text-align:center;padding:8px 10px;border-radius:10px;background:#ff0000;color:#fff;text-decoration:none;font:700 14px system-ui;border:none}
      .empty{padding:14px;color:#f55}
    `;

    this.shadowRoot.innerHTML = `<style>${this._style}</style>
      <div class="wrap">
        <div class="head">
          <div class="tabs" role="tablist" aria-label="Категории"></div>
          <div class="controls">
            <input class="search" type="search" placeholder="Поиск">
            <select class="sort" aria-label="Сортировка">
              <option value="title">По названию</option>
              <option value="price">По цене</option>
            </select>
            <div class="counter">Показано: 0</div>
          </div>
        </div>
        <div class="grid" aria-live="polite"></div>
      </div>`;
  }

  
  // === Price-based theming for kits ===
  _computeKitPriceStats(){
    const kits = this._data.filter(p => (p.category||'').toLowerCase()==='kits' && typeof p.price === 'number');
    if(!kits.length) return {min:0, q1:0, q2:0, q3:0, max:0};
    const arr = kits.map(k=>k.price).sort((a,b)=>a-b);
    const q = (p)=> arr[Math.max(0, Math.min(arr.length-1, Math.round((arr.length-1)*p)))];
    return { min: arr[0], q1: q(0.33), q2: q(0.5), q3: q(0.66), max: arr[arr.length-1] };
  }
  
  
  _kitAccent(price, stats){
    if(!stats || stats.max===stats.min){ 
      return {accent:'#ff003c', tier:'HIGH'}; 
    }
    if(price <= stats.q1) return {accent:'#39ff14', tier:'LOW'};   // дешёвый (кислотно-зелёный)
    if(price <= stats.q2) return {accent:'#bf00ff', tier:'MID'};   // средний (ультрафиолет)
    return {accent:'#ff003c', tier:'HIGH'};                        // дорогой (кровавый неон)
  }

    if(price <= stats.q1) return {accent:'#ffd700', tier:'LOW'};   // дешёвый (жёлтый)
    if(price <= stats.q2) return {accent:'#8a2be2', tier:'MID'};   // средний (пурпур)
    return {accent:'#ff2400', tier:'HIGH'};                        // дорогой (красный)
  }

connectedCallback(){
    this._init();
  }

  async _init(){
    try{
      // Load data
      const src = this.getAttribute('src');
      if(src){
        const res = await fetch(src, {cache:'no-store'});
        if(!res.ok) throw new Error('Не найден файл: '+src);
        this._data = await res.json();
      }else{
        const script = this.querySelector('script[type="application/json"]');
        this._data = script ? JSON.parse(script.textContent) : [];
      }

      // Prepare categories
      this._byCat = {};
      for(const p of this._data){
        const k = (p.category || 'uncategorized').toLowerCase();
        (this._byCat[k] ||= []).push(p);
      }
      for(const k in this._byCat){
        this._byCat[k].sort((a,b)=> (a.title||'').localeCompare(b.title||'', 'ru', {sensitivity:'base'}));
      }

      this._renderTabs();
      this._wire();

      // compute price stats for kit theming
      this._kitStats = this._computeKitPriceStats();

      const prefer = this.getAttribute('default') || 'kits';
      const key = this._byCat[prefer]?.length ? prefer : 'all';
      this._render(key);

    }catch(err){
      console.error(err);
      this.shadowRoot.querySelector('.grid').innerHTML = `<div class="empty">${err.message}</div>`;
    }
  }

  _makeTab(key,label){
    const b = document.createElement('button');
    b.className='tab';
    b.dataset.key = key;
    b.textContent = label;
    return b;
  }

  _renderTabs(){
    const wrap = this.shadowRoot.querySelector('.tabs');
    wrap.innerHTML = '';
    wrap.append(this._makeTab('all', this._titles.all));
    for(const k of this._blockOrder){
      if(this._byCat[k]?.length){
        wrap.append(this._makeTab(k, this._titles[k] || k.toUpperCase()));
      }
    }
  }

  _normalizeImg(path){ return path || ''; }

  _cardHTML(p){
    const img = this._normalizeImg(p.image);
    const isKit = (p.category||'').toLowerCase()==='kits';
    const theming = isKit ? this._kitAccent(p.price??0, this._kitStats) : {accent:'#ff3333', tier:''};
    const accent = theming.accent;
    const price = `${p.price ?? ''} ${p.currency || ''}`.trim();
    const desc = (p.description || '').toString();
    return `
    <div class="card" data-id="${p.id}" data-accent="${accent}" style="--hb-accent:${accent}">
      <div class="thumb" style="position:relative">
        <div style="position:absolute;left:0;top:0;right:0;height:4px;background:var(--hb-accent)"></div>
        ${img ? `<img src="${img}" alt="${p.title||''}">` : ''}
      </div>
      <div class="body">
        <div class="title" style="color:var(--hb-accent)">${p.title||''}</div>
        <div class="desc">${desc}</div>
        <div class="price" style="color:#fff"><span style="color:var(--hb-accent)">${price}</span></div>
        <div class="cta">
          <a class="more" href="#" data-action="open">Подробнее</a>
          <a class="buy" href="#" data-action="buy" style="background:var(--hb-accent)">КУПИТЬ</a>
        </div>
      </div>
    </div>`;
  }


  _wire(){
    const tabs = this.shadowRoot.querySelector('.tabs');
    const search = this.shadowRoot.querySelector('.search');
    const sort = this.shadowRoot.querySelector('.sort');
    const grid = this.shadowRoot.querySelector('.grid');

    tabs.addEventListener('click', e=>{
      const btn = e.target.closest('.tab'); if(!btn) return;
      this._render(btn.dataset.key);
    });
    search.addEventListener('input', ()=>{
      const active = this.shadowRoot.querySelector('.tab.active')?.dataset.key || 'all';
      this._render(active);
    });
    sort.addEventListener('change', ()=>{
      const active = this.shadowRoot.querySelector('.tab.active')?.dataset.key || 'all';
      this._render(active);
    });

    // Delegate clicks to open modal
    grid.addEventListener('click', (e)=>{
      const openBtn = e.target.closest('[data-action="open"], .card');
      const buyBtn = e.target.closest('[data-action="buy"]');

      const card = e.target.closest('.card');
      if(!card) return;
      const id = card.getAttribute('data-id');
      const item = this._data.find(p => p.id === id);
      if(!item) return;

      if(openBtn){
        e.preventDefault();
        this._openModal(item);
      } else if(buyBtn){
        e.preventDefault();
        // If there is a payment link, open it; otherwise open modal
        if(item.paymentLink){
          window.open(item.paymentLink, '_blank', 'noopener');
        } else {
          this._openModal(item);
        }
      }
    });
  }

  _render(activeKey='all'){
    const tabs = Array.from(this.shadowRoot.querySelectorAll('.tab'));
    tabs.forEach(t=>t.classList.toggle('active', t.dataset.key===activeKey));

    let items = activeKey==='all' ? this._data.slice() : (this._byCat[activeKey] || []).slice();

    const q = this.shadowRoot.querySelector('.search').value.trim().toLowerCase();
    if(q){
      items = items.filter(p => (p.title||'').toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q));
    }

    const mode = this.shadowRoot.querySelector('.sort').value;
    if(mode==='title'){
      items.sort((a,b)=> (a.title||'').localeCompare(b.title||'', 'ru', {sensitivity:'base'}));
    } else if(mode==='price'){
      items.sort((a,b)=> ((a.price??0) - (b.price??0)));
    }

    const grid = this.shadowRoot.querySelector('.grid');
    grid.innerHTML = items.length ? items.map(p=>this._cardHTML(p)).join('') : `<div class="empty">Ничего не найдено</div>`;
    this.shadowRoot.querySelector('.counter').textContent = `Показано: ${items.length}`;
  }

  
  _openModal(item){
    const modal = document.getElementById(this._modalId);
    if(!modal){
      console.warn('Modal element not found:', this._modalId);
      return;
    }
    // ---- Fill content
    const imgEl = modal.querySelector('#modal-image');
    const descEl = modal.querySelector('#modal-description');
    const priceEl = modal.querySelector('#modal-price');
    const buyEl = modal.querySelector('#modal-buy');

    // Determine accent based on kit price
    const isKit = (item.category||'').toLowerCase()==='kits';
    const theme = isKit ? this._kitAccent(item.price??0, this._kitStats) : {accent:'#ff3333', tier:''};
    const accent = theme.accent;

    if(imgEl){ imgEl.src = item.image || ''; imgEl.alt = item.title || ''; }

    // Build description + privileges
    
    let html = '';

    // --- Base description ---
    if(item.description){
      html += `<p style="margin:8px 0 12px 0; line-height:1.5; color:#ddd">${item.description}</p>`;
    }

    
    // --- Composition / Состав ---
    const detailsList = Array.isArray(item.details) ? item.details : [];
    if(detailsList.length){
      html += `<div style="margin:12px 0 16px 0; background:#171717; border:1px solid #242424; border-radius:12px; padding:12px">
        <h4 style="margin:0 0 8px 0; font-weight:800; color:#ff3333">Состав</h4>
        <ul style="margin:0; padding:0; list-style:none; display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:8px">
          ${detailsList.map(d=>`<li style="margin:0; padding:8px 10px; background:#202020; border:1px solid #2a2a2a; border-radius:10px; line-height:1.45; color:#eee">${d}</li>`).join('')}
        </ul>
      </div>`;
    }

    // --- Privileges / Привилегии (styled, below composition) ---
    // Build perks list first (same logic as before)
    const perksList = [];
    const isKitForPerks = (item.category||'').toLowerCase()==='kits';
    if(isKitForPerks){
      if(typeof item.sethome_count === 'number') perksList.push(`Количество SetHome: <b>${item.sethome_count}</b>`);
      if(typeof item.tp_cooldown_sec === 'number') perksList.push(`КД телепорта: <b>${item.tp_cooldown_sec} сек</b>`);
      if(typeof item.tp_time_sec === 'number') perksList.push(`Время телепорта: <b>${item.tp_time_sec} сек</b>`);
      if(item.chat_prefix && item.chat_prefix.text) perksList.push(`Префикс в чате: <b>${item.chat_prefix.text}</b>`);
      if(typeof item.backpack_slots === 'number') perksList.push(`Слоты рюкзака: <b>${item.backpack_slots}</b>`);
      if(typeof item.smelt_multiplier === 'number') perksList.push(`Плавка ×<b>${item.smelt_multiplier}</b>`);
      if(typeof item.recycler_multiplier === 'number') perksList.push(`Переработчик ×<b>${item.recycler_multiplier}</b>`);
      if(typeof item.repair_discount_percent === 'number') perksList.push(`Скидка на ремонт: <b>${item.repair_discount_percent}%</b>`);
      if(typeof item.gather_bonus_percent === 'number') perksList.push(`Бонус добычи: <b>${item.gather_bonus_percent}%</b>`);
      if(item.daily_kit_name) perksList.push(`Ежедневный кит: <b>${item.daily_kit_name}</b>`);
    }
    if(Array.isArray(item.privileges)){
      for(const p of item.privileges){ perksList.push(p); }
    }

    if(perksList.length){
      // Determine accent from price tier (same as card/modal theming)
      const isKit = (item.category||'').toLowerCase()==='kits';
      const theme = isKit ? this._kitAccent(item.price??0, this._kitStats) : {accent:'#ff3333', tier:''};
      const accent = theme.accent;

      html += `<div style="margin:12px 0 0 0; background:#171717; border:1px solid #242424; border-radius:12px; padding:12px">
        <h4 style="margin:0 0 8px 0; font-weight:800; color:${accent}">Привилегии</h4>
        <ul style="margin:0; padding:0; list-style:none; display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:8px">
          ${perksList.map(txt=>`
            <li style="margin:0; display:flex; align-items:flex-start; gap:10px; padding:10px 12px; background:#202020; border:1px solid #2a2a2a; border-radius:10px; line-height:1.45; color:#eee">
              <span style="flex:0 0 10px; height:10px; margin-top:5px; border-radius:50%; background:${accent}; box-shadow:0 0 0 3px rgba(255,255,255,0.04)"></span>
              <span style="display:block">${txt}</span>
            </li>`).join('')}
        </ul>
      </div>`;
    }

    if(!item.description && !detailsList.length && !perksList.length){
      html = '<p>Описание отсутствует</p>';
    }

    if(descEl){ descEl.innerHTML = html || '<p>Описание отсутствует</p>'; }

    if(priceEl){ priceEl.textContent = `${item.price ?? ''} ${item.currency || ''}`.trim(); priceEl.style.color = accent; }
    if(buyEl){ buyEl.href = item.paymentLink || '#'; buyEl.target = item.paymentLink ? '_blank' : '_self'; }

    // ---- Center modal without touching global CSS
    // Backdrop
    Object.assign(modal.style, {
      position: 'fixed',
      inset: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
      zIndex: 9999
    });
    modal.setAttribute('aria-hidden','false');

    // Dialog sizing (safe minimal styling)
    const dialog = modal.querySelector('.modal-dialog');
    if(dialog){
      Object.assign(dialog.style, {
        maxWidth: '560px',
        width: 'min(92vw, 560px)',
        borderRadius: '14px',
        overflow: 'hidden',
        background: '#141414',
        border: '1px solid #2a2a2a',
        boxShadow: '0 12px 40px rgba(0,0,0,.6)'
      });
      const h4s = modal.querySelectorAll('h4');
      h4s.forEach(h=> h.style.color = accent);
      if(buyEl){ buyEl.style.background = accent; buyEl.style.border = 'none'; }
      const titleEl = modal.querySelector('.modal-title, #modal-title');
      if(titleEl){ titleEl.style.color = accent; }
      const img = modal.querySelector('#modal-image');
      if(img){
        img.style.display = 'block';
        img.style.width = '100%';
        img.style.maxHeight = '240px';
        img.style.objectFit = 'contain';
        img.style.background = '#0f0f0f';
        img.style.border = 'none';
      }
    }

    const closeBtns = modal.querySelectorAll('.modal-close');
    const close = ()=>{
      modal.setAttribute('aria-hidden','true');
      modal.style.display = 'none';
      modal.style.background = ''; // cleanup just in case
    };
    closeBtns.forEach(b=> b.onclick = close);
    modal.addEventListener('click', (e)=>{ if(e.target === modal) close(); }, {once:true});
  }
}

customElements.define('hb-shop-block', HBShopBlock);