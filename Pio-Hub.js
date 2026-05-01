/* ============================================================
   Pio-Hub.js — Pioneers Platform Main Script
   - Teacher cards rendering
   - Kids theme toggle
   - Likes system (LocalStorage + Google Sheets backend)
   - Teacher login modal
   ============================================================ */

'use strict';

// ===== CONFIG =====
const CONFIG = {
  APPS_SCRIPT_URL: 'YOUR_APPS_SCRIPT_URL_HERE',
  KIDS_THEME_KEY:  'pio_kids_theme',
};

// ===== STATE =====
let allTeachers  = [];
let activeFilter = 'all';
let isKidsTheme  = localStorage.getItem(CONFIG.KIDS_THEME_KEY) === 'true';

// ===== DEMO DATA =====
// يُستبدل بـ API call من Apps Script لما يبقى جاهز
const DEMO_TEACHERS = [
  { id:'T001', name:'أ. أحمد علي',     subject:'رياضيات',   category:'math',    icon:'📐', lessons:12, exams:8,  likes:47, page:'teacher_ahmed_ali.html' },
  { id:'T002', name:'أ. سارة كمال',    subject:'علوم',      category:'science', icon:'🔬', lessons:9,  exams:6,  likes:38, page:'teacher_sara_kamal.html' },
  { id:'T003', name:'أ. محمود حسن',    subject:'لغة عربية', category:'arabic',  icon:'📖', lessons:15, exams:10, likes:61, page:'teacher_mahmoud_hassan.html' },
  { id:'T004', name:'أ. نورا إبراهيم', subject:'تاريخ',     category:'history', icon:'🏺', lessons:8,  exams:5,  likes:29, page:'teacher_nora_ibrahim.html' },
  { id:'T005', name:'أ. عمر يوسف',     subject:'حاسب آلي', category:'cs',      icon:'💻', lessons:18, exams:12, likes:83, page:'teacher_omar_youssef.html' },
  { id:'T006', name:'أ. ليلى منصور',   subject:'علوم',      category:'science', icon:'🧪', lessons:11, exams:7,  likes:52, page:'teacher_layla_mansour.html' },
  { id:'T007', name:'أ. كريم طارق',    subject:'رياضيات',   category:'math',    icon:'📊', lessons:14, exams:9,  likes:44, page:'teacher_karim_tarek.html' },
  { id:'T008', name:'أ. هبة السيد',    subject:'جغرافيا',   category:'history', icon:'🗺️', lessons:7,  exams:4,  likes:31, page:'teacher_heba_sayed.html' },
];

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  restoreKidsTheme();
  loadTeachers();
});

