// ============================================================
// PIONEERS ACADEMY — Pio-T-Hub.js
// ============================================================

const API_URL = 'https://script.google.com/macros/s/AKfycby8mKLySPt58BXV8TKnAh5G7REKJCYYW5EXsKQoSKRfzgkZd2YpcCQb-4Zss8Bh_9g-/exec';

// ============================================================
// STATE
// ============================================================
const params       = new URLSearchParams(window.location.search);
const URL_CODE     = params.get('code');
const URL_REGISTER = params.get('register');

let teacherData  = JSON.parse(localStorage.getItem('pioneer_teacher') || 'null');
let groupsData   = [];
let currentStudent = null;
let esraaSlide   = 1;
let esraaType    = '';

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initKidsTheme();
  initModals();
  initTabs();

  document.getElementById('btnEsraa').addEventListener('click', () => {
    resetEsraaModal();
    openModal('esraaModal');
  });

  // لو جاي من URL بكود مباشرة
  if (URL_CODE) {
    document.getElementById('teacherCode').value = URL_CODE;
    doTeacherLogin();
    return;
  }

  // لو جاي عشان يسجل
  if (URL_REGISTER === 'true') {
    switchGateTab('register');
  }

  // لو عنده session محفوظة
  if (teacherData) {
    showDashboard(teacherData);
    loadGroups();
    loadTeacherVideos();
    renderProfileEdit();
    return;
  }

  // عرض الـ Gate
  document.getElementById('gateSection').style.display = 'flex';
});

// ============================================================
// KIDS THEME
// ============================================================
function initKidsTheme() {
  const toggle   = document.getElementById('kidsToggle');
  const isActive = localStorage.getItem('kids_theme') === 'true';
  if (isActive) document.body.classList.add('kids-theme');
  toggle.classList.toggle('active', isActive);
  toggle.addEventListener('click', () => {
    const now = document.body.classList.toggle('kids-theme');
    toggle.classList.toggle('active', now);
    localStorage.setItem('kids_theme', now);
  });
}

