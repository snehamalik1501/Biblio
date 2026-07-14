const CATS = {
  Programming:{color:'#5b4636', ic:'💻'},
  Fiction:{color:'#7a3b3b', ic:'📖'},
  Science:{color:'#3f5d4a', ic:'🧪'},
  History:{color:'#a9762f', ic:'📜'},
  Business:{color:'#3b4d63', ic:'📈'},
  Others:{color:'#5c4770', ic:'🎨'}
};

let state = {
  view:'dashboard',
  query:'',
  activeCategory:null,
  selectedId:null,
  dark:false,
  leavingId:null,
  justAddedId:null,
  loading:true,
  error:null,
  books:[]
};

const SHELF_CAPACITY = 8;
const API = '/api';

function mapFromApi(b){
  return { id:b.id, title:b.title, author:b.author, category:b.category, year:b.year, copies:b.copies };
}

async function apiGetBooks(){
  const res = await fetch(`${API}/books`);
  if(!res.ok) throw new Error('Failed to load books');
  return (await res.json()).map(mapFromApi);
}

async function apiCreateBook(payload){
  const res = await fetch(`${API}/books`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  if(!res.ok){ const err = await res.json().catch(()=>({})); throw new Error((err.errors||['Failed to add book']).join(', ')); }
  return mapFromApi(await res.json());
}

async function apiDeleteBook(id){
  const res = await fetch(`${API}/books/${id}`, { method:'DELETE' });
  if(!res.ok && res.status!==204) throw new Error('Failed to delete book');
}

async function loadBooks(){
  state.loading = true; state.error = null;
  render();
  try{
    state.books = await apiGetBooks();
    state.loading = false;
  }catch(e){
    state.loading = false;
    state.error = 'Could not reach the Biblio server. Is it running on port 4000?';
  }
  render();
}

function stats(){
  const total = state.books.reduce((s,b)=>s+b.copies,0);
  return { total, titles: state.books.length };
}

function filteredBooks(){
  let list = state.books;
  if(state.activeCategory) list = list.filter(b=>b.category===state.activeCategory);
  if(state.query.trim()){
    const q = state.query.toLowerCase();
    list = list.filter(b=> b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
  }
  return list;
}

function byCategory(list){
  const groups = {};
  list.forEach(b=>{
    if(!groups[b.category]) groups[b.category]=[];
    groups[b.category].push(b);
  });
  return groups;
}

function render(){
  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderSidebar()}
    <div class="page-wrap">
      <div class="page">
        ${renderTopbar()}
        ${renderView()}
      </div>
    </div>
    ${renderPanel()}
  `;
  bindEvents();
  document.body.classList.toggle('dark', state.dark);
}

function renderSidebar(){
  const items = [
    {id:'dashboard', ic:'🏠', label:'Dashboard'},
    {id:'books', ic:'📖', label:'Books'},
    {id:'add', ic:'➕', label:'Add Book'},
    {id:'categories', ic:'📂', label:'Categories'},
  ];
  return `
  <div class="spine">
    <span class="rivet" style="top:14px; left:14px;"></span>
    <span class="rivet" style="top:14px; right:14px;"></span>
    <span class="rivet" style="bottom:14px; left:14px;"></span>
    <span class="rivet" style="bottom:14px; right:14px;"></span>
    <div class="brand">
      <span class="glyph">📚</span>
      <span class="title">Biblio</span>
      <span class="sub">Est. in your study</span>
    </div>
    <ul class="nav">
      ${items.map(it=>`
        <li><button data-view="${it.id}" class="${state.view===it.id?'active':''}">
          <span class="ic">${it.ic}</span><span class="label">${it.label}</span>
        </button></li>
      `).join('')}
    </ul>
    <div class="spine-footer">
      <button class="candle-toggle" id="darkToggle">
        <span>${state.dark? '🕯 Candlelight':'☀ Daylight'}</span>
        <span>${state.dark?'●':'○'}</span>
      </button>
    </div>
  </div>`;
}

function renderTopbar(){
  return `
  <div class="topbar">
    <div class="search-wrap">
      <span class="ic">🔍</span>
      <input id="searchInput" type="text" placeholder="Search the catalog…" value="${escapeAttr(state.query)}">
    </div>
    <div class="top-actions">
      <button class="btn ghost" data-view="books">Browse Shelves</button>
      <button class="btn wax" data-view="add">+ Add Book</button>
    </div>
  </div>`;
}

function renderView(){
  if(state.loading){
    return `<div class="empty"><span class="ic">📚</span><div class="msg">Unlocking the archive…</div></div>`;
  }
  if(state.error){
    return `<div class="empty"><span class="ic">🕯</span><div class="msg">${state.error}</div>
      <div style="margin-top:16px;"><button class="btn wax" id="retryLoad">Try Again</button></div></div>`;
  }
  if(state.query.trim() && state.view!=='add'){
    return renderSearchResults();
  }
  switch(state.view){
    case 'dashboard': return renderDashboard();
    case 'books': return renderShelves(filteredBooks());
    case 'add': return renderAddForm();
    case 'categories': return renderCategories();
    default: return renderDashboard();
  }
}

function renderSearchResults(){
  const list = filteredBooks();
  return `
    <div class="section-head"><h2>Results for “${escapeHtml(state.query)}”</h2><span class="count">${list.length} found</span><div class="fill-rule"></div></div>
    ${list.length? renderShelfRow(list) : renderEmpty('No such volume upon these shelves.')}
  `;
}

function renderDashboard(){
  const s = stats();
  const recent = state.books.slice(0,4);
  return `
    <div class="hero fade-in">
      <div class="eyebrow">Your Personal Digital Library</div>
      <h1>Biblio</h1>
      <div class="tag">Your library, beautifully organized.</div>
      <div class="rule"></div>
    </div>

    <div class="stats">
      <div class="stat-card"><div class="stat-label">Total Books</div><div class="stat-num">${s.total}</div></div>
      <div class="stat-card"><div class="stat-label">Titles Catalogued</div><div class="stat-num">${s.titles}</div></div>
    </div>

    <div class="section-head"><h2>Recently Added</h2><div class="fill-rule"></div></div>
    <div class="recent-row">
      ${recent.map(b=>renderSpineCard(b)).join('')}
    </div>

    <div class="section-head"><h2>Categories</h2><div class="fill-rule"></div></div>
    ${renderCatGrid()}
  `;
}

function renderSpineCard(b, isNew){
  const c = CATS[b.category];
  return `
    <div class="spine-card ${state.justAddedId===b.id?'book-enter':''}" style="background:linear-gradient(160deg, ${c.color}, ${shade(c.color,-18)});" data-open="${b.id}">
      ${isNew || isRecentIdx(b)? '<span class="new-badge">New</span>':''}
      <span class="spine-title">${escapeHtml(b.title)}</span>
      <span class="spine-year">${b.year>0?b.year:Math.abs(b.year)+' BC'}</span>
    </div>`;
}
function isRecentIdx(b){
  const idx = state.books.findIndex(x=>x.id===b.id);
  return idx > -1 && idx <= 2;
}

function renderCatGrid(){
  return `<div class="cat-grid">
    ${Object.entries(CATS).map(([name,c])=>{
      const count = state.books.filter(b=>b.category===name).length;
      return `<div class="cat-card" style="background:linear-gradient(150deg, ${c.color}, ${shade(c.color,-20)});" data-open-cat="${name}">
        <span class="cat-ic">${c.ic}</span>
        <div class="cat-name">${name}</div>
        <div class="cat-count">${count} titles</div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderCategories(){
  return `
    <div class="section-head"><h2>Categories</h2><div class="fill-rule"></div></div>
    ${renderCatGrid()}
  `;
}

function renderEmpty(msg){
  return `<div class="empty"><span class="ic">📕</span><div class="msg">${msg}</div></div>`;
}

function renderShelfRow(list){
  return `<div class="shelf-books">${list.map(b=>renderBookSpine(b)).join('')}</div>`;
}

function renderShelves(list){
  if(!list.length) return renderEmpty('These shelves stand empty. Add a book to begin.');
  const groups = byCategory(list);
  const title = state.activeCategory ? state.activeCategory : 'All Shelves';
  return `
    <div class="section-head"><h2>${title}</h2><span class="count">${list.length} books</span><div class="fill-rule"></div>
      ${state.activeCategory? `<button class="btn ghost" id="clearCat" style="padding:6px 12px;">Show All</button>`:''}
    </div>
    ${Object.entries(groups).map(([cat,books])=>{
      const c = CATS[cat];
      const pct = Math.min(100, Math.round(books.reduce((s,b)=>s+b.copies,0)/SHELF_CAPACITY*100));
      return `
      <div class="shelf-block">
        <div class="shelf-title">
          <span class="dot" style="background:${c.color};"></span>
          <h3>${c.ic} ${cat}</h3>
          <span class="cap">${books.reduce((s,b)=>s+b.copies,0)}/${SHELF_CAPACITY*Math.ceil(books.length/4 || 1)} shelf capacity</span>
          <div class="capacity-bar"><div class="capacity-fill" style="width:${pct}%; background:${c.color};"></div></div>
        </div>
        <div class="shelf-books">
          ${books.map(b=>renderBookSpine(b)).join('')}
        </div>
      </div>`;
    }).join('')}
  `;
}

function renderBookSpine(b){
  const c = CATS[b.category];
  return `
    <div class="book-spine ${state.justAddedId===b.id?'book-enter':''} ${state.leavingId===b.id?'book-leaving':''}"
         style="background:linear-gradient(160deg, ${c.color}, ${shade(c.color,-22)});" data-open="${b.id}" title="${escapeAttr(b.title)}">
      <span class="b-title">${escapeHtml(b.title)}</span>
    </div>`;
}

function renderAddForm(){
  return `
  <div class="section-head"><h2>Add New Book</h2><div class="fill-rule"></div></div>
  <div class="catalog-wrap">
    <div class="catalog-card fade-in">
      <div class="catalog-head">
        <div class="eyebrow">Library Catalog Card</div>
        <h2>New Accession</h2>
      </div>
      <form id="addForm">
        <div class="field">
          <label>Book Name</label>
          <input type="text" name="title" required placeholder="e.g. The Old Man and the Sea">
        </div>
        <div class="field">
          <label>Author</label>
          <input type="text" name="author" required placeholder="e.g. Ernest Hemingway">
        </div>
        <div class="field-row">
          <div class="field">
            <label>Category</label>
            <select name="category">
              ${Object.keys(CATS).map(c=>`<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Year</label>
            <input type="number" name="year" placeholder="2024" value="2024">
          </div>
        </div>
        <div class="field">
          <label>Copies</label>
          <input type="number" name="copies" min="1" value="1" required>
        </div>
        <div class="catalog-actions">
          <button type="button" class="btn ghost" data-view="dashboard">Cancel</button>
          <button type="submit" class="btn wax">Add Book</button>
        </div>
      </form>
    </div>
  </div>`;
}

function renderPanel(){
  const b = state.books.find(x=>x.id===state.selectedId);
  if(!b) return `<div class="overlay" id="overlay"></div><div class="panel" id="panel"></div>`;
  const c = CATS[b.category];
  return `
    <div class="overlay show" id="overlay"></div>
    <div class="panel show" id="panel">
      <div class="ribbon"></div>
      <button class="panel-close" id="panelClose">✕ Close</button>
      <div class="eyebrow" style="margin-top:26px;">${c.ic} ${b.category}</div>
      <h2>${escapeHtml(b.title)}</h2>
      <div class="p-author">by ${escapeHtml(b.author)}</div>

      <div class="p-row"><span class="k">Author</span><span class="v">${escapeHtml(b.author)}</span></div>
      <div class="p-row"><span class="k">Category</span><span class="v">${b.category}</span></div>
      <div class="p-row"><span class="k">Published</span><span class="v">${b.year>0?b.year:Math.abs(b.year)+' BC'}</span></div>
      <div class="p-row"><span class="k">Copies</span><span class="v">${b.copies}</span></div>

      <div class="panel-actions">
        <button class="btn wax" id="deleteBook">Delete</button>
      </div>
    </div>
  `;
}

function bindEvents(){
  document.querySelectorAll('[data-view]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.view = el.dataset.view;
      state.activeCategory = null;
      state.query='';
      render();
    });
  });
  document.querySelectorAll('[data-open]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.selectedId = el.dataset.open;
      render();
    });
  });
  document.querySelectorAll('[data-open-cat]').forEach(el=>{
    el.addEventListener('click', ()=>{
      state.activeCategory = el.dataset.openCat;
      state.view = 'books';
      render();
    });
  });
  const clearCat = document.getElementById('clearCat');
  if(clearCat) clearCat.addEventListener('click', ()=>{ state.activeCategory=null; render(); });

  const searchInput = document.getElementById('searchInput');
  if(searchInput){
    searchInput.addEventListener('input', e=>{
      state.query = e.target.value;
      renderKeepFocus();
    });
  }

  const darkToggle = document.getElementById('darkToggle');
  if(darkToggle) darkToggle.addEventListener('click', ()=>{ state.dark=!state.dark; render(); });

  const overlay = document.getElementById('overlay');
  const panelClose = document.getElementById('panelClose');
  [overlay, panelClose].forEach(el=>{ if(el) el.addEventListener('click', ()=>{ state.selectedId=null; render(); }); });

  const deleteBook = document.getElementById('deleteBook');
  if(deleteBook) deleteBook.addEventListener('click', async ()=>{
    const id = state.selectedId;
    state.selectedId = null;
    state.leavingId = id;
    render();
    try{ await apiDeleteBook(id); }catch(e){}
    setTimeout(()=>{
      state.books = state.books.filter(b=>b.id!==id);
      state.leavingId = null;
      render();
    }, 320);
  });

  const addForm = document.getElementById('addForm');
  if(addForm){
    addForm.addEventListener('submit', async e=>{
      e.preventDefault();
      const fd = new FormData(addForm);
      const payload = {
        title: fd.get('title').trim(),
        author: fd.get('author').trim(),
        category: fd.get('category'),
        year: parseInt(fd.get('year'))||2024,
        copies: parseInt(fd.get('copies'))||1
      };
      const submitBtn = addForm.querySelector('button[type=submit]');
      submitBtn.disabled = true; submitBtn.textContent = 'Saving…';
      try{
        const nb = await apiCreateBook(payload);
        state.books.unshift(nb);
        state.view='books';
        state.activeCategory = nb.category;
        state.justAddedId = nb.id;
        render();
        setTimeout(()=>{ state.justAddedId=null; }, 600);
      }catch(err){
        submitBtn.disabled = false; submitBtn.textContent = 'Add Book';
        alert(err.message || 'Could not add book.');
      }
    });
  }

  const retryLoad = document.getElementById('retryLoad');
  if(retryLoad) retryLoad.addEventListener('click', loadBooks);
}

function renderKeepFocus(){
  const app = document.getElementById('app');
  app.innerHTML = `
    ${renderSidebar()}
    <div class="page-wrap">
      <div class="page">
        ${renderTopbar()}
        ${renderView()}
      </div>
    </div>
    ${renderPanel()}
  `;
  bindEvents();
  const input = document.getElementById('searchInput');
  if(input){ input.focus(); input.selectionStart = input.selectionEnd = input.value.length; }
}

function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s){ return escapeHtml(s); }
function shade(hex, pct){
  const num = parseInt(hex.replace('#',''),16);
  let r = (num>>16)+Math.round(2.55*pct);
  let g = ((num>>8)&0x00FF)+Math.round(2.55*pct);
  let b = (num&0x0000FF)+Math.round(2.55*pct);
  r=Math.min(255,Math.max(0,r)); g=Math.min(255,Math.max(0,g)); b=Math.min(255,Math.max(0,b));
  return '#'+(0x1000000+r*0x10000+g*0x100+b).toString(16).slice(1);
}

loadBooks();
