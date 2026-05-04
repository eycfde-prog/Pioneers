// ============================================================
// PIONEERS ACADEMY — Apps Script API (Standalone)
// Spreadsheet ID: 1R46_rFqM4KpVXf1Dlh-Gk7LRQHSagbOBckHztcylFC8
// ============================================================

const SPREADSHEET_ID = '1R46_rFqM4KpVXf1Dlh-Gk7LRQHSagbOBckHztcylFC8';

// ============================================================
// SHEETS STRUCTURE — أسماء الـ Sheets والأعمدة
// ============================================================

const SHEETS = {
  MASTER:  'MASTER',
  PARENTS: 'Parents',
  GROUPS:  'Groups',
  ADMIN:   'Admin',
  INBOX:   'Inbox'
};

// هيكل الأعمدة لكل Sheet
const COLUMNS = {
  MASTER: [
    'teacher_id',       // T001
    'name',             // أحمد علي
    'subject',          // رياضيات
    'photo_url',        // رابط الصورة
    'phone',            // 01001234567
    'whatsapp',         // 01001234567
    'password_hash',    // hash
    'sheet_id',         // ID الـ Spreadsheet الخاص بالتيتشر
    'youtube_links',    // روابط فيديوهات يوتيوب مفصولة بـ |
    'likes',            // عدد اللايكات
    'rating_total',     // مجموع التقييمات
    'rating_count',     // عدد المقيّمين
    'status',           // active / pending / suspended
    'created_at',       // تاريخ التسجيل
    'price_kg',         // سعر المحاضرة KG
    'price_primary',    // سعر المحاضرة ابتدائي
    'price_prep',       // سعر المحاضرة إعدادي
    'price_secondary',  // سعر المحاضرة ثانوي
    'slots'             // المواعيد المتاحة مفصولة بـ |
  ],

  PARENTS: [
    'parent_id',        // P001
    'name',             // اسم ولي الأمر
    'email',            // email
    'password_hash',    // hash
    'cash_phones',      // أرقام الكاش مفصولة بـ |
    'whatsapp',         // رقم الواتساب
    'created_at'        // تاريخ التسجيل
  ],

  GROUPS: [
    'group_id',         // G001
    'teacher_id',       // T001
    'group_name',       // اسم الجروب
    'schedule',         // السبت 5م
    'student_id',       // S001
    'student_name',     // محمد أحمد
    'student_photo',    // رابط الصورة
    'grade',            // الصف الثالث الإعدادي
    'parent_id',        // P001
    'attend_history',   // 100%,50%,80%
    'focus_history',    // 90%,85%,90%
    'commit_history',   // 80%,80%,75%
    'hw_history',       // 100%,75%,90%
    'weekly_history',   // 100%,50%,80%
    'rating_dates'      // تواريخ التقييمات مفصولة بـ |
  ],

  ADMIN: [
    'serial',           // كود 8 أرقام
    'parent_id',        // P001
    'parent_name',      // اسم البيرنت
    'phone',            // رقم التليفون
    'whatsapp',         // رقم الواتساب
    'teacher_id',       // T001
    'plan',             // 4 أو 8 محاضرات
    'students',         // JSON بيانات الطلاب
    'amount',           // المبلغ
    'status',           // pending / confirmed / rejected
    'how_knew',         // إزاي عرف عن الأكاديمية
    'slot',             // الموعد المختار
    'created_at'        // تاريخ الحجز
  ],

  INBOX: [
    'message_id',       // MSG001
    'parent_id',        // P001 أو unknown
    'parent_name',      // اسم البيرنت أو غير معروف
    'whatsapp',         // رقم الواتساب
    'type',             // اقتراح / استفسار / شكوى / أخرى
    'message',          // نص الرسالة
    'is_read',          // true / false
    'created_at'        // تاريخ الرسالة
  ]
};

