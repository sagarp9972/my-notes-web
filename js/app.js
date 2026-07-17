/* =====================================================
   MyNotes — App logic
   ===================================================== */

// ---- Auth guard ----
const session = DB.getSession();
let currentUser = session ? DB.currentUser() : null;
if(!currentUser){ window.location.href = 'index.html'; }

// ---- App state ----
let state = {
  view: 'view-dashboard',
  activeFolderId: null,
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(), // 0-indexed
  calSelectedDate: DB.today(),
  editingNoteId: null,
  presetFolderId: null
};

const FOLDER_ICON_OPTIONS = ['📁','💼','🎓','📚','💡','🎯','✈️','🏠','💰','🏋️','🎉','📷','🎨','🛒','🔑','📌','❤️','⭐','🚀','🧾','🍽','🎵','🐾','📅'];
const TASK_ICON_OPTIONS = ['📌','🕒','✅','🛒','💼','📚','🏋️','🍽','🚗','💰','🎯','✈️','🎉','📞','💊','🏠','🎁','📅'];
const FOLDER_COLORS = [
  {name:'White', hex:'#FFFFFF'}, {name:'Black', hex:'#2A2A2A'}, {name:'Red', hex:'#E24C4C'},
  {name:'Blue', hex:'#6E9BD1'}, {name:'Green', hex:'#5FA85E'}, {name:'Yellow', hex:'#EFCB4B'},
  {name:'Orange', hex:'#E3A542'}, {name:'Pink', hex:'#EC94B4'}, {name:'Purple', hex:'#B586D6'},
  {name:'Brown', hex:'#9C6B45'}, {name:'Grey', hex:'#9AA0AA'}, {name:'Sky Blue', hex:'#87CEEB'},
  {name:'Light Blue', hex:'#A9D6E5'}, {name:'Baby Blue', hex:'#BFE1F0'}, {name:'Light Green', hex:'#A8D5AF'},
  {name:'Mint Green', hex:'#7FE0B0'}, {name:'Lime Green', hex:'#B4E33D'}, {name:'Light Pink', hex:'#F3C4D3'},
  {name:'Peach', hex:'#FFCBA4'}, {name:'Lavender', hex:'#C9B8E8'}, {name:'Cream', hex:'#F5EEDC'},
  {name:'Beige', hex:'#E8DCC8'}, {name:'Ivory', hex:'#FFFFF0'}, {name:'Off White', hex:'#F5F5F0'}
];
const CATEGORY_EMOJI = {
  AI:'🤖', Work:'💼', Personal:'🧘', Study:'📚', Ideas:'💡', Projects:'🗂',
  College:'🎓', Office:'🏢', Business:'📈', Finance:'💰', Shopping:'🛍', Travel:'✈️',
  Health:'🩺', Fitness:'🏋️', Meeting:'🗓', Assignments:'📄', Diary:'📔', Goals:'🎯',
  Wishlist:'🎁', Events:'🎉', Birthday:'🎂', Important:'❗', Documents:'📑', Bills:'🧾',
  Passwords:'🔑', Home:'🏠', Family:'👨‍👩‍👧', Friends:'🧑‍🤝‍🧑', Sports:'🏅', Technology:'💻',
  News:'📰', Learning:'🧠', Career:'🚀', Interview:'🎤', Other:'🗂'
};

function renderIconSwatches(selectedIcon){
  const container = document.getElementById('folderIconSwatches');
  const chosen = selectedIcon || FOLDER_ICON_OPTIONS[0];
  container.innerHTML = FOLDER_ICON_OPTIONS.map(ic => `<div class="icon-swatch ${ic === chosen ? 'selected':''}" data-icon="${ic}">${ic}</div>`).join('');
  container.querySelectorAll('.icon-swatch').forEach(s => s.addEventListener('click', () => {
    container.querySelectorAll('.icon-swatch').forEach(x => x.classList.remove('selected'));
    s.classList.add('selected');
  }));
}
function populateIconSelect(selectId){
  const sel = document.getElementById(selectId);
  sel.innerHTML = TASK_ICON_OPTIONS.map(ic => `<option value="${ic}">${ic}</option>`).join('');
}

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=> t.classList.remove('show'), 2200);
}

