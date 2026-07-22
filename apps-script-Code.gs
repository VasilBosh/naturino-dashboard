/************************************************************************
 * NATURINO KIDS — ДВИГАТЕЛ ЗА НАПОМНЯНИЯ  (версия 4)
 * ---------------------------------------------------------------------
 *  - Само ЕДНО съобщение (стандартно напомняне) за всички.
 *  - Максимум 2 напомняния на клиент, без повторения:
 *      • всички:   напомняне на ден 18
 *      • 1 брой:   второ (последно) напомняне на ден 30
 *      • 2+ броя:  второ (последно) напомняне на ден 35
 *  - Автоматично разпознава колоните и смята количеството от цената.
 *  - Всяка нова поръчка нулира часовника и напомнянията.
 *
 * НАСТРОЙВА СЕ САМО РАЗДЕЛ "CONFIG".
 ************************************************************************/

const CONFIG = {
  // ---- Твоите данни ----
  siteUrl:      'https://kids.naturinokids.bg/',
  phone:        '+359 896 783 751',
  viberNumber:  '359896783751',
  contactEmail: 'info@naturinokids.bg',
  logoUrl:      'https://kids.naturinokids.bg/logo.png',
  senderName:   'Naturino Kids',

  // Таен код за връзката с таблото (трябва да е ЕДНАКЪВ с API_TOKEN в src/config.js)
  webToken:     'naturino-taen-kod-smeni-me',

  // ---- Цени за смятане на количеството ----
  productPrice:    19.90,          // цена на 1 шишенце
  deliveryOptions: [3.52, 4.15],   // възможни цени за доставка

  // ---- Дни за напомняне (2 напомняния общо, после спира) ----
  reminder1Day:    18,   // всички: първо напомняне
  reminder2Single: 30,   // 1 брой: второ (последно) напомняне
  reminder2Multi:  35,   // 2+ броя: второ (последно) напомняне

  importHasHeader: true,

  // Резервни номера на колони (1=A,2=B...), АКО авто-разпознаването се провали.
  // За твоя файл реалните са: име=8, имейл=11, телефон=12, цена=15, дата=3
  fallbackNameCol:  8,
  fallbackEmailCol: 11,
  fallbackPhoneCol: 12,
  fallbackCodCol:   15,
  fallbackDateCol:  3
};

const SHEETS = {
  clients: 'Клиенти',
  import: 'Импорт',
  log: 'Лог имейли',
  stats: 'Статистика'
};

/* =====================================================================
 *  МЕНЮ
 * ===================================================================*/
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🌿 Naturino')
    .addItem('1. Първоначална настройка (създай листовете)', 'setupSheets')
    .addSeparator()
    .addItem('2. Обработи импорт', 'обработиИмпорт')
    .addItem('3. Изпрати напомняния СЕГА (ръчно/тест)', 'дневнаПроверка')
    .addItem('4. Обнови статистиката', 'обновиСтатистика')
    .addSeparator()
    .addItem('5. Включи автоматичните напомняния (дневен тригер)', 'създайТригер')
    .addToUi();
}