// ============================================================
// SETUP — إنشاء وتنظيم الـ Sheets أوتوماتيك
// ============================================================

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const results = [];

  Object.keys(SHEETS).forEach(key => {
    const sheetName = SHEETS[key];
    const columns   = COLUMNS[key];

    let sheet = ss.getSheetByName(sheetName);

    // لو الـ Sheet مش موجودة — ننشئها
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      results.push(`✅ تم إنشاء Sheet: ${sheetName}`);
    } else {
      results.push(`ℹ️ Sheet موجودة: ${sheetName}`);
    }

    // نضيف الأعمدة لو الصف الأول فاضي
    const firstRow = sheet.getRange(1, 1, 1, columns.length).getValues()[0];
    const isEmpty  = firstRow.every(cell => cell === '');

    if (isEmpty) {
      sheet.getRange(1, 1, 1, columns.length).setValues([columns]);

      // تنسيق الـ Header
      const headerRange = sheet.getRange(1, 1, 1, columns.length);
      headerRange.setBackground('#1a1a2e');
      headerRange.setFontColor('#F5C842');
      headerRange.setFontWeight('bold');
      headerRange.setFontSize(11);
      sheet.setFrozenRows(1);

      // ضبط عرض الأعمدة
      sheet.setColumnWidths(1, columns.length, 160);

      results.push(`  → تم إضافة الأعمدة لـ ${sheetName}`);
    }
  });

  // حذف الـ Sheet الافتراضية "Sheet1" لو موجودة
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet) {
    ss.deleteSheet(defaultSheet);
    results.push('🗑️ تم حذف Sheet1 الافتراضية');
  }

  Logger.log(results.join('\n'));
  return results.join('\n');
}

// ============================================================
// HELPERS
// ============================================================

function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function sheetToObjects(sheet) {
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  }).filter(row => row[headers[0]] !== ''); // تجاهل الصفوف الفاضية
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function hashPassword(password) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  ).map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function generateId(prefix, sheet) {
  const data  = sheet.getDataRange().getValues();
  const count = Math.max(data.length, 1);
  return `${prefix}${String(count).padStart(3, '0')}`;
}

function generateSerial() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

function generateTeacherCode(fullName) {
  // أول حرفين من الاسم بالإنجليزي + 6 أرقام
  const arabicToEnglish = {
    'أ':'A','ا':'A','إ':'A','آ':'A','ب':'B','ت':'T','ث':'T','ج':'G',
    'ح':'H','خ':'K','د':'D','ذ':'Z','ر':'R','ز':'Z','س':'S','ش':'S',
    'ص':'S','ض':'D','ط':'T','ظ':'Z','ع':'A','غ':'G','ف':'F','ق':'K',
    'ك':'K','ل':'L','م':'M','ن':'N','ه':'H','و':'W','ي':'Y','ى':'Y',
    'ة':'T','ء':'A'
  };

  const parts  = fullName.trim().split(/\s+/);
  const first  = parts[0]  || '';
  const second = parts[1]  || parts[0] || '';

  const c1 = arabicToEnglish[first[0]]  || first[0]?.toUpperCase()  || 'X';
  const c2 = arabicToEnglish[second[0]] || second[0]?.toUpperCase() || 'X';

  const nums = Math.floor(100000 + Math.random() * 900000).toString();
  return `${c1}${c2}${nums}`;
}

// ============================================================
// ROUTER — doGet و doPost
// ============================================================

