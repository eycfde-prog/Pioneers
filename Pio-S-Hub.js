// ============================================================
// PIONEERS ACADEMY — Pio-S-Hub.js
// ============================================================

const API_URL = 'YOUR_APPS_SCRIPT_URL_HERE';

// ============================================================
// STATE
// ============================================================
const params     = new URLSearchParams(window.location.search);
const TEACHER_ID = params.get('teacher');

let teacher       = null;
let parentData    = JSON.parse(localStorage.getItem('pioneer_parent') || 'null');
let likedTeachers = JSON.parse(localStorage.getItem('liked_teachers') || '[]');
let selectedRating = 0;
let lastRatingDate = localStorage.getItem(`last_rating_${TEACHER_ID}`) || null;

// Booking state
let bookingState = {
  plan: null, slot: null, parentName: '', parentPhone: '',
  parentWhatsapp: '', howKnew: '', studentsCount: 1,
  students: [], currentSlideNum: 1, totalSlides: 0
};

// Exam state
let examState = {
  questions: [], currentQ: 0, score: 0,
  timer: null, timeLeft: 0, examName: ''
};

// Esraa state
let esraaSlide = 1;
let esraaType  = '';

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  if (!TEACHER_ID) {
    window.location.href = 'Pio-Hub.html';
    return;
  }

  initKidsTheme();
  initTabs();
  initModals();
  updateParentUI();

  await loadTeacher();

  document.getElementById('btnEsraa').addEventListener('click', () => {
    resetEsraaModal();
    openModal('esraaModal');
  });

  document.getElementById('btnBookHero').addEventListener('click', openBooking);
  document.getElementById('btnLike').addEventListener('click', toggleLike);
  document.getElementById('btnParentAuth').addEventListener('click', () => {
    if (parentData) logoutParent();
    else openModal('parentModal');
  });
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
// LOAD TEACHER
// ============================================================
async function loadTeacher() {
  try {
    const cache = getCachedTeachers();
    const list  = cache || await fetchTeachers();
    teacher     = list?.find(t => t.teacher_id === TEACHER_ID);

    if (!teacher) throw new Error('التيتشر مش موجود');

    renderTeacherHero();
    await loadVideos();
    await loadExams();
    initStarRating();
    if (parentData) loadChildren();

    document.getElementById('pageLoading').style.display = 'none';
    document.getElementById('mainContent').style.display  = 'block';
    document.title = `${teacher.name} — Pioneers Academy`;

  } catch (err) {
    console.error(err);
    document.getElementById('pageLoading').innerHTML =
      `<div class="empty-icon">😞</div><p>مش لاقيين المدرّس ده</p><a href="Pio-Hub.html" class="btn-auth-login" style="margin-top:16px;display:inline-block">ارجع للرئيسية</a>`;
  }
}

async function fetchTeachers() {
  const res  = await fetch(`${API_URL}?action=getTeachers`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('بيانات غلط');
  localStorage.setItem('pioneers_teachers', JSON.stringify({ data, timestamp: Date.now() }));
  return data;
}

function getCachedTeachers() {
  try {
    const raw = localStorage.getItem('pioneers_teachers');
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > 3600000) return null;
    return data;
  } catch { return null; }
}

// ============================================================
// RENDER TEACHER HERO
// ============================================================
function renderTeacherHero() {
  // Avatar
  const avatarEl = document.getElementById('teacherAvatar');
  if (teacher.photo_url) {
    avatarEl.innerHTML = `<img src="${teacher.photo_url}" alt="${teacher.name}">`;
  } else {
    avatarEl.textContent = teacher.name?.charAt(0) || '؟';
  }

  document.getElementById('teacherSubject').textContent = teacher.subject || 'مادة';
  document.getElementById('teacherName').textContent    = teacher.name;

  // Rating
  const rating = parseFloat(teacher.rating) || 0;
  document.getElementById('teacherRating').textContent      = rating.toFixed(1);
  document.getElementById('teacherRatingCount').textContent = `(${teacher.rating_count || 0} تقييم)`;
  document.getElementById('teacherStars').innerHTML         = buildBigStars(rating, 10);

  // Likes
  document.getElementById('likesCount').textContent = teacher.likes || 0;
  const isLiked = likedTeachers.includes(TEACHER_ID);
  const btnLike = document.getElementById('btnLike');
  btnLike.classList.toggle('liked', isLiked);
  document.getElementById('likeHeart').textContent = isLiked ? '❤️' : '🤍';
}