// ============================================================
// GATE TABS
// ============================================================
function switchGateTab(tab) {
  document.querySelectorAll('.gate-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('gateLogin').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('gateRegister').style.display = tab === 'register' ? 'block' : 'none';
}

// ============================================================
// LOGIN
// ============================================================
async function doTeacherLogin() {
  const code = document.getElementById('teacherCode')?.value.trim().toUpperCase();
  if (!code || code.length < 6) {
    showError('loginError', 'الكود لازم يكون 8 خانات');
    return;
  }

  showError('loginError', '');
  document.querySelector('.gate-btn')?.setAttribute('disabled', true);

  try {
    const res  = await fetch(API_URL, {
      method: 'POST',
      body:   JSON.stringify({ action: 'verifyTeacher', code })
    });
    const data = await res.json();

    if (!data.success) {
      if (data.pending) {
        showPendingState();
      } else {
        showError('loginError', data.message || 'الكود غلط — تأكد وحاول تاني');
      }
      document.querySelector('.gate-btn')?.removeAttribute('disabled');
      return;
    }

    // نجح — نحفظ ونعرض الداشبورد
    data.code = code;
    teacherData = data;
    localStorage.setItem('pioneer_teacher', JSON.stringify(data));
    showDashboard(data);
    await loadGroups();
    await loadTeacherVideos();
    renderProfileEdit();

  } catch (err) {
    showError('loginError', 'مش قادر يتصل بالسيرفر — حاول تاني');
    document.querySelector('.gate-btn')?.removeAttribute('disabled');
  }
}

function showPendingState() {
  document.getElementById('gateSection').innerHTML = `
    <div class="gate-card">
      <div class="pending-state">
        <div class="pending-icon">⏳</div>
        <h2>بياناتك بتتراجع</h2>
        <p>الكود بتاعك اتبعتلك — بس الحساب لسه بيتراجع من مس إسراء<br>
        هتقدر تدخل بمجرد ما الإدارة توافق على حسابك</p>
      </div>
    </div>`;
}

// ============================================================
// REGISTER
// ============================================================
async function doTeacherRegister() {
  const name     = document.getElementById('regFullName').value.trim();
  const phone    = document.getElementById('regPhone').value.trim();
  const whatsapp = document.getElementById('regWhatsapp').value.trim();
  const subjects = document.getElementById('regSubjects').value.trim();
  const photoFile= document.getElementById('regPhoto').files[0];

  if (!name || !phone) {
    showError('registerError', 'الاسم ورقم التليفون مطلوبين');
    return;
  }

  showError('registerError', '');

  try {
    // لو في صورة — نحوّلها base64 مؤقتاً
    let photo_url = '';
    if (photoFile) {
      photo_url = await fileToBase64(photoFile);
    }

    const res  = await fetch(API_URL, {
      method: 'POST',
      body:   JSON.stringify({ action: 'registerTeacher', name, phone, whatsapp, subjects, photo_url })
    });
    const data = await res.json();

    if (data.error) { showError('registerError', data.error); return; }

    // عرض الكود للتيتشر
    document.getElementById('gateSection').innerHTML = `
      <div class="gate-card" style="text-align:center">
        <div class="gate-icon">🎉</div>
        <h2 class="gate-title">تم التسجيل!</h2>
        <p class="gate-desc">احتفظ بالكود ده — هتحتاجه عشان تدخل على بورتالك</p>
        <div class="code-input-wrap" style="margin:24px 0">
          <div class="code-input" style="cursor:default;letter-spacing:6px">${data.code}</div>
        </div>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:20px">
          بياناتك بتتراجع من الإدارة — لما توافق هتقدر تدخل بالكود ده
        </p>
        <button class="gate-btn" onclick="copyCode('${data.code}')">📋 انسخ الكود</button>
      </div>`;

  } catch (err) {
    showError('registerError', 'خطأ في الاتصال — حاول تاني');
  }
}

function copyCode(code) {
  navigator.clipboard.writeText(code).then(() => alert('✅ تم نسخ الكود!'));
}

function previewPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('photoPreview').src     = e.target.result;
    document.getElementById('photoPreview').style.display = 'block';
    document.getElementById('photoLabelText').textContent = file.name;
  };
  reader.readAsDataURL(file);
}

// ============================================================
// DASHBOARD
// ============================================================
function showDashboard(data) {
  document.getElementById('gateSection').style.display = 'none';
  document.getElementById('dashboard').style.display   = 'block';
  document.getElementById('btnLogout').style.display   = 'flex';

  // Nav center
  document.getElementById('navCenter').textContent = `مرحباً يا ${data.name?.split(' ')[0]}`;

  // Avatar
  const avatarEl = document.getElementById('profileAvatar');
  if (data.photo_url) {
    avatarEl.innerHTML = `<img src="${data.photo_url}" alt="${data.name}">`;
  } else {
    avatarEl.textContent = data.name?.charAt(0) || '؟';
  }

  // Status
  const statusEl = document.getElementById('profileStatus');
  statusEl.className = 'profile-status';

  // Info
  document.getElementById('profileCode').textContent    = data.code || '';
  document.getElementById('profileName').textContent    = data.name || '';
  document.getElementById('profileSubject').textContent = data.subject || '';

  // Page title
  document.title = `${data.name} — Pioneers Teacher`;

  // Esraa greeting
  document.getElementById('teacherGreeting').textContent = data.name?.split(' ')[0] || '';
}

function logoutTeacher() {
  if (!confirm('هتطلع من حسابك؟')) return;
  teacherData = null;
  localStorage.removeItem('pioneer_teacher');
  window.location.reload();
}

// ============================================================
// TABS
// ============================================================
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

