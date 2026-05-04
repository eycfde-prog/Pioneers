// ============================================================
// PIONEERS ACADEMY — Q-Templates.js
// كل تمبليتات الأسئلة في ملف واحد
// ============================================================

// ============================================================
// BASE TEMPLATE — الأساس المشترك
// ============================================================
class BaseTemplate {
  constructor(config) {
    this.questions  = config.questions || [];
    this.grade      = config.grade     || '';
    this.hasTimer   = config.hasTimer  !== false;
    this.timePerQ   = config.timePerQ  || 60;
    this.attemptKey = config.attemptKey || '';
    this.onComplete = config.onComplete || (() => {});
    this.examType   = config.examType  || 'single_type';

    this.currentQ   = 0;
    this.score      = 0;
    this.wrong      = [];
    this.timer      = null;
    this.timeLeft   = 0;
    this.answered   = false;

    this.container  = document.getElementById('q-engine-container');
    this.render();
  }

  // الهيكل الأساسي
  baseHTML(questionHTML, optionsHTML) {
    const q      = this.questions[this.currentQ];
    const num    = this.currentQ + 1;
    const total  = this.questions.length;
    const pct    = Math.round((num / total) * 100);

    return `
      <div class="qt-wrap">
        <!-- Header -->
        <div class="qt-header">
          <div class="qt-progress-bar">
            <div class="qt-progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="qt-meta">
            <span class="qt-counter">${num} / ${total}</span>
            ${this.hasTimer && this.timePerQ > 0
              ? `<span class="qt-timer" id="qt-timer">⏱ ${this.timePerQ}s</span>`
              : ''}
          </div>
        </div>

        <!-- Help button -->
        <button class="qt-help-btn" onclick="toggleHelp()">💡 مساعدة</button>
        <div class="qt-help-box" id="qt-help" style="display:none"></div>

        <!-- Question -->
        <div class="qt-question-box">
          ${questionHTML}
        </div>

        <!-- Options -->
        <div class="qt-options" id="qt-options">
          ${optionsHTML}
        </div>

        <!-- Feedback -->
        <div class="qt-feedback" id="qt-feedback" style="display:none"></div>

        <!-- Next button -->
        <button class="qt-next-btn" id="qt-next" onclick="this.getRootNode().defaultView.QTemplate.nextQuestion()" style="display:none">
          ${num === total ? 'إنهاء ✓' : 'التالي ←'}
        </button>
      </div>`;
  }

  // عرض التغذية الراجعة
  showFeedback(isCorrect, correctAnswer, explanation) {
    this.answered = true;
    clearInterval(this.timer);

    const fb = document.getElementById('qt-feedback');
    if (fb) {
      fb.style.display = 'block';
      fb.className     = `qt-feedback ${isCorrect ? 'correct' : 'wrong'}`;
      fb.innerHTML     = isCorrect
        ? `<span>✅ إجابة صح!</span>${explanation ? `<small>${explanation}</small>` : ''}`
        : `<span>❌ الإجابة الصح: <strong>${correctAnswer}</strong></span>${explanation ? `<small>${explanation}</small>` : ''}`;
    }

    const next = document.getElementById('qt-next');
    if (next) next.style.display = 'block';
  }

  // السؤال الجاي
  nextQuestion() {
    this.currentQ++;
    if (this.currentQ >= this.questions.length) {
      this.finish();
    } else {
      this.answered = false;
      this.render();
    }
  }

  // إنهاء الامتحان
  finish() {
    clearInterval(this.timer);
    this.onComplete({
      score: this.score,
      total: this.questions.length,
      wrong: this.wrong
    });
  }

  // Timer
  startTimer() {
    if (!this.hasTimer || this.timePerQ <= 0) return;
    this.timeLeft = this.timePerQ;
    clearInterval(this.timer);

    this.timer = setInterval(() => {
      this.timeLeft--;
      const el    = document.getElementById('qt-timer');
      const color = this.timeLeft <= 10 ? '#F87171' : this.timeLeft <= 30 ? '#F5C842' : '#4ADE80';
      if (el) el.innerHTML = `<span style="color:${color}">⏱ ${this.timeLeft}s</span>`;

      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.onTimeUp();
      }
    }, 1000);
  }

  onTimeUp() {
    if (!this.answered) {
      this.wrong.push({ num: this.currentQ + 1, given: '(انتهى الوقت)', correct: '—' });
      this.showFeedback(false, 'انتهى الوقت', '');
      this.disableOptions();
    }
  }

  disableOptions() {
    document.querySelectorAll('.qt-option').forEach(o => {
      o.style.pointerEvents = 'none';
    });
  }
}

// ============================================================
// 1 — MCQ TEMPLATE
// ============================================================
class MCQTemplate extends BaseTemplate {
  render() {
    if (!this.container) return;
    const q       = this.questions[this.currentQ];
    const letters = ['أ', 'ب', 'ج', 'د'];
    const keys    = ['A', 'B', 'C', 'D'];

    const optionsHTML = keys.map((key, i) => `
      <button class="qt-option qt-option-mcq" data-key="${key}"
              onclick="window.QTemplate.answer('${key}')">
        <span class="qt-option-letter">${letters[i]}</span>
        <span class="qt-option-text">${q[key] || ''}</span>
      </button>`).join('');

    const questionHTML = `
      <div class="qt-q-num">سؤال ${this.currentQ + 1}</div>
      <div class="qt-q-text">${q.question}</div>`;

    this.container.innerHTML = this.baseHTML(questionHTML, optionsHTML);
    this.setHelp('اقرأ كل الاختيارات كويس قبل ما تختار — لو مش متأكد استبعد الغلط الأول');
    this.startTimer();
  }

  answer(chosen) {
    if (this.answered) return;
    const q       = this.questions[this.currentQ];
    const correct = q.correct?.toUpperCase();
    const letters = { A:'أ', B:'ب', C:'ج', D:'د' };
    const isRight = chosen === correct;

    if (isRight) {
      this.score++;
    } else {
      this.wrong.push({
        num:     this.currentQ + 1,
        given:   letters[chosen] || chosen,
        correct: letters[correct] || correct
      });
    }

    // لوّن الاختيارات
    document.querySelectorAll('.qt-option-mcq').forEach(btn => {
      btn.style.pointerEvents = 'none';
      if (btn.dataset.key === correct) btn.classList.add('qt-correct');
      if (btn.dataset.key === chosen && !isRight) btn.classList.add('qt-wrong');
    });

    this.showFeedback(isRight, `${letters[correct]} — ${q[correct]}`, q.explanation);
  }

  setHelp(text) {
    const el = document.getElementById('qt-help');
    if (el) el.textContent = text;
  }
}

// ============================================================
// 2 — TRUE/FALSE TEMPLATE
// ============================================================
class TFTemplate extends BaseTemplate {
  render() {
    if (!this.container) return;
    const q = this.questions[this.currentQ];

    const optionsHTML = `
      <button class="qt-option qt-option-tf qt-tf-true" data-val="true"
              onclick="window.QTemplate.answer('true')">
        <span class="qt-tf-icon">✅</span> صح
      </button>
      <button class="qt-option qt-option-tf qt-tf-false" data-val="false"
              onclick="window.QTemplate.answer('false')">
        <span class="qt-tf-icon">❌</span> غلط
      </button>`;

    const questionHTML = `
      <div class="qt-q-num">سؤال ${this.currentQ + 1}</div>
      <div class="qt-q-text">${q.question}</div>`;

    this.container.innerHTML = this.baseHTML(questionHTML, optionsHTML);
    this.setHelp('العبارة إما صح تماماً أو غلط — لو فيها جزء غلط يبقى الجواب غلط');
    this.startTimer();
  }

  answer(chosen) {
    if (this.answered) return;
    const q       = this.questions[this.currentQ];
    const correct = q.correct?.toLowerCase() === 'true' ? 'true' : 'false';
    const isRight = chosen === correct;

    if (isRight) this.score++;
    else this.wrong.push({ num: this.currentQ + 1, given: chosen === 'true' ? 'صح' : 'غلط', correct: correct === 'true' ? 'صح' : 'غلط' });

    document.querySelectorAll('.qt-option-tf').forEach(btn => {
      btn.style.pointerEvents = 'none';
      if (btn.dataset.val === correct) btn.classList.add('qt-correct');
      if (btn.dataset.val === chosen && !isRight) btn.classList.add('qt-wrong');
    });

    this.showFeedback(isRight, correct === 'true' ? 'صح ✅' : 'غلط ❌', q.explanation);
  }

  setHelp(text) {
    const el = document.getElementById('qt-help');
    if (el) el.textContent = text;
  }
}

// ============================================================
// 3 — FILL IN THE BLANK TEMPLATE
// ============================================================
class FillTemplate extends BaseTemplate {
  render() {
    if (!this.container) return;
    const q = this.questions[this.currentQ];

    // الجملة فيها ___ مكان الفراغ
    const displayText = q.question.replace(/___+/g,
      `<span class="qt-blank-space" id="blank-display">________</span>`);

    const questionHTML = `
      <div class="qt-q-num">سؤال ${this.currentQ + 1}</div>
      <div class="qt-q-text">${displayText}</div>`;

    const optionsHTML = `
      <div class="qt-fill-wrap">
        <input type="text" class="qt-fill-input" id="qt-fill-input"
               placeholder="اكتب الإجابة هنا..."
               onkeydown="if(event.key==='Enter') window.QTemplate.answer()">
        <button class="qt-fill-submit" onclick="window.QTemplate.answer()">تأكيد ✓</button>
      </div>`;

    this.container.innerHTML = this.baseHTML(questionHTML, optionsHTML);
    this.setHelp('اكتب الكلمة أو الجملة اللي تكمّل الفراغ — مش لازم تطابق تماماً في الكتابة');
    document.getElementById('qt-fill-input')?.focus();
    this.startTimer();
  }

  answer() {
    if (this.answered) return;
    const input   = document.getElementById('qt-fill-input');
    const given   = input?.value.trim() || '';
    if (!given) return;

    const q       = this.questions[this.currentQ];
    const correct = q.correct || q.A || '';

    // مقارنة مرنة — بتشيل المسافات والتشكيل
    const normalize = s => s.trim().replace(/[\u064B-\u065F]/g, '').toLowerCase();
    const isRight   = normalize(given) === normalize(correct);

    if (isRight) this.score++;
    else this.wrong.push({ num: this.currentQ + 1, given, correct });

    if (input) input.disabled = true;
    document.querySelector('.qt-fill-submit')?.setAttribute('disabled', true);

    this.showFeedback(isRight, correct, q.explanation);
  }

  setHelp(text) {
    const el = document.getElementById('qt-help');
    if (el) el.textContent = text;
  }
}

// ============================================================
// 4 — ORDERING TEMPLATE
// ============================================================
class OrderTemplate extends BaseTemplate {
  constructor(config) {
    super(config);
    this.items = [];
  }

  render() {
    if (!this.container) return;
    const q = this.questions[this.currentQ];

    // الأيتمز موجودة في A, B, C, D
    const keys  = ['A','B','C','D','E'].filter(k => q[k]);
    this.items  = keys.map(k => q[k]);

    // خلط الأيتمز
    const shuffled = [...this.items].sort(() => Math.random() - 0.5);

    const questionHTML = `
      <div class="qt-q-num">سؤال ${this.currentQ + 1}</div>
      <div class="qt-q-text">${q.question}</div>
      <div class="qt-order-hint">اسحب الأيتمز عشان ترتبها صح 👆</div>`;

    const optionsHTML = `
      <div class="qt-order-list" id="qt-order-list">
        ${shuffled.map((item, i) => `
          <div class="qt-order-item" draggable="true" data-index="${i}"
               ondragstart="window.QTemplate.dragStart(event)"
               ondragover="window.QTemplate.dragOver(event)"
               ondrop="window.QTemplate.drop(event)"
               ontouchstart="window.QTemplate.touchStart(event)"
               ontouchmove="window.QTemplate.touchMove(event)"
               ontouchend="window.QTemplate.touchEnd(event)">
            <span class="qt-order-handle">⠿</span>
            <span class="qt-order-text">${item}</span>
          </div>`).join('')}
      </div>
      <button class="qt-fill-submit" onclick="window.QTemplate.answer()" style="margin-top:16px;width:100%">
        تأكيد الترتيب ✓
      </button>`;

    this.container.innerHTML = this.baseHTML(questionHTML, optionsHTML);
    this.setHelp('اسحب كل عنصر لمكانه الصح — الترتيب من فوق لتحت');
    this.startTimer();
    this.draggedEl = null;
  }

  dragStart(e) {
    this.draggedEl = e.currentTarget;
    e.currentTarget.classList.add('dragging');
  }

  dragOver(e) {
    e.preventDefault();
    const list  = document.getElementById('qt-order-list');
    const items = [...list.querySelectorAll('.qt-order-item:not(.dragging)')];
    const after = items.find(item => {
      const box = item.getBoundingClientRect();
      return e.clientY < box.top + box.height / 2;
    });
    if (after) list.insertBefore(this.draggedEl, after);
    else list.appendChild(this.draggedEl);
  }

  drop(e) {
    e.preventDefault();
    this.draggedEl?.classList.remove('dragging');
  }

  // Touch support
  touchStart(e) {
    this.draggedEl = e.currentTarget;
    this._touchY   = e.touches[0].clientY;
  }

  touchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const list  = document.getElementById('qt-order-list');
    const items = [...list.querySelectorAll('.qt-order-item')].filter(i => i !== this.draggedEl);
    const after = items.find(item => {
      const box = item.getBoundingClientRect();
      return touch.clientY < box.top + box.height / 2;
    });
    if (after) list.insertBefore(this.draggedEl, after);
    else list.appendChild(this.draggedEl);
  }

  touchEnd(e) {}

  answer() {
    if (this.answered) return;
    const list    = document.getElementById('qt-order-list');
    const current = [...list.querySelectorAll('.qt-order-text')].map(el => el.textContent);
    const q       = this.questions[this.currentQ];
    const correct = ['A','B','C','D','E'].filter(k => q[k]).map(k => q[k]);

    const isRight = JSON.stringify(current) === JSON.stringify(correct);

    if (isRight) this.score++;
    else this.wrong.push({ num: this.currentQ + 1, given: current.join(' → '), correct: correct.join(' → ') });

    // لوّن الأيتمز
    list.querySelectorAll('.qt-order-item').forEach((item, i) => {
      item.style.pointerEvents = 'none';
      item.classList.add(current[i] === correct[i] ? 'qt-correct' : 'qt-wrong');
    });

    document.querySelector('.qt-fill-submit')?.setAttribute('disabled', true);
    this.showFeedback(isRight, correct.join(' ← '), q.explanation);
  }

  setHelp(text) {
    const el = document.getElementById('qt-help');
    if (el) el.textContent = text;
  }
}

// ============================================================
// 5 — MATCHING TEMPLATE
// ============================================================
class MatchTemplate extends BaseTemplate {
  constructor(config) {
    super(config);
    this.selectedLeft  = null;
    this.matches       = {};
  }

  render() {
    if (!this.container) return;
    const q = this.questions[this.currentQ];

    // العمود الأيمن: keys A, B, C, D
    // العمود الأيسر: values في A_match, B_match, C_match, D_match
    const keys    = ['A','B','C','D'].filter(k => q[k]);
    const left    = keys.map(k => ({ key: k, text: q[k] }));
    const right   = keys.map(k => ({ key: k, text: q[`${k}_match`] || q[k] }))
                        .sort(() => Math.random() - 0.5);

    this.correctMap = Object.fromEntries(keys.map(k => [k, q[`${k}_match`] || q[k]]));
    this.matches    = {};

    const questionHTML = `
      <div class="qt-q-num">سؤال ${this.currentQ + 1}</div>
      <div class="qt-q-text">${q.question}</div>`;

    const optionsHTML = `
      <div class="qt-match-grid">
        <div class="qt-match-col">
          ${left.map(item => `
            <div class="qt-match-item qt-match-left" data-key="${item.key}"
                 onclick="window.QTemplate.selectLeft('${item.key}', this)">
              ${item.text}
            </div>`).join('')}
        </div>
        <div class="qt-match-col">
          ${right.map(item => `
            <div class="qt-match-item qt-match-right" data-key="${item.key}"
                 onclick="window.QTemplate.selectRight('${item.key}', this)">
              ${item.text}
            </div>`).join('')}
        </div>
      </div>
      <button class="qt-fill-submit" id="qt-match-submit"
              onclick="window.QTemplate.answer()" style="margin-top:16px;width:100%" disabled>
        تأكيد المطابقة ✓
      </button>`;

    this.container.innerHTML = this.baseHTML(questionHTML, optionsHTML);
    this.setHelp('اضغط على عنصر من اليمين ثم اضغط على مقابله من اليسار');
    this.startTimer();
  }

  selectLeft(key, el) {
    if (this.answered) return;
    document.querySelectorAll('.qt-match-left').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    this.selectedLeft = key;
  }

  selectRight(key, el) {
    if (this.answered || !this.selectedLeft) return;

    // أزل أي ربط قديم لنفس اليسار
    const prevRight = Object.keys(this.matches).find(r => this.matches[r] === this.selectedLeft);
    if (prevRight) {
      document.querySelector(`.qt-match-right[data-key="${prevRight}"]`)?.classList.remove('matched');
    }

    this.matches[key]  = this.selectedLeft;
    document.querySelectorAll('.qt-match-right').forEach(e => e.classList.remove('selected'));
    el.classList.add('matched');
    document.querySelector(`.qt-match-left[data-key="${this.selectedLeft}"]`)?.classList.add('matched');
    document.querySelectorAll('.qt-match-left').forEach(e => e.classList.remove('selected'));
    this.selectedLeft  = null;

    // لو كل حاجة اتربطت — فعّل زرار التأكيد
    const keys = document.querySelectorAll('.qt-match-left').length;
    if (Object.keys(this.matches).length === keys) {
      document.getElementById('qt-match-submit')?.removeAttribute('disabled');
    }
  }