function doGet(e) {
  try {
    const action = e.parameter.action;
    let result;

    switch (action) {
      case 'getTeachers':      result = getTeachers();                    break;
      case 'getLessons':       result = getLessons(e.parameter);          break;
      case 'getExams':         result = getExams(e.parameter);            break;
      case 'getQuestions':     result = getQuestions(e.parameter);        break;
      case 'getTeacherVideos': result = getTeacherVideos(e.parameter);    break;
      case 'getAvailableSlots':result = getAvailableSlots(e.parameter);   break;
      case 'getMessages':      result = getMessages();                    break;
      case 'getGroups':        result = getGroups(e.parameter);           break;
      case 'getStudentProgress':result = getStudentProgress(e.parameter); break;
      case 'getBookings':      result = getBookings();                    break;
      case 'getParentChildren':result = getParentChildren(e.parameter);   break;
      default: result = { error: 'action غير معروف' };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    let result;

    switch (action) {
      case 'registerParent':   result = registerParent(body);   break;
      case 'loginParent':      result = loginParent(body);       break;
      case 'registerTeacher':  result = registerTeacher(body);   break;
      case 'verifyTeacher':    result = verifyTeacher(body);     break;
      case 'approveTeacher':   result = approveTeacher(body);    break;
      case 'submitBooking':    result = submitBooking(body);     break;
      case 'submitRating':     result = submitRating(body);      break;
      case 'submitMessage':    result = submitMessage(body);     break;
      case 'markAsRead':       result = markAsRead(body);        break;
      case 'addLike':          result = addLike(body);           break;
      case 'submitStarRating': result = submitStarRating(body);  break;
      case 'updateTeacher':    result = updateTeacher(body);     break;
      case 'addGroup':         result = addGroup(body);          break;
      case 'updateStudentPhoto':result = updateStudentPhoto(body);break;
      default: result = { error: 'action غير معروف' };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ============================================================
// TEACHERS — التيتشرز
// ============================================================

function getTeachers() {
  const sheet   = getSheet(SHEETS.MASTER);
  const teachers = sheetToObjects(sheet);
  return teachers
    .filter(t => t.status === 'active')
    .map(t => ({
      teacher_id:    t.teacher_id,
      name:          t.name,
      subject:       t.subject,
      photo_url:     t.photo_url,
      likes:         t.likes || 0,
      rating:        t.rating_count > 0
                       ? (t.rating_total / t.rating_count).toFixed(1)
                       : '0.0',
      rating_count:  t.rating_count || 0,
      youtube_links: t.youtube_links ? t.youtube_links.split('|') : []
    }));
}

function registerTeacher(body) {
  const { name, phone, whatsapp, subjects, photo_url } = body;
  if (!name || !phone) return { error: 'الاسم والتليفون مطلوبين' };

  const sheet = getSheet(SHEETS.MASTER);
  const code  = generateTeacherCode(name);
  const id    = generateId('T', sheet);

  sheet.appendRow([
    id, name, subjects, photo_url || '',
    phone, whatsapp || phone,
    '', '', '', 0, 0, 0,
    'pending',
    new Date().toISOString(),
    0, 0, 0, 0, ''
  ]);

  return { success: true, teacher_id: id, code: code, message: 'تم التسجيل — بياناتك بتتراجع من الإدارة' };
}

function verifyTeacher(body) {
  const { code } = body;
  const sheet    = getSheet(SHEETS.MASTER);
  const teachers = sheetToObjects(sheet);
  const teacher  = teachers.find(t => t.teacher_id === code || t.code === code);

  if (!teacher) return { success: false, message: 'الكود غير صحيح' };
  if (teacher.status === 'pending') return { success: false, pending: true, message: 'بياناتك بتتراجع من الإدارة' };
  if (teacher.status === 'suspended') return { success: false, message: 'الحساب موقوف — تواصل مع الإدارة' };

  return {
    success:    true,
    teacher_id: teacher.teacher_id,
    name:       teacher.name,
    subject:    teacher.subject,
    photo_url:  teacher.photo_url,
    phone:      teacher.phone
  };
}

function approveTeacher(body) {
  const { teacher_id } = body;
  const sheet          = getSheet(SHEETS.MASTER);
  const data           = sheet.getDataRange().getValues();
  const headers        = data[0];
  const statusCol      = headers.indexOf('status') + 1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === teacher_id) {
      sheet.getRange(i + 1, statusCol).setValue('active');
      return { success: true, message: 'تم تفعيل حساب التيتشر' };
    }
  }
  return { error: 'التيتشر مش موجود' };
}

function updateTeacher(body) {
  const { teacher_id, field, value } = body;
  const sheet   = getSheet(SHEETS.MASTER);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const col     = headers.indexOf(field) + 1;

  if (col === 0) return { error: 'العمود مش موجود' };

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === teacher_id) {
      sheet.getRange(i + 1, col).setValue(value);
      return { success: true };
    }
  }
  return { error: 'التيتشر مش موجود' };
}

// ============================================================
// LESSONS & EXAMS — المحتوى التعليمي
// ============================================================

function getLessons(params) {
  const { teacher_id } = params;
  const masterSheet    = getSheet(SHEETS.MASTER);
  const teachers       = sheetToObjects(masterSheet);
  const teacher        = teachers.find(t => t.teacher_id === teacher_id);

  if (!teacher || !teacher.sheet_id) return { error: 'التيتشر مش موجود' };

  const ss           = SpreadsheetApp.openById(teacher.sheet_id);
  const contentSheet = ss.getSheetByName('content');
  if (!contentSheet) return { lessons: [] };

  const data    = contentSheet.getDataRange().getValues();
  const headers = data[0];
  const rows    = data.slice(1).filter(r => r[headers.indexOf('type')] === 'text' || !r[headers.indexOf('type')]);

  // تجميع السلايدز لكل درس
  const lessonsMap = {};
  rows.forEach(row => {
    const obj        = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    const lesson_id  = obj.lesson_id;
    if (!lessonsMap[lesson_id]) {
      lessonsMap[lesson_id] = { lesson_id, title: obj.title, slides: [] };
    }
    lessonsMap[lesson_id].slides.push({ order: obj.slide_order, content: obj.content });
  });

  return { lessons: Object.values(lessonsMap) };
}

function getExams(params) {
  const { teacher_id } = params;
  const masterSheet    = getSheet(SHEETS.MASTER);
  const teachers       = sheetToObjects(masterSheet);
  const teacher        = teachers.find(t => t.teacher_id === teacher_id);

  if (!teacher || !teacher.sheet_id) return { error: 'التيتشر مش موجود' };

  const ss           = SpreadsheetApp.openById(teacher.sheet_id);
  const contentSheet = ss.getSheetByName('content');
  if (!contentSheet) return { exams: [] };

  const data    = contentSheet.getDataRange().getValues();
  const headers = data[0];
  const rows    = data.slice(1).filter(r => r[headers.indexOf('q_id')] !== '');

  const examNames = [...new Set(rows.map(r => r[headers.indexOf('exam_name')]))];
  return { exams: examNames };
}

function getQuestions(params) {
  const { teacher_id, exam_name } = params;
  const masterSheet = getSheet(SHEETS.MASTER);
  const teachers    = sheetToObjects(masterSheet);
  const teacher     = teachers.find(t => t.teacher_id === teacher_id);

  if (!teacher || !teacher.sheet_id) return { error: 'التيتشر مش موجود' };

  const ss           = SpreadsheetApp.openById(teacher.sheet_id);
  const contentSheet = ss.getSheetByName('content');
  if (!contentSheet) return { questions: [] };

  const data    = contentSheet.getDataRange().getValues();
  const headers = data[0];
  const rows    = data.slice(1).filter(r =>
    r[headers.indexOf('exam_name')] === exam_name &&
    r[headers.indexOf('q_id')] !== ''
  );

  return {
    questions: rows.map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    })
  };
}

// ============================================================
// VIDEOS — الفيديوهات
// ============================================================

function getTeacherVideos(params) {
  const { teacher_id } = params;
  const sheet          = getSheet(SHEETS.MASTER);
  const teachers       = sheetToObjects(sheet);
  const teacher        = teachers.find(t => t.teacher_id === teacher_id);

  if (!teacher) return { error: 'التيتشر مش موجود' };

  const links = teacher.youtube_links
    ? teacher.youtube_links.split('|').filter(l => l.trim() !== '')
    : [];

  return { videos: links };
}

// ============================================================
// PARENTS — البيرنتس
// ============================================================

function registerParent(body) {
  const { name, email, password, cash_phones, whatsapp } = body;
  if (!email || !password) return { error: 'الإيميل والباسورد مطلوبين' };

  const sheet   = getSheet(SHEETS.PARENTS);
  const parents = sheetToObjects(sheet);

  if (parents.find(p => p.email === email)) {
    return { error: 'الإيميل ده مسجل قبل كده' };
  }

  const id = generateId('P', sheet);
  sheet.appendRow([
    id, name, email,
    hashPassword(password),
    Array.isArray(cash_phones) ? cash_phones.join('|') : cash_phones,
    whatsapp || '',
    new Date().toISOString()
  ]);

  return { success: true, parent_id: id, name: name };
}