function buildBigStars(rating, outOf) {
  const filled = Math.round((rating / outOf) * 5);
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star-big ${i < filled ? 'filled' : ''}">★</span>`
  ).join('');
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

      if (btn.dataset.tab === 'children') {
        if (!parentData) {
          document.getElementById('authRequired').style.display  = 'block';
          document.getElementById('childrenSection').style.display = 'none';
        } else {
          document.getElementById('authRequired').style.display  = 'none';
          document.getElementById('childrenSection').style.display = 'block';
          loadChildren();
        }
      }
    });
  });
}

// ============================================================
// VIDEOS
// ============================================================
async function loadVideos() {
  const grid = document.getElementById('videosGrid');
  try {
    const res  = await fetch(`${API_URL}?action=getTeacherVideos&teacher_id=${TEACHER_ID}`);
    const data = await res.json();
    const vids = data.videos || [];

    if (vids.length === 0) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🎬</div><p>مفيش فيديوهات متاحة دلوقتي</p></div>`;
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
            <div class="video-title">شرح المدرّس ${teacher.name}</div>
          </div>
        </div>`;
    }).join('');
  } catch {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>تعذّر تحميل الفيديوهات</p></div>`;
  }
}

function youtubeEmbed(url) {
  try {
    const u = new URL(url);
    let id = u.searchParams.get('v') || u.pathname.split('/').pop();
    return `https://www.youtube.com/embed/${id}`;
  } catch { return url; }
}

// ============================================================
// EXAMS
// ============================================================
async function loadExams() {
  const grid = document.getElementById('examsGrid');
  try {
    const res  = await fetch(`${API_URL}?action=getExams&teacher_id=${TEACHER_ID}`);
    const data = await res.json();
    const exams = data.exams || [];

    if (exams.length === 0) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>مفيش امتحانات متاحة دلوقتي</p></div>`;
      return;
    }

    grid.innerHTML = exams.map((name, i) => `
      <div class="exam-card">
        <div class="exam-icon">${['📝','📚','✏️','📖'][i % 4]}</div>
        <div class="exam-name">${name}</div>
        <div class="exam-meta">امتحان ${i + 1}</div>
        <button class="btn-start-exam" onclick="startExam('${name}')">ابدأ الامتحان ←</button>
      </div>`
    ).join('');
  } catch {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>تعذّر تحميل الامتحانات</p></div>`;
  }
}

// ============================================================
// EXAM PLAYER
// ============================================================
async function startExam(examName) {
  try {
    const res  = await fetch(`${API_URL}?action=getQuestions&teacher_id=${TEACHER_ID}&exam_name=${encodeURIComponent(examName)}`);
    const data = await res.json();
    const qs   = data.questions || [];
    if (qs.length === 0) return alert('مفيش أسئلة في الامتحان ده');

    examState = { questions: qs, currentQ: 0, score: 0, timer: null, timeLeft: 0, examName };
    document.getElementById('examTitle').textContent = examName;
    document.getElementById('examResult').style.display  = 'none';
    openModal('examModal');
    renderQuestion();
  } catch (err) {
    alert('تعذّر تحميل الأسئلة');
  }
}

function renderQuestion() {
  const { questions, currentQ } = examState;
  if (currentQ >= questions.length) { showExamResult(); return; }

  const q = questions[currentQ];
  document.getElementById('examProgressText').textContent = `${currentQ + 1} / ${questions.length}`;
  document.getElementById('examFeedback').style.display   = 'none';
  document.getElementById('examNextBtn').style.display    = 'none';
  document.getElementById('examResult').style.display     = 'none';

  document.getElementById('examQuestion').textContent = q.question;

  const letters = ['أ', 'ب', 'ج', 'د'];
  const options  = [q.A, q.B, q.C, q.D];
  const correct  = q.correct; // A, B, C, or D

  document.getElementById('examOptions').innerHTML = options.map((opt, i) => {
    const letter = ['A','B','C','D'][i];
    return `
      <button class="exam-option" data-letter="${letter}" onclick="answerQuestion('${letter}','${correct}','${escHtml(q.explanation || '')}')">
        <span class="option-letter">${letters[i]}</span>
        ${opt}
      </button>`;
  }).join('');

  // Timer — 90 ثانية لكل سؤال
  clearInterval(examState.timer);
  examState.timeLeft = 90;
  updateTimer();
  examState.timer = setInterval(() => {
    examState.timeLeft--;
    updateTimer();
    if (examState.timeLeft <= 0) {
      clearInterval(examState.timer);
      autoAnswer(correct, q.explanation || '');
    }
  }, 1000);
}

