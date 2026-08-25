/************************************************************************
 * NATURINO KIDS — ДВИГАТЕЛ ЗА НАПОМНЯНИЯ  (версия 9)
 * ---------------------------------------------------------------------
 *  - Само ЕДНО съобщение (стандартно напомняне) за всички.
 *  - Максимум 2 напомняния на клиент:
 *      • всички:   напомняне на ден 18
 *      • 1 брой:   второ (последно) напомняне на ден 30
 *      • 2+ броя:  второ (последно) напомняне на ден 35
 *  - Разпознава колоните и смята количеството + сумата от цената.
 *  - Дневник "Поръчки" (приходи) + защита от двойно броене по номер.
 *  - Лист "История импорти" (докъде си стигнал).
 *  - Копче за оставаща квота + чисто спиране при дневния лимит.
 *  - Всяка нова поръчка нулира часовника и напомнянията.
 *
 * Продуктовите настройки са в "CONFIG". Входът се задава от менюто 🌿 Naturino.
 ************************************************************************/

const CONFIG = {
  // ---- Твоите данни ----
  siteUrl:      'https://kids.naturinokids.bg/',
  phone:        '+359 896 783 751',
  viberNumber:  '359896783751',
  contactEmail: 'info@naturinokids.bg',
  logoUrl:      'https://kids.naturinokids.bg/logo.png',
  senderName:   'Naturino Kids',

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
  stats: 'Статистика',
  orders: 'Поръчки',
  history: 'История импорти'
};

const DASHBOARD_AUTH = {
  sessionHours: 12,
  minPasswordLength: 10,
  statsCacheSeconds: 600,
  statsCacheKey: 'naturinoDashboardStatsV9',
  statsSnapshotKey: 'naturinoDashboardStatsSnapshotV9'
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
    .addSeparator()
    .addItem('📊 Колко имейла ми остават днес', 'покажиКвота')
    .addItem('💰 Напълни дневника от стар файл (еднократно)', 'историченДневник')
    .addSeparator()
    .addItem('🔐 Настрой входа за таблото', 'покажиНастройкаДостъп')
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

  // Поръчки (дневник за приходи + защита от двойно броене)
  let o = ss.getSheetByName(SHEETS.orders) || ss.insertSheet(SHEETS.orders);
  o.getRange(1, 1, 1, 5)
    .setValues([['Номер поръчка', 'Дата', 'Телефон', 'Количество', 'Сума (лв/€)']])
    .setFontWeight('bold');
  o.setFrozenRows(1);

  // История импорти
  let h = ss.getSheetByName(SHEETS.history) || ss.insertSheet(SHEETS.history);
  h.getRange(1, 1, 1, 7)
    .setValues([['Кога импортиран', 'Редове', 'Нови клиенти', 'Повторни', 'Дубликати (пропуснати)', 'Най-ранна дата', 'Най-късна дата']])
    .setFontWeight('bold');
  h.setFrozenRows(1);

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
  return qtyAndAmount(cod).qty;
}

// Връща { qty, amount } — количество И нето сума (COD минус доставката).
// amount е реалният оборот от продукта (улавя и отстъпки), без доставката.
function qtyAndAmount(cod) {
  const c = parseFloat(String(cod).replace(',', '.'));

  if (!c || isNaN(c)) {
    return { qty: 1, amount: 0 };
  }

  let bestQ = 1;
  let bestErr = 999;
  let bestDelivery = CONFIG.deliveryOptions[0];

  CONFIG.deliveryOptions.forEach(d => {
    const raw = (c - d) / CONFIG.productPrice;
    const q = Math.round(raw);
    const err = Math.abs(raw - q);

    if (q >= 1 && err < bestErr) {
      bestQ = q;
      bestErr = err;
      bestDelivery = d;
    }
  });

  const amount = Math.max(0, Math.round((c - bestDelivery) * 100) / 100);
  return { qty: bestQ, amount: amount };
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
  const order = find(['oper', 'номер', 'order', '№']);

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
    date:  date  > -1 ? date  : CONFIG.fallbackDateCol  - 1,
    order: order  // -1 ако няма колона с номер (тогава без защита от дубли)
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

  // Запазваме датата на последния импорт (за таблото).
  PropertiesService.getScriptProperties().setProperty('lastImport', JSON.stringify({
    time: new Date().getTime(),
    нови: res.нови,
    повторни: res.повторни,
    пропуснати: res.пропуснати,
    дубликати: res.дубликати
  }));

  // Изчистваме импорта.
  const clearFrom = CONFIG.importHasHeader ? 2 : 1;
  const lastR = imp.getLastRow();

  if (lastR >= clearFrom) {
    imp.getRange(clearFrom, 1, lastR - clearFrom + 1, imp.getLastColumn()).clearContent();
  }

  обновиСтатистика(true);
  SpreadsheetApp.flush();
  _refreshDashboardStats_();

  ui.alert(
    'Импортът е обработен ✅\n\n' +
    'Нови клиенти: ' + res.нови +
    '\nПовторни поръчки: ' + res.повторни +
    '\nДубликати (вече преброени): ' + res.дубликати +
    '\nПропуснати (без телефон): ' + res.пропуснати +
    '\n\nЛист "Импорт" е изчистен.'
  );
}

