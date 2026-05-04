// ============================================================
// PIONEERS ACADEMY — Pio-Hub.js
// ============================================================

const API_URL   = 'YOUR_APPS_SCRIPT_URL_HERE'; // ← هتحط الرابط هنا
const CACHE_KEY = 'pioneers_teachers';
const CACHE_TTL = 60 * 60 * 1000; // ساعة بالـ ms

// ============================================================
// STATE
// ============================================================
let allTeachers   = [];
let currentFilter = 'all';
let searchQuery   = '';
let currentSlide  = 1;
let selectedType  = '';
let likedTeachers = JSON.parse(localStorage.getItem('liked_teachers') || '[]');
let parentData    = JSON.parse(localStorage.getItem('pioneer_parent') || 'null');

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initKidsTheme();
  initNavbar();
  initSearch();
  initFilters();
  initModals();
  loadTeachers();
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
    const nowActive = document.body.classList.toggle('kids-theme');
    toggle.classList.toggle('active', nowActive);
    localStorage.setItem('kids_theme', nowActive);
  });
}

// ============================================================
// NAVBAR
// ============================================================
function initNavbar() {
  // زرار التيتشر المخفي
  document.getElementById('teacherBtn').addEventListener('click', () => {
    openModal('teacherModal');
  });

  // زرار إسراء
  document.getElementById('btnEsraa').addEventListener('click', () => {
    resetEsraaSlides();
    openModal('esraaModal');
  });
}

// ============================================================
// SEARCH
// ============================================================
function initSearch() {
  const input     = document.getElementById('searchInput');
  const clearBtn  = document.getElementById('searchClear');

  input.addEventListener('input', () => {
    searchQuery = input.value.trim();
    clearBtn.classList.toggle('visible', searchQuery.length > 0);
    renderTeachers();
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    searchQuery = '';
    clearBtn.classList.remove('visible');
    renderTeachers();
  });
}

function resetSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').classList.remove('visible');
  searchQuery = '';
  renderTeachers();
}

// ============================================================
// FILTERS
// ============================================================
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTeachers();
    });
  });
}

// ============================================================
// LOAD TEACHERS — مع Caching
// ============================================================
async function loadTeachers() {
  // نشوف لو في cache صالح
  const cached = getCachedTeachers();
  if (cached) {
    allTeachers = cached;
    hideLoading();
    renderTeachers();
    return;
  }

  try {
    const res  = await fetch(`${API_URL}?action=getTeachers`);
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    allTeachers = data;
    cacheTeachers(data);
    hideLoading();
    renderTeachers();
  } catch (err) {
    console.error('خطأ في تحميل التيتشرز:', err);
    hideLoading();
    // نعرض كروت تجريبية لو في خطأ
    allTeachers = getDemoTeachers();
    renderTeachers();
  }
}

function getCachedTeachers() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function cacheTeachers(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
}

function hideLoading() {
  document.getElementById('loadingState').style.display = 'none';
}

// ============================================================
// RENDER TEACHERS
// ============================================================
function renderTeachers() {
  const grid = document.getElementById('teachersGrid');
  const noRes = document.getElementById('noResults');

  // فلترة
  let filtered = allTeachers.filter(t => {
    const matchFilter = currentFilter === 'all' || t.subject?.includes(currentFilter);
    const matchSearch = !searchQuery ||
      t.name?.includes(searchQuery) ||
      t.subject?.includes(searchQuery);
    return matchFilter && matchSearch;
  });

  // Count
  document.getElementById('teachersCount').textContent =
    `${filtered.length} مدرّس`;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    noRes.style.display = 'block';
    document.getElementById('searchTerm').textContent = searchQuery || currentFilter;
    return;
  }

  noRes.style.display = 'none';
  grid.innerHTML = filtered.map((t, i) => buildTeacherCard(t, i)).join('');

  // Events على الكروت
  grid.querySelectorAll('.teacher-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-like-btn')) return;
      const id = card.dataset.id;
      goToTeacher(id);
    });
  });

  grid.querySelectorAll('.card-like-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleLike(btn));
  });
}

// ============================================================
// TEACHER CARD HTML
// ============================================================
function buildTeacherCard(teacher, index) {
  const isLiked   = likedTeachers.includes(teacher.teacher_id);
  const rating    = parseFloat(teacher.rating) || 0;
  const stars     = buildStars(rating, 10);
  const imgHtml   = teacher.photo_url
    ? `<img src="${teacher.photo_url}" alt="${teacher.name}" class="card-img" loading="lazy">`
    : `<div class="card-img-placeholder">${teacher.name?.charAt(0) || '؟'}</div>`;

  return `
    <div class="teacher-card" data-id="${teacher.teacher_id}"
         style="animation-delay:${index * 0.07}s">

      <div class="card-img-wrap">
        ${imgHtml}
        <div class="card-subject-badge">${teacher.subject || 'مادة'}</div>

        <button class="card-like-btn ${isLiked ? 'liked' : ''}"
                data-id="${teacher.teacher_id}"
                data-liked="${isLiked}">
          <span class="like-heart">${isLiked ? '❤️' : '🤍'}</span>
          <span class="like-count">${teacher.likes || 0}</span>
        </button>
      </div>

      <div class="card-body">
        <div class="card-name">${teacher.name}</div>

        <div class="card-meta">
          <div class="card-rating">
            <div class="stars-display">${stars}</div>
            <span class="rating-num">${rating}/10</span>
          </div>
          <span style="font-size:12px;color:var(--text-dim)">
            ${teacher.rating_count || 0} تقييم
          </span>
        </div>

        <button class="card-cta">شوف بروفايل المدرّس ←</button>
      </div>
    </div>
  `;
}