  answer() {
    if (this.answered) return;
    const q = this.questions[this.currentQ];
    const keys = ['A','B','C','D'].filter(k => q[k]);

    let correctCount = 0;
    keys.forEach(k => {
      const matchedKey = Object.keys(this.matches).find(r => this.matches[r] === k);
      if (matchedKey === k) correctCount++;
    });

    const isRight = correctCount === keys.length;
    if (isRight) this.score++;
    else this.wrong.push({ num: this.currentQ + 1, given: `${correctCount}/${keys.length} صح`, correct: 'كل الربط' });

    document.querySelectorAll('.qt-match-item').forEach(el => el.style.pointerEvents = 'none');
    this.showFeedback(isRight, 'الربط الصح', q.explanation);
  }

  setHelp(text) {
    const el = document.getElementById('qt-help');
    if (el) el.textContent = text;
  }
}

// ============================================================
// 6 — ESSAY TEMPLATE (كتابي / مقالي)
// ============================================================
class EssayTemplate extends BaseTemplate {
  render() {
    if (!this.container) return;
    const questions = this.questions;
    const q0        = questions[0];
    const subType   = q0?.sub_type || 'paragraph'; // paragraph | explain | draw | label

    // عرض كل الأسئلة في صفحة واحدة
    const questionsHTML = questions.map((q, i) => {
      const spaceStyle = this.getSpaceStyle(q.sub_type);
      return `
        <div class="qt-essay-q">
          <div class="qt-essay-q-num">سؤال ${i + 1}</div>
          <div class="qt-essay-q-text">${q.question}</div>
          <div class="qt-essay-space" style="${spaceStyle}">
            ${q.sub_type === 'draw' ? '<div class="qt-draw-hint">ارسم هنا</div>' : ''}
          </div>
        </div>`;
    }).join('');

    this.container.innerHTML = `
      <div class="qt-essay-wrap">
        <div class="qt-essay-header">
          <div class="qt-essay-title">📄 امتحان مقالي</div>
          <div class="qt-essay-count">${questions.length} سؤال</div>
        </div>

        <div class="qt-essay-instructions">
          <div class="qt-inst-item">📥 نزّل الامتحان كـ PDF</div>
          <div class="qt-inst-item">✏️ أجب على الأسئلة بخط يدك</div>
          <div class="qt-inst-item">📷 صوّر إجابتك وارفعها</div>
        </div>

        <div class="qt-essay-questions" id="qt-essay-questions">
          ${questionsHTML}
        </div>

        <div class="qt-essay-actions">
          <button class="qt-essay-btn qt-essay-pdf" onclick="window.QTemplate.downloadPDF()">
            📥 تنزيل PDF
          </button>
          <button class="qt-essay-btn qt-essay-print" onclick="window.print()">
            🖨️ طباعة مباشرة
          </button>
        </div>

        <div class="qt-essay-upload-section">
          <div class="qt-essay-upload-title">📤 ارفع إجابتك</div>
          <div class="qt-upload-zone" id="qt-upload-zone"
               onclick="document.getElementById('qt-answer-file').click()">
            <div class="qt-upload-icon">📷</div>
            <div class="qt-upload-text">اضغط هنا أو اسحب صورة الإجابة</div>
            <input type="file" id="qt-answer-file" accept="image/*" multiple
                   style="display:none" onchange="window.QTemplate.handleUpload(this)">
          </div>
          <div id="qt-upload-preview" class="qt-upload-preview"></div>
          <button class="qt-essay-btn qt-essay-submit" id="qt-essay-submit"
                  onclick="window.QTemplate.submitEssay()" style="display:none">
            إرسال الإجابة ✓
          </button>
        </div>
      </div>`;

    this.setHelp('نزّل الامتحان أو اطبعه — أجب بخط يدك — صوّر الإجابة وارفعها');
  }

  getSpaceStyle(subType) {
    switch (subType) {
      case 'paragraph': return 'height:160px;border:1px dashed rgba(255,255,255,0.15);border-radius:8px;margin-top:10px';
      case 'explain':   return 'height:80px;border:1px dashed rgba(255,255,255,0.15);border-radius:8px;margin-top:10px';
      case 'draw':      return 'height:200px;border:1px dashed rgba(255,255,255,0.15);border-radius:8px;margin-top:10px;display:flex;align-items:center;justify-content:center';
      default:          return 'height:100px;border:1px dashed rgba(255,255,255,0.15);border-radius:8px;margin-top:10px';
    }
  }