function loginParent(body) {
  const { email, password } = body;
  const sheet    = getSheet(SHEETS.PARENTS);
  const parents  = sheetToObjects(sheet);
  const hashed   = hashPassword(password);
  const parent   = parents.find(p => p.email === email && p.password_hash === hashed);

  if (!parent) return { success: false, message: 'الإيميل أو الباسورد غلط' };

  return {
    success:   true,
    parent_id: parent.parent_id,
    name:      parent.name,
    email:     parent.email,
    whatsapp:  parent.whatsapp
  };
}

function getParentChildren(params) {
  const { parent_id } = params;
  const sheet         = getSheet(SHEETS.GROUPS);
  const rows          = sheetToObjects(sheet);
  const children      = rows.filter(r => r.parent_id === parent_id);

  return {
    children: children.map(c => ({
      student_id:      c.student_id,
      student_name:    c.student_name,
      student_photo:   c.student_photo,
      grade:           c.grade,
      group_id:        c.group_id,
      teacher_id:      c.teacher_id,
      schedule:        c.schedule,
      attend_history:  c.attend_history  ? c.attend_history.split(',')  : [],
      focus_history:   c.focus_history   ? c.focus_history.split(',')   : [],
      commit_history:  c.commit_history  ? c.commit_history.split(',')  : [],
      hw_history:      c.hw_history      ? c.hw_history.split(',')      : [],
      weekly_history:  c.weekly_history  ? c.weekly_history.split(',')  : [],
      rating_dates:    c.rating_dates    ? c.rating_dates.split('|')    : []
    }))
  };
}

// ============================================================
// BOOKING — الحجز
// ============================================================

function getAvailableSlots(params) {
  const { teacher_id } = params;
  const sheet          = getSheet(SHEETS.MASTER);
  const teachers       = sheetToObjects(sheet);
  const teacher        = teachers.find(t => t.teacher_id === teacher_id);

  if (!teacher) return { error: 'التيتشر مش موجود' };

  const slots = teacher.slots
    ? teacher.slots.split('|').filter(s => s.trim() !== '')
    : [];

  return {
    slots,
    prices: {
      kg:        Number(teacher.price_kg)        || 0,
      primary:   Number(teacher.price_primary)   || 0,
      prep:      Number(teacher.price_prep)      || 0,
      secondary: Number(teacher.price_secondary) || 0
    }
  };
}

function submitBooking(body) {
  const {
    parent_id, parent_name, phone, whatsapp,
    teacher_id, plan, students, how_knew, slot
  } = body;

  // حساب المبلغ
  const masterSheet = getSheet(SHEETS.MASTER);
  const teachers    = sheetToObjects(masterSheet);
  const teacher     = teachers.find(t => t.teacher_id === teacher_id);

  const priceMap = {
    'KG1': 'price_kg', 'KG2': 'price_kg',
    'ابتدائي': 'price_primary',
    'إعدادي':  'price_prep',
    'ثانوي':   'price_secondary'
  };

  const lectureCount = plan === '4' ? 4 : 8;
  let totalAmount    = 0;

  students.forEach(student => {
    const gradeKey   = Object.keys(priceMap).find(k => student.grade.includes(k));
    const priceField = gradeKey ? priceMap[gradeKey] : 'price_primary';
    const pricePerLecture = Number(teacher[priceField]) || 0;
    totalAmount += pricePerLecture * lectureCount;
  });

  const serial = generateSerial();
  const sheet  = getSheet(SHEETS.ADMIN);

  sheet.appendRow([
    serial,
    parent_id || 'guest',
    parent_name,
    phone,
    whatsapp || phone,
    teacher_id,
    `${plan} محاضرات`,
    JSON.stringify(students),
    totalAmount,
    'pending',
    how_knew,
    slot,
    new Date().toISOString()
  ]);

  return {
    success: true,
    serial:  serial,
    amount:  totalAmount,
    message: 'تم استلام طلب الحجز — يرجى إتمام الدفع'
  };
}

