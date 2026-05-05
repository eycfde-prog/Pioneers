// ============================================================
// PIONEERS ACADEMY — Pio-Q-Engine.js
// محرك توجيه الأسئلة
// ============================================================

const API_URL = 'https://script.google.com/macros/s/AKfycby8mKLySPt58BXV8TKnAh5G7REKJCYYW5EXsKQoSKRfzgkZd2YpcCQb-4Zss8Bh_9g-/exec';

// ============================================================
// CONSTANTS
// ============================================================

// أنواع الأسئلة
const Q_TYPES = {
  MCQ:   'mcq',      // اختيار من متعدد
  TF:    'tf',       // صح وغلط
  FILL:  'fill',     // إكمال فراغ
  ORDER: 'order',    // ترتيب
  MATCH: 'match',    // مطابقة
  ESSAY: 'essay'     // مقالي / كتابي
};

// المراحل اللي مفيهاش Timer
const NO_TIMER_GRADES = ['KG1', 'KG2', 'الصف الأول الابتدائي', 'الصف الثاني الابتدائي'];

// وقت السؤال الافتراضي (ثانية) — مضاعف
const DEFAULT_TIME = {
  mcq:   60,
  tf:    30,
  fill:  90,
  order: 120,
  match: 120,
  essay: 0   // مفيش timer
};

// ============================================================
// STATE
// ============================================================
const Engine = {
  teacherId:   null,
  studentGrade:null,
  lessonId:    null,
  examName:    null,
  examType:    null,  // single_type | mixed
  questions:   [],
  parentData:  JSON.parse(localStorage.getItem('pioneer_parent') || 'null'),
  studentId:   null,
  attemptKey:  null,  // مفتاح تخزين المحاولة في localStorage
};

// ============================================================
// INIT — نقطة البداية
// ============================================================
async function initEngine(teacherId, lessonId, examName, studentGrade, studentId) {
  Engine.teacherId    = teacherId;
  Engine.lessonId     = lessonId;
  Engine.examName     = examName;
  Engine.studentGrade = studentGrade;
  Engine.studentId    = studentId;
  Engine.attemptKey   = `attempt_${teacherId}_${lessonId}_${examName}_${studentId}`;

  // جيب الأسئلة من الـ API
  const questions = await fetchQuestions(teacherId, examName);
  if (!questions || questions.length === 0) {
    showEngineError('مفيش أسئلة في الامتحان ده');
    return;
  }

  Engine.questions = questions;
  Engine.examType  = detectExamType(questions);

  // لو امتحان نوع واحد — تحقق من المحاولة القديمة
  if (Engine.examType === 'single_type') {
    const oldAttempt = getAttempt();
    if (oldAttempt) {
      showAttemptReport(oldAttempt);
      return;
    }
  }

  // وجّه للتمبليت الصح
  routeToTemplate(questions, studentGrade);
}

// ============================================================
// FETCH QUESTIONS
// ============================================================
async function fetchQuestions(teacherId, examName) {
  try {
    const res  = await fetch(`${API_URL}?action=getQuestions&teacher_id=${teacherId}&exam_name=${encodeURIComponent(examName)}`);
    const data = await res.json();
    return data.questions || [];
  } catch (err) {
    console.error('Engine fetch error:', err);
    return [];
  }
}

// ============================================================
// DETECT EXAM TYPE
// ============================================================
function detectExamType(questions) {
  const types = [...new Set(questions.map(q => q.type?.toLowerCase()))];
  return types.length === 1 ? 'single_type' : 'mixed';
}

// ============================================================
// ROUTER — القلب
// ============================================================
function routeToTemplate(questions, grade) {
  // لو امتحان متنوع — قسّم الأسئلة لمجموعات حسب النوع
  if (Engine.examType === 'mixed') {
    const groups = groupByType(questions);
    launchMixedExam(groups, grade);
    return;
  }

  // امتحان نوع واحد
  const type = questions[0]?.type?.toLowerCase();
  launchSingleTemplate(type, questions, grade);
}

