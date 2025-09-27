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
      .card:hover{border-color:#ff3333;transform:translateY(-1px)}
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
    const price = `${p.price ?? ''} ${p.currency || ''}`.trim();
    const desc = (p.description || '').toString();
    // Note: primary action is to open modal; buy link is available inside modal
    return `
    <div class="card" data-id="${p.id}">
      <div class="thumb">${img ? `<img src="${img}" alt="${p.title||''}">` : ''}</div>
      <div class="body">
        <div class="title">${p.title||''}</div>
        <div class="desc">${desc}</div>
        <div class="price">${price}</div>
        <div class="cta">
          <a class="more" href="#" data-action="open">Подробнее</a>
          <a class="buy" href="#" data-action="buy">КУПИТЬ</a>
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

    if(imgEl){ imgEl.src = item.image || ''; imgEl.alt = item.title || ''; }

    // Build description + privileges
    let html = '';
    if(item.description){ html += `<p>${item.description}</p>`; }
    const perks = Array.isArray(item.privileges) ? item.privileges
                 : (Array.isArray(item.details) ? item.details : []);
    if(perks.length){
      html += `<h4 style="margin:12px 0 6px 0">Привилегии</h4><ul>` + perks.map(d=>`<li>${d}</li>`).join('') + `</ul>`;
    }
    if(descEl){ descEl.innerHTML = html || '<p>Описание отсутствует</p>'; }

    if(priceEl){ priceEl.textContent = `${item.price ?? ''} ${item.currency || ''}`.trim(); }
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
      // Tweak inner image if present
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