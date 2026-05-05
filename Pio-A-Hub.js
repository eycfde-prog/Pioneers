// ============================================================
// PIONEERS ACADEMY — Pio-A-Hub.js
// ============================================================

const API_URL       = 'YOUR_APPS_SCRIPT_URL_HERE';
const ADMIN_PASSWORD = 'pioneers2025'; // ← غيّريه لباسورد قوي

// ============================================================
// STATE
// ============================================================
let allTeachers  = [];
let allBookings  = [];
let allGroups    = [];
let allParents   = [];
let allMessages  = [];
let currentTeacherId = null;
let currentTeacherSlots = [];
let currentTeacherYTLinks = [];
let studentRows  = 0;

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // لو logged in من قبل
  if (localStorage.getItem('pioneer_admin') === 'true') {
    showAdminLayout();
  }

  // Clock
  updateClock();
  setInterval(updateClock, 1000);

  // Modals
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
      document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
  });

  // Apply saved settings
  applySettings();
});

// ============================================================
// CLOCK
// ============================================================
function updateClock() {
  const now = new Date();
  const timeEl = document.getElementById('topbarTime');
  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString('ar-EG', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
}

// ============================================================
// GATE — LOGIN
// ============================================================
function doAdminLogin() {
  const password = document.getElementById('adminPassword').value;
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem('pioneer_admin', 'true');
    showAdminLayout();
  } else {
    document.getElementById('gateError').textContent = '❌ الباسورد غلط — حاولي تاني';
    document.getElementById('adminPassword').value = '';
  }
}

function showAdminLayout() {
  document.getElementById('adminGate').style.display   = 'none';
  document.getElementById('adminLayout').style.display = 'flex';
  loadAllData();
}

function adminLogout() {
  if (!confirm('هتطلعي من الأدمن؟')) return;
  localStorage.removeItem('pioneer_admin');
  window.location.reload();
}

// ============================================================
// SIDEBAR TOGGLE
// ============================================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.querySelector('.admin-main');

  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('full');
  }
}