function updateTimer() {
  const s = examState.timeLeft;
  const color = s <= 10 ? 'var(--red)' : s <= 30 ? 'var(--gold)' : 'var(--green)';
  document.getElementById('examTimer').innerHTML =
    `<span style="color:${color}">⏱ ${s}s</span>`;
}

function answerQuestion(chosen, correct, explanation) {
  clearInterval(examState.timer);
  document.querySelectorAll('.exam-option').forEach(btn => {
    btn.classList.add('disabled');
    if (btn.dataset.letter === correct) btn.classList.add('correct');
    if (btn.dataset.letter === chosen && chosen !== correct) btn.classList.add('wrong');
  });

  if (chosen === correct) examState.score++;

  const fb = document.getElementById('examFeedback');
  fb.style.display = 'block';
  fb.innerHTML = chosen === correct
    ? `<span style="color:var(--green)">✅ إجابة صح!</span>${explanation ? `<br><small style="color:var(--text-dim)">${explanation}</small>` : ''}`
    : `<span style="color:var(--red)">❌ الإجابة الصح هي ${correct}</span>${explanation ? `<br><small style="color:var(--text-dim)">${explanation}</small>` : ''}`;

  document.getElementById('examNextBtn').style.display = 'block';
}

function autoAnswer(correct, explanation) {
  document.querySelectorAll('.exam-option').forEach(btn => {
    btn.classList.add('disabled');
    if (btn.dataset.letter === correct) btn.classList.add('correct');
  });
  const fb = document.getElementById('examFeedback');
  fb.style.display = 'block';
  fb.innerHTML = `<span style="color:var(--text-dim)">⏰ انتهى الوقت — الإجابة الصح: ${correct}</span>${explanation ? `<br><small>${explanation}</small>` : ''}`;
  document.getElementById('examNextBtn').style.display = 'block';
}

function nextQuestion() {
  examState.currentQ++;
  renderQuestion();
}

function showExamResult() {
  clearInterval(examState.timer);
  const { score, questions } = examState;
  const pct  = Math.round((score / questions.length) * 100);
  const msg  = pct >= 80 ? '🌟 ممتاز!' : pct >= 60 ? '👍 كويس!' : '💪 حاول تاني!';

  document.getElementById('examTimer').textContent   = '';
  document.getElementById('examQuestion').textContent = '';
  document.getElementById('examOptions').innerHTML   = '';
  document.getElementById('examFeedback').style.display  = 'none';
  document.getElementById('examNextBtn').style.display   = 'none';

  const res = document.getElementById('examResult');
  res.style.display = 'block';
  res.innerHTML = `
    <div class="result-score">${pct}%</div>
    <div class="result-msg">${msg}</div>
    <div class="result-detail">${score} صح من ${questions.length} سؤال</div>
    <button class="exam-next-btn" style="margin-top:20px" onclick="closeExam()">إغلاق</button>`;
}

function closeExam() {
  clearInterval(examState.timer);
  closeModal('examModal');
}

function escHtml(s) { return s.replace(/'/g, "\\'").replace(/"/g, '\\"'); }

// ============================================================
// STAR RATING (10 نجوم)
// ============================================================
function initStarRating() {
  const container = document.getElementById('stars10');
  const labels    = ['😞','😕','😐','🙂','😊','😄','🌟','⭐','💫','🏆'];

  for (let i = 1; i <= 10; i++) {
    const star = document.createElement('span');
    star.className   = 'star-10';
    star.textContent = '★';
    star.dataset.val = i;
    star.addEventListener('click', () => {
      selectedRating = i;
      document.querySelectorAll('.star-10').forEach((s, idx) => s.classList.toggle('active', idx < i));
      document.getElementById('starsLabel').textContent = `${i}/10 — ${labels[i-1]}`;
      document.getElementById('btnSubmitRate').disabled = false;
    });
    star.addEventListener('mouseover', () => {
      document.querySelectorAll('.star-10').forEach((s, idx) => s.classList.toggle('active', idx < i));
    });
    star.addEventListener('mouseout', () => {
      document.querySelectorAll('.star-10').forEach((s, idx) => s.classList.toggle('active', idx < selectedRating));
    });
    container.appendChild(star);
  }

  // تحقق من آخر تقييم
  if (lastRatingDate) {
    const last    = new Date(lastRatingDate);
    const now     = new Date();
    const diffDays = (now - last) / (1000 * 60 * 60 * 24);
    const note     = document.getElementById('rateNote');
    if (diffDays < 30) {
      note.textContent = `قيّمت المدرّس ده من ${Math.ceil(30 - diffDays)} يوم — تقدر تقيّم تاني بعد ${Math.ceil(30 - diffDays)} يوم`;
      document.getElementById('btnSubmitRate').disabled = true;
    }
  }

  document.getElementById('btnSubmitRate').addEventListener('click', submitStarRating);
}