/**
 * ЯДРО НА ВЛИВАНЕТО — приема масив от редове (impData[0] = заглавия),
 * влива ги в лист "Клиенти" и връща брояч. Ползва се и от менюто,
 * и от уеб импорта (таблото). Не показва прозорци.
 */
function вливанеОтРедове(impData, options) {
  options = options || {};
  const ledgerOnly = !!options.ledgerOnly; // true = само дневник, без клиенти/напомняния

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cust = ss.getSheetByName(SHEETS.clients);
  const ordersSheet = ss.getSheetByName(SHEETS.orders);

  if (!impData || impData.length === 0) {
    return { нови: 0, повторни: 0, пропуснати: 0, дубликати: 0 };
  }

  const col = откриКолони(impData[0]);
  const startRow = CONFIG.importHasHeader ? 1 : 0;

  if (impData.length <= startRow) {
    return { нови: 0, повторни: 0, пропуснати: 0, дубликати: 0 };
  }

  const WIDTH = 10; // A..J

  // Зареждаме съществуващите клиенти в паметта.
  let existing = [];
  if (!ledgerOnly && cust) {
    const lastRow = cust.getLastRow();
    if (lastRow >= 2) existing = cust.getRange(2, 1, lastRow - 1, WIDTH).getValues();
  }
  const keyToIdx = {};
  for (let i = 0; i < existing.length; i++) {
    const k = String(existing[i][1]);
    if (k) keyToIdx[k] = i;
  }

  // Зареждаме вече записаните номера на поръчки (за защита от двойно броене).
  const seenOrders = {};
  if (ordersSheet && ordersSheet.getLastRow() >= 2) {
    const oc = ordersSheet.getRange(2, 1, ordersSheet.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < oc.length; i++) {
      const v = String(oc[i][0]);
      if (v) seenOrders[v] = true;
    }
  }

  let нови = 0, повторни = 0, пропуснати = 0, дубликати = 0;
  const ledgerBuffer = [];
  let earliest = null, latest = null;

  for (let r = startRow; r < impData.length; r++) {
    const row = impData[r];
    const key = normPhone(row[col.phone]);

    if (!key) { пропуснати++; continue; }

    const дата = parseDate(row[col.date]);
    const qa = qtyAndAmount(row[col.cod]);
    const бройки = qa.qty;
    const сума = qa.amount;

    // Уникален ключ на поръчката (за защита от двойно броене).
    const dateStr = Utilities.formatDate(дата, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const orderNum = (col.order > -1 && row[col.order])
      ? String(row[col.order]).trim()
      : (key + '|' + dateStr + '|' + сума);

    if (seenOrders[orderNum]) { дубликати++; continue; } // вече преброена — пропускаме
    seenOrders[orderNum] = true;

    // Записваме в дневника поръчки.
    ledgerBuffer.push([orderNum, дата, String(row[col.phone]), бройки, сума]);
    if (!earliest || дата < earliest) earliest = дата;
    if (!latest || дата > latest) latest = дата;

    // Обновяваме клиентите (освен ако е само за дневника).
    if (!ledgerOnly && cust) {
      const име = firstName(row[col.name]);
      const имейл = String(row[col.email] || '').trim();

      if (keyToIdx.hasOwnProperty(key)) {
        const rec = existing[keyToIdx[key]];
        rec[4] = дата;
        rec[5] = (Number(rec[5]) || 0) + 1;
        rec[7] = бройки;
        rec[8] = '';
        rec[9] = '';
        if (имейл) rec[3] = имейл;
        if (име)   rec[2] = име;
        повторни++;
      } else {
        const rec = [String(row[col.phone]), key, име, имейл, дата, 1, дата, бройки, '', ''];
        existing.push(rec);
        keyToIdx[key] = existing.length - 1;
        нови++;
      }
    }
  }

  // Записваме клиентите наведнъж.
  if (!ledgerOnly && cust && existing.length > 0) {
    cust.getRange(2, 1, existing.length, WIDTH).setValues(existing);
  }

  // Добавяме поръчките в дневника наведнъж.
  if (ordersSheet && ledgerBuffer.length > 0) {
    ordersSheet.getRange(ordersSheet.getLastRow() + 1, 1, ledgerBuffer.length, 5).setValues(ledgerBuffer);
  }

  // Записваме ред в История импорти.
  const hist = ss.getSheetByName(SHEETS.history);
  if (hist) {
    hist.appendRow([
      new Date(),
      impData.length - startRow,
      нови,
      повторни,
      дубликати,
      earliest ? fmtDate(earliest) : '',
      latest ? fmtDate(latest) : ''
    ]);
  }

  return { нови: нови, повторни: повторни, пропуснати: пропуснати, дубликати: дубликати };
}

/**
 * Еднократно: напълва САМО дневника "Поръчки" от файл в лист "Импорт",
 * без да пипа клиентите или напомнянията. За историческите приходи.
 */
function историченДневник() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const imp = ss.getSheetByName(SHEETS.import);
  const ui = SpreadsheetApp.getUi();

  if (!imp) { ui.alert('Липсва лист "Импорт".'); return; }
  const impData = imp.getDataRange().getValues();
  if (impData.length < 2) { ui.alert('Сложи стария файл в лист "Импорт" първо.'); return; }

  const res = вливанеОтРедове(impData, { ledgerOnly: true });

  // Изчистваме импорта.
  const lastR = imp.getLastRow();
  if (lastR >= 2) imp.getRange(2, 1, lastR - 1, imp.getLastColumn()).clearContent();

  обновиСтатистика(true);
  SpreadsheetApp.flush();
  _refreshDashboardStats_();
  ui.alert(
    'Дневникът е напълнен от файла ✅\n\n' +
    'Добавени поръчки: ' + (res.нови + res.повторни) +
    '\nДубликати (вече в дневника): ' + res.дубликати +
    '\n\nКлиентите и напомнянията НЕ са пипани.'
  );
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
  let спрянОтЛимит = false;

  // Колко имейла можем да пратим днес (пазим малък буфер).
  let оставащаКвота = 100;
  try { оставащаКвота = MailApp.getRemainingDailyQuota(); } catch (e) {}

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

    // Пазим буфер от 3 имейла (за да не откраднем всичко от друг процес).
    if (оставащаКвота <= 3) {
      спрянОтЛимит = true;
      break; // спираме чисто — останалите нямат маркер и се хващат утре
    }

    const res = изпратиНапомняне(имейл, име);
    cust.getRange(n, колона).setValue(new Date());
    logRow(row[0], име, имейл, 'Напомняне', res);

    if (res === 'изпратен') {
      пратени++;
      оставащаКвота--;
    }
  }

  обновиСтатистика();

  try {
    let m = 'Проверката приключи. Изпратени: ' + пратени;
    if (спрянОтЛимит) {
      m += '\n\n⏸ Спряно заради дневния лимит на имейлите. ' +
           'Останалите ще се пратят автоматично утре.';
    }
    SpreadsheetApp.getUi().alert(m);
  } catch (e) {
    // При автоматичен тригер няма активен интерфейс.
  }
}