// ============================================================
// TABS
// ============================================================
function switchTab(tabName, btn) {
  // Nav items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

  // Panels
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-${tabName}`)?.classList.add('active');

  // Topbar title
  const titles = {
    overview: 'التقارير', teachers: 'المدرّسين', bookings: 'الحجوزات',
    groups: 'الجروبات', parents: 'أولياء الأمور', inbox: 'الإنبوكس',
    'teacher-detail': 'بيانات المدرّس'
  };
  document.getElementById('topbarTitle').textContent = titles[tabName] || tabName;

  // Mobile: close sidebar
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

// ============================================================
// LOAD ALL DATA
// ============================================================
async function loadAllData() {
  await Promise.all([
    loadTeachers(),
    loadBookings(),
    loadGroups(),
    loadParents(),
    loadMessages()
  ]);
  renderOverview();
}

// ============================================================
// TEACHERS
// ============================================================
async function loadTeachers() {
  try {
    const res  = await fetch(`${API_URL}?action=getTeachers`);
    const data = await res.json();
    // نجيب كل التيتشرز (active + pending) من MASTER
    allTeachers = Array.isArray(data) ? data : [];
    renderTeachers();
  } catch { allTeachers = []; }
}

function renderTeachers() {
  const query    = document.getElementById('teachersSearch')?.value.toLowerCase() || '';
  const active   = allTeachers.filter(t => t.status !== 'pending' && matchSearch(t, query));
  const pending  = allTeachers.filter(t => t.status === 'pending' && matchSearch(t, query));

  document.getElementById('teachersCountBadge').textContent = active.length;

  // Pending block
  const pendingBlock = document.getElementById('pendingTeachersBlock');
  const pendingCards = document.getElementById('pendingTeachersCards');
  if (pending.length > 0) {
    pendingBlock.style.display = 'block';
    pendingCards.innerHTML = pending.map(t => buildTeacherAdminCard(t, true)).join('');
  } else {
    pendingBlock.style.display = 'none';
  }

  // Active
  const cards = document.getElementById('teachersCards');
  if (active.length === 0) {
    cards.innerHTML = `<div class="td-loading">مفيش مدرّسين لسه</div>`;
    return;
  }
  cards.innerHTML = active.map(t => buildTeacherAdminCard(t, false)).join('');
}

function buildTeacherAdminCard(t, isPending) {
  const avatarHtml = t.photo_url
    ? `<img src="${t.photo_url}" alt="${t.name}">`
    : (t.name?.charAt(0) || '؟');

  const rating = t.rating_count > 0
    ? (t.rating_total / t.rating_count).toFixed(1)
    : '0.0';

  return `
    <div class="teacher-admin-card">
      <div class="tac-header">
        <div class="tac-avatar">${avatarHtml}</div>
        <div>
          <div class="tac-name">${t.name}</div>
          <div class="tac-subject">${t.subject || '—'}</div>
          <div class="tac-code">${t.teacher_id || ''}</div>
        </div>
      </div>
      <div class="tac-actions">
        ${isPending
          ? `<button class="btn-confirm" onclick="approveTeacher('${t.teacher_id}')">✅ موافقة</button>
             <button class="btn-reject"  onclick="rejectTeacher('${t.teacher_id}')">❌ رفض</button>`
          : `<button class="btn-view" onclick="openTeacherDetail('${t.teacher_id}')">📋 عرض وتعديل</button>
             <span style="font-size:11px;color:var(--text-muted)">⭐ ${rating} | ❤️ ${t.likes||0}</span>`
        }
      </div>
    </div>`;
}

function filterTeachers() { renderTeachers(); }

async function approveTeacher(id) {
  if (!confirm('هتوافقي على التيتشر ده؟')) return;
  try {
    await fetch(API_URL, {
      method: 'POST',
      body:   JSON.stringify({ action: 'approveTeacher', teacher_id: id })
    });
    await loadTeachers();
    renderOverview();
  } catch { alert('خطأ في الموافقة'); }
}

async function rejectTeacher(id) {
  if (!confirm('هترفضي التيتشر ده؟')) return;
  try {
    await fetch(API_URL, {
      method: 'POST',
      body:   JSON.stringify({ action: 'updateTeacher', teacher_id: id, field: 'status', value: 'rejected' })
    });
    await loadTeachers();
  } catch { alert('خطأ في الرفض'); }
}

// ============================================================
// TEACHER DETAIL
// ============================================================
function openTeacherDetail(teacherId) {
  currentTeacherId = teacherId;
  const teacher    = allTeachers.find(t => t.teacher_id === teacherId);
  if (!teacher) return;

  currentTeacherSlots   = teacher.slots ? teacher.slots.split('|').filter(Boolean) : [];
  currentTeacherYTLinks = teacher.youtube_links ? teacher.youtube_links.split('|').filter(Boolean) : [];

  const avatarHtml = teacher.photo_url
    ? `<img src="${teacher.photo_url}" alt="${teacher.name}">`
    : (teacher.name?.charAt(0) || '؟');

  const slotsHtml = currentTeacherSlots.map((s, i) => `
    <div class="slot-tag" data-index="${i}">
      ${s}
      <button class="slot-remove" onclick="removeSlot(${i})">✕</button>
    </div>`).join('');

  const ytHtml = currentTeacherYTLinks.map((url, i) => `
    <div class="yt-link-row">
      <input type="text" class="yt-link-input" value="${url}" id="yt_${i}"
             placeholder="رابط يوتيوب..." oninput="updateYTLink(${i}, this.value)">
      <button class="btn-yt-remove" onclick="removeYTLink(${i})">✕</button>
    </div>`).join('');

  document.getElementById('teacherDetailWrap').innerHTML = `
    <div class="td-profile-row">
      <div class="td-avatar">${avatarHtml}</div>
      <div>
        <div class="td-name">${teacher.name}</div>
        <div class="td-subject">${teacher.subject || '—'}</div>
        <div class="td-code-badge">${teacher.teacher_id}</div>
      </div>
    </div>

    <!-- بيانات أساسية -->
    <div class="td-edit-grid">
      <div class="td-field">
        <label>الاسم</label>
        <input type="text" id="td_name" value="${teacher.name || ''}">
      </div>
      <div class="td-field">
        <label>المادة</label>
        <input type="text" id="td_subject" value="${teacher.subject || ''}">
      </div>
      <div class="td-field">
        <label>التليفون</label>
        <input type="tel" id="td_phone" value="${teacher.phone || ''}">
      </div>
      <div class="td-field">
        <label>واتساب</label>
        <input type="tel" id="td_whatsapp" value="${teacher.whatsapp || ''}">
      </div>
      <div class="td-field">
        <label>الحالة</label>
        <select id="td_status">
          <option value="active"    ${teacher.status==='active'    ? 'selected':''}>نشط</option>
          <option value="pending"   ${teacher.status==='pending'   ? 'selected':''}>في الانتظار</option>
          <option value="suspended" ${teacher.status==='suspended' ? 'selected':''}>موقوف</option>
        </select>
      </div>
    </div>

    <!-- أسعار المحاضرات -->
    <div class="settings-label" style="margin-bottom:10px">💰 أجر المحاضرة (بالجنيه)</div>
    <div class="prices-grid">
      <div class="td-field">
        <label>KG</label>
        <input type="number" id="td_price_kg" value="${teacher.price_kg || 0}">
      </div>
      <div class="td-field">
        <label>ابتدائي</label>
        <input type="number" id="td_price_primary" value="${teacher.price_primary || 0}">
      </div>
      <div class="td-field">
        <label>إعدادي</label>
        <input type="number" id="td_price_prep" value="${teacher.price_prep || 0}">
      </div>
      <div class="td-field">
        <label>ثانوي</label>
        <input type="number" id="td_price_secondary" value="${teacher.price_secondary || 0}">
      </div>
    </div>

    <!-- المواعيد -->
    <div class="slots-manager">
      <div class="settings-label" style="margin-bottom:10px">📅 المواعيد المتاحة</div>
      <div class="slots-list" id="slotsList">${slotsHtml || '<span style="color:var(--text-muted);font-size:13px">مفيش مواعيد</span>'}</div>
      <div class="slot-add-row">
        <input type="text" class="slot-input" id="newSlotInput" placeholder="مثال: السبت 5م">
        <button class="btn-add-slot" onclick="addSlot()">+ إضافة</button>
      </div>
    </div>

    <!-- روابط يوتيوب -->
    <div class="yt-links-section">
      <div class="settings-label" style="margin-bottom:10px">🎬 روابط الفيديوهات (YouTube)</div>
      <div id="ytLinksList">${ytHtml}</div>
      <button class="btn-yt-add" onclick="addYTLink()">+ إضافة رابط</button>
    </div>

    <button class="btn-primary" style="width:100%;margin-top:20px" onclick="saveTeacherDetail()">
      💾 حفظ كل التعديلات
    </button>
    <div style="color:var(--green);font-size:13px;text-align:center;margin-top:8px;min-height:20px" id="td_success"></div>`;

  switchTab('teacher-detail');
}

function addSlot() {
  const input = document.getElementById('newSlotInput');
  const val   = input.value.trim();
  if (!val) return;
  currentTeacherSlots.push(val);
  input.value = '';
  refreshSlotsUI();
}

function removeSlot(index) {
  currentTeacherSlots.splice(index, 1);
  refreshSlotsUI();
}

function refreshSlotsUI() {
  const list = document.getElementById('slotsList');
  if (!list) return;
  list.innerHTML = currentTeacherSlots.length
    ? currentTeacherSlots.map((s, i) => `
        <div class="slot-tag" data-index="${i}">
          ${s}
          <button class="slot-remove" onclick="removeSlot(${i})">✕</button>
        </div>`).join('')
    : '<span style="color:var(--text-muted);font-size:13px">مفيش مواعيد</span>';
}

function addYTLink() {
  currentTeacherYTLinks.push('');
  refreshYTLinksUI();
}

function removeYTLink(index) {
  currentTeacherYTLinks.splice(index, 1);
  refreshYTLinksUI();
}

function updateYTLink(index, value) {
  currentTeacherYTLinks[index] = value;
}

function refreshYTLinksUI() {
  const list = document.getElementById('ytLinksList');
  if (!list) return;
  list.innerHTML = currentTeacherYTLinks.map((url, i) => `
    <div class="yt-link-row">
      <input type="text" class="yt-link-input" value="${url}" id="yt_${i}"
             placeholder="رابط يوتيوب..." oninput="updateYTLink(${i}, this.value)">
      <button class="btn-yt-remove" onclick="removeYTLink(${i})">✕</button>
    </div>`).join('');
}

async function saveTeacherDetail() {
  if (!currentTeacherId) return;

  // اجمع روابط اليوتيوب من الـ inputs
  const ytInputs = document.querySelectorAll('.yt-link-input');
  const ytLinks  = [...ytInputs].map(i => i.value.trim()).filter(Boolean);

  const updates = [
    { field: 'name',            value: document.getElementById('td_name')?.value.trim() },
    { field: 'subject',         value: document.getElementById('td_subject')?.value.trim() },
    { field: 'phone',           value: document.getElementById('td_phone')?.value.trim() },
    { field: 'whatsapp',        value: document.getElementById('td_whatsapp')?.value.trim() },
    { field: 'status',          value: document.getElementById('td_status')?.value },
    { field: 'price_kg',        value: document.getElementById('td_price_kg')?.value },
    { field: 'price_primary',   value: document.getElementById('td_price_primary')?.value },
    { field: 'price_prep',      value: document.getElementById('td_price_prep')?.value },
    { field: 'price_secondary', value: document.getElementById('td_price_secondary')?.value },
    { field: 'slots',           value: currentTeacherSlots.join('|') },
    { field: 'youtube_links',   value: ytLinks.join('|') }
  ];

  try {
    await Promise.all(updates.map(u =>
      fetch(API_URL, {
        method: 'POST',
        body:   JSON.stringify({ action: 'updateTeacher', teacher_id: currentTeacherId, ...u })
      })
    ));
    document.getElementById('td_success').textContent = '✅ تم الحفظ بنجاح!';
    setTimeout(() => { document.getElementById('td_success').textContent = ''; }, 3000);
    await loadTeachers();
  } catch {
    alert('خطأ في الحفظ');
  }
}

// ============================================================
// BOOKINGS
// ============================================================
async function loadBookings() {
  try {
    const res  = await fetch(`${API_URL}?action=getBookings`);
    const data = await res.json();
    allBookings = data.bookings || [];
    renderBookings();
  } catch { allBookings = []; }
}

function renderBookings() {
  const statusFilter = document.getElementById('bookingStatusFilter')?.value || 'all';
  const query        = document.getElementById('bookingsSearch')?.value.toLowerCase() || '';

  let filtered = allBookings.filter(b => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchQ      = !query || b.parent_name?.toLowerCase().includes(query) ||
                        b.serial?.includes(query) || b.teacher_id?.toLowerCase().includes(query);
    return matchStatus && matchQ;
  });

  // Recent (first 5) for overview
  renderRecentBookings(allBookings.slice(0, 5));

  const tbody = document.getElementById('bookingsTbody');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="td-loading">مفيش حجوزات</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(b => {
    const teacher = allTeachers.find(t => t.teacher_id === b.teacher_id);
    let students  = [];
    try { students = JSON.parse(b.students || '[]'); } catch {}

    return `
      <tr>
        <td><span style="font-family:var(--mono);font-size:12px">${b.serial}</span></td>
        <td>${b.parent_name || '—'}</td>
        <td>
          <a href="https://wa.me/2${b.whatsapp?.replace(/^0/,'')}" target="_blank"
             style="color:var(--green);text-decoration:none;font-size:12px;font-family:var(--mono)">
            ${b.whatsapp || '—'}
          </a>
        </td>
        <td>${teacher?.name || b.teacher_id}</td>
        <td>${b.plan || '—'}</td>
        <td>${students.length} طالب</td>
        <td style="font-family:var(--mono);color:var(--c-accent)">${b.amount || 0} ج.م</td>
        <td>${statusBadge(b.status)}</td>
        <td style="font-size:11px;color:var(--text-muted)">${formatDate(b.created_at)}</td>
        <td>
          <div style="display:flex;gap:5px">
            ${b.status === 'pending'
              ? `<button class="btn-confirm" onclick="confirmBooking('${b.serial}')">✅</button>
                 <button class="btn-reject"  onclick="rejectBooking('${b.serial}')">❌</button>`
              : ''}
          </div>
        </td>
      </tr>`;
  }).join('');
}

function renderRecentBookings(bookings) {
  const tbody = document.getElementById('recentBookingsTbody');
  if (!tbody) return;
  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="td-loading">مفيش حجوزات</td></tr>`;
    return;
  }
  tbody.innerHTML = bookings.map(b => {
    const teacher = allTeachers.find(t => t.teacher_id === b.teacher_id);
    return `
      <tr>
        <td style="font-family:var(--mono);font-size:11px">${b.serial}</td>
        <td>${b.parent_name || '—'}</td>
        <td>${teacher?.name || b.teacher_id}</td>
        <td>${b.plan || '—'}</td>
        <td style="font-family:var(--mono);color:var(--c-accent)">${b.amount || 0} ج.م</td>
        <td>${statusBadge(b.status)}</td>
      </tr>`;
  }).join('');
}