function escapeHtml(str){
  return String(str || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function formatDate(iso){
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' });
}

/* ---------------- Navigation ---------------- */
function goToView(viewId){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  document.querySelectorAll('.nav-item[data-view]').forEach(n => n.classList.toggle('active', n.dataset.view === viewId));
  state.view = viewId;

  const titles = {
    'view-dashboard':'Dashboard', 'view-today':'Today Work', 'view-notes':'My Notes',
    'view-folders':'Folders', 'view-folder-detail':'Folder', 'view-favorites':'Favorites',
    'view-calendar':'Calendar', 'view-trash':'Trash', 'view-profile':'Profile', 'view-settings':'Settings'
  };
  document.getElementById('topbarTitle').textContent = titles[viewId] || 'MyNotes';
  document.getElementById('sidebar').classList.remove('open');

  if(viewId === 'view-dashboard') renderDashboard();
  if(viewId === 'view-today') renderTodayWork();
  if(viewId === 'view-notes') renderAllNotes();
  if(viewId === 'view-folders') renderFolders();
  if(viewId === 'view-favorites') renderFavorites();
  if(viewId === 'view-calendar') renderCalendar();
  if(viewId === 'view-trash') renderTrash();
  if(viewId === 'view-profile') renderProfile();
}

document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
  btn.addEventListener('click', () => goToView(btn.dataset.view));
});
document.querySelectorAll('[data-goto]').forEach(el => {
  el.addEventListener('click', (e) => { e.preventDefault(); goToView(el.dataset.goto); });
});
document.getElementById('logoutBtn').addEventListener('click', () => {
  DB.logout();
  window.location.href = 'index.html';
});
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

/* ---------------- Note card rendering ---------------- */
function noteCardHtml(note){
  const folders = DB.getFolders(currentUser.id);
  const folder = folders.find(f => f.id === note.folderId);
  const catEmoji = CATEGORY_EMOJI[note.category] || '🗂';
  const catLabel = note.categoryDetail ? `${note.category}: ${note.categoryDetail}` : note.category;
  return `
  <div class="note-card" data-id="${note.id}">
    <div class="tags-row">
      ${folder ? `<span class="folder-tag"><span class="dot" style="background:${folder.color}"></span>${escapeHtml(folder.folder_name)}</span>` : ''}
      <span class="folder-tag">${catEmoji} ${escapeHtml(catLabel)}</span>
    </div>
    <h4>${escapeHtml(note.title)}</h4>
    <div class="meta">Created ${formatDate(note.createdAt)}</div>
    <div class="excerpt">${escapeHtml(note.content).slice(0,140) || 'No content yet.'}</div>
    <div class="actions">
      <button class="mini-action edit-note" data-id="${note.id}">✏ Edit</button>
      <button class="mini-action fav ${note.favorite ? 'is-fav':''}" data-id="${note.id}">⭐ Favorite</button>
      <button class="mini-action del del-note" data-id="${note.id}">🗑 Delete</button>
    </div>
  </div>`;
}

function emptyStateHtml(icon, text, cta){
  return `<div class="empty-state" style="grid-column:1/-1;">
    <div class="big">${icon}</div>
    <p>${text}</p>
    ${cta || ''}
  </div>`;
}

function wireNoteCardActions(container){
  container.querySelectorAll('.edit-note').forEach(b => b.addEventListener('click', () => openNoteModal(b.dataset.id)));
  container.querySelectorAll('.fav').forEach(b => b.addEventListener('click', () => {
    DB.toggleFavorite(b.dataset.id);
    refreshCurrentView();
  }));
  container.querySelectorAll('.del-note').forEach(b => b.addEventListener('click', () => {
    DB.trashNote(b.dataset.id);
    toast('Note moved to Trash');
    refreshCurrentView();
  }));
}

function refreshCurrentView(){ goToView(state.view); }

/* ---------------- Dashboard ---------------- */
function renderDashboard(){
  document.getElementById('welcomeName').textContent = currentUser.name;
  const notes = DB.getNotes(currentUser.id);
  const favs = notes.filter(n => n.favorite);
  const today = DB.today();
  const createdToday = notes.filter(n => n.createdAt.slice(0,10) === today).length;
  const todayWork = DB.getDayNotes(currentUser.id, today).length;
  const categories = new Set(notes.map(n => n.category)).size;

  document.getElementById('statTotal').textContent = notes.length;
  document.getElementById('statCreatedToday').textContent = createdToday;
  document.getElementById('statTodayWork').textContent = todayWork;
  document.getElementById('statFavorites').textContent = favs.length;
  document.getElementById('statCategories').textContent = categories;

  const recent = [...notes].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,4);
  const grid = document.getElementById('recentNotesGrid');
  grid.innerHTML = recent.length ? recent.map(noteCardHtml).join('') : emptyStateHtml('📝','No notes yet. Create your first note to get started.');
  wireNoteCardActions(grid);

  updateNotificationBadge();
}

function updateNotificationBadge(){
  const settings = DB.getSettings(currentUser.id);
  const today = DB.today();
  const count = DB.getDayNotes(currentUser.id, today).filter(d => !d.completed).length;
  const dot = document.getElementById('notifDot');
  const badge = document.getElementById('todayBadge');
  if(settings.notifications && count > 0){
    dot.style.display = 'block';
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    dot.style.display = 'none';
    badge.classList.add('hidden');
  }
}

document.getElementById('notifBtn').addEventListener('click', () => {
  const count = DB.getDayNotes(currentUser.id, DB.today()).filter(d => !d.completed).length;
  toast(count > 0 ? `You have ${count} pending task(s) for today.` : 'All caught up for today!');
});

/* ---------------- Today Work ---------------- */
function renderTodayWork(){
  const today = DB.today();
  document.getElementById('todayDateLabel').textContent = new Date().toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const list = DB.getDayNotes(currentUser.id, today);
  const container = document.getElementById('todayList');
  container.innerHTML = list.length ? list.map(d => `
    <div class="day-note-item ${d.completed ? 'completed':''}" data-id="${d.id}">
      <span>${d.icon || '🕒'}</span><span class="task-text">${escapeHtml(d.text)}</span>
      <div class="item-actions">
        <button class="complete-btn" data-id="${d.id}">${d.completed ? '✓ Completed' : 'Mark Complete'}</button>
        <button class="remove-btn remove-day" data-id="${d.id}">✕</button>
      </div>
    </div>`).join('') : `<p style="color:var(--ink-faint); font-size:13.5px; padding:8px 0;">Nothing planned for today yet.</p>`;
  container.querySelectorAll('.complete-btn').forEach(b => b.addEventListener('click', () => {
    DB.toggleDayNoteComplete(b.dataset.id);
    renderTodayWork();
    updateNotificationBadge();
  }));
  container.querySelectorAll('.remove-day').forEach(b => b.addEventListener('click', () => {
    DB.removeDayNote(b.dataset.id);
    toast('Task removed');
    renderTodayWork();
    updateNotificationBadge();
  }));
}
document.getElementById('todayAddBtn').addEventListener('click', () => {
  const input = document.getElementById('todayInput');
  if(!input.value.trim()) return;
  const icon = document.getElementById('todayIconSelect').value || '🕒';
  DB.addDayNote(currentUser.id, DB.today(), input.value.trim(), icon);
  input.value = '';
  renderTodayWork();
  updateNotificationBadge();
});
document.getElementById('todayInput').addEventListener('keydown', (e) => { if(e.key === 'Enter') document.getElementById('todayAddBtn').click(); });