/* =====================================================================
 *  НАСТРОЙКА НА ЛИСТОВЕТЕ
 * ===================================================================*/
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const CLIENT_HEADERS = [
    'Телефон',
    'Ключ',
    'Име',
    'Имейл',
    'Последна поръчка',
    'Брой поръчки',
    'Първа поръчка',
    'Количество (последна)',
    'Напомняне 1',
    'Напомняне 2'
  ];

  // Клиенти — ВИНАГИ налага правилните заглавия
  let c = ss.getSheetByName(SHEETS.clients) || ss.insertSheet(SHEETS.clients);
  const hadData = c.getLastRow() > 1;

  c.getRange(1, 1, 1, CLIENT_HEADERS.length)
    .setValues([CLIENT_HEADERS])
    .setFontWeight('bold');

  // Изчистваме евентуален стар 11-ти заглавен ред ("Напомняне посл."/"Оферта посл.")
  c.getRange(1, CLIENT_HEADERS.length + 1).clearContent();

  c.setFrozenRows(1);
  c.hideColumns(2);

  // Импорт
  if (!ss.getSheetByName(SHEETS.import)) {
    ss.insertSheet(SHEETS.import);
  }

  // Лог имейли
  let l = ss.getSheetByName(SHEETS.log) || ss.insertSheet(SHEETS.log);

  l.getRange(1, 1, 1, 6)
    .setValues([['Дата', 'Телефон', 'Име', 'Имейл', 'Тип', 'Статус']])
    .setFontWeight('bold');

  l.setFrozenRows(1);

  // Статистика
  if (!ss.getSheetByName(SHEETS.stats)) {
    ss.insertSheet(SHEETS.stats);
  }

  let msg =
    'Готово ✅ Заглавията са зададени/поправени.\n\n' +
    'Колоните в "Клиенти" вече са: … Количество · Напомняне 1 · Напомняне 2';

  if (hadData) {
    msg +=
      '\n\n⚠️ ВНИМАНИЕ: в лист "Клиенти" има стари редове с данни от предишна версия. ' +
      'Изтрий ги само ако колоните са разместени, след което пусни импорта наново.';
  }

  msg += '\n\nСега сложи дневния файл в лист "Импорт" и натисни "Обработи импорт".';

  SpreadsheetApp.getUi().alert(msg);
}

/* =====================================================================
 *  ПОМОЩНИ ФУНКЦИИ
 * ===================================================================*/
function normPhone(raw) {
  if (raw === null || raw === undefined) {
    return '';
  }

  let d = String(raw).replace(/\D/g, '');

  // Ако са точно 8 цифри, добавяме 08 отпред.
  if (d.length === 8) {
    d = '08' + d;
  }

  // Ключът е последните 9 цифри.
  return d.length >= 9 ? d.slice(-9) : '';
}

/**
 * Взима само първото име.
 * "Васил Николаев Бошнаков" -> "Васил"
 */
function firstName(raw) {
  if (raw === null || raw === undefined) {
    return '';
  }

  const име = String(raw).trim();

  if (!име) {
    return '';
  }

  return име.split(/\s+/)[0];
}

function parseDate(v) {
  if (!v) {
    return new Date();
  }

  if (v instanceof Date && !isNaN(v)) {
    return v;
  }

  const s = String(v).trim();

  // Формат: 2026-07-09 16:04:55 или 2026-07-09
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (m) {
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }

  // Формат: дд.мм.гггг
  m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);

  if (m) {
    let y = +m[3];

    if (y < 100) {
      y += 2000;
    }

    return new Date(y, +m[2] - 1, +m[1]);
  }

  const d = new Date(s);

  return isNaN(d) ? new Date() : d;
}

function daysSince(d) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);

  const x = new Date(d);
  x.setHours(0, 0, 0, 0);

  return Math.floor((t - x) / 86400000);
}

function fmtDate(d) {
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'dd.MM.yyyy');
}

// Смята броя шишенца от COD цената.
function qtyFromCod(cod) {
  const c = parseFloat(String(cod).replace(',', '.'));

  if (!c || isNaN(c)) {
    return 1;
  }

  let bestQ = 1;
  let bestErr = 999;

  CONFIG.deliveryOptions.forEach(d => {
    const raw = (c - d) / CONFIG.productPrice;
    const q = Math.round(raw);
    const err = Math.abs(raw - q);

    if (q >= 1 && err < bestErr) {
      bestQ = q;
      bestErr = err;
    }
  });

  return bestQ;
}

// Разпознава колоните по заглавния ред.
function откриКолони(header) {
  const find = keywords => {
    for (let i = 0; i < header.length; i++) {
      const h = String(header[i]).toLowerCase();

      if (keywords.some(keyword => h.indexOf(keyword) > -1)) {
        return i;
      }
    }

    return -1;
  };

  const name = find(['consignee', 'име', 'name']);
  const email = find(['email', 'mail', 'имейл']);
  const phone = find(['phone', 'тел']);
  const cod = find(['cod', 'сума', 'цена', 'amount']);

  const date = (function () {
    let i = find(['completed']);

    if (i > -1) {
      return i;
    }

    return find(['date', 'дата']);
  })();

  return {
    name:  name  > -1 ? name  : CONFIG.fallbackNameCol  - 1,
    email: email > -1 ? email : CONFIG.fallbackEmailCol - 1,
    phone: phone > -1 ? phone : CONFIG.fallbackPhoneCol - 1,
    cod:   cod   > -1 ? cod   : CONFIG.fallbackCodCol   - 1,
    date:  date  > -1 ? date  : CONFIG.fallbackDateCol  - 1
  };
}