function filterBookings() { renderBookings(); }

async function confirmBooking(serial) {
  if (!confirm('هتأكدي الحجز ده؟')) return;
  await updateBookingStatus(serial, 'confirmed');
}

async function rejectBooking(serial) {
  if (!confirm('هترفضي الحجز ده؟')) return;
  await updateBookingStatus(serial, 'rejected');
}

async function updateBookingStatus(serial, status) {
  try {
    await fetch(API_URL, {
      method: 'POST',
      body:   JSON.stringify({ action: 'updateBookingStatus', serial, status })
    });
    await loadBookings();
    renderOverview();
  } catch { alert('خطأ في التحديث'); }
}

// ============================================================
// GROUPS
// ============================================================
async function loadGroups() {
  try {
    // نجيب جروبات كل التيتشرز
    const promises = allTeachers
      .filter(t => t.status === 'active')
      .map(t => fetch(`${API_URL}?action=getGroups&teacher_id=${t.teacher_id}`)
        .then(r => r.json())
        .then(d => (d.groups || []).map(g => ({ ...g, teacher_name: t.name })))
      );
    const results = await Promise.all(promises);
    allGroups = results.flat();
    renderGroups();
    populateTeachersDropdown();
  } catch { allGroups = []; }
}

function renderGroups() {
  const list = document.getElementById('groupsAdminList');
  if (!list) return;

  if (allGroups.length === 0) {
    list.innerHTML = `<div class="td-loading">مفيش جروبات لسه — دوسي على "+ جروب جديد"</div>`;
    return;
  }

  list.innerHTML = allGroups.map(g => {
    const studentsHtml = (g.students || []).map(s => `
      <div class="gac-student-chip">
        ${s.student_name}
        <span class="chip-grade">${s.grade}</span>
      </div>`).join('');

    return `
      <div class="group-admin-card">
        <div class="gac-header">
          <div>
            <div class="gac-name">${g.group_name}</div>
            <div class="gac-schedule">📅 ${g.schedule}</div>
            <div class="gac-teacher">🎓 ${g.teacher_name}</div>
          </div>
          <span class="count-badge">${g.students?.length || 0} طالب</span>
        </div>
        <div class="gac-students">
          ${studentsHtml || '<span style="color:var(--text-muted);font-size:12px">مفيش طلاب لسه</span>'}
        </div>
      </div>`;
  }).join('');
}