/* ---------------- My Notes ---------------- */
function renderAllNotes(query){
  let notes = DB.getNotes(currentUser.id).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  if(query){
    const q = query.toLowerCase();
    notes = notes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  }
  const grid = document.getElementById('allNotesGrid');
  grid.innerHTML = notes.length ? notes.map(noteCardHtml).join('') : emptyStateHtml('📭', query ? 'No notes match your search.' : 'You have not created any notes yet.', query ? '' : `<button class="btn btn-primary btn-sm" onclick="openNoteModal()">➕ Create Note</button>`);
  wireNoteCardActions(grid);
}
document.getElementById('searchNotes').addEventListener('input', (e) => renderAllNotes(e.target.value));

/* ---------------- Folders ---------------- */
function folderIconColorStyle(color){ return `background:${color}33; color:${color};`; }

function renderFolders(){
  const folders = DB.getFolders(currentUser.id);
  const grid = document.getElementById('folderGrid');
  grid.innerHTML = folders.length ? folders.map(f => {
    const count = DB.getByFolder(currentUser.id, f.id).length;
    return `<div class="folder-card open-folder" data-id="${f.id}">
      <div class="folder-ic" style="${folderIconColorStyle(f.color)}">${f.folder_icon || '📁'}</div>
      <div><div class="fname">${escapeHtml(f.folder_name)}</div><div class="fcount">${count} note${count===1?'':'s'}</div></div>
    </div>`;
  }).join('') : emptyStateHtml('📁','No folders yet. Create one to start organizing.');
  grid.querySelectorAll('.open-folder').forEach(c => c.addEventListener('click', () => openFolderDetail(c.dataset.id)));
}

function openFolderDetail(folderId){
  state.activeFolderId = folderId;
  const folders = DB.getFolders(currentUser.id);
  const folder = folders.find(f => f.id === folderId);
  document.getElementById('folderDetailName').textContent = folder.folder_name;
  document.getElementById('folderDetailTitle').textContent = `${folder.folder_icon || '📁'} ${folder.folder_name}`;
  renderFolderNotes();
  goToView('view-folder-detail');
}
function renderFolderNotes(){
  const notes = DB.getByFolder(currentUser.id, state.activeFolderId);
  const grid = document.getElementById('folderNotesGrid');
  grid.innerHTML = notes.length ? notes.map(noteCardHtml).join('') : emptyStateHtml('📄','No notes in this folder yet.');
  wireNoteCardActions(grid);
}
document.getElementById('folderCreateNoteBtn').addEventListener('click', () => openNoteModal(null, state.activeFolderId));
document.getElementById('newFolderBtn').addEventListener('click', openFolderModal);

/* Folder modal */
function renderColorSwatches(){
  const container = document.getElementById('folderColorSwatches');
  container.innerHTML = FOLDER_COLORS.map((c,i) => `<div class="swatch ${i===0?'selected':''}" data-color="${c.hex}" title="${c.name}" style="background:${c.hex}"></div>`).join('');
  container.querySelectorAll('.swatch').forEach(s => s.addEventListener('click', () => {
    container.querySelectorAll('.swatch').forEach(x => x.classList.remove('selected'));
    s.classList.add('selected');
  }));
}
function openFolderModal(){
  document.getElementById('folderName').value = '';
  renderColorSwatches();
  renderIconSwatches();
  document.getElementById('folderModalOverlay').classList.add('active');
}
document.getElementById('folderCancelBtn').addEventListener('click', () => document.getElementById('folderModalOverlay').classList.remove('active'));
document.getElementById('folderSaveBtn').addEventListener('click', () => {
  const name = document.getElementById('folderName').value.trim();
  if(!name){ toast('Please enter a folder name'); return; }
  const color = document.querySelector('#folderColorSwatches .swatch.selected').dataset.color;
  const icon = document.querySelector('#folderIconSwatches .icon-swatch.selected').dataset.icon;
  DB.createFolder(currentUser.id, name, color, icon);
  document.getElementById('folderModalOverlay').classList.remove('active');
  toast('Folder created');
  populateFolderSelect();
  refreshCurrentView();
});