// ============================================================
// GROUPS & STUDENTS
// ============================================================
async function loadGroups() {
  const list = document.getElementById('groupsList');
  if (!teacherData) return;

  try {
    const res  = await fetch(`${API_URL}?action=getGroups&teacher_id=${teacherData.teacher_id}`);
    const data = await res.json();
    groupsData  = data.groups || [];

    if (groupsData.length === 0) {
      list.innerHTML = `
        <div style="text-align:center;padding:60px 24px;color:var(--text-dim)">
          <div style="font-size:48px;margin-bottom:16px">👥</div>
          <p>مفيش جروبات لسه — الإدارة هتضيفها قريباً</p>
        </div>`;
      return;
    }

    // Stats
    const totalStudents = groupsData.reduce((sum, g) => sum + (g.students?.length || 0), 0);
    document.getElementById('statGroups').textContent   = groupsData.length;
    document.getElementById('statStudents').textContent = totalStudents;

    list.innerHTML = groupsData.map((g, i) => buildGroupCard(g, i)).join('');

    // Toggle groups
    list.querySelectorAll('.group-card-header').forEach(header => {
      header.addEventListener('click', () => {
        const card = header.closest('.group-card');
        card.classList.toggle('open');
      });
    });

    // Rating buttons
    list.querySelectorAll('.student-mini-card').forEach(card => {
      card.addEventListener('click', () => {
        const sid = card.dataset.studentId;
        const gid = card.dataset.groupId;
        openRatingModal(sid, gid);
      });
    });

  } catch (err) {
    list.innerHTML = `<div style="color:var(--red);padding:20px">تعذّر تحميل الجروبات</div>`;
  }
}

function buildGroupCard(group, index) {
  const emojis  = ['🟡','🔵','🟢','🟣','🔴','🟠'];
  const emoji   = emojis[index % emojis.length];
  const count   = group.students?.length || 0;

  const studentsHtml = count === 0
    ? `<p style="color:var(--text-dim);font-size:13px">مفيش طلاب في الجروب ده لسه</p>`
    : `<div class="students-mini-grid">${group.students.map(s => buildStudentMiniCard(s, group.group_id)).join('')}</div>`;

  return `
    <div class="group-card" data-group-id="${group.group_id}">
      <div class="group-card-header">
        <div class="group-card-left">
          <div class="group-emoji">${emoji}</div>
          <div>
            <div class="group-name">${group.group_name}</div>
            <div class="group-schedule">📅 ${group.schedule}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="group-count">${count} طالب</div>
          <div class="group-arrow">›</div>
        </div>
      </div>
      <div class="group-students-panel">${studentsHtml}</div>
    </div>`;
}

function buildStudentMiniCard(student, groupId) {
  const attend = student.attend_history?.slice(-1)[0] || '—';
  const focus  = student.focus_history?.slice(-1)[0]  || '—';
  const hw     = student.hw_history?.slice(-1)[0]     || '—';

  const prevAttend = student.attend_history?.slice(-2, -1)[0] || null;
  const diff       = prevAttend ? parseInt(attend) - parseInt(prevAttend) : null;
  const diffColor  = diff === null ? '' : diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--red)' : 'var(--gold)';
  const diffText   = diff === null ? '' : `${diff > 0 ? '+' : ''}${diff}%`;

  const avatarHtml = student.student_photo
    ? `<img src="${student.student_photo}" alt="${student.student_name}">`
    : student.student_name?.charAt(0) || '؟';

  const bars = [
    { label: 'حضور', val: parseInt(attend) || 0, color: '#4ADE80' },
    { label: 'تركيز', val: parseInt(focus)  || 0, color: '#60A5FA' },
    { label: 'واجب',  val: parseInt(hw)     || 0, color: '#F5C842' }
  ];

  const barsHtml = bars.map(b => `
    <div class="smc-bar-row">
      <div class="smc-bar-label">${b.label}</div>
      <div class="smc-bar-wrap">
        <div class="smc-bar" style="width:${b.val}%;background:${b.color}"></div>
      </div>
      <div class="smc-bar-val">${b.val}%</div>
    </div>`).join('');

  return `
    <div class="student-mini-card" data-student-id="${student.student_id}" data-group-id="${groupId}">
      <div class="smc-avatar">${avatarHtml}</div>
      <div class="smc-info">
        <div class="smc-name">${student.student_name}</div>
        <div class="smc-grade">${student.grade}</div>
        <div class="smc-bars">${barsHtml}</div>
        ${diff !== null ? `<div class="smc-diff" style="color:${diffColor};font-size:10px;margin-top:4px">حضور: ${diffText}</div>` : ''}
      </div>
    </div>`;
}