async function submitStarRating() {
  if (!parentData) { openModal('parentModal'); return; }
  if (!selectedRating) return;

  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'submitStarRating',
        teacher_id: TEACHER_ID,
        rating:     selectedRating,
        parent_id:  parentData.parent_id
      })
    });
    localStorage.setItem(`last_rating_${TEACHER_ID}`, new Date().toISOString());
    localStorage.removeItem('pioneers_teachers');
    document.getElementById('rateNote').textContent = '✅ شكراً — وصّل تقييمك!';
    document.getElementById('btnSubmitRate').disabled = true;
  } catch { alert('مش قادر يبعت التقييم دلوقتي'); }
}

// ============================================================
// LIKE
// ============================================================
async function toggleLike() {
  const isLiked = likedTeachers.includes(TEACHER_ID);
  const newLiked = !isLiked;
  const btn  = document.getElementById('btnLike');
  const cnt  = document.getElementById('likesCount');

  btn.classList.toggle('liked', newLiked);
  document.getElementById('likeHeart').textContent = newLiked ? '❤️' : '🤍';
  cnt.textContent = parseInt(cnt.textContent) + (newLiked ? 1 : -1);

  if (newLiked) likedTeachers.push(TEACHER_ID);
  else likedTeachers = likedTeachers.filter(l => l !== TEACHER_ID);
  localStorage.setItem('liked_teachers', JSON.stringify(likedTeachers));
  localStorage.removeItem('pioneers_teachers');

  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'addLike', teacher_id: TEACHER_ID, action_type: newLiked ? 'add' : 'remove' })
    });
  } catch {}
}

// ============================================================
// PARENT AUTH
// ============================================================
function updateParentUI() {
  const btn = document.getElementById('btnParentAuth');
  if (parentData) {
    document.getElementById('parentAuthIcon').textContent  = '✅';
    document.getElementById('parentAuthLabel').textContent = parentData.name?.split(' ')[0] || 'حسابك';
    btn.classList.add('logged-in');
  } else {
    document.getElementById('parentAuthIcon').textContent  = '👤';
    document.getElementById('parentAuthLabel').textContent = 'دخول ولي الأمر';
    btn.classList.remove('logged-in');
  }
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.auth === tab));
  document.getElementById('loginForm').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

async function doLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { document.getElementById('loginError').textContent = 'اكتب الإيميل والباسورد'; return; }

  try {
    const res  = await fetch(API_URL, { method:'POST', body: JSON.stringify({ action:'loginParent', email, password }) });
    const data = await res.json();
    if (!data.success) { document.getElementById('loginError').textContent = data.message || 'خطأ'; return; }
    parentData = data;
    localStorage.setItem('pioneer_parent', JSON.stringify(data));
    closeModal('parentModal');
    updateParentUI();
    loadChildren();
  } catch { document.getElementById('loginError').textContent = 'خطأ في الاتصال'; }
}

async function doRegister() {
  const name      = document.getElementById('regName').value.trim();
  const email     = document.getElementById('regEmail').value.trim();
  const password  = document.getElementById('regPassword').value;
  const whatsapp  = document.getElementById('regWhatsapp').value.trim();
  const cashPhones = [...document.querySelectorAll('.cash-phone')].map(i => i.value.trim()).filter(Boolean);

  if (!name || !email || !password) { document.getElementById('registerError').textContent = 'اكمّل البيانات'; return; }

  try {
    const res  = await fetch(API_URL, { method:'POST', body: JSON.stringify({ action:'registerParent', name, email, password, whatsapp, cash_phones: cashPhones }) });
    const data = await res.json();
    if (data.error) { document.getElementById('registerError').textContent = data.error; return; }
    await doLogin();
  } catch { document.getElementById('registerError').textContent = 'خطأ في الاتصال'; }
}