function populateTeachersDropdown() {
  const select = document.getElementById('ag-teacher');
  if (!select) return;
  select.innerHTML = `<option value="">اختار المدرّس...</option>` +
    allTeachers.filter(t => t.status === 'active').map(t =>
      `<option value="${t.teacher_id}">${t.name}</option>`
    ).join('');
}

function addStudentRow() {
  const grades = ['KG1','KG2','الصف الأول الابتدائي','الصف الثاني الابتدائي','الصف الثالث الابتدائي','الصف الرابع الابتدائي','الصف الخامس الابتدائي','الصف السادس الابتدائي','الصف الأول الإعدادي','الصف الثاني الإعدادي','الصف الثالث الإعدادي','الصف الأول الثانوي','الصف الثاني الثانوي','الصف الثالث الثانوي','الصف الرابع الثانوي'];
  const i      = studentRows++;
  const row    = document.createElement('div');
  row.className = 'student-add-row';
  row.id = `srow_${i}`;
  row.innerHTML = `
    <input type="text" class="modal-input" id="sname_${i}" placeholder="اسم الطالب" style="margin-bottom:0">
    <select class="modal-input" id="sgrade_${i}" style="margin-bottom:0">
      <option value="">الصف...</option>
      ${grades.map(g => `<option value="${g}">${g}</option>`).join('')}
    </select>
    <input type="tel" class="modal-input" id="sparent_${i}" placeholder="رقم ولي الأمر" style="margin-bottom:0;max-width:140px">
    <button onclick="document.getElementById('srow_${i}').remove()"
            style="background:none;border:none;color:var(--red);cursor:pointer;font-size:18px;flex-shrink:0">✕</button>`;
  document.getElementById('studentsAddList').appendChild(row);
}