// ============================================================
// RATING MODAL
// ============================================================
function openRatingModal(studentId, groupId) {
  const group   = groupsData.find(g => g.group_id === groupId);
  const student = group?.students?.find(s => s.student_id === studentId);
  if (!student) return;

  currentStudent = { ...student, groupId };

  // Header
  const avatarHtml = student.student_photo
    ? `<img src="${student.student_photo}" alt="${student.student_name}">`
    : student.student_name?.charAt(0) || '؟';

  document.getElementById('ratingStudentHeader').innerHTML = `
    <div class="rs-avatar">${avatarHtml}</div>
    <div>
      <div class="rs-name">${student.student_name}</div>
      <div class="rs-grade">${student.grade}</div>
    </div>`;

  // Reset sliders
  ['attend','focus','commit','hw','weekly'].forEach(key => {
    const slider = document.getElementById(`r_${key}`);
    const val    = key === 'weekly' ? 100 : 80;
    slider.value = val;
    document.getElementById(`val_${key}`).textContent = `${val}%`;
  });

  document.getElementById('ratingSuccess').style.display = 'none';
  openModal('ratingModal');
}

function updateSliderVal(key, val) {
  const el    = document.getElementById(`val_${key}`);
  el.textContent = `${val}%`;

  // لون الـ slider بيتغير حسب القيمة
  const color = val >= 75 ? 'var(--green)' : val >= 50 ? 'var(--gold)' : 'var(--red)';
  el.style.color = color;
}