function logoutParent() {
  if (!confirm('هتطلع من حسابك؟')) return;
  parentData = null;
  localStorage.removeItem('pioneer_parent');
  updateParentUI();
  document.getElementById('authRequired').style.display   = 'block';
  document.getElementById('childrenSection').style.display = 'none';
}

function addCashPhone() {
  const container = document.getElementById('cashPhonesContainer');
  const row = document.createElement('div');
  row.className = 'cash-phone-row';
  row.innerHTML = `<input type="tel" class="modal-input cash-phone" placeholder="رقم كاش إضافي"><button class="btn-add-phone" onclick="this.parentElement.remove()">−</button>`;
  container.appendChild(row);
}

// ============================================================
// CHILDREN — بيانات الأولاد لولي الأمر
// ============================================================
async function loadChildren() {
  if (!parentData) return;
  const grid = document.getElementById('childrenGrid');
  grid.innerHTML = `<div class="empty-state"><div class="loader-ring"></div></div>`;

  try {
    const res  = await fetch(`${API_URL}?action=getParentChildren&parent_id=${parentData.parent_id}`);
    const data = await res.json();

    // فلترة الأولاد اللي مع التيتشر ده بس
    const children = (data.children || []).filter(c => c.teacher_id === TEACHER_ID);

    if (children.length === 0) {
      // لو مفيش أولاد مع التيتشر ده — نشوف لو في حجوزات pending
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⏳</div>
          <p>مفيش أولاد مسجلين مع المدرّس ده دلوقتي</p>
          <p style="margin-top:8px;font-size:13px;color:var(--text-muted)">لو عملت حجز — الإدارة هتضيف بياناتهم قريباً</p>
        </div>`;
      return;
    }

    grid.innerHTML = children.map(child => buildChildCard(child)).join('');

    grid.querySelectorAll('.child-card').forEach(card => {
      card.addEventListener('click', () => openStudentDetail(card.dataset.id, children));
    });

  } catch {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>تعذّر تحميل البيانات</p></div>`;
  }
}

function buildChildCard(child) {
  const attend = child.attend_history?.slice(-1)[0] || '—';
  const prev   = child.attend_history?.slice(-2, -1)[0] || null;
  const avatarHtml = child.student_photo
    ? `<img src="${child.student_photo}" alt="${child.student_name}">`
    : child.student_name?.charAt(0) || '؟';

  return `
    <div class="child-card" data-id="${child.student_id}">
      <div class="child-avatar">${avatarHtml}</div>
      <div class="child-name">${child.student_name}</div>
      <div class="child-grade">${child.grade}</div>
      <div class="child-mini-stats">
        <div class="mini-stat">
          <div class="mini-stat-val">${child.attend_history?.slice(-1)[0] || '—'}</div>
          <div class="mini-stat-label">حضور</div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat-val">${child.focus_history?.slice(-1)[0] || '—'}</div>
          <div class="mini-stat-label">تركيز</div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat-val">${child.hw_history?.slice(-1)[0] || '—'}</div>
          <div class="mini-stat-label">هوم وورك</div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat-val">${child.commit_history?.slice(-1)[0] || '—'}</div>
          <div class="mini-stat-label">التزام</div>
        </div>
      </div>
    </div>`;
}

function openStudentDetail(studentId, children) {
  const child = children.find(c => c.student_id === studentId);
  if (!child) return;

  const detail = document.getElementById('studentDetail');
  const avatarHtml = child.student_photo
    ? `<img src="${child.student_photo}" alt="${child.student_name}">`
    : child.student_name?.charAt(0) || '؟';

  const metrics = [
    { label: 'الحضور',    history: child.attend_history,  color: '#4ADE80' },
    { label: 'التركيز',   history: child.focus_history,   color: '#60A5FA' },
    { label: 'الالتزام',  history: child.commit_history,  color: '#F5C842' },
    { label: 'هوم وورك',  history: child.hw_history,      color: '#F87171' },
    { label: 'الحضور الأسبوعي', history: child.weekly_history, color: '#A78BFA' }
  ];

  const progressRows = metrics.map(m => {
    const vals    = m.history || [];
    const last    = parseInt(vals[vals.length - 1]) || 0;
    const prev    = parseInt(vals[vals.length - 2]) || null;
    const diff    = prev !== null ? last - prev : null;
    const diffColor = diff === null ? '' : diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--red)' : 'var(--gold)';
    const diffText  = diff === null ? '' : `${diff > 0 ? '+' : ''}${diff}%`;

    return `
      <div class="prog-row">
        <div class="prog-label">${m.label}</div>
        <div class="prog-bar-wrap">
          <div class="prog-bar" style="width:${last}%;background:${m.color}"></div>
        </div>
        <div class="prog-val">${last}%</div>
        <div class="prog-diff" style="color:${diffColor}">${diffText}</div>
      </div>`;
  }).join('');

  detail.innerHTML = `
    <div class="sd-header">
      <div class="sd-avatar">${avatarHtml}</div>
      <div>
        <div class="sd-name">${child.student_name}</div>
        <div class="sd-grade">${child.grade}</div>
        <div class="sd-upload">
          <label class="btn-upload-photo" style="cursor:pointer">
            📷 تغيير الصورة
            <input type="file" accept="image/*" style="display:none" onchange="uploadStudentPhoto(this,'${studentId}')">
          </label>
        </div>
      </div>
    </div>
    <div class="sd-chart-title">📊 تقييمات المدرّس</div>
    <div class="progress-chart">${progressRows}</div>
    <div class="sd-canvas-wrap">
      <canvas id="studentChart" height="180"></canvas>
    </div>`;

  openModal('studentModal');
  drawStudentChart(child);
}

function drawStudentChart(child) {
  const canvas = document.getElementById('studentChart');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  const dates  = child.rating_dates || [];
  const attend = (child.attend_history || []).map(v => parseInt(v) || 0);

  const w = canvas.offsetWidth || 400;
  const h = 180;
  canvas.width  = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);

  if (attend.length < 2) {
    ctx.fillStyle = '#8888AA';
    ctx.font = '14px Tajawal';
    ctx.textAlign = 'center';
    ctx.fillText('محتاج تقييمات أكتر عشان يظهر الرسم', w/2, h/2);
    return;
  }

  const pad  = { top: 20, right: 20, bottom: 40, left: 40 };
  const pw   = w - pad.right - pad.left;
  const ph   = h - pad.top - pad.bottom;
  const step = pw / (attend.length - 1);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth   = 1;
  [0,25,50,75,100].forEach(val => {
    const y = pad.top + ph - (val / 100) * ph;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    ctx.fillStyle = '#55556A'; ctx.font = '10px monospace'; ctx.textAlign = 'right';
    ctx.fillText(`${val}%`, pad.left - 4, y + 4);
  });

  // Line
  ctx.strokeStyle = '#F5C842';
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  attend.forEach((val, i) => {
    const x = pad.left + i * step;
    const y = pad.top + ph - (val / 100) * ph;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Fill
  ctx.fillStyle = 'rgba(245,200,66,0.08)';
  ctx.beginPath();
  attend.forEach((val, i) => {
    const x = pad.left + i * step;
    const y = pad.top + ph - (val / 100) * ph;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.left + (attend.length - 1) * step, pad.top + ph);
  ctx.lineTo(pad.left, pad.top + ph);
  ctx.fill();

  // Dots
  attend.forEach((val, i) => {
    const x = pad.left + i * step;
    const y = pad.top + ph - (val / 100) * ph;
    ctx.fillStyle   = '#F5C842';
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();

    // Date label
    if (dates[i]) {
      ctx.fillStyle   = '#55556A'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(dates[i].slice(0, 5), x, h - 6);
    }
  });
}

async function uploadStudentPhoto(input, studentId) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { alert('الصورة أكبر من 10 ميجا'); return; }

  // هنا بيتم الرفع على Drive عبر الـ API
  // مؤقتاً بنعمل FileReader لعرض الصورة locally
  const reader = new FileReader();
  reader.onload = async (e) => {
    const dataUrl = e.target.result;
    document.querySelectorAll(`.child-avatar`).forEach(el => {
      if (el.closest(`[data-id="${studentId}"]`)) el.innerHTML = `<img src="${dataUrl}">`;
    });
    document.querySelector('.sd-avatar').innerHTML = `<img src="${dataUrl}">`;

    try {
      await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'updateStudentPhoto', student_id: studentId, photo_url: dataUrl })
      });
    } catch {}
  };
  reader.readAsDataURL(file);
}