function populateFolderSelect(){
  const sel = document.getElementById('noteFolder');
  const folders = DB.getFolders(currentUser.id);
  sel.innerHTML = '<option value="">No folder</option>' + folders.map(f => `<option value="${f.id}">${escapeHtml(f.folder_name)}</option>`).join('');
}

/* ---------------- Favorites ---------------- */
function renderFavorites(){
  const favs = DB.getFavorites(currentUser.id);
  const grid = document.getElementById('favoritesGrid');
  grid.innerHTML = favs.length ? favs.map(noteCardHtml).join('') : emptyStateHtml('⭐','No favorite notes yet. Star a note to pin it here.');
  wireNoteCardActions(grid);
}

/* ---------------- Trash ---------------- */
function renderTrash(){
  const trashed = DB.getTrashed(currentUser.id);
  const grid = document.getElementById('trashGrid');
  grid.innerHTML = trashed.length ? trashed.map(n => `
    <div class="note-card" data-id="${n.id}">
      <h4>${escapeHtml(n.title)}</h4>
      <div class="meta">Deleted note</div>
      <div class="excerpt">${escapeHtml(n.content).slice(0,140) || 'No content.'}</div>
      <div class="actions">
        <button class="mini-action restore-note" data-id="${n.id}">♻ Restore</button>
        <button class="mini-action del perm-del-note" data-id="${n.id}">🗑 Delete Permanently</button>
      </div>
    </div>`).join('') : emptyStateHtml('🗑','Trash is empty.');
  grid.querySelectorAll('.restore-note').forEach(b => b.addEventListener('click', () => { DB.restoreNote(b.dataset.id); toast('Note restored'); renderTrash(); }));
  grid.querySelectorAll('.perm-del-note').forEach(b => b.addEventListener('click', () => {
    if(confirm('Permanently delete this note? This cannot be undone.')){
      DB.deleteNotePermanently(b.dataset.id);
      toast('Note permanently deleted');
      renderTrash();
    }
  }));
}

/* ---------------- Note Modal (Create / Edit) ---------------- */
function updateCategoryDetailVisibility(prefillValue){
  const cat = document.getElementById('noteCategory').value;
  const wrap = document.getElementById('categoryDetailWrap');
  const label = document.getElementById('categoryDetailLabel');
  const input = document.getElementById('noteCategoryDetail');
  if(cat === 'Sports'){
    wrap.classList.remove('hidden');
    label.textContent = 'Sport Name';
    input.placeholder = 'e.g. Cricket, Football...';
  } else if(cat === 'AI'){
    wrap.classList.remove('hidden');
    label.textContent = 'AI Tool / Topic';
    input.placeholder = 'e.g. ChatGPT, Machine Learning, Image generation...';
  } else if(cat === 'Other'){
    wrap.classList.remove('hidden');
    label.textContent = 'Category Name';
    input.placeholder = 'e.g. Custom category name';
  } else {
    wrap.classList.add('hidden');
  }
  input.value = prefillValue !== undefined ? prefillValue : '';
}
document.getElementById('noteCategory').addEventListener('change', () => updateCategoryDetailVisibility());