function buildStars(rating, outOf = 10) {
  const filled = Math.round((rating / outOf) * 5);
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star ${i < filled ? 'filled' : ''}">★</span>`
  ).join('');
}

// ============================================================
// LIKE TOGGLE
// ============================================================
async function toggleLike(btn) {
  const id      = btn.dataset.id;
  const isLiked = btn.dataset.liked === 'true';
  const heart   = btn.querySelector('.like-heart');
  const count   = btn.querySelector('.like-count');

  // UI أولاً — Optimistic update
  const newLiked = !isLiked;
  btn.dataset.liked = newLiked;
  btn.classList.toggle('liked', newLiked);
  heart.textContent = newLiked ? '❤️' : '🤍';

  const currentCount = parseInt(count.textContent) || 0;
  count.textContent  = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

  // حفظ في localStorage
  if (newLiked) {
    likedTeachers.push(id);
  } else {
    likedTeachers = likedTeachers.filter(l => l !== id);
  }
  localStorage.setItem('liked_teachers', JSON.stringify(likedTeachers));

  // بعتها للـ API
  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'addLike',
        teacher_id: id,
        action_type: newLiked ? 'add' : 'remove'
      })
    });
    // بنعمل invalidate للـ cache
    localStorage.removeItem(CACHE_KEY);
  } catch (err) {
    console.error('Like error:', err);
  }
}

// ============================================================
// NAVIGATION
// ============================================================
function goToTeacher(teacher_id) {
  window.location.href = `Pio-S-Hub.html?teacher=${teacher_id}`;
}

function goToTeacherHub() {
  const code = document.getElementById('teacherCode').value.trim().toUpperCase();
  if (!code || code.length < 8) {
    document.getElementById('teacherError').textContent = 'لازم تكتب الكود صح (8 خانات)';
    return;
  }
  window.location.href = `Pio-T-Hub.html?code=${code}`;
}

function goToTeacherRegister() {
  window.location.href = `Pio-T-Hub.html?register=true`;
}

// ============================================================
// MODALS
// ============================================================
function initModals() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => {
        closeModal(m.id);
      });
    }
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
// ESRAA MESSAGE SLIDES
// ============================================================
function resetEsraaSlides() {
  currentSlide = 1;
  selectedType = '';
  showSlide(1);

  // تحية شخصية لو مسجل دخول
  const greeting = document.getElementById('parentGreeting');
  if (parentData?.name) {
    greeting.textContent = `يا ${parentData.name}`;
  } else {
    greeting.textContent = 'بيك';
  }
}

function showSlide(num) {
  document.querySelectorAll('.slide').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));

  const slide = document.querySelector(`[data-slide="${num}"]`);
  const dot   = document.querySelector(`[data-dot="${num}"]`);

  if (slide) slide.classList.add('active');
  if (dot)   dot.classList.add('active');
  currentSlide = num;
}

function nextSlide() {
  showSlide(currentSlide + 1);
}

function selectType(btn) {
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedType = btn.dataset.type;

  // بعد اختيار النوع نروح للرسالة
  setTimeout(() => nextSlide(), 300);
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
        type:        selectedType,
        message
      })
    });
  } catch (err) {
    console.error('Message error:', err);
  }

  // نكمل للسلايد التأكيد حتى لو في error
  showSlide(4);
}

// ============================================================
// DEMO DATA — لو API مش شغال
// ============================================================
function getDemoTeachers() {
  return [
    {
      teacher_id: 'T001', name: 'أحمد علي',
      subject: 'رياضيات', photo_url: '',
      likes: 24, rating: '8.5', rating_count: 12
    },
    {
      teacher_id: 'T002', name: 'سارة كمال',
      subject: 'علوم', photo_url: '',
      likes: 18, rating: '9.2', rating_count: 20
    },
    {
      teacher_id: 'T003', name: 'محمد حسن',
      subject: 'عربي', photo_url: '',
      likes: 31, rating: '7.8', rating_count: 9
    },
    {
      teacher_id: 'T004', name: 'نورا إبراهيم',
      subject: 'لغة إنجليزية', photo_url: '',
      likes: 15, rating: '9.5', rating_count: 25
    },
    {
      teacher_id: 'T005', name: 'خالد منصور',
      subject: 'حاسب آلي', photo_url: '',
      likes: 42, rating: '8.9', rating_count: 18
    },
    {
      teacher_id: 'T006', name: 'هدى سالم',
      subject: 'تاريخ', photo_url: '',
      likes: 11, rating: '8.1', rating_count: 7
    }
  ];
}