function getBookings() {
  const sheet    = getSheet(SHEETS.ADMIN);
  const bookings = sheetToObjects(sheet);
  return { bookings };
}

// ============================================================
// RATINGS — التقييمات
// ============================================================

function submitRating(body) {
  const {
    teacher_id, student_id,
    attend, focus, commit, hw, weekly
  } = body;

  const sheet   = getSheet(SHEETS.GROUPS);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];

  const attendCol  = headers.indexOf('attend_history')  + 1;
  const focusCol   = headers.indexOf('focus_history')   + 1;
  const commitCol  = headers.indexOf('commit_history')  + 1;
  const hwCol      = headers.indexOf('hw_history')      + 1;
  const weeklyCol  = headers.indexOf('weekly_history')  + 1;
  const datesCol   = headers.indexOf('rating_dates')    + 1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][headers.indexOf('teacher_id')] === teacher_id &&
        data[i][headers.indexOf('student_id')]  === student_id) {

      const appendVal = (colIndex, newVal) => {
        const existing = data[i][colIndex - 1];
        return existing ? `${existing},${newVal}%` : `${newVal}%`;
      };

      sheet.getRange(i+1, attendCol).setValue(appendVal(attendCol,  attend));
      sheet.getRange(i+1, focusCol).setValue(appendVal(focusCol,    focus));
      sheet.getRange(i+1, commitCol).setValue(appendVal(commitCol,  commit));
      sheet.getRange(i+1, hwCol).setValue(appendVal(hwCol,          hw));
      sheet.getRange(i+1, weeklyCol).setValue(appendVal(weeklyCol,  weekly));

      const existingDates = data[i][datesCol - 1];
      const newDate       = new Date().toLocaleDateString('ar-EG');
      sheet.getRange(i+1, datesCol).setValue(
        existingDates ? `${existingDates}|${newDate}` : newDate
      );

      return { success: true, message: 'تم حفظ التقييم' };
    }
  }

  return { error: 'الطالب مش موجود في هذا الجروب' };
}

function getStudentProgress(params) {
  const { student_id, teacher_id } = params;
  const sheet   = getSheet(SHEETS.GROUPS);
  const rows    = sheetToObjects(sheet);
  const student = rows.find(r =>
    r.student_id === student_id && r.teacher_id === teacher_id
  );

  if (!student) return { error: 'الطالب مش موجود' };

  const parseHistory = h => h ? h.split(',').map(v => parseInt(v) || 0) : [];
  const dates        = student.rating_dates ? student.rating_dates.split('|') : [];

  return {
    student_name:   student.student_name,
    student_photo:  student.student_photo,
    grade:          student.grade,
    dates,
    attend:  parseHistory(student.attend_history),
    focus:   parseHistory(student.focus_history),
    commit:  parseHistory(student.commit_history),
    hw:      parseHistory(student.hw_history),
    weekly:  parseHistory(student.weekly_history)
  };
}

// ============================================================
// LIKES & STAR RATINGS — اللايكات والتقييم بالنجوم
// ============================================================

function addLike(body) {
  const { teacher_id, action } = body; // action: 'add' or 'remove'
  const sheet   = getSheet(SHEETS.MASTER);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const likesCol = headers.indexOf('likes') + 1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === teacher_id) {
      const current = Number(data[i][likesCol - 1]) || 0;
      const updated = action === 'remove' ? Math.max(0, current - 1) : current + 1;
      sheet.getRange(i + 1, likesCol).setValue(updated);
      return { success: true, likes: updated };
    }
  }
  return { error: 'التيتشر مش موجود' };
}

