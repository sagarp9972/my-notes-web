/* =====================================================
   MyNotes — Data layer
   Simulates the Users / Folders / Notes / DayNotes tables
   using localStorage, so the whole app runs from static
   files with no backend/server required.
   ===================================================== */

const DB = {
  KEYS: {
    users: 'mn_users',
    session: 'mn_session',
    folders: 'mn_folders',
    notes: 'mn_notes',
    dayNotes: 'mn_daynotes',
    settings: 'mn_settings_'
  },

  _get(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){ return fallback; }
  },
  _set(key, val){ localStorage.setItem(key, JSON.stringify(val)); },

  uid(){ return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8); },
  today(){ return new Date().toISOString().slice(0,10); },

  /* ---------- Users ---------- */
  getUsers(){ return this._get(this.KEYS.users, []); },
  saveUsers(u){ this._set(this.KEYS.users, u); },
  findUserByEmail(email){
    return this.getUsers().find(u => u.email.toLowerCase() === String(email).toLowerCase());
  },
  createUser(user){
    const users = this.getUsers();
    const record = {
      id: this.uid(),
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: user.password, // demo app only — plain text, not for production
      dob: user.dob || '',
      gender: user.gender || '',
      avatar: user.avatar || null,
      createdAt: new Date().toISOString()
    };
    users.push(record);
    this.saveUsers(users);
    return record;
  },
  updateUser(id, patch){
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if(idx === -1) return null;
    users[idx] = { ...users[idx], ...patch };
    this.saveUsers(users);
    return users[idx];
  },

  /* ---------- Session ---------- */
  getSession(){ return this._get(this.KEYS.session, null); },
  login(userId){ this._set(this.KEYS.session, { userId }); },
  logout(){ localStorage.removeItem(this.KEYS.session); },
  currentUser(){
    const s = this.getSession();
    if(!s) return null;
    return this.getUsers().find(u => u.id === s.userId) || null;
  },

  /* ---------- Folders ---------- */
  getFolders(userId){ return this._get(this.KEYS.folders, []).filter(f => f.userId === userId); },
  _allFolders(){ return this._get(this.KEYS.folders, []); },
  createFolder(userId, name, color, icon){
    const all = this._allFolders();
    const record = { id: this.uid(), userId, folder_name: name, color, folder_icon: icon || '📁', createdAt: new Date().toISOString() };
    all.push(record);
    this._set(this.KEYS.folders, all);
    return record;
  },
  deleteFolder(id){
    const all = this._allFolders().filter(f => f.id !== id);
    this._set(this.KEYS.folders, all);
  },

  /* ---------- Notes ---------- */
  _allNotes(){ return this._get(this.KEYS.notes, []); },
  _saveNotes(n){ this._set(this.KEYS.notes, n); },
  getNotes(userId){ return this._allNotes().filter(n => n.userId === userId && !n.trashed); },
  getTrashed(userId){ return this._allNotes().filter(n => n.userId === userId && n.trashed); },
  getFavorites(userId){ return this.getNotes(userId).filter(n => n.favorite); },
  getByFolder(userId, folderId){ return this.getNotes(userId).filter(n => n.folderId === folderId); },
  createNote(userId, data){
    const all = this._allNotes();
    const now = new Date().toISOString();
    const record = {
      id: this.uid(), userId,
      folderId: data.folderId || null,
      title: data.title, content: data.content || '',
      category: data.category || 'Other',
      categoryDetail: data.categoryDetail || '',
      favorite: !!data.favorite,
      trashed: false,
      createdAt: now, updatedAt: now
    };
    all.push(record);
    this._saveNotes(all);
    return record;
  },
  updateNote(id, patch){
    const all = this._allNotes();
    const idx = all.findIndex(n => n.id === id);
    if(idx === -1) return null;
    all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
    this._saveNotes(all);
    return all[idx];
  },
  trashNote(id){ return this.updateNote(id, { trashed: true }); },
  restoreNote(id){ return this.updateNote(id, { trashed: false }); },
  deleteNotePermanently(id){
    const all = this._allNotes().filter(n => n.id !== id);
    this._saveNotes(all);
  },
  toggleFavorite(id){
    const all = this._allNotes();
    const n = all.find(x => x.id === id);
    if(!n) return;
    n.favorite = !n.favorite;
    this._saveNotes(all);
    return n;
  },

  /* ---------- Day / Calendar notes ("today work") ---------- */
  _allDayNotes(){ return this._get(this.KEYS.dayNotes, []); },
  _saveDayNotes(d){ this._set(this.KEYS.dayNotes, d); },
  getDayNotes(userId, date){ return this._allDayNotes().filter(d => d.userId === userId && d.date === date); },
  getAllDayNotesForUser(userId){ return this._allDayNotes().filter(d => d.userId === userId); },
  addDayNote(userId, date, text, icon){
    const all = this._allDayNotes();
    const record = { id: this.uid(), userId, date, text, icon: icon || '📌', completed:false, createdAt: new Date().toISOString() };
    all.push(record);
    this._saveDayNotes(all);
    return record;
  },
  removeDayNote(id){
    const all = this._allDayNotes().filter(d => d.id !== id);
    this._saveDayNotes(all);
  },
  toggleDayNoteComplete(id){
    const all = this._allDayNotes();
    const d = all.find(x => x.id === id);
    if(!d) return;
    d.completed = !d.completed;
    this._saveDayNotes(all);
    return d;
  },

  /* ---------- Settings ---------- */
  getSettings(userId){
    return this._get(this.KEYS.settings + userId, { darkMode:true, notifications:true, language:'en' });
  },
  saveSettings(userId, settings){ this._set(this.KEYS.settings + userId, settings); }
};