async function saveNewGroup() {
  const teacherId = document.getElementById('ag-teacher').value;
  const name      = document.getElementById('ag-name').value.trim();
  const schedule  = document.getElementById('ag-schedule').value.trim();

  if (!teacherId || !name || !schedule) {
    document.getElementById('addGroupError').textContent = 'اكملي كل البيانات';
    return;
  }

  // اجمع الطلاب
  const students = [];
  document.querySelectorAll('[id^="srow_"]').forEach((row, i) => {
    const idx = row.id.replace('srow_', '');
    const sname  = document.getElementById(`sname_${idx}`)?.value.trim();
    const sgrade = document.getElementById(`sgrade_${idx}`)?.value;
    if (sname && sgrade) {
      students.push({ student_name: sname, grade: sgrade });
    }
  });

  try {
    await fetch(API_URL, {
      method: 'POST',
      body:   JSON.stringify({ action: 'addGroup', teacher_id: teacherId, group_name: name, schedule, students })
    });
    closeModal('addGroupModal');
    await loadGroups();
  } catch { alert('خطأ في إنشاء الجروب'); }
}

// ============================================================
// PARENTS
// ============================================================
async function loadParents() {
  try {
    const res  = await fetch(`${API_URL}?action=getParents`);
    const data = await res.json();
    allParents  = data.parents || [];
    renderParents();
  } catch { allParents = []; }
}