  handleUpload(input) {
    const files   = [...input.files];
    const preview = document.getElementById('qt-upload-preview');
    const submit  = document.getElementById('qt-essay-submit');

    preview.innerHTML = files.map((file, i) => {
      const url = URL.createObjectURL(file);
      return `<div class="qt-preview-item">
        <img src="${url}" alt="إجابة ${i+1}">
        <span>صورة ${i+1}</span>
      </div>`;
    }).join('');

    if (files.length > 0 && submit) submit.style.display = 'block';
    this.uploadFiles = files;
  }

  async submitEssay() {
    if (!this.uploadFiles?.length) return;

    const btn = document.getElementById('qt-essay-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري الإرسال...'; }

    try {
      // تحويل الصور لـ base64 وإرسالها
      for (let i = 0; i < this.uploadFiles.length; i++) {
        const file   = this.uploadFiles[i];
        const b64    = await fileToBase64(file);
        const fname  = buildFileName(i);

        await fetch(API_URL, {
          method: 'POST',
          body:   JSON.stringify({
            action:      'uploadStudentAnswer',
            file_base64: b64,
            file_name:   fname,
            teacher_id:  Engine.teacherId,
            student_id:  Engine.studentId,
            lesson_id:   Engine.lessonId,
            exam_name:   Engine.examName,
            answer_num:  i + 1
          })
        });
      }

      if (btn) { btn.textContent = '✅ تم الإرسال!'; btn.style.background = '#4ADE80'; btn.style.color = '#0a0a14'; }

      setTimeout(() => closeQEngine(), 2000);

    } catch {
      if (btn) { btn.disabled = false; btn.textContent = 'إرسال الإجابة ✓'; }
      alert('تعذّر إرسال الإجابة — حاول تاني');
    }
  }