/* =====================================================================
 *  ВЛИВАНЕ НА ИМПОРТА В БАЗАТА
 * ===================================================================*/
function обработиИмпорт() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const imp = ss.getSheetByName(SHEETS.import);
  const cust = ss.getSheetByName(SHEETS.clients);
  const ui = SpreadsheetApp.getUi();

  if (!imp || !cust) {
    ui.alert('Липсват листове. Пусни "Първоначална настройка".');
    return;
  }

  const impData = imp.getDataRange().getValues();

  if (impData.length === 0) {
    ui.alert('Лист "Импорт" е празен.');
    return;
  }

  // Обработваме редовете чрез общото ядро.
  const res = вливанеОтРедове(impData);

  // Изчистваме импорта.
  const clearFrom = CONFIG.importHasHeader ? 2 : 1;
  const lastR = imp.getLastRow();

  if (lastR >= clearFrom) {
    imp.getRange(clearFrom, 1, lastR - clearFrom + 1, imp.getLastColumn()).clearContent();
  }

  обновиСтатистика();

  ui.alert(
    'Импортът е обработен ✅\n\n' +
    'Нови клиенти: ' + res.нови +
    '\nПовторни поръчки: ' + res.повторни +
    '\nПропуснати (без телефон): ' + res.пропуснати +
    '\n\nРазпознати колони: име, имейл, телефон, цена, дата — автоматично.' +
    '\nЛист "Импорт" е изчистен.'
  );
}

/**
 * ЯДРО НА ВЛИВАНЕТО — приема масив от редове (impData[0] = заглавия),
 * влива ги в лист "Клиенти" и връща брояч. Ползва се и от менюто,
 * и от уеб импорта (таблото). Не показва прозорци.
 */
function вливанеОтРедове(impData) {
  const cust = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.clients);

  if (!cust) {
    return { нови: 0, повторни: 0, пропуснати: 0 };
  }

  if (!impData || impData.length === 0) {
    return { нови: 0, повторни: 0, пропуснати: 0 };
  }

  const col = откриКолони(impData[0]);
  const startRow = CONFIG.importHasHeader ? 1 : 0;

  if (impData.length <= startRow) {
    return { нови: 0, повторни: 0, пропуснати: 0 };
  }

  const custData = cust.getDataRange().getValues();
  const keyToRow = {};

  for (let r = 1; r < custData.length; r++) {
    const k = String(custData[r][1]);
    if (k) keyToRow[k] = r + 1;
  }

  let нови = 0;
  let повторни = 0;
  let пропуснати = 0;

  for (let r = startRow; r < impData.length; r++) {
    const row = impData[r];
    const key = normPhone(row[col.phone]);

    if (!key) {
      пропуснати++;
      continue;
    }

    const име = firstName(row[col.name]);
    const имейл = String(row[col.email] || '').trim();
    const дата = parseDate(row[col.date]);
    const бройки = qtyFromCod(row[col.cod]);

    if (keyToRow[key]) {
      const n = keyToRow[key];
      const прежПоръчки = cust.getRange(n, 6).getValue() || 0;

      cust.getRange(n, 5).setValue(дата);
      cust.getRange(n, 6).setValue(прежПоръчки + 1);
      cust.getRange(n, 8).setValue(бройки);
      cust.getRange(n, 9, 1, 2).clearContent();

      if (имейл) cust.getRange(n, 4).setValue(имейл);
      if (име)   cust.getRange(n, 3).setValue(име);

      повторни++;
    } else {
      cust.appendRow([
        String(row[col.phone]), key, име, имейл, дата, 1, дата, бройки, '', ''
      ]);

      keyToRow[key] = cust.getLastRow();
      нови++;
    }
  }

  return { нови: нови, повторни: повторни, пропуснати: пропуснати };
}