function renderParents() {
  const query = document.getElementById('parentsSearch')?.value.toLowerCase() || '';
  const list  = allParents.filter(p => !query ||
    p.name?.toLowerCase().includes(query) || p.email?.includes(query));

  const tbody = document.getElementById('parentsTbody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="td-loading">مفيش أولياء أمور</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => `
    <tr>
      <td>${p.name || '—'}</td>
      <td style="font-family:var(--mono);font-size:12px">${p.email || '—'}</td>
      <td>
        <a href="https://wa.me/2${p.whatsapp?.replace(/^0/,'')}" target="_blank"
           style="color:var(--green);text-decoration:none;font-size:12px;font-family:var(--mono)">
          ${p.whatsapp || '—'}
        </a>
      </td>
      <td style="font-size:12px;font-family:var(--mono)">${p.cash_phones?.replace(/\|/g,', ') || '—'}</td>
      <td style="font-size:11px;color:var(--text-muted)">${formatDate(p.created_at)}</td>
    </tr>`).join('');
}

function filterParents() { renderParents(); }

// ============================================================
// MESSAGES — INBOX
// ============================================================
async function loadMessages() {
  try {
    const res  = await fetch(`${API_URL}?action=getMessages`);
    const data = await res.json();
    allMessages = data.messages || [];

    const unread = allMessages.filter(m => m.is_read === false || m.is_read === 'false').length;
    const badge  = document.getElementById('inboxBadge');
    const ovInbox = document.getElementById('ov-inbox');

    if (badge) {
      badge.textContent     = unread;
      badge.style.display   = unread > 0 ? 'inline' : 'none';
    }
    if (ovInbox) ovInbox.textContent = unread;

    renderInbox();
  } catch { allMessages = []; }
}

function renderInbox() {
  const filter = document.getElementById('inboxFilter')?.value || 'all';
  let list     = allMessages;

  if (filter === 'unread') list = list.filter(m => m.is_read === false || m.is_read === 'false');
  else if (filter !== 'all') list = list.filter(m => m.type === filter);

  const container = document.getElementById('inboxList');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<div class="td-loading">مفيش رسائل</div>`;
    return;
  }

  container.innerHTML = list.map(msg => {
    const isUnread = msg.is_read === false || msg.is_read === 'false';
    const preview  = msg.message?.slice(0, 60) + (msg.message?.length > 60 ? '...' : '');
    return `
      <div class="inbox-item ${isUnread ? 'unread' : ''}" onclick="openMessage('${msg.message_id}')">
        <div class="inbox-dot"></div>
        <span class="inbox-type-badge type-${msg.type || 'أخرى'}">${msg.type || 'أخرى'}</span>
        <div class="inbox-body">
          <div class="inbox-sender">${msg.parent_name || 'غير معروف'}</div>
          <div class="inbox-preview">${preview}</div>
        </div>
        <div class="inbox-time">${formatDate(msg.created_at)}</div>
      </div>`;
  }).join('');
}