/* =====================================================================
 *  КВОТА — колко имейла остават днес
 * ===================================================================*/
function покажиКвота() {
  let q = '?';
  try { q = MailApp.getRemainingDailyQuota(); } catch (e) { q = 'неизвестно (' + e.message + ')'; }
  SpreadsheetApp.getUi().alert(
    '📊 Остават ти ' + q + ' имейла за днес.\n\n' +
    '(Безплатен Gmail: ~100/ден. Броячът се нулира 24 часа след първото пращане, не в полунощ.)'
  );
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
function обновиСтатистика(skipDashboardCache) {
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

  if (!skipDashboardCache) {
    _clearDashboardStats_();
    SpreadsheetApp.flush();
    _refreshDashboardStats_();
  }
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
 *  ЗАЩИТЕН ДОСТЪП ДО ТАБЛОТО
 * ===================================================================*/

function покажиНастройкаДостъп() {
  const html = HtmlService.createHtmlOutput(`
    <!doctype html>
    <html lang="bg">
      <head>
        <base target="_top">
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 24px; font: 14px Arial, sans-serif; color: #2c3e2f; background: #f6f8f4; }
          h2 { margin: 0 0 8px; color: #2f6b3a; }
          p { margin: 0 0 18px; color: #5c6b5e; line-height: 1.45; }
          label { display: block; margin: 12px 0 5px; font-weight: 700; }
          input { width: 100%; padding: 11px 12px; border: 1px solid #b9cbbb; border-radius: 10px; font-size: 14px; }
          button { width: 100%; margin-top: 18px; padding: 12px; border: 0; border-radius: 999px; color: white; background: #3a7d44; font-weight: 700; cursor: pointer; }
          button:disabled { opacity: .6; cursor: wait; }
          #message { min-height: 20px; margin-top: 12px; font-size: 13px; }
          .error { color: #a33a2b; }
          .success { color: #2f6b3a; }
        </style>
      </head>
      <body>
        <h2>Вход за Naturino таблото</h2>
        <p>Задай потребителско име и силна парола. Паролата се записва само като защитен хеш и не се качва в GitHub.</p>
        <form id="form">
          <label for="username">Потребителско име</label>
          <input id="username" autocomplete="username" minlength="3" required>
          <label for="password">Парола</label>
          <input id="password" type="password" autocomplete="new-password" minlength="${DASHBOARD_AUTH.minPasswordLength}" required>
          <label for="confirm">Повтори паролата</label>
          <input id="confirm" type="password" autocomplete="new-password" minlength="${DASHBOARD_AUTH.minPasswordLength}" required>
          <button id="save" type="submit">Запази новия вход</button>
          <div id="message"></div>
        </form>
        <script>
          const form = document.getElementById('form');
          const button = document.getElementById('save');
          const message = document.getElementById('message');
          form.addEventListener('submit', event => {
            event.preventDefault();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm').value;
            message.className = 'error';
            if (password !== confirm) {
              message.textContent = 'Двете пароли не съвпадат.';
              return;
            }
            button.disabled = true;
            message.className = '';
            message.textContent = 'Запазване…';
            google.script.run
              .withSuccessHandler(result => {
                button.disabled = false;
                if (!result || !result.ok) {
                  message.className = 'error';
                  message.textContent = (result && result.error) || 'Настройката не беше запазена.';
                  return;
                }
                message.className = 'success';
                message.textContent = 'Готово. Вече можеш да влезеш в таблото.';
                document.getElementById('password').value = '';
                document.getElementById('confirm').value = '';
                setTimeout(() => google.script.host.close(), 1400);
              })
              .withFailureHandler(error => {
                button.disabled = false;
                message.className = 'error';
                message.textContent = error && error.message ? error.message : 'Възникна грешка.';
              })
              .saveDashboardCredentials(username, password);
          });
        </script>
      </body>
    </html>
  `).setWidth(440).setHeight(520);

  SpreadsheetApp.getUi().showModalDialog(html, '🔐 Настрой входа за таблото');
}

function saveDashboardCredentials(username, password) {
  const user = String(username || '').trim();
  const pass = String(password || '');

  if (user.length < 3) {
    return { ok: false, error: 'Потребителското име трябва да е поне 3 знака.' };
  }
  if (pass.length < DASHBOARD_AUTH.minPasswordLength) {
    return { ok: false, error: 'Паролата трябва да е поне ' + DASHBOARD_AUTH.minPasswordLength + ' знака.' };
  }

  const salt = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const secret = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
  const props = PropertiesService.getScriptProperties();

  props.setProperties({
    DASHBOARD_AUTH_USER: user,
    DASHBOARD_AUTH_SALT: salt,
    DASHBOARD_AUTH_HASH: _hashPassword_(pass, salt),
    DASHBOARD_SESSION_SECRET: secret,
    DASHBOARD_AUTH_VERSION: String(new Date().getTime())
  });

  return { ok: true };
}

function _hashPassword_(password, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(salt) + '\n' + String(password),
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
}

function _safeEqual_(a, b) {
  const x = String(a || '');
  const y = String(b || '');
  let diff = x.length ^ y.length;
  const length = Math.max(x.length, y.length);

  for (let i = 0; i < length; i++) {
    diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function _signSession_(payload, secret) {
  const signature = Utilities.computeHmacSha256Signature(
    payload,
    secret,
    Utilities.Charset.UTF_8
  );
  return Utilities.base64EncodeWebSafe(signature).replace(/=+$/g, '');
}

function _createSession_(username) {
  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty('DASHBOARD_SESSION_SECRET');
  const version = props.getProperty('DASHBOARD_AUTH_VERSION');
  const expiresAt = new Date().getTime() + DASHBOARD_AUTH.sessionHours * 60 * 60 * 1000;
  const payloadObject = { u: username, exp: expiresAt, v: version };
  const payload = Utilities
    .base64EncodeWebSafe(JSON.stringify(payloadObject))
    .replace(/=+$/g, '');

  return {
    token: payload + '.' + _signSession_(payload, secret),
    expiresAt: expiresAt
  };
}

function _decodeSessionPayload_(payload) {
  let padded = String(payload || '');
  while (padded.length % 4) padded += '=';
  const bytes = Utilities.base64DecodeWebSafe(padded);
  return JSON.parse(Utilities.newBlob(bytes).getDataAsString('UTF-8'));
}

function _validateSession_(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 2) return null;

    const props = PropertiesService.getScriptProperties();
    const secret = props.getProperty('DASHBOARD_SESSION_SECRET');
    const currentVersion = props.getProperty('DASHBOARD_AUTH_VERSION');
    if (!secret || !currentVersion) return null;
    if (!_safeEqual_(parts[1], _signSession_(parts[0], secret))) return null;

    const payload = _decodeSessionPayload_(parts[0]);
    if (!payload || payload.v !== currentVersion) return null;
    if (!payload.exp || Number(payload.exp) <= new Date().getTime()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function _login_(username, password) {
  const props = PropertiesService.getScriptProperties();
  const configuredUser = props.getProperty('DASHBOARD_AUTH_USER');
  const salt = props.getProperty('DASHBOARD_AUTH_SALT');
  const expectedHash = props.getProperty('DASHBOARD_AUTH_HASH');

  if (!configuredUser || !salt || !expectedHash) {
    return { ok: false, code: 'AUTH_NOT_CONFIGURED', error: 'Входът още не е настроен от Google таблицата.' };
  }

  const userOk = _safeEqual_(String(username || '').trim(), configuredUser);
  const passwordOk = _safeEqual_(_hashPassword_(String(password || ''), salt), expectedHash);
  if (!userOk || !passwordOk) {
    Utilities.sleep(350);
    return { ok: false, code: 'INVALID_CREDENTIALS', error: 'Грешно потребителско име или парола.' };
  }

  const session = _createSession_(configuredUser);
  return {
    ok: true,
    session: session.token,
    expiresAt: session.expiresAt,
    sessionHours: DASHBOARD_AUTH.sessionHours
  };
}

/* =====================================================================
 *  УЕБ ВРЪЗКА С ТАБЛОТО  (doGet / doPost)
 * ===================================================================*/

// GET никога не връща лични данни. Всички реални операции са защитени POST заявки.
function doGet() {
  return _json({ ok: true, service: 'Naturino Dashboard API', protected: true });
}

function doPost(e) {
  try {
    const body = _parseRequestBody_(e);
    const action = String(body.action || '');

    if (action === 'login') {
      return _json(_login_(body.username, body.password));
    }

    const session = _validateSession_(body.session);
    if (!session) {
      return _json({ ok: false, code: 'UNAUTHORIZED', error: 'Сесията е изтекла. Влез отново.' });
    }

    if (action === 'session') {
      return _json({ ok: true, expiresAt: session.exp, username: session.u });
    }

    if (action === 'stats') {
      return _json(_getDashboardStats_());
    }

    if (action === 'refreshStats') {
      return _json(_refreshDashboardStats_());
    }

    if (action === 'import') {
      return _json(_handleDashboardImport_(body));
    }

    return _json({ ok: false, code: 'UNKNOWN_ACTION', error: 'Непозната заявка.' });
  } catch (err) {
    return _json({ ok: false, code: 'SERVER_ERROR', error: String(err && err.message ? err.message : err) });
  }
}

function _parseRequestBody_(e) {
  if (e && e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }
  return JSON.parse(e.postData.contents);
}

function _handleDashboardImport_(body) {
  const requestId = String(body.requestId || '');
  if (!requestId || requestId.length > 100) {
    return { ok: false, code: 'INVALID_IMPORT_ID', error: 'Липсва валиден номер на импорта.' };
  }
  if (!Array.isArray(body.rows) || body.rows.length < 2) {
    return { ok: false, code: 'EMPTY_IMPORT', error: 'Файлът няма редове за обработване.' };
  }

  const props = PropertiesService.getScriptProperties();
  const previousId = props.getProperty('lastDashboardImportRequestId');
  const previousResult = props.getProperty('lastDashboardImportRequestResult');
  if (previousId === requestId && previousResult) {
    return JSON.parse(previousResult);
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { ok: false, code: 'IMPORT_BUSY', error: 'В момента се обработва друг импорт. Опитай след малко.' };
  }

  try {
    const lockedPreviousId = props.getProperty('lastDashboardImportRequestId');
    const lockedPreviousResult = props.getProperty('lastDashboardImportRequestResult');
    if (lockedPreviousId === requestId && lockedPreviousResult) {
      return JSON.parse(lockedPreviousResult);
    }

    _clearDashboardStats_();
    const res = вливанеОтРедове(body.rows);
    const lastImport = {
      time: new Date().getTime(),
      нови: res.нови,
      повторни: res.повторни,
      пропуснати: res.пропуснати,
      дубликати: res.дубликати
    };
    props.setProperty('lastImport', JSON.stringify(lastImport));
    обновиСтатистика(true);

    let warning = '';
    try {
      SpreadsheetApp.flush();
      _refreshDashboardStats_();
    } catch (cacheError) {
      _clearDashboardStats_();
      warning = 'Импортът е успешен, но статистиката ще се преизчисли при следващото отваряне.';
    }

    const result = {
      ok: true,
      нови: res.нови,
      повторни: res.повторни,
      пропуснати: res.пропуснати,
      дубликати: res.дубликати,
      warning: warning
    };
    props.setProperties({
      lastDashboardImportRequestId: requestId,
      lastDashboardImportRequestResult: JSON.stringify(result)
    });
    return result;
  } finally {
    lock.releaseLock();
  }
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _getDashboardStats_() {
  const cache = CacheService.getScriptCache();
  const props = PropertiesService.getScriptProperties();
  let raw = cache.get(DASHBOARD_AUTH.statsCacheKey);

  if (!raw) raw = props.getProperty(DASHBOARD_AUTH.statsSnapshotKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      cache.put(DASHBOARD_AUTH.statsCacheKey, raw, DASHBOARD_AUTH.statsCacheSeconds);
      return parsed;
    } catch (e) {
      _clearDashboardStats_();
    }
  }

  return _refreshDashboardStats_();
}

function _refreshDashboardStats_() {
  const stats = getStatsObject();
  stats.generatedAt = new Date().getTime();
  const raw = JSON.stringify(stats);
  const cache = CacheService.getScriptCache();
  const props = PropertiesService.getScriptProperties();

  cache.put(DASHBOARD_AUTH.statsCacheKey, raw, DASHBOARD_AUTH.statsCacheSeconds);
  if (raw.length < 8500) {
    props.setProperty(DASHBOARD_AUTH.statsSnapshotKey, raw);
  }
  return stats;
}

function _clearDashboardStats_() {
  CacheService.getScriptCache().remove(DASHBOARD_AUTH.statsCacheKey);
  PropertiesService.getScriptProperties().deleteProperty(DASHBOARD_AUTH.statsSnapshotKey);
}

// Връща числата за таблото (същите като лист "Статистика" + дневна серия).
function getStatsObject() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cust = ss.getSheetByName(SHEETS.clients);
  const log = ss.getSheetByName(SHEETS.log);

  const out = {
    ok: true,
    total: 0, totalOrders: 0, returning: 0, returningPct: 0,
    single: 0, multi: 0, noEmail: 0,
    ordersYesterday: 0, orders7d: 0, orders30d: 0,
    remindersSent: 0, daily: [],
    revenue: { total: 0, m3: 0, m1: 0, w2: 0, w1: 0, yesterday: 0 },
    revenueDaily: []
  };

  if (!cust) return out;

  const lastClientRow = cust.getLastRow();
  const data = lastClientRow >= 2
    ? cust.getRange(2, 1, lastClientRow - 1, 10).getValues()
    : [];
  const dailyMap = {};

  for (let r = 0; r < data.length; r++) {
    if (!data[r][1]) continue;

    out.total++;

    const бр = data[r][5] || 0;
    const кол = Number(data[r][7]) || 1;
    const посл = data[r][4];

    out.totalOrders += Number(бр) || 0;
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
    const lastLogRow = log.getLastRow();
    const ld = lastLogRow >= 2
      ? log.getRange(2, 1, lastLogRow - 1, 6).getValues()
      : [];
    for (let r = 0; r < ld.length; r++) {
      if (String(ld[r][5] || '').indexOf('изпратен') > -1) out.remindersSent++;
    }
  }

  // Резултат от последния импорт (за потвърждение в таблото).
  const li = PropertiesService.getScriptProperties().getProperty('lastImport');
  out.lastImport = li ? JSON.parse(li) : null;

  // Оставаща квота за имейли днес.
  try {
    out.emailQuotaLeft = MailApp.getRemainingDailyQuota();
  } catch (e) {
    out.emailQuotaLeft = null;
  }
  out.emailQuotaMax = 100;

  // ── ПРИХОДИ от дневника "Поръчки" ──
  const ordersSheet = ss.getSheetByName(SHEETS.orders);
  if (ordersSheet && ordersSheet.getLastRow() >= 2) {
    const od = ordersSheet.getRange(2, 1, ordersSheet.getLastRow() - 1, 5).getValues();
    const revMap = {}; // yyyy-MM-dd -> сума

    for (let i = 0; i < od.length; i++) {
      const дата = od[i][1];
      const сума = Number(od[i][4]) || 0;
      if (!дата || !сума) continue;

      out.revenue.total += сума;
      const d = daysSince(дата);
      if (d === 1) out.revenue.yesterday += сума;
      if (d <= 7) out.revenue.w1 += сума;
      if (d <= 14) out.revenue.w2 += сума;
      if (d <= 30) out.revenue.m1 += сума;
      if (d <= 90) out.revenue.m3 += сума;

      if (d >= 0 && d <= 29) {
        const key = Utilities.formatDate(new Date(дата), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        revMap[key] = (revMap[key] || 0) + сума;
      }
    }

    // Закръгляме
    ['total', 'm3', 'm1', 'w2', 'w1', 'yesterday'].forEach(k => {
      out.revenue[k] = Math.round(out.revenue[k] * 100) / 100;
    });

    // Дневна серия приходи (последните 30 дни).
    for (let i = 29; i >= 0; i--) {
      const day = new Date(today.getTime() - i * 86400000);
      const key = Utilities.formatDate(day, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      const label = Utilities.formatDate(day, Session.getScriptTimeZone(), 'dd.MM');
      out.revenueDaily.push({ date: label, sum: Math.round((revMap[key] || 0) * 100) / 100 });
    }
  }

  return out;
}