/* =====================================================================
 *  ДНЕВНА ПРОВЕРКА + ИЗПРАЩАНЕ  (максимум 2 напомняния)
 * ===================================================================*/
function дневнаПроверка() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cust = ss.getSheetByName(SHEETS.clients);

  if (!cust) {
    return;
  }

  const data = cust.getDataRange().getValues();
  let пратени = 0;

  for (let r = 1; r < data.length; r++) {
    const row = data[r];

    if (!row[1]) {
      continue; // няма клиентски ключ
    }

    const име = firstName(row[2]);
    const имейл = String(row[3] || '').trim();
    const посл = row[4];

    if (!посл) {
      continue;
    }

    const D = daysSince(посл);
    const бройки = Number(row[7]) || 1;
    const single = бройки <= 1;

    const напомн1 = row[8];   // ден 18
    const напомн2 = row[9];   // ден 30 (1 брой) / ден 35 (2+)

    const n = r + 1;

    let колона = 0;

    // 1) Първо напомняне — ден 18 (всички).
    if (D >= CONFIG.reminder1Day && !напомн1) {
      колона = 9;
    }
    // 2) Второ (последно) напомняне — ден 30 за 1 брой, ден 35 за 2+.
    else {
      const secondDay = single ? CONFIG.reminder2Single : CONFIG.reminder2Multi;

      if (D >= secondDay && !напомн2) {
        колона = 10;
      }
    }

    if (!колона) {
      continue; // клиентът е получил каквото му се полага — спираме
    }

    // Няма имейл -> маркираме за Viber.
    if (!имейл) {
      cust.getRange(n, колона).setValue('няма имейл (Viber)');
      logRow(row[0], име, '', 'Напомняне', 'ПРОПУСНАТ — няма имейл (за Viber)');
      continue;
    }

    const res = изпратиНапомняне(имейл, име);
    cust.getRange(n, колона).setValue(new Date());
    logRow(row[0], име, имейл, 'Напомняне', res);

    if (res === 'изпратен') {
      пратени++;
    }
  }

  обновиСтатистика();

  try {
    SpreadsheetApp.getUi().alert('Проверката приключи. Изпратени: ' + пратени);
  } catch (e) {
    // При автоматичен тригер няма активен интерфейс.
  }
}

/* =====================================================================
 *  ИЗПРАЩАНЕ
 * ===================================================================*/
function изпратиНапомняне(имейл, име) {
  return _send(имейл, 'Малко напомняне за Naturino Kids 🌿', имейлНапомняне(име));
}

function _send(имейл, subject, html) {
  try {
    MailApp.sendEmail({
      to: имейл,
      subject: subject,
      htmlBody: html,
      name: CONFIG.senderName
    });

    return 'изпратен';
  } catch (e) {
    return 'ГРЕШКА: ' + e.message;
  }
}

function logRow(тел, име, имейл, тип, статус) {
  const l = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.log);

  if (l) {
    l.appendRow([new Date(), тел, име, имейл, тип, статус]);
  }
}

/* =====================================================================
 *  ИМЕЙЛ ШАБЛОН  (само едно съобщение)
 * ===================================================================*/