// ============================================================
// BOOKING
// ============================================================
async function openBooking() {
  bookingState = { plan: null, slot: null, parentName: '', parentPhone: '',
    parentWhatsapp: '', howKnew: '', studentsCount: 1, students: [], currentSlideNum: 1 };

  // لو مسجل — نملي بيانات ولي الأمر
  if (parentData) {
    setTimeout(() => {
      document.getElementById('bkParentName').value     = parentData.name     || '';
      document.getElementById('bkParentWhatsapp').value = parentData.whatsapp || '';
    }, 100);
  }

  await loadSlots();
  showBookingSlide(1);
  openModal('bookingModal');
  updateBookingProgress(1, 6);
}

async function loadSlots() {
  const grid = document.getElementById('slotsGrid');
  try {
    const res  = await fetch(`${API_URL}?action=getAvailableSlots&teacher_id=${TEACHER_ID}`);
    const data = await res.json();
    const slots = data.slots || [];

    if (slots.length === 0) {
      grid.innerHTML = `<p style="color:var(--text-dim);font-size:14px">مفيش مواعيد متاحة دلوقتي</p>`;
      return;
    }

    grid.innerHTML = slots.map(s => `
      <button class="slot-btn" data-slot="${s}" onclick="selectSlot(this)">${s}</button>`
    ).join('');

    // حفظ prices للحساب
    window._teacherPrices = data.prices || {};
  } catch {
    grid.innerHTML = `<p style="color:var(--red);font-size:13px">تعذّر تحميل المواعيد</p>`;
  }
}

function selectPlan(el) {
  document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  bookingState.plan = el.dataset.plan;
  setTimeout(() => bookingNext(), 300);
}

function selectSlot(el) {
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  bookingState.slot = el.dataset.slot;
  document.getElementById('btnNextSlot').disabled = false;
}

function bookingNext() { showBookingSlide(bookingState.currentSlideNum + 1); }

function showBookingSlide(num) {
  document.querySelectorAll('.b-slide').forEach(s => s.classList.remove('active'));
  const target = document.querySelector(`.b-slide[data-slide="${num}"]`);
  if (target) { target.classList.add('active'); bookingState.currentSlideNum = num; }
  updateBookingProgress(num, 6 + bookingState.studentsCount);
}

function updateBookingProgress(current, total) {
  const pct = Math.min((current / total) * 100, 100);
  document.getElementById('bookingProgress').style.width = `${pct}%`;
}

function changeStudentCount(delta) {
  const cnt = Math.max(1, Math.min(10, bookingState.studentsCount + delta));
  bookingState.studentsCount = cnt;
  document.getElementById('studentsCount').textContent = cnt;
}

function buildStudentSlides() {
  const n       = bookingState.studentsCount;
  const wrapper = document.getElementById('dynamicStudentSlides');
  const grades  = ['KG1','KG2','الصف الأول الابتدائي','الصف الثاني الابتدائي','الصف الثالث الابتدائي','الصف الرابع الابتدائي','الصف الخامس الابتدائي','الصف السادس الابتدائي','الصف الأول الإعدادي','الصف الثاني الإعدادي','الصف الثالث الإعدادي','الصف الأول الثانوي','الصف الثاني الثانوي','الصف الثالث الثانوي','الصف الرابع الثانوي'];

  wrapper.innerHTML = Array.from({ length: n }, (_, i) => `
    <div class="b-slide" data-slide="student-${i+1}">
      <div class="slide-emoji">${i === 0 ? '👦' : '👧'}</div>
      <h3 class="slide-title">بيانات الطالب ${i+1}</h3>
      <div class="student-slide-inputs" style="width:100%">
        <input type="text" class="modal-input" id="sName_${i}" placeholder="اسم الطالب" style="text-align:right">
        <select class="modal-select" id="sGrade_${i}">
          <option value="">اختار الصف...</option>
          ${grades.map(g => `<option value="${g}">${g}</option>`).join('')}
        </select>
        <input type="number" class="modal-input" id="sAge_${i}" placeholder="السن" min="3" max="25">
      </div>
      <button class="slide-btn" onclick="saveStudentAndNext(${i})">
        ${i < n - 1 ? 'التالي ←' : 'عرض الملخص ←'}
      </button>
    </div>`
  ).join('');

  showBookingSlide('student-1');
}

function saveStudentAndNext(i) {
  const name  = document.getElementById(`sName_${i}`)?.value.trim();
  const grade = document.getElementById(`sGrade_${i}`)?.value;
  const age   = document.getElementById(`sAge_${i}`)?.value;

  if (!name || !grade) { alert('اكمّل بيانات الطالب'); return; }

  bookingState.students[i] = { student_name: name, grade, age };

  if (i < bookingState.studentsCount - 1) {
    showBookingSlide(`student-${i + 2}`);
  } else {
    buildSummary();
    showBookingSlide('summary');
  }
}