// ============================================================
// LAUNCH SINGLE TEMPLATE
// ============================================================
function launchSingleTemplate(type, questions, grade) {
  const hasTimer = !NO_TIMER_GRADES.includes(grade);
  const timePerQ = hasTimer ? DEFAULT_TIME[type] * 2 : 0;

  const config = {
    questions,
    grade,
    hasTimer,
    timePerQ,
    examType:  Engine.examType,
    attemptKey: Engine.attemptKey,
    onComplete: handleExamComplete
  };

  // تحميل التمبليت المناسب
  switch (type) {
    case Q_TYPES.MCQ:   window.QTemplate = new MCQTemplate(config);   break;
    case Q_TYPES.TF:    window.QTemplate = new TFTemplate(config);    break;
    case Q_TYPES.FILL:  window.QTemplate = new FillTemplate(config);  break;
    case Q_TYPES.ORDER: window.QTemplate = new OrderTemplate(config); break;
    case Q_TYPES.MATCH: window.QTemplate = new MatchTemplate(config); break;
    case Q_TYPES.ESSAY: window.QTemplate = new EssayTemplate(config); break;
    default:
      showEngineError(`نوع سؤال غير معروف: ${type}`);
  }
}

// ============================================================
// LAUNCH MIXED EXAM
// ============================================================
function launchMixedExam(groups, grade) {
  // عرض سكرين اختيار نوع السؤال
  const container = document.getElementById('q-engine-container');
  if (!container) return;

  const typeNames = {
    mcq:   '📝 اختيار من متعدد',
    tf:    '✅ صح وغلط',
    fill:  '✏️ إكمال فراغ',
    order: '🔢 ترتيب',
    match: '🔗 مطابقة',
    essay: '📄 مقالي'
  };

  container.innerHTML = `
    <div class="engine-mixed-intro">
      <div class="engine-header">
        <div class="engine-icon">📋</div>
        <h2>امتحان شامل</h2>
        <p>الامتحان ده فيه ${Engine.questions.length} سؤال من أنواع مختلفة</p>
      </div>
      <div class="mixed-sections">
        ${Object.entries(groups).map(([type, qs]) => `
          <div class="mixed-section-card" onclick="launchSingleTemplate('${type}', ${JSON.stringify(qs).replace(/"/g,'&quot;')}, '${grade}')">
            <div class="msc-icon">${typeNames[type]?.split(' ')[0] || '📝'}</div>
            <div class="msc-info">
              <div class="msc-name">${typeNames[type]?.split(' ').slice(1).join(' ') || type}</div>
              <div class="msc-count">${qs.length} سؤال</div>
            </div>
            <div class="msc-arrow">←</div>
          </div>`
        ).join('')}
      </div>
      <div class="mixed-note">💡 تقدر تعمل كل نوع أكتر من مرة</div>
    </div>`;
}

// ============================================================
// GROUP BY TYPE
// ============================================================
function groupByType(questions) {
  return questions.reduce((acc, q) => {
    const type = q.type?.toLowerCase() || 'mcq';
    if (!acc[type]) acc[type] = [];
    acc[type].push(q);
    return acc;
  }, {});
}

// ============================================================
// ATTEMPT STORAGE
// ============================================================
function saveAttempt(result) {
  localStorage.setItem(Engine.attemptKey, JSON.stringify({
    ...result,
    date: new Date().toISOString()
  }));

  // بعت للـ API عشان يتسجل في الـ Sheet
  try {
    fetch(API_URL, {
      method: 'POST',
      body:   JSON.stringify({
        action:      'saveExamAttempt',
        teacher_id:  Engine.teacherId,
        student_id:  Engine.studentId,
        lesson_id:   Engine.lessonId,
        exam_name:   Engine.examName,
        score:       result.score,
        total:       result.total,
        date:        new Date().toISOString()
      })
    });
  } catch {}
}