function openNoteModal(noteId, presetFolderId){
  state.editingNoteId = noteId || null;
  populateFolderSelect();
  const modalTitle = document.getElementById('noteModalTitle');

  if(noteId){
    const note = DB._allNotes().find(n => n.id === noteId);
    modalTitle.textContent = 'Edit Note';
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteFolder').value = note.folderId || '';
    document.getElementById('noteCategory').value = note.category;
    document.getElementById('noteContent').value = note.content;
    document.getElementById('noteFavorite').checked = note.favorite;
    updateCategoryDetailVisibility(note.categoryDetail || '');
  } else {
    modalTitle.textContent = 'Create Note';
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteFolder').value = presetFolderId || '';
    document.getElementById('noteCategory').value = 'AI';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteFavorite').checked = false;
    updateCategoryDetailVisibility('');
  }
  document.getElementById('noteModalOverlay').classList.add('active');
}
document.getElementById('noteCancelBtn').addEventListener('click', () => document.getElementById('noteModalOverlay').classList.remove('active'));
document.getElementById('noteSaveBtn').addEventListener('click', () => {
  const title = document.getElementById('noteTitle').value.trim();
  if(!title){ toast('Please enter a title'); return; }
  const data = {
    title,
    folderId: document.getElementById('noteFolder').value || null,
    category: document.getElementById('noteCategory').value,
    categoryDetail: document.getElementById('noteCategoryDetail').value.trim(),
    content: document.getElementById('noteContent').value,
    favorite: document.getElementById('noteFavorite').checked
  };
  if(state.editingNoteId){
    DB.updateNote(state.editingNoteId, data);
    toast('Note updated');
  } else {
    DB.createNote(currentUser.id, data);
    toast('Note created');
  }
  document.getElementById('noteModalOverlay').classList.remove('active');
  refreshCurrentView();
});
document.getElementById('qaCreateNote').addEventListener('click', () => openNoteModal());
document.getElementById('qaCreateFolder').addEventListener('click', openFolderModal);