function buildSummary() {
  const { plan, slot, students } = bookingState;
  const prices = window._teacherPrices || {};
  const lectures = parseInt(plan) || 4;

  const priceMap = { 'KG': prices.kg||0, 'ابتدائي': prices.primary||0, 'إعدادي': prices.prep||0, 'ثانوي': prices.secondary||0 };

  let total = 0;
  students.forEach(s => {
    const key = Object.keys(priceMap).find(k => s.grade?.includes(k)) || 'ابتدائي';
    total += (priceMap[key] || 0) * lectures;
  });

  document.getElementById('summaryCard').innerHTML = `
    <div class="summary-row"><span class="summary-row-label">المدرّس</span><span class="summary-row-val">${teacher?.name || ''}</span></div>
    <div class="summary-row"><span class="summary-row-label">الخطة</span><span class="summary-row-val">${plan} محاضرات شهرياً</span></div>
    <div class="summary-row"><span class="summary-row-label">الموعد</span><span class="summary-row-val">${slot || '—'}</span></div>
    <div class="summary-row"><span class="summary-row-label">عدد الطلاب</span><span class="summary-row-val">${students.length}</span></div>
    ${students.map((s,i) => `<div class="summary-row"><span class="summary-row-label">طالب ${i+1}</span><span class="summary-row-val">${s.student_name} — ${s.grade}</span></div>`).join('')}`;

  document.getElementById('summaryAmount').textContent = `${total} ج.م`;
  bookingState._total = total;
}

async function submitBooking() {
  const { plan, slot, students, _total } = bookingState;
  const parentName    = document.getElementById('bkParentName')?.value.trim();
  const parentPhone   = document.getElementById('bkParentPhone')?.value.trim();
  const parentWhatsapp= document.getElementById('bkParentWhatsapp')?.value.trim();
  const howKnew       = document.getElementById('bkHowKnew')?.value;

  // فتح فودافون كاش
  const vodafoneUrl = `vodafone://payment`;
  window.location.href = vodafoneUrl;

  // لو ما اتفتحش خلال ثانيتين
  setTimeout(() => {
    const choice = confirm('مش اتفتح فودافون كاش؟\nاضغط OK لتنزيله — أو Cancel لدفع بالكود');
    if (choice) {
      const isAndroid = /android/i.test(navigator.userAgent);
      window.open(isAndroid
        ? 'https://play.google.com/store/apps/details?id=com.vodafone.myvodafone.egypt'
        : 'https://apps.apple.com/eg/app/my-vodafone-egypt/id563690729', '_blank');
    } else {
      alert(`ادفع بالكود: *9*7*[رقم مؤقت]#`);
    }
  }, 2000);

  try {
    const res  = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'submitBooking',
        parent_id:        parentData?.parent_id || null,
        parent_name:      parentName,
        phone:            parentPhone,
        whatsapp:         parentWhatsapp,
        teacher_id:       TEACHER_ID,
        plan, students, how_knew: howKnew, slot
      })
    });
    const data = await res.json();

    document.getElementById('serialBox').textContent = data.serial || '--------';
    showBookingSlide('confirm');
  } catch {
    showBookingSlide('confirm');
    document.getElementById('serialBox').textContent = '--------';
  }
}

// ============================================================
// ESRAA MODAL
// ============================================================
function resetEsraaModal() {
  esraaSlide = 1; esraaType = '';
  showEsraaSlide(1);
  const greeting = document.getElementById('parentGreeting');
  greeting.textContent = parentData ? `يا ${parentData.name?.split(' ')[0]}` : 'بيك';
}

function esraaNext() { showEsraaSlide(esraaSlide + 1); }

function showEsraaSlide(n) {
  document.querySelectorAll('#esraaSlides .slide').forEach((s, i) => s.classList.toggle('active', i + 1 === n));
  document.querySelectorAll('#esraaDots .dot').forEach((d, i) => d.classList.toggle('active', i + 1 === n));
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
      body: JSON.stringify({
        action:      'submitMessage',
        parent_id:   parentData?.parent_id   || null,
        parent_name: parentData?.name        || null,
        whatsapp:    parentData?.whatsapp    || null,
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
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
  });
}

function openModal(id)  {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}