function getAttempt() {
  try {
    const raw = localStorage.getItem(Engine.attemptKey);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ============================================================
// HANDLE EXAM COMPLETE
// ============================================================
function handleExamComplete(result) {
  // لو امتحان نوع واحد — احفظ المحاولة
  if (Engine.examType === 'single_type') {
    saveAttempt(result);
  }
  showExamReport(result);
}

// ============================================================
// SHOW EXAM REPORT — التقرير البسيط
// ============================================================
function showExamReport(result) {
  const container = document.getElementById('q-engine-container');
  if (!container) return;

  const { score, total, wrong } = result;
  const pct     = total > 0 ? Math.round((score / total) * 100) : 0;
  const barFill = Math.min(pct, 100);
  const emoji   = pct >= 80 ? '🌟' : pct >= 60 ? '👍' : '💪';
  const msg     = pct >= 80 ? 'ممتاز — استمر!' : pct >= 60 ? 'كويس — كمّل ذاكر!' : 'حاول تاني — هتبقى أحسن!';
  const barColor = pct >= 80 ? '#4ADE80' : pct >= 60 ? '#F5C842' : '#F87171';

  const wrongHtml = wrong?.length > 0
    ? `<div class="report-wrong-section">
        <div class="report-wrong-title">الأسئلة الغلط:</div>
        ${wrong.map(w => `
          <div class="report-wrong-item">
            ❌ س${w.num} — إجابتك: <span class="wrong-ans">${w.given}</span> — الصح: <span class="correct-ans">${w.correct}</span>
          </div>`).join('')}
       </div>`
    : '';

  container.innerHTML = `
    <div class="exam-report">
      <div class="report-emoji">${emoji}</div>
      <div class="report-title">خلصت الامتحان!</div>

      <div class="report-score">${score} / ${total}</div>

      <div class="report-bar-wrap">
        <div class="report-bar" style="width:${barFill}%;background:${barColor}"></div>
      </div>
      <div class="report-pct" style="color:${barColor}">${pct}%</div>

      <div class="report-stats">
        <div class="report-stat">
          <span class="rs-icon">✅</span>
          <span class="rs-val">${score}</span>
          <span class="rs-label">صح</span>
        </div>
        <div class="report-stat">
          <span class="rs-icon">❌</span>
          <span class="rs-val">${total - score}</span>
          <span class="rs-label">غلط</span>
        </div>
      </div>

      ${wrongHtml}

      <div class="report-msg">${msg}</div>

      <div class="report-actions">
        ${Engine.examType === 'mixed'
          ? `<button class="report-btn report-btn-retry" onclick="routeToTemplate(Engine.questions, Engine.studentGrade)">
               🔄 امتحان تاني
             </button>`
          : `<button class="report-btn report-btn-review" onclick="showAttemptReport(getAttempt())">
               👁️ راجع إجاباتك
             </button>`
        }
        <button class="report-btn report-btn-close" onclick="closeQEngine()">✓ تمام</button>
      </div>
    </div>`;
}

// ============================================================
// SHOW ATTEMPT REPORT — لو الطالب رجع لامتحان خلصه
// ============================================================
function showAttemptReport(attempt) {
  if (!attempt) return;
  const container = document.getElementById('q-engine-container');
  if (!container) return;

  const pct      = Math.round((attempt.score / attempt.total) * 100);
  const barColor = pct >= 80 ? '#4ADE80' : pct >= 60 ? '#F5C842' : '#F87171';
  const date     = attempt.date
    ? new Date(attempt.date).toLocaleDateString('ar-EG', { day:'numeric', month:'short' })
    : '';

  container.innerHTML = `
    <div class="exam-report">
      <div class="report-emoji">📋</div>
      <div class="report-title">نتيجتك القديمة</div>
      <div class="report-date" style="font-size:13px;color:var(--text-dim);margin-bottom:12px">${date}</div>

      <div class="report-score">${attempt.score} / ${attempt.total}</div>
      <div class="report-bar-wrap">
        <div class="report-bar" style="width:${pct}%;background:${barColor}"></div>
      </div>
      <div class="report-pct" style="color:${barColor}">${pct}%</div>

      <div class="report-stats">
        <div class="report-stat"><span class="rs-icon">✅</span><span class="rs-val">${attempt.score}</span><span class="rs-label">صح</span></div>
        <div class="report-stat"><span class="rs-icon">❌</span><span class="rs-val">${attempt.total - attempt.score}</span><span class="rs-label">غلط</span></div>
      </div>

      ${attempt.wrong?.length > 0 ? `
        <div class="report-wrong-section">
          <div class="report-wrong-title">الأسئلة الغلط:</div>
          ${attempt.wrong.map(w => `
            <div class="report-wrong-item">
              ❌ س${w.num} — إجابتك: <span class="wrong-ans">${w.given}</span> — الصح: <span class="correct-ans">${w.correct}</span>
            </div>`).join('')}
        </div>` : ''}

      <div class="report-note">🔒 الامتحان ده اتعمل مرة واحدة بس</div>
      <button class="report-btn report-btn-close" onclick="closeQEngine()">✓ تمام</button>
    </div>`;
}

// ============================================================
// ERROR
// ============================================================
function showEngineError(msg) {
  const container = document.getElementById('q-engine-container');
  if (container) {
    container.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--text-dim)">
        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
        <p>${msg}</p>
      </div>`;
  }
}

function closeQEngine() {
  const container = document.getElementById('q-engine-container');
  if (container) container.innerHTML = '';
  // لو في callback من الصفحة الأم
  if (typeof onQEngineClose === 'function') onQEngineClose();
}

// ============================================================
// ENGINE STYLES — Injected
// ============================================================
(function injectEngineStyles() {
  if (document.getElementById('q-engine-styles')) return;
  const style = document.createElement('style');
  style.id = 'q-engine-styles';
  style.textContent = `
    #q-engine-container {
      font-family: 'Tajawal', sans-serif;
      direction: rtl;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }

    /* Mixed Intro */
    .engine-mixed-intro { text-align: center; }
    .engine-header { margin-bottom: 28px; }
    .engine-icon { font-size: 52px; margin-bottom: 12px; }
    .engine-header h2 { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
    .engine-header p  { font-size: 14px; color: var(--text-dim, #888); }
    .mixed-sections { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
    .mixed-section-card {
      background: var(--surface, #1C1C30);
      border: 1px solid var(--border, rgba(255,255,255,0.1));
      border-radius: 12px; padding: 16px 18px;
      display: flex; align-items: center; gap: 14px;
      cursor: pointer; transition: all .25s; text-align: right;
    }
    .mixed-section-card:hover { border-color: var(--gold, #F5C842); transform: translateX(-3px); }
    .msc-icon  { font-size: 24px; flex-shrink: 0; }
    .msc-info  { flex: 1; }
    .msc-name  { font-size: 15px; font-weight: 700; }
    .msc-count { font-size: 12px; color: var(--text-dim, #888); }
    .msc-arrow { color: var(--text-dim, #888); font-size: 18px; }
    .mixed-note { font-size: 13px; color: var(--text-dim, #888); }

    /* Report */
    .exam-report { text-align: center; padding: 20px 0; }
    .report-emoji { font-size: 56px; margin-bottom: 10px; }
    .report-title { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
    .report-score { font-size: 42px; font-weight: 900; color: var(--gold, #F5C842); font-family: 'Space Mono', monospace; margin: 12px 0 8px; }
    .report-bar-wrap { height: 10px; background: var(--surface-2, #242438); border-radius: 5px; overflow: hidden; margin: 0 auto 8px; max-width: 300px; }
    .report-bar { height: 100%; border-radius: 5px; transition: width .8s ease; }
    .report-pct { font-size: 18px; font-weight: 800; margin-bottom: 16px; }
    .report-stats { display: flex; justify-content: center; gap: 32px; margin-bottom: 20px; }
    .report-stat { display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .rs-icon  { font-size: 20px; }
    .rs-val   { font-size: 22px; font-weight: 900; }
    .rs-label { font-size: 11px; color: var(--text-dim, #888); }
    .report-wrong-section { background: var(--surface, #1C1C30); border-radius: 10px; padding: 14px; margin: 0 0 16px; text-align: right; }
    .report-wrong-title { font-size: 13px; font-weight: 700; color: var(--text-dim, #888); margin-bottom: 10px; }
    .report-wrong-item { font-size: 13px; padding: 5px 0; border-bottom: 1px solid var(--border, rgba(255,255,255,0.07)); }
    .report-wrong-item:last-child { border-bottom: none; }
    .wrong-ans   { color: #F87171; font-weight: 700; }
    .correct-ans { color: #4ADE80; font-weight: 700; }
    .report-msg  { font-size: 15px; color: var(--text-dim, #888); margin-bottom: 20px; }
    .report-note { font-size: 13px; color: var(--text-muted, #555); margin: 8px 0 16px; }
    .report-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    .report-btn {
      padding: 11px 22px; border-radius: 8px; font-family: 'Tajawal', sans-serif;
      font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: all .3s;
    }
    .report-btn-retry  { background: var(--gold, #F5C842); color: #0a0a14; }
    .report-btn-review { background: var(--surface, #1C1C30); border: 1px solid var(--border, rgba(255,255,255,0.1)); color: var(--text, #eee); }
    .report-btn-close  { background: #4ADE80; color: #0a0a14; }
    .report-btn:hover  { transform: scale(1.04); }
  `;
  document.head.appendChild(style);
})();