async function submitRating() {
  if (!currentStudent || !teacherData) return;

  const attend = document.getElementById('r_attend').value;
  const focus  = document.getElementById('r_focus').value;
  const commit = document.getElementById('r_commit').value;
  const hw     = document.getElementById('r_hw').value;
  const weekly = document.getElementById('r_weekly').value;

  try {
    const res  = await fetch(API_URL, {
      method: 'POST',
      body:   JSON.stringify({
        action:     'submitRating',
        teacher_id: teacherData.teacher_id,
        student_id: currentStudent.student_id,
        attend, focus, commit, hw, weekly
      })
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('ratingSuccess').style.display = 'block';
      setTimeout(() => {
        closeModal('ratingModal');
        loadGroups(); // Reload
      }, 1500);
    }
  } catch {
    alert('تعذّر حفظ التقييم — حاول تاني');
  }
}

// ============================================================
// VIDEOS
// ============================================================
async function loadTeacherVideos() {
  if (!teacherData) return;
  const grid = document.getElementById('teacherVideosGrid');

  try {
    const res  = await fetch(`${API_URL}?action=getTeacherVideos&teacher_id=${teacherData.teacher_id}`);
    const data = await res.json();
    const vids  = data.videos || [];

    document.getElementById('statVideos').textContent = vids.length;

    if (vids.length === 0) {
      grid.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--text-dim);grid-column:1/-1">
          <div style="font-size:40px;margin-bottom:12px">🎬</div>
          <p>مفيش فيديوهات منشورة لسه</p>
        </div>`;
      return;
    }

    grid.innerHTML = vids.map((url, i) => {
      const embedUrl = youtubeEmbed(url);
      return `
        <div class="video-card">
          <div class="video-embed">
            <iframe src="${embedUrl}" allowfullscreen loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
            </iframe>
          </div>
          <div class="video-info">
            <div class="video-num">فيديو ${i + 1}</div>
            <div class="video-title">فيديو شرح</div>
          </div>
        </div>`;
    }).join('');

  } catch {
    grid.innerHTML = `<div style="color:var(--red)">تعذّر تحميل الفيديوهات</div>`;
  }
}

function youtubeEmbed(url) {
  try {
    const u  = new URL(url);
    const id = u.searchParams.get('v') || u.pathname.split('/').pop();
    return `https://www.youtube.com/embed/${id}`;
  } catch { return url; }
}

function handleVideoFile(input) {
  const file = input.files[0];
  if (!file) return;
  const mb = (file.size / 1024 / 1024).toFixed(1);
  document.getElementById('dropZoneText').textContent = `✅ ${file.name} (${mb} MB)`;
  document.getElementById('fileDropZone').classList.add('drag-over');
}

function handleContentFile(input) {
  const file = input.files[0];
  if (!file) return;
  const mb = (file.size / 1024 / 1024).toFixed(1);
  document.getElementById('contentDropText').textContent = `✅ ${file.name} (${mb} MB)`;
  document.getElementById('contentDropZone').classList.add('drag-over');
}

async function uploadVideo() {
  const title = document.getElementById('videoTitle').value.trim();
  const file  = document.getElementById('videoFile').files[0];

  if (!file) { alert('اختار فيديو الأول'); return; }
  if (!title) { alert('اكتب عنوان الفيديو'); return; }

  const progressWrap = document.getElementById('uploadProgressWrap');
  const progressBar  = document.getElementById('uploadProgressBar');
  const progressText = document.getElementById('uploadProgressText');

  progressWrap.style.display = 'flex';

  // Simulate progress لأن Drive upload بيحتاج Apps Script خاص
  let prog = 0;
  const interval = setInterval(() => {
    prog = Math.min(prog + Math.random() * 15, 90);
    progressBar.style.setProperty('--prog', `${prog}%`);
    progressText.textContent = `${Math.round(prog)}%`;
  }, 400);

  try {
    // بنبعت للـ API إن التيتشر رفع فيديو — الـ API هيتعامل مع Drive
    const base64 = await fileToBase64(file);
    const res    = await fetch(API_URL, {
      method: 'POST',
      body:   JSON.stringify({
        action:     'uploadVideo',
        teacher_id: teacherData.teacher_id,
        teacher_code: teacherData.code,
        teacher_name: teacherData.name,
        title,
        file_base64: base64,
        file_name:   file.name
      })
    });

    clearInterval(interval);
    progressBar.style.setProperty('--prog', '100%');
    progressText.textContent = '100%';

    setTimeout(() => {
      progressWrap.style.display = 'none';
      alert('✅ تم رفع الفيديو — هيظهر على بروفايلك بعد مراجعة مس إسراء');
      document.getElementById('videoTitle').value = '';
      document.getElementById('videoFile').value  = '';
      document.getElementById('dropZoneText').textContent = 'اضغط هنا أو اسحب الفيديو';
      document.getElementById('fileDropZone').classList.remove('drag-over');
    }, 500);

  } catch {
    clearInterval(interval);
    progressWrap.style.display = 'none';
    alert('تعذّر رفع الفيديو — حاول تاني');
  }
}

async function uploadContent() {
  const title   = document.getElementById('contentTitle').value.trim();
  const type    = document.getElementById('contentType').value;
  const file    = document.getElementById('contentFile').files[0];

  if (!file)  { alert('اختار ملف الأول'); return; }
  if (!title) { alert('اكتب اسم الملف'); return; }

  try {
    const base64 = await fileToBase64(file);
    await fetch(API_URL, {
      method: 'POST',
      body:   JSON.stringify({
        action:       'uploadContent',
        teacher_id:   teacherData.teacher_id,
        teacher_name: teacherData.name,
        title, type,
        file_base64:  base64,
        file_name:    file.name
      })
    });
    alert('✅ تم رفع الملف — هيتم مراجعته من الإدارة');
    document.getElementById('contentTitle').value = '';
    document.getElementById('contentFile').value  = '';
    document.getElementById('contentDropText').textContent = 'اضغط هنا أو اسحب الملف (PDF أو Word)';
    document.getElementById('contentDropZone').classList.remove('drag-over');
  } catch {
    alert('تعذّر رفع الملف — حاول تاني');
  }
}

// ============================================================
// PROFILE EDIT
// ============================================================
function renderProfileEdit() {
  if (!teacherData) return;
  const card = document.getElementById('profileEditCard');
  card.innerHTML = `
    <div class="profile-edit-row">
      <span class="per-label">الكود</span>
      <span class="per-code">${teacherData.code || '——'}</span>
    </div>
    <div class="profile-edit-row">
      <span class="per-label">الاسم</span>
      <span class="per-val">${teacherData.name || '——'}</span>
    </div>
    <div class="profile-edit-row">
      <span class="per-label">المادة</span>
      <span class="per-val">${teacherData.subject || '——'}</span>
    </div>
    <div class="profile-edit-row">
      <span class="per-label">التليفون</span>
      <span class="per-val" style="font-family:var(--mono)">${teacherData.phone || '——'}</span>
    </div>
    <div class="profile-edit-row" style="border-bottom:none;padding-top:20px">
      <span class="per-label" style="color:var(--text-dim);font-size:12px">
        لتعديل بياناتك تواصل مع الإدارة عبر زرار "ابعت لمس إسراء"
      </span>
    </div>`;
}

// ============================================================
// ESRAA MODAL
// ============================================================
function resetEsraaModal() {
  esraaSlide = 1; esraaType = '';
  showEsraaSlide(1);
  document.getElementById('teacherGreeting').textContent =
    teacherData?.name?.split(' ')[0] || '';
}

function esraaNext() { showEsraaSlide(esraaSlide + 1); }

function showEsraaSlide(n) {
  document.querySelectorAll('#esraaSlides .slide').forEach((s, i) =>
    s.classList.toggle('active', i + 1 === n));
  document.querySelectorAll('#esraaDots .dot').forEach((d, i) =>
    d.classList.toggle('active', i + 1 === n));
  esraaSlide = n;
}

function selectType(btn) {
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  esraaType = btn.dataset.type;
  setTimeout(() => esraaNext(), 300);
}

async function sendEsraaMessage() {
  const message = document.getElementById('esraaMessage').value.trim();
  if (!message) return;
  try {
    await fetch(API_URL, {
      method: 'POST',
      body:   JSON.stringify({
        action:      'submitMessage',
        parent_id:   teacherData?.teacher_id || null,
        parent_name: teacherData?.name       || 'مدرّس',
        whatsapp:    teacherData?.phone      || null,
        type:        esraaType,
        message
      })
    });
  } catch {}
  showEsraaSlide(4);
}

// ============================================================
// MODALS
// ============================================================
function initModals() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
      document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
  });
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

// ============================================================
// HELPERS
// ============================================================
function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Drag & Drop
document.addEventListener('DOMContentLoaded', () => {
  ['fileDropZone', 'contentDropZone'].forEach(zoneId => {
    const zone = document.getElementById(zoneId);
    if (!zone) return;
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop',      e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const inputId = zoneId === 'fileDropZone' ? 'videoFile' : 'contentFile';
      const input   = document.getElementById(inputId);
      if (input && e.dataTransfer.files[0]) {
        const dt = new DataTransfer();
        dt.items.add(e.dataTransfer.files[0]);
        input.files = dt.files;
        zoneId === 'fileDropZone' ? handleVideoFile(input) : handleContentFile(input);
      }
    });
  });
});