  async downloadPDF() {
    // PDF بيتبني من HTML وبيتنزل
    const content = document.getElementById('qt-essay-questions')?.innerHTML;
    if (!content) return;

    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>امتحان</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:'Tajawal',sans-serif; padding:40px; color:#111; direction:rtl; }
          .qt-essay-q { margin-bottom:32px; page-break-inside:avoid; }
          .qt-essay-q-num { font-size:13px; color:#666; margin-bottom:6px; }
          .qt-essay-q-text { font-size:16px; font-weight:700; margin-bottom:10px; line-height:1.7; }
          .qt-essay-space { border:1px dashed #ccc; border-radius:6px; margin-top:8px; }
          .qt-draw-hint { color:#bbb; text-align:center; padding:20px; }
          @media print { body { padding:20px; } }
        </style>
      </head>
      <body>
        <h2 style="margin-bottom:24px;font-size:20px">امتحان — ${Engine.examName || ''}</h2>
        ${content}
        <script>setTimeout(()=>{window.print();window.close();},500)<\/script>
      </body>
      </html>`);
  }

  setHelp(text) {
    const el = document.getElementById('qt-help');
    if (el) el.textContent = text;
  }
}

// ============================================================
// HELP TOGGLE
// ============================================================
function toggleHelp() {
  const box = document.getElementById('qt-help');
  if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

// ============================================================
// HELPERS
// ============================================================
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function buildFileName(answerNum) {
  const parts = [
    Engine.teacherId   || 'T',
    Engine.studentId   || 'S',
    Engine.studentGrade?.replace(/\s/g,'_') || 'grade',
    Engine.examName?.replace(/\s/g,'_')     || 'exam',
    Engine.lessonId    || 'L',
    'essay',
    `ans${answerNum + 1}`
  ];
  return parts.join('_') + '.jpg';
}

// ============================================================
// TEMPLATE STYLES
// ============================================================
(function injectTemplateStyles() {
  if (document.getElementById('q-template-styles')) return;
  const style = document.createElement('style');
  style.id = 'q-template-styles';
  style.textContent = `
    /* Base */
    .qt-wrap { font-family:'Tajawal',sans-serif; direction:rtl; max-width:580px; margin:0 auto; padding:16px; }
    .qt-header { margin-bottom:16px; }
    .qt-progress-bar { height:6px; background:var(--surface-2,#242438); border-radius:3px; overflow:hidden; margin-bottom:8px; }
    .qt-progress-fill { height:100%; background:linear-gradient(90deg,#F5C842,#C9A22A); border-radius:3px; transition:width .5s ease; }
    .qt-meta { display:flex; justify-content:space-between; align-items:center; }
    .qt-counter { font-size:13px; color:var(--text-dim,#888); font-family:'Space Mono',monospace; }
    .qt-timer   { font-size:14px; font-weight:700; font-family:'Space Mono',monospace; }
    .qt-help-btn { background:none; border:1px solid var(--border,rgba(255,255,255,0.1)); color:var(--text-dim,#888); padding:5px 12px; border-radius:20px; font-family:'Tajawal',sans-serif; font-size:12px; cursor:pointer; margin-bottom:10px; transition:all .2s; }
    .qt-help-btn:hover { border-color:var(--gold,#F5C842); color:var(--gold,#F5C842); }
    .qt-help-box { background:rgba(245,200,66,.08); border:1px solid rgba(245,200,66,.2); border-radius:8px; padding:10px 14px; font-size:13px; color:var(--gold,#F5C842); margin-bottom:12px; line-height:1.7; }
    .qt-question-box { background:var(--surface,#1C1C30); border-radius:12px; padding:18px; margin-bottom:18px; }
    .qt-q-num  { font-size:11px; color:var(--text-muted,#555); margin-bottom:6px; font-family:'Space Mono',monospace; }
    .qt-q-text { font-size:17px; font-weight:700; line-height:1.7; }

    /* Options */
    .qt-options { display:flex; flex-direction:column; gap:10px; margin-bottom:14px; }
    .qt-option {
      background:var(--surface,#1C1C30); border:1px solid var(--border,rgba(255,255,255,0.1));
      border-radius:10px; padding:13px 16px; font-family:'Tajawal',sans-serif; font-size:15px;
      color:var(--text,#eee); text-align:right; cursor:pointer; transition:all .25s;
      display:flex; align-items:center; gap:10px;
    }
    .qt-option:hover:not([disabled]) { border-color:rgba(245,200,66,.4); background:var(--surface-2,#242438); }
    .qt-option.qt-correct { border-color:#4ADE80; background:rgba(74,222,128,.08); color:#4ADE80; }
    .qt-option.qt-wrong   { border-color:#F87171; background:rgba(248,113,113,.08); color:#F87171; }
    .qt-option-letter { width:28px; height:28px; border-radius:6px; background:var(--dark-3,#171728); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; }

    /* TF */
    .qt-options:has(.qt-option-tf) { flex-direction:row; }
    .qt-option-tf { flex:1; justify-content:center; font-size:16px; font-weight:700; padding:18px; }
    .qt-tf-icon { font-size:24px; }

    /* Fill */
    .qt-fill-wrap { display:flex; gap:8px; }
    .qt-fill-input { flex:1; background:var(--surface,#1C1C30); border:1px solid var(--border,rgba(255,255,255,0.1)); border-radius:8px; padding:13px 14px; font-family:'Tajawal',sans-serif; font-size:15px; color:var(--text,#eee); text-align:right; outline:none; transition:border-color .3s; }
    .qt-fill-input:focus { border-color:var(--gold,#F5C842); }
    .qt-fill-submit { background:linear-gradient(135deg,#F5C842,#C9A22A); border:none; border-radius:8px; padding:13px 20px; font-family:'Tajawal',sans-serif; font-size:14px; font-weight:700; color:#0a0a14; cursor:pointer; transition:all .3s; white-space:nowrap; }
    .qt-fill-submit:hover:not([disabled]) { transform:scale(1.03); }
    .qt-fill-submit:disabled { opacity:.4; cursor:not-allowed; }
    .qt-blank-space { display:inline-block; border-bottom:2px solid var(--gold,#F5C842); min-width:80px; }

    /* Order */
    .qt-order-hint { font-size:13px; color:var(--text-dim,#888); margin-top:6px; }
    .qt-order-list { display:flex; flex-direction:column; gap:8px; }
    .qt-order-item { background:var(--surface,#1C1C30); border:1px solid var(--border,rgba(255,255,255,0.1)); border-radius:8px; padding:12px 14px; display:flex; align-items:center; gap:10px; cursor:grab; transition:all .2s; user-select:none; }
    .qt-order-item:active { cursor:grabbing; opacity:.7; transform:scale(.98); }
    .qt-order-item.dragging { opacity:.4; border-style:dashed; }
    .qt-order-item.qt-correct { border-color:#4ADE80; background:rgba(74,222,128,.08); }
    .qt-order-item.qt-wrong   { border-color:#F87171; background:rgba(248,113,113,.08); }
    .qt-order-handle { color:var(--text-muted,#555); font-size:16px; flex-shrink:0; }
    .qt-order-text { font-size:14px; font-weight:600; }

    /* Match */
    .qt-match-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .qt-match-col  { display:flex; flex-direction:column; gap:8px; }
    .qt-match-item { background:var(--surface,#1C1C30); border:1px solid var(--border,rgba(255,255,255,0.1)); border-radius:8px; padding:11px 14px; cursor:pointer; transition:all .25s; font-size:14px; font-weight:600; text-align:center; }
    .qt-match-item:hover   { border-color:rgba(245,200,66,.4); }
    .qt-match-item.selected { border-color:var(--gold,#F5C842); background:rgba(245,200,66,.08); }
    .qt-match-item.matched  { border-color:#60A5FA; background:rgba(96,165,250,.08); }

    /* Feedback */
    .qt-feedback { border-radius:8px; padding:12px 14px; margin-bottom:12px; font-size:14px; line-height:1.7; display:flex; flex-direction:column; gap:4px; }
    .qt-feedback.correct { background:rgba(74,222,128,.08); border:1px solid rgba(74,222,128,.2); color:#4ADE80; }
    .qt-feedback.wrong   { background:rgba(248,113,113,.08); border:1px solid rgba(248,113,113,.2); color:#F87171; }
    .qt-feedback small   { font-size:12px; color:var(--text-dim,#888); }

    /* Next */
    .qt-next-btn { width:100%; background:linear-gradient(135deg,#F5C842,#C9A22A); border:none; border-radius:8px; padding:14px; font-family:'Tajawal',sans-serif; font-size:15px; font-weight:700; color:#0a0a14; cursor:pointer; transition:all .3s; }
    .qt-next-btn:hover { transform:scale(1.02); box-shadow:0 4px 18px rgba(245,200,66,.3); }

    /* Essay */
    .qt-essay-wrap { max-width:680px; margin:0 auto; }
    .qt-essay-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
    .qt-essay-title { font-size:20px; font-weight:800; }
    .qt-essay-count { font-size:13px; color:var(--text-dim,#888); background:var(--surface,#1C1C30); padding:4px 12px; border-radius:20px; border:1px solid var(--border,rgba(255,255,255,0.1)); }
    .qt-essay-instructions { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:20px; }
    .qt-inst-item { background:var(--surface,#1C1C30); border:1px solid var(--border,rgba(255,255,255,0.1)); border-radius:8px; padding:8px 14px; font-size:13px; color:var(--text-dim,#888); }
    .qt-essay-q { background:var(--surface,#1C1C30); border:1px solid var(--border,rgba(255,255,255,0.1)); border-radius:10px; padding:18px; margin-bottom:12px; }
    .qt-essay-q-num { font-size:11px; color:var(--text-muted,#555); margin-bottom:6px; font-family:'Space Mono',monospace; }
    .qt-essay-q-text { font-size:15px; font-weight:700; line-height:1.7; }
    .qt-draw-hint { color:var(--text-muted,#555); font-size:13px; }
    .qt-essay-actions { display:flex; gap:10px; margin:16px 0; }
    .qt-essay-btn { padding:12px 20px; border-radius:8px; font-family:'Tajawal',sans-serif; font-size:14px; font-weight:700; cursor:pointer; border:none; transition:all .3s; }
    .qt-essay-pdf   { background:rgba(96,165,250,.1); border:1px solid rgba(96,165,250,.2); color:#60A5FA; }
    .qt-essay-print { background:rgba(167,139,250,.1); border:1px solid rgba(167,139,250,.2); color:#A78BFA; }
    .qt-essay-submit { background:linear-gradient(135deg,#4ADE80,#16A34A); color:#0a0a14; }
    .qt-essay-upload-section { background:var(--surface,#1C1C30); border:1px solid var(--border,rgba(255,255,255,0.1)); border-radius:12px; padding:20px; }
    .qt-essay-upload-title { font-size:15px; font-weight:700; margin-bottom:12px; }
    .qt-upload-zone { border:2px dashed rgba(245,200,66,.3); border-radius:10px; padding:32px; text-align:center; cursor:pointer; transition:all .3s; }
    .qt-upload-zone:hover { border-color:var(--gold,#F5C842); background:rgba(245,200,66,.04); }
    .qt-upload-icon { font-size:32px; margin-bottom:8px; }
    .qt-upload-text { font-size:13px; color:var(--text-dim,#888); }
    .qt-upload-preview { display:flex; flex-wrap:wrap; gap:10px; margin:12px 0; }
    .qt-preview-item { display:flex; flex-direction:column; align-items:center; gap:4px; }
    .qt-preview-item img { width:80px; height:80px; object-fit:cover; border-radius:8px; border:1px solid var(--border,rgba(255,255,255,0.1)); }
    .qt-preview-item span { font-size:11px; color:var(--text-dim,#888); }

    @media (max-width:480px) {
      .qt-options:has(.qt-option-tf) { flex-direction:column; }
      .qt-match-grid { grid-template-columns:1fr; }
      .qt-fill-wrap { flex-direction:column; }
    }
  `;
  document.head.appendChild(style);
})();