/* ---------------- Calendar ---------------- */
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function renderCalendar(){
  const grid = document.getElementById('calGrid');
  document.getElementById('calMonthLabel').textContent = `${MONTH_NAMES[state.calMonth]} ${state.calYear}`;

  const firstDay = new Date(state.calYear, state.calMonth, 1).getDay();
  const daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
  const todayIso = DB.today();

  let html = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="cal-dow">${d}</div>`).join('');
  for(let i=0;i<firstDay;i++) html += `<div class="cal-cell empty"></div>`;

  for(let day=1; day<=daysInMonth; day++){
    const iso = `${state.calYear}-${String(state.calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const hasNote = DB.getDayNotes(currentUser.id, iso).length > 0;
    const isToday = iso === todayIso;
    const isSelected = iso === state.calSelectedDate;
    html += `<div class="cal-cell ${isToday?'today':''} ${isSelected?'selected':''}" data-date="${iso}">
      <div class="num">${day}</div>
      ${hasNote ? '<div class="has-note"></div>' : ''}
    </div>`;
  }
  grid.innerHTML = html;
  grid.querySelectorAll('.cal-cell:not(.empty)').forEach(c => c.addEventListener('click', () => {
    state.calSelectedDate = c.dataset.date;
    renderCalendar();
    renderDayPanel();
  }));
  renderDayPanel();
}

function renderDayPanel(){
  const dateObj = new Date(state.calSelectedDate + 'T00:00:00');
  document.getElementById('dayPanelTitle').textContent = dateObj.toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const list = DB.getDayNotes(currentUser.id, state.calSelectedDate);
  const container = document.getElementById('dayPanelList');
  container.innerHTML = list.length ? list.map(d => `
    <div class="day-note-item ${d.completed ? 'completed':''}" data-id="${d.id}">
      <span>${d.icon || '📌'}</span><span class="task-text">${escapeHtml(d.text)}</span>
      <div class="item-actions">
        <button class="complete-day-panel" data-id="${d.id}">${d.completed ? '✓ Completed' : 'Mark Complete'}</button>
        <button class="remove-btn remove-day-panel" data-id="${d.id}">✕</button>
      </div>
    </div>`).join('') : `<p style="color:var(--ink-faint); font-size:13.5px; padding:6px 0;">No notes saved for this day.</p>`;
  container.querySelectorAll('.complete-day-panel').forEach(b => b.addEventListener('click', () => {
    DB.toggleDayNoteComplete(b.dataset.id);
    renderDayPanel();
    updateNotificationBadge();
  }));
  container.querySelectorAll('.remove-day-panel').forEach(b => b.addEventListener('click', () => {
    DB.removeDayNote(b.dataset.id);
    toast('Task removed');
    renderCalendar();
    updateNotificationBadge();
  }));
}
document.getElementById('dayPanelAddBtn').addEventListener('click', () => {
  const input = document.getElementById('dayPanelInput');
  if(!input.value.trim()) return;
  const icon = document.getElementById('dayPanelIconSelect').value || '📌';
  DB.addDayNote(currentUser.id, state.calSelectedDate, input.value.trim(), icon);
  input.value = '';
  renderCalendar();
  updateNotificationBadge();
});
document.getElementById('calPrev').addEventListener('click', () => {
  state.calMonth--; if(state.calMonth < 0){ state.calMonth = 11; state.calYear--; }
  renderCalendar();
});
document.getElementById('calNext').addEventListener('click', () => {
  state.calMonth++; if(state.calMonth > 11){ state.calMonth = 0; state.calYear++; }
  renderCalendar();
});
document.getElementById('calToday').addEventListener('click', () => {
  const now = new Date();
  state.calYear = now.getFullYear(); state.calMonth = now.getMonth(); state.calSelectedDate = DB.today();
  renderCalendar();
});

/* ---------------- Profile ---------------- */
function renderProfile(){
  document.getElementById('profileNameDisplay').textContent = currentUser.name;
  document.getElementById('profileEmailDisplay').textContent = currentUser.email;
  document.getElementById('profileAvatar').innerHTML = currentUser.avatar ? `<img src="${currentUser.avatar}">` : '👤';
  document.getElementById('pName').value = currentUser.name;
  document.getElementById('pEmail').value = currentUser.email;
  document.getElementById('pPhone').value = currentUser.phone || '';
  document.getElementById('pDob').value = currentUser.dob || '';
  if(currentUser.gender){
    const r = document.querySelector(`input[name=pGender][value="${currentUser.gender}"]`);
    if(r) r.checked = true;
  }
  updateTopAvatar();
}
function updateTopAvatar(){
  document.getElementById('topAvatar').innerHTML = currentUser.avatar ? `<img src="${currentUser.avatar}">` : '👤';
}
document.getElementById('topAvatar').addEventListener('click', () => goToView('view-profile'));
document.getElementById('changePictureBtn').addEventListener('click', () => document.getElementById('profileAvatarFile').click());
document.getElementById('profileAvatar').addEventListener('click', () => document.getElementById('profileAvatarFile').click());
document.getElementById('profileAvatarFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;
  resizeImageFile(file, 320, (dataUrl) => {
    if(!dataUrl){
      toast('Could not read that image. Please try a different photo.');
      return;
    }
    try{
      currentUser = DB.updateUser(currentUser.id, { avatar: dataUrl });
      renderProfile();
      toast('Profile picture updated');
    }catch(err){
      toast('Could not save that picture. Please try a smaller photo.');
    }
  });
});
document.getElementById('updateProfileBtn').addEventListener('click', () => {
  const name = document.getElementById('pName').value.trim();
  const phone = document.getElementById('pPhone').value.trim();
  const dob = document.getElementById('pDob').value;
  const genderEl = document.querySelector('input[name=pGender]:checked');
  if(!name){ toast('Name cannot be empty'); return; }
  currentUser = DB.updateUser(currentUser.id, { name, phone, dob, gender: genderEl ? genderEl.value : currentUser.gender });
  toast('Profile updated');
  renderProfile();
  document.getElementById('welcomeName').textContent = currentUser.name;
});
document.getElementById('changePassBtn').addEventListener('click', () => {
  const cur = document.getElementById('curPass').value;
  const n1 = document.getElementById('newPass').value;
  const n2 = document.getElementById('confPass').value;
  if(cur !== currentUser.password){ toast('Current password is incorrect'); return; }
  if(n1.length < 6){ toast('New password must be at least 6 characters'); return; }
  if(n1 !== n2){ toast('New passwords do not match'); return; }
  currentUser = DB.updateUser(currentUser.id, { password: n1 });
  document.getElementById('curPass').value = '';
  document.getElementById('newPass').value = '';
  document.getElementById('confPass').value = '';
  toast('Password changed successfully');
});