/* ---------- i18n ---------- */
const I18N = {
  en: {
    dashboard:'Dashboard', todayWork:'Today Work', myNotes:'My Notes', folders:'Folders',
    favorites:'Favorites', calendar:'Calendar', trash:'Trash', profile:'Profile',
    settings:'Settings', logout:'Logout', quickActions:'Quick Actions',
    createNote:'Create Note', createFolder:'Create Folder', viewFavorites:'View Favorites',
    recentNotes:'Recent Notes', totalNotes:'Total Notes', favoriteNotes:'Favorite Notes',
    categories:'Categories', welcome:'Welcome'
  },
  kn: {
    dashboard:'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', todayWork:'ಇಂದಿನ ಕೆಲಸ', myNotes:'ನನ್ನ ಟಿಪ್ಪಣಿಗಳು', folders:'ಫೋಲ್ಡರ್‌ಗಳು',
    favorites:'ಮೆಚ್ಚಿನವುಗಳು', calendar:'ಕ್ಯಾಲೆಂಡರ್', trash:'ಕಸದ ಬುಟ್ಟಿ', profile:'ಪ್ರೊಫೈಲ್',
    settings:'ಸೆಟ್ಟಿಂಗ್‌ಗಳು', logout:'ಲಾಗ್ ಔಟ್', quickActions:'ತ್ವರಿತ ಕ್ರಿಯೆಗಳು',
    createNote:'ಟಿಪ್ಪಣಿ ರಚಿಸಿ', createFolder:'ಫೋಲ್ಡರ್ ರಚಿಸಿ', viewFavorites:'ಮೆಚ್ಚಿನವುಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
    recentNotes:'ಇತ್ತೀಚಿನ ಟಿಪ್ಪಣಿಗಳು', totalNotes:'ಒಟ್ಟು ಟಿಪ್ಪಣಿಗಳು', favoriteNotes:'ಮೆಚ್ಚಿನ ಟಿಪ್ಪಣಿಗಳು',
    categories:'ವರ್ಗಗಳು', welcome:'ಸ್ವಾಗತ'
  },
  hi: {
    dashboard:'डैशबोर्ड', todayWork:'आज का काम', myNotes:'मेरे नोट्स', folders:'फ़ोल्डर',
    favorites:'पसंदीदा', calendar:'कैलेंडर', trash:'ट्रैश', profile:'प्रोफ़ाइल',
    settings:'सेटिंग्स', logout:'लॉग आउट', quickActions:'त्वरित कार्य',
    createNote:'नोट बनाएं', createFolder:'फ़ोल्डर बनाएं', viewFavorites:'पसंदीदा देखें',
    recentNotes:'हाल के नोट्स', totalNotes:'कुल नोट्स', favoriteNotes:'पसंदीदा नोट्स',
    categories:'श्रेणियाँ', welcome:'स्वागत है'
  }
};

function applyI18n(lang){
  const dict = I18N[lang] || I18N.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if(dict[key]) el.textContent = dict[key];
  });
}

/* ---------- Shared image helper ----------
   Photos straight from a phone camera can be several MB, which can silently
   fail to save in localStorage (quota limits). This shrinks any picture to
   a small JPEG before we ever try to store it, so uploads always succeed. */
function resizeImageFile(file, maxDim, callback){
  if(!file || !file.type || !file.type.startsWith('image/')){ callback(null); return; }
  const reader = new FileReader();
  reader.onload = function(e){
    const rawDataUrl = e.target.result;
    let finished = false;
    const finish = (result) => { if(finished) return; finished = true; callback(result); };
    const img = new Image();
    img.onload = function(){
      try{
        let { width, height } = img;
        if(width > height){
          if(width > maxDim){ height = Math.round(height * (maxDim / width)); width = maxDim; }
        } else {
          if(height > maxDim){ width = Math.round(width * (maxDim / height)); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        finish(canvas.toDataURL('image/jpeg', 0.85));
      }catch(err){
        finish(rawDataUrl); // resizing failed — fall back to the original photo so it still shows
      }
    };
    img.onerror = function(){ finish(rawDataUrl); };
    img.src = rawDataUrl;
    setTimeout(() => finish(rawDataUrl), 4000); // safety net if the image never fires load/error
  };
  reader.onerror = function(){ callback(null); };
  reader.readAsDataURL(file);
}