function имейлWrap(поздрав, тяло, ctaText) {
  const лого = CONFIG.logoUrl
    ? '<img src="' + CONFIG.logoUrl + '" alt="Naturino Kids" style="max-height:60px;margin-bottom:8px;">'
    : '<div style="font-size:22px;font-weight:700;color:#3a7d44;">🌿 Naturino Kids</div>';

  return '' +
    '<div style="background:#f4f7f4;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">' +
      '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.06);">' +
        '<div style="text-align:center;padding:26px 24px 8px;">' + лого + '</div>' +
        '<div style="padding:8px 32px;color:#2c3e2f;font-size:16px;line-height:1.6;">' +
          '<p style="font-size:18px;font-weight:600;margin:0 0 14px;">' + поздрав + '</p>' +
          тяло +
        '</div>' +
        '<div style="text-align:center;padding:8px 24px 28px;">' +
          '<a href="' + CONFIG.siteUrl + '" style="display:inline-block;background:#3a7d44;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 34px;border-radius:30px;">' + ctaText + '</a>' +
        '</div>' +
        '<div style="background:#eef3ee;padding:18px 24px;text-align:center;color:#5c6b5e;font-size:13px;line-height:1.6;">' +
          'Naturino Kids &nbsp;•&nbsp; ' +
          '<a href="tel:' + CONFIG.phone.replace(/\s/g, '') + '" style="color:#3a7d44;text-decoration:none;">' + CONFIG.phone + '</a>' +
          ' &nbsp;•&nbsp; ' +
          '<a href="mailto:' + CONFIG.contactEmail + '" style="color:#3a7d44;text-decoration:none;">' + CONFIG.contactEmail + '</a>' +
          '<br>' +
          '<a href="' + CONFIG.siteUrl + '" style="color:#3a7d44;text-decoration:none;">' + CONFIG.siteUrl + '</a>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function имейлНапомняне(име) {
  const п = име
    ? 'Здравейте, ' + име + '! 🌿'
    : 'Здравейте! 🌿';

  const тяло =
    '<p>' +
      'Пишем Ви малко по-рано, защото шишенцето Naturino Kids вероятно вече е към края си.' +
    '</p>' +
    '<p>' +
      'Едно шишенце обикновено стига за около 20 дни, затова Ви напомняме сега, за да имате достатъчно време да поръчате следващото и да не се окаже, че капките са свършили точно когато сте решили да ги дадете.' +
    '</p>' +
    '<p>' +
      'Между работата, детската градина и всички останали грижи е съвсем нормално подобно нещо да бъде пропуснато. Ние сме тук само да Ви подсетим навреме. 💚' +
    '</p>' +
    '<p>' +
      '<strong><em>Поздрави, Пламена.</em></strong>' + '🍀' +
    '</p>';

  return имейлWrap(п, тяло, 'Поръчайте отново');
}

/* =====================================================================
 *  СТАТИСТИКА
 * ===================================================================*/
function обновиСтатистика() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cust = ss.getSheetByName(SHEETS.clients);
  const log = ss.getSheetByName(SHEETS.log);
  const s = ss.getSheetByName(SHEETS.stats);

  if (!cust || !s) {
    return;
  }

  const data = cust.getDataRange().getValues();

  let общо = 0;
  let повторни = 0;
  let единично = 0;
  let множествено = 0;
  let безИмейл = 0;

  let вчера = 0;
  let седмица = 0;
  let месец = 0;

  for (let r = 1; r < data.length; r++) {
    if (!data[r][1]) {
      continue;
    }

    общо++;

    const бр = data[r][5] || 0;
    const кол = Number(data[r][7]) || 1;
    const посл = data[r][4];

    if (бр >= 2) повторни++;
    if (кол <= 1) единично++; else множествено++;
    if (!String(data[r][3]).trim()) безИмейл++;

    if (посл) {
      const d = daysSince(посл);
      if (d === 1) вчера++;
      if (d <= 7) седмица++;
      if (d <= 30) месец++;
    }
  }

  let напомнения = 0;

  if (log) {
    const ld = log.getDataRange().getValues();

    for (let r = 1; r < ld.length; r++) {
      const ст = String(ld[r][5] || '');
      if (ст.indexOf('изпратен') > -1) напомнения++;
    }
  }

  const проц = общо ? Math.round(повторни / общо * 100) : 0;

  s.clear();

  s.getRange(1, 1, 15, 2).setValues([
    ['ПОКАЗАТЕЛ', 'СТОЙНОСТ'],
    ['Общо клиенти в базата', общо],
    ['Клиенти с 2+ поръчки (върнали се)', повторни],
    ['Процент върнали се', проц + '%'],
    ['', ''],
    ['Последна поръчка: 1 брой', единично],
    ['Последна поръчка: 2+ броя', множествено],
    ['Клиенти без имейл (за Viber)', безИмейл],
    ['', ''],
    ['Поръчки вчера', вчера],
    ['Поръчки последните 7 дни', седмица],
    ['Поръчки последните 30 дни', месец],
    ['', ''],
    ['Напомняния изпратени (общо)', напомнения],
    [
      'Обновено',
      fmtDate(new Date()) + ' ' +
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm')
    ]
  ]);

  s.getRange('1:1').setFontWeight('bold');
  s.getRange('A1:A15').setFontWeight('bold');
  s.autoResizeColumns(1, 2);
}