/* ---------------- Settings ---------------- */
function applyTheme(dark){
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.getElementById('themeToggleBtn').textContent = dark ? '🌙' : '☀';
}
function loadSettings(){
  const settings = DB.getSettings(currentUser.id);
  document.getElementById('darkModeToggle').checked = settings.darkMode;
  document.getElementById('notifToggle').checked = settings.notifications;
  document.getElementById('langSelect').value = settings.language;
  applyTheme(settings.darkMode);
  applyI18n(settings.language);
  updateNotificationBadge();
}
document.getElementById('darkModeToggle').addEventListener('change', (e) => {
  const settings = DB.getSettings(currentUser.id);
  settings.darkMode = e.target.checked;
  DB.saveSettings(currentUser.id, settings);
  applyTheme(settings.darkMode);
});
document.getElementById('themeToggleBtn').addEventListener('click', () => {
  const toggle = document.getElementById('darkModeToggle');
  toggle.checked = !toggle.checked;
  toggle.dispatchEvent(new Event('change'));
});
document.getElementById('notifToggle').addEventListener('change', (e) => {
  const settings = DB.getSettings(currentUser.id);
  settings.notifications = e.target.checked;
  DB.saveSettings(currentUser.id, settings);
  updateNotificationBadge();
});
document.getElementById('langSelect').addEventListener('change', (e) => {
  const settings = DB.getSettings(currentUser.id);
  settings.language = e.target.value;
  DB.saveSettings(currentUser.id, settings);
  applyI18n(settings.language);
});

/* Export as PDF (print-ready window) */
document.getElementById('exportBtn').addEventListener('click', () => {
  const notes = DB.getNotes(currentUser.id);
  const win = window.open('', '_blank');
  const rows = notes.map(n => `
    <div style="margin-bottom:22px; padding-bottom:16px; border-bottom:1px solid #ddd;">
      <h3 style="margin:0 0 4px;">${escapeHtml(n.title)} ${n.favorite ? '⭐' : ''}</h3>
      <div style="font-size:12px; color:#777; margin-bottom:8px;">Category: ${escapeHtml(n.category)} · Created: ${formatDate(n.createdAt)}</div>
      <div style="white-space:pre-wrap; font-size:14px; line-height:1.5;">${escapeHtml(n.content)}</div>
    </div>`).join('');
  win.document.write(`
    <html><head><title>MyNotes Export</title>
    <style>body{font-family: Arial, sans-serif; padding:32px; color:#222;} h1{margin-bottom:2px;}</style>
    </head><body>
    <h1>📝 MyNotes — ${escapeHtml(currentUser.name)}</h1>
    <p style="color:#777; margin-bottom:24px;">Exported on ${new Date().toLocaleDateString()}</p>
    ${rows || '<p>No notes to export.</p>'}
    <script>window.onload = () => window.print();<\/script>
    </body></html>`);
  win.document.close();
});

/* ---------------- Init ---------------- */
(function init(){
  populateFolderSelect();
  populateIconSelect('todayIconSelect');
  populateIconSelect('dayPanelIconSelect');
  loadSettings();
  goToView('view-dashboard');
})();