// ===== LOAD TEACHERS =====
async function loadTeachers() {
  if (CONFIG.APPS_SCRIPT_URL !== 'YOUR_APPS_SCRIPT_URL_HERE') {
    try {
      const res  = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getTeachers`);
      const data = await res.json();
      allTeachers = data;
    } catch (e) {
      console.warn('API fetch failed, using demo data:', e);
      allTeachers = DEMO_TEACHERS;
    }
  } else {
    allTeachers = DEMO_TEACHERS;
  }
  renderCards(allTeachers);
}

// ===== RENDER CARDS =====
function renderCards(teachers) {
  const grid  = document.getElementById('teachersGrid');
  const badge = document.getElementById('countBadge');
  const noRes = document.getElementById('noResults');

  if (!teachers.length) {
    grid.innerHTML = '';
    noRes.style.display = 'block';
    badge.textContent = '0 مدرّس';
    return;
  }
  noRes.style.display = 'none';
  badge.textContent = `${teachers.length} مدرّس`;

  grid.innerHTML = teachers.map((t, i) => {
    const liked     = sessionLikedSet.has(t.id);
    const likeCount = (t.likes || 0) + (liked ? 1 : 0);
    const avatarHTML = t.photo_url
      ? `<img src="${t.photo_url}" alt="${t.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : `<span>${t.name.trim()[3] || '؟'}</span>`;

    return `
    <a class="teacher-card" href="${t.page || '#'}"
       style="animation-delay:${i * 0.07}s"
       onclick="handleCardClick(event, '${t.page || ''}')">
      <div class="card-banner ${t.category || 'default'}">
        <span class="subject-icon">${t.icon || '👤'}</span>
        <div class="card-avatar-wrap">
          <div class="card-avatar">${avatarHTML}</div>
        </div>
      </div>
      <div class="card-body">
        <div class="teacher-name">${t.name}</div>
        <div class="teacher-subject">${t.subject}</div>
        <div class="card-meta">
          <span class="meta-pill">📚 ${t.lessons || 0} درس</span>
          <span class="meta-pill">📝 ${t.exams || 0} امتحان</span>
          <button
            class="like-btn ${liked ? 'liked' : ''}"
            id="like-btn-${t.id}"
            onclick="handleLike(event, '${t.id}')"
            title="${liked ? 'لقد قيّمت هذا المدرّس' : 'أعجبني'}"
          >
            <span class="heart">${liked ? '❤️' : '🤍'}</span>
            <span class="like-count" id="like-count-${t.id}">${likeCount}</span>
          </button>
        </div>
        <div class="card-cta">
          <span class="cta-btn">ابدأ الآن</span>
          <span class="arrow-icon">←</span>
        </div>
      </div>
    </a>`;
  }).join('');
}

// ===== HANDLE CARD CLICK (prevent navigation when clicking like) =====
function handleCardClick(event, page) {
  if (event.defaultPrevented) return;
  if (!page) event.preventDefault();
}

// ===== FILTER =====
function filterCards() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  document.getElementById('noResultsQuery').textContent = q;

  const filtered = allTeachers.filter(t => {
    const matchFilter = activeFilter === 'all' || t.category === activeFilter;
    const matchSearch = !q ||
      t.name.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });
  renderCards(filtered);
}

function setFilter(el, val) {
  activeFilter = val;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  filterCards();
}

// ===== LIKES SYSTEM (Google Sheets backend — toggle like/unlike) =====
// اللايكات بتتحفظ في Sheets بس — مفيش localStorage
// عشان نعرف نميّز المستخدم بدون login بنستخدم visitor ID مؤقت في sessionStorage

function getVisitorId() {
  let vid = sessionStorage.getItem('pio_visitor_id');
  if (!vid) {
    vid = 'v_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
    sessionStorage.setItem('pio_visitor_id', vid);
  }
  return vid;
}

// Cache محلي للسيشن بس — عشان الـ UI يتحرك فورًا من غير ما ننتظر الـ API
const sessionLikedSet = new Set();

async function handleLike(event, teacherId) {
  event.preventDefault();
  event.stopPropagation();

  const visitorId = getVisitorId();
  const isLiked   = sessionLikedSet.has(teacherId);

  // Toggle in session cache
  if (isLiked) {
    sessionLikedSet.delete(teacherId);
  } else {
    sessionLikedSet.add(teacherId);
  }

  // Update UI immediately (optimistic)
  updateLikeUI(teacherId, !isLiked);

  // Sync to Google Sheets
  if (CONFIG.APPS_SCRIPT_URL !== 'YOUR_APPS_SCRIPT_URL_HERE') {
    try {
      const action = isLiked ? 'removeLike' : 'addLike';
      await fetch(
        `${CONFIG.APPS_SCRIPT_URL}?action=${action}&teacher_id=${encodeURIComponent(teacherId)}&visitor_id=${encodeURIComponent(visitorId)}`
      );
    } catch(e) {
      console.warn('Like sync failed:', e);
      // Revert UI on failure
      if (isLiked) sessionLikedSet.add(teacherId);
      else sessionLikedSet.delete(teacherId);
      updateLikeUI(teacherId, isLiked);
    }
  }

  if (!isLiked) showLikeToast();
}