function filterInbox() { renderInbox(); }

async function openMessage(messageId) {
  const msg     = allMessages.find(m => m.message_id === messageId);
  if (!msg) return;

  // Mark as read
  if (msg.is_read === false || msg.is_read === 'false') {
    try {
      await fetch(API_URL, {
        method: 'POST',
        body:   JSON.stringify({ action: 'markAsRead', message_id: messageId })
      });
      msg.is_read = true;
      renderInbox();
      const unread = allMessages.filter(m => m.is_read === false || m.is_read === 'false').length;
      document.getElementById('inboxBadge').textContent   = unread;
      document.getElementById('inboxBadge').style.display = unread > 0 ? 'inline' : 'none';
    } catch {}
  }

  // بيانات البيرنت لو مسجل
  const parent   = allParents.find(p => p.parent_id === msg.parent_id);
  const children = parent ? allGroups.flatMap(g => g.students || [])
    .filter(s => s.parent_id === parent.parent_id) : [];

  const parentSummaryHtml = parent ? `
    <div class="parent-summary">
      <div class="parent-summary-title">👤 بيانات ولي الأمر</div>
      <div class="parent-summary-row"><span>الاسم</span><span>${parent.name}</span></div>
      <div class="parent-summary-row"><span>الإيميل</span><span style="font-family:var(--mono);font-size:12px">${parent.email}</span></div>
      <div class="parent-summary-row"><span>أرقام الكاش</span><span style="font-family:var(--mono);font-size:12px">${parent.cash_phones?.replace(/\|/g,', ')}</span></div>
      ${children.length > 0 ? `
        <div class="parent-summary-row" style="flex-direction:column;align-items:flex-start;gap:6px">
          <span>الأولاد</span>
          <div class="student-chips-row">
            ${children.map(c => `<span class="student-mini-chip">${c.student_name} — ${c.grade}</span>`).join('')}
          </div>
        </div>` : ''}
    </div>` : '';

  const whatsappLink = msg.whatsapp
    ? `<a href="https://wa.me/2${msg.whatsapp.replace(/^0/,'')}" target="_blank" class="inbox-msg-whatsapp">
         📱 رد على الواتساب — ${msg.whatsapp}
       </a>` : '';

  document.getElementById('inboxMessageContent').innerHTML = `
    <div class="inbox-msg-header">
      <div class="inbox-msg-avatar">
        ${msg.parent_name?.charAt(0) || '؟'}
      </div>
      <div>
        <div class="inbox-msg-name">${msg.parent_name || 'غير معروف'}</div>
        <div class="inbox-msg-meta">
          <span class="inbox-type-badge type-${msg.type || 'أخرى'}" style="margin-left:8px">${msg.type || 'أخرى'}</span>
          ${formatDate(msg.created_at)}
        </div>
      </div>
    </div>
    ${parentSummaryHtml}
    <div class="inbox-msg-body">${msg.message}</div>
    ${whatsappLink}`;

  openModal('inboxMessageModal');
}