/* =====================================================================
 *  АВТОМАТИЧЕН ТРИГЕР
 * ===================================================================*/
function създайТригер() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'дневнаПроверка') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('дневнаПроверка')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  SpreadsheetApp.getUi().alert('✅ Готово. Напомнянията ще се изпращат автоматично всяка сутрин около 9:00.');
}

/* =====================================================================
 *  УЕБ ВРЪЗКА С ТАБЛОТО  (doGet / doPost)
 *  След добавяне: Deploy > New deployment > Web app.
 * ===================================================================*/

// GET: таблото чете статистиката.
function doGet(e) {
  const p = (e && e.parameter) || {};

  if (p.token !== CONFIG.webToken) {
    return _json({ ok: false, error: 'Невалиден код' });
  }

  if (p.action === 'stats') {
    return _json(getStatsObject());
  }

  return _json({ ok: false, error: 'Непозната заявка' });
}

// POST: таблото праща редовете от файла за обработка.
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.token !== CONFIG.webToken) {
      return _json({ ok: false, error: 'Невалиден код' });
    }

    if (body.action === 'import') {
      const res = вливанеОтРедове(body.rows || []);
      обновиСтатистика();
      return _json({
        ok: true,
        нови: res.нови,
        повторни: res.повторни,
        пропуснати: res.пропуснати
      });
    }

    return _json({ ok: false, error: 'Непозната заявка' });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Връща числата за таблото (същите като лист "Статистика" + дневна серия).
function getStatsObject() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cust = ss.getSheetByName(SHEETS.clients);
  const log = ss.getSheetByName(SHEETS.log);

  const out = {
    ok: true,
    total: 0, returning: 0, returningPct: 0,
    single: 0, multi: 0, noEmail: 0,
    ordersYesterday: 0, orders7d: 0, orders30d: 0,
    remindersSent: 0, daily: []
  };

  if (!cust) return out;

  const data = cust.getDataRange().getValues();
  const dailyMap = {};

  for (let r = 1; r < data.length; r++) {
    if (!data[r][1]) continue;

    out.total++;

    const бр = data[r][5] || 0;
    const кол = Number(data[r][7]) || 1;
    const посл = data[r][4];

    if (бр >= 2) out.returning++;
    if (кол <= 1) out.single++; else out.multi++;
    if (!String(data[r][3]).trim()) out.noEmail++;

    if (посл) {
      const d = daysSince(посл);
      if (d === 1) out.ordersYesterday++;
      if (d <= 7) out.orders7d++;
      if (d <= 30) out.orders30d++;

      if (d >= 0 && d <= 29) {
        const key = Utilities.formatDate(new Date(посл), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        dailyMap[key] = (dailyMap[key] || 0) + 1;
      }
    }
  }

  out.returningPct = out.total ? Math.round(out.returning / out.total * 100) : 0;

  // Дневна серия за последните 30 дни (винаги 30 точки).
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 29; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 86400000);
    const key = Utilities.formatDate(day, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const label = Utilities.formatDate(day, Session.getScriptTimeZone(), 'dd.MM');
    out.daily.push({ date: label, count: dailyMap[key] || 0 });
  }

  if (log) {
    const ld = log.getDataRange().getValues();
    for (let r = 1; r < ld.length; r++) {
      if (String(ld[r][5] || '').indexOf('изпратен') > -1) out.remindersSent++;
    }
  }

  return out;
}