function updateLikeUI(teacherId, nowLiked) {
  const btn      = document.getElementById(`like-btn-${teacherId}`);
  const countEl  = document.getElementById(`like-count-${teacherId}`);
  const teacher  = allTeachers.find(t => t.id === teacherId);

  if (!btn) return;

  const heart = btn.querySelector('.heart');
  if (nowLiked) {
    btn.classList.add('liked');
    heart.textContent = '❤️';
    btn.title = 'إلغاء الإعجاب';
    heart.style.transform = 'scale(1.5)';
    setTimeout(() => { heart.style.transform = ''; }, 400);
  } else {
    btn.classList.remove('liked');
    heart.textContent = '🤍';
    btn.title = 'أعجبني';
  }

  if (countEl && teacher) {
    const delta = nowLiked ? 1 : -1;
    teacher.likes = Math.max(0, (teacher.likes || 0) + delta);
    countEl.textContent = teacher.likes;
  }
}

function showLikeToast() {
  const toast = document.getElementById('likeToast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// ===== KIDS THEME =====
function toggleKidsTheme() {
  isKidsTheme = !isKidsTheme;
  applyKidsTheme(isKidsTheme);
  localStorage.setItem(CONFIG.KIDS_THEME_KEY, String(isKidsTheme));
}

function restoreKidsTheme() {
  if (isKidsTheme) applyKidsTheme(true);
}

function applyKidsTheme(enable) {
  const body    = document.body;
  const fab     = document.getElementById('kidsToggleBtn');
  const logoEl  = document.getElementById('logoIcon');
  const badge   = document.getElementById('heroBadge');
  const tooltip = document.getElementById('kidsFabTooltip');

  if (enable) {
    body.classList.add('kids-theme');
    if (fab) fab.querySelector('.kids-fab-icon').textContent = '🌙';
    if (tooltip) tooltip.textContent = 'الوضع العادي';
    if (logoEl) logoEl.textContent = '🌟';
    if (badge) badge.querySelector('.badge-icon').textContent = '🎉';
  } else {
    body.classList.remove('kids-theme');
    if (fab) fab.querySelector('.kids-fab-icon').textContent = '🧸';
    if (tooltip) tooltip.textContent = 'وضع الأطفال';
    if (logoEl) logoEl.textContent = '🏛️';
    if (badge) badge.querySelector('.badge-icon').textContent = '✦';
  }
}

// ===== DROPDOWN =====
function toggleDropdown() {
  document.getElementById('contactDropdown').classList.toggle('open');
}
document.addEventListener('click', e => {
  const dd = document.getElementById('contactDropdown');
  if (dd && !dd.contains(e.target)) dd.classList.remove('open');
});

// ===== LOGIN MODAL =====
function openLoginModal()  { document.getElementById('loginModal').classList.add('open'); }
function closeLoginModal() {
  document.getElementById('loginModal').classList.remove('open');
  document.getElementById('loginError').style.display = 'none';
}
function closeOnOverlay(e) { if (e.target === e.currentTarget) closeLoginModal(); }

async function handleLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  errEl.style.display = 'none';

  if (!email || !password) {
    errEl.textContent = 'يرجى إدخال البريد وكلمة المرور';
    errEl.style.display = 'block';
    return;
  }

  if (CONFIG.APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
    // Demo mode
    closeLoginModal();
    window.location.href = 'Pio-Teacher-Hub.html';
    return;
  }

  try {
    const url  = `${CONFIG.APPS_SCRIPT_URL}?action=verifyTeacher&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.success) {
      sessionStorage.setItem('teacher_id',   data.teacher_id);
      sessionStorage.setItem('teacher_name', data.name);
      closeLoginModal();
      window.location.href = 'Pio-Teacher-Hub.html';
    } else {
      errEl.textContent = 'البريد أو كلمة المرور غلط';
      errEl.style.display = 'block';
    }
  } catch(e) {
    errEl.textContent = 'خطأ في الاتصال — حاول مرة أخرى';
    errEl.style.display = 'block';
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('loginModal').classList.contains('open')) {
    handleLogin();
  }
  if (e.key === 'Escape' && document.getElementById('loginModal').classList.contains('open')) {
    closeLoginModal();
  }
});


/* ============================================================
   APPS SCRIPT BACKEND — كود جاهز للـ Google Apps Script
   ============================================================
   انسخ الكود ده وحطه في Apps Script بتاع الـ MASTER Sheet

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.openById('YOUR_MASTER_SHEET_ID');

  // ---- getTeachers ----
  if (action === 'getTeachers') {
    const sheet = ss.getSheetByName('MASTER');
    const rows  = sheet.getDataRange().getValues();
    const keys  = rows[0];
    // اجمع عدد اللايكات لكل تيتشر من LIKES sheet
    const likesSheet = ss.getSheetByName('LIKES');
    const likesMap   = {};
    if (likesSheet) {
      const likesData = likesSheet.getDataRange().getValues();
      for (let i = 1; i < likesData.length; i++) {
        likesMap[likesData[i][0]] = likesData[i][1] || 0;
      }
    }
    const data = rows.slice(1).map(r => {
      let obj = {};
      keys.forEach((k,i) => obj[k] = r[i]);
      obj.likes = likesMap[obj.teacher_id] || 0;
      return obj;
    });
    return jsonResponse(data);
  }

  // ---- addLike ----
  if (action === 'addLike') {
    const teacherId = e.parameter.teacher_id;
    const visitorId = e.parameter.visitor_id;
    return handleLikeToggle(ss, teacherId, visitorId, true);
  }

  // ---- removeLike ----
  if (action === 'removeLike') {
    const teacherId = e.parameter.teacher_id;
    const visitorId = e.parameter.visitor_id;
    return handleLikeToggle(ss, teacherId, visitorId, false);
  }

  // ---- verifyTeacher ----
  if (action === 'verifyTeacher') {
    const email    = e.parameter.email;
    const password = e.parameter.password;
    const sheet    = ss.getSheetByName('MASTER');
    const rows     = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][5] === email) {
        const hash = Utilities.computeDigest(
          Utilities.DigestAlgorithm.SHA_256, password
        ).map(b => ('0'+(b & 0xFF).toString(16)).slice(-2)).join('');
        if (rows[i][6] === hash) {
          return jsonResponse({ success: true, teacher_id: rows[i][0], name: rows[i][1] });
        }
      }
    }
    return jsonResponse({ success: false });
  }

  return jsonResponse({ error: 'Unknown action' });
}

// هيكل LIKES sheet:
// teacher_id | likes | visitors (comma-separated visitor IDs)
function handleLikeToggle(ss, teacherId, visitorId, adding) {
  let likesSheet = ss.getSheetByName('LIKES');
  if (!likesSheet) {
    likesSheet = ss.insertSheet('LIKES');
    likesSheet.appendRow(['teacher_id', 'likes', 'visitors']);
  }
  const data = likesSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === teacherId) {
      let visitors = data[i][2] ? data[i][2].toString().split(',') : [];
      const alreadyLiked = visitors.includes(visitorId);
      if (adding && !alreadyLiked) {
        visitors.push(visitorId);
        likesSheet.getRange(i+1, 2).setValue(data[i][1] + 1);
        likesSheet.getRange(i+1, 3).setValue(visitors.join(','));
      } else if (!adding && alreadyLiked) {
        visitors = visitors.filter(v => v !== visitorId);
        likesSheet.getRange(i+1, 2).setValue(Math.max(0, data[i][1] - 1));
        likesSheet.getRange(i+1, 3).setValue(visitors.join(','));
      }
      return jsonResponse({ success: true, likes: data[i][1] });
    }
  }
  // تيتشر جديد في LIKES
  if (adding) {
    likesSheet.appendRow([teacherId, 1, visitorId]);
  }
  return jsonResponse({ success: true });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
============================================================ */