// ============================================================
// OVERVIEW
// ============================================================
function renderOverview() {
  const active   = allTeachers.filter(t => t.status === 'active').length;
  const students = allGroups.reduce((sum, g) => sum + (g.students?.length || 0), 0);
  const month    = new Date().getMonth();
  const monthlyBookings = allBookings.filter(b => {
    try { return new Date(b.created_at).getMonth() === month; } catch { return false; }
  });
  const revenue  = monthlyBookings
    .filter(b => b.status === 'confirmed')
    .reduce((sum, b) => sum + (parseInt(b.amount) || 0), 0);
  const pending  = allBookings.filter(b => b.status === 'pending').length;
  const unread   = allMessages.filter(m => m.is_read === false || m.is_read === 'false').length;

  document.getElementById('ov-teachers').textContent = active;
  document.getElementById('ov-students').textContent = students;
  document.getElementById('ov-bookings').textContent = monthlyBookings.length;
  document.getElementById('ov-revenue').textContent  = `${revenue.toLocaleString('ar-EG')} ج.م`;
  document.getElementById('ov-inbox').textContent    = unread;
  document.getElementById('ov-pending').textContent  = pending;

  renderRecentBookings(allBookings.slice(0, 5));
}

// ============================================================
// SETTINGS — THEMES
// ============================================================
function setTheme(theme) {
  document.body.classList.remove('theme-dark', 'theme-light', 'theme-soft');
  document.body.classList.add(`theme-${theme}`);
  localStorage.setItem('admin_theme', theme);
  document.querySelectorAll('.theme-opt').forEach(o =>
    o.classList.toggle('active', o.dataset.theme === theme));
}

function setAccent(accent) {
  document.body.classList.remove('accent-gold','accent-blue','accent-green','accent-purple','accent-pink','accent-orange');
  document.body.classList.add(`accent-${accent}`);
  localStorage.setItem('admin_accent', accent);
  document.querySelectorAll('.accent-opt').forEach(o =>
    o.classList.toggle('active', o.dataset.accent === accent));
}

function setSize(size) {
  document.body.classList.remove('size-sm','size-md','size-lg');
  document.body.classList.add(`size-${size}`);
  localStorage.setItem('admin_size', size);
  document.querySelectorAll('.size-opt').forEach(o =>
    o.classList.toggle('active', o.dataset.size === size));
}

function applySettings() {
  const theme  = localStorage.getItem('admin_theme')  || 'dark';
  const accent = localStorage.getItem('admin_accent') || 'gold';
  const size   = localStorage.getItem('admin_size')   || 'md';

  document.body.classList.remove('theme-dark','theme-light','theme-soft');
  document.body.classList.add(`theme-${theme}`);

  document.body.classList.remove('accent-gold','accent-blue','accent-green','accent-purple','accent-pink','accent-orange');
  document.body.classList.add(`accent-${accent}`);

  document.body.classList.remove('size-sm','size-md','size-lg');
  document.body.classList.add(`size-${size}`);

  // Mark active options
  document.querySelectorAll('.theme-opt').forEach(o  => o.classList.toggle('active', o.dataset.theme  === theme));
  document.querySelectorAll('.accent-opt').forEach(o => o.classList.toggle('active', o.dataset.accent === accent));
  document.querySelectorAll('.size-opt').forEach(o   => o.classList.toggle('active', o.dataset.size   === size));
}

// ============================================================
// MODALS
// ============================================================
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
function statusBadge(status) {
  const map = {
    pending:   '⏳ معلّقة',
    confirmed: '✅ مؤكدة',
    rejected:  '❌ مرفوضة',
    active:    '✅ نشط'
  };
  return `<span class="status-badge status-${status}">${map[status] || status}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return dateStr; }
}

function matchSearch(item, query) {
  if (!query) return true;
  return JSON.stringify(item).toLowerCase().includes(query);
}