function submitStarRating(body) {
  const { teacher_id, rating, parent_id } = body;
  if (rating < 1 || rating > 10) return { error: 'التقييم لازم يكون بين 1 و 10' };

  const sheet   = getSheet(SHEETS.MASTER);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const totalCol = headers.indexOf('rating_total') + 1;
  const countCol = headers.indexOf('rating_count') + 1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === teacher_id) {
      const total   = Number(data[i][totalCol - 1]) || 0;
      const count   = Number(data[i][countCol - 1]) || 0;
      sheet.getRange(i + 1, totalCol).setValue(total + rating);
      sheet.getRange(i + 1, countCol).setValue(count + 1);
      const newAvg = ((total + rating) / (count + 1)).toFixed(1);
      return { success: true, new_average: newAvg, total_ratings: count + 1 };
    }
  }
  return { error: 'التيتشر مش موجود' };
}

// ============================================================
// GROUPS — الجروبات
// ============================================================

function getGroups(params) {
  const { teacher_id } = params;
  const sheet = getSheet(SHEETS.GROUPS);
  const rows  = sheetToObjects(sheet);

  const groups = {};
  rows.filter(r => r.teacher_id === teacher_id).forEach(r => {
    if (!groups[r.group_id]) {
      groups[r.group_id] = {
        group_id:   r.group_id,
        group_name: r.group_name,
        schedule:   r.schedule,
        students:   []
      };
    }
    groups[r.group_id].students.push({
      student_id:    r.student_id,
      student_name:  r.student_name,
      student_photo: r.student_photo,
      grade:         r.grade,
      parent_id:     r.parent_id,
      attend_history: r.attend_history ? r.attend_history.split(',') : [],
      focus_history:  r.focus_history  ? r.focus_history.split(',')  : [],
      commit_history: r.commit_history ? r.commit_history.split(',') : [],
      hw_history:     r.hw_history     ? r.hw_history.split(',')     : [],
      weekly_history: r.weekly_history ? r.weekly_history.split(',') : [],
      rating_dates:   r.rating_dates   ? r.rating_dates.split('|')   : []
    });
  });

  return { groups: Object.values(groups) };
}

function addGroup(body) {
  const { teacher_id, group_name, schedule, students } = body;
  const sheet   = getSheet(SHEETS.GROUPS);
  const group_id = generateId('G', sheet);

  students.forEach(student => {
    sheet.appendRow([
      group_id, teacher_id, group_name, schedule,
      student.student_id   || generateId('S', sheet),
      student.student_name,
      student.student_photo || '',
      student.grade,
      student.parent_id    || '',
      '', '', '', '', '', ''
    ]);
  });

  return { success: true, group_id };
}

// ============================================================
// STUDENT PHOTO — صورة الطالب
// ============================================================

function updateStudentPhoto(body) {
  const { student_id, photo_url } = body;
  const sheet   = getSheet(SHEETS.GROUPS);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const photoCol = headers.indexOf('student_photo') + 1;
  const idCol    = headers.indexOf('student_id');

  let updated = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === student_id) {
      sheet.getRange(i + 1, photoCol).setValue(photo_url);
      updated++;
    }
  }

  return updated > 0
    ? { success: true, message: 'تم تحديث الصورة' }
    : { error: 'الطالب مش موجود' };
}

// ============================================================
// INBOX — الرسائل
// ============================================================

function submitMessage(body) {
  const { parent_id, parent_name, whatsapp, type, message } = body;
  const sheet = getSheet(SHEETS.INBOX);
  const id    = generateId('MSG', sheet);

  sheet.appendRow([
    id,
    parent_id   || 'unknown',
    parent_name || 'غير معروف',
    whatsapp    || '',
    type        || 'أخرى',
    message,
    false,
    new Date().toISOString()
  ]);

  return { success: true, message_id: id, message: 'تم إرسال رسالتك لمس إسراء' };
}

function getMessages() {
  const sheet    = getSheet(SHEETS.INBOX);
  const messages = sheetToObjects(sheet);
  return {
    messages:    messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    unread_count: messages.filter(m => m.is_read === false || m.is_read === 'false').length
  };
}

function markAsRead(body) {
  const { message_id } = body;
  const sheet   = getSheet(SHEETS.INBOX);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const readCol = headers.indexOf('is_read') + 1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === message_id) {
      sheet.getRange(i + 1, readCol).setValue(true);
      return { success: true };
    }
  }
  return { error: 'الرسالة مش موجودة' };
}
