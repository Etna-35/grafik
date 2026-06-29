const app = document.querySelector("#app");

const serviceMeta = {
  schedule: {
    accent: "var(--brand)",
    description: "Смены и часы",
    icon: calendarIcon
  },
  shift_close: {
    accent: "var(--teal)",
    description: "Отчет дня",
    icon: checkIcon
  },
  tasks: {
    accent: "var(--gold)",
    description: "Поручения",
    icon: starIcon
  },
  training: {
    accent: "var(--brand)",
    description: "База знаний",
    icon: bookIcon
  },
  requisition: {
    accent: "var(--green)",
    description: "Продукты и хозтовары",
    icon: boxIcon
  },
  payroll: {
    accent: "var(--green)",
    description: "Начисления",
    icon: rubleIcon
  },
  admin: {
    accent: "var(--ink)",
    description: "Сотрудники и права",
    icon: settingsIcon
  },
  finance: {
    accent: "var(--gold)",
    description: "Выручка и метрики",
    icon: chartIcon
  },
  treasury: {
    accent: "var(--brand-bright)",
    description: "Планирование и резервы",
    icon: walletIcon
  }
};

function walletIcon(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v0H5a2 2 0 0 0-2 2v0"/><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M16 13h2"/></svg>`; }

function chartIcon(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/></svg>`; }

let state = {
  loading: true,
  user: null,
  services: [],
  summary: null,
  schedule: null,
  scheduleLoading: false,
  scheduleError: "",
  weeklyStats: undefined,
  weeklyStatsLoading: false,
  scheduleSaveError: "",
  selectedScheduleCell: null,
  scheduleEditorRole: null,
  scheduleEditorKind: null,
  selectedScheduleDate: null,
  selectedDateEmployeeId: null,
  selectedMyHoursDate: null,
  selectedRosterEmployeeId: null,
  selectedEventDate: null,
  editingPayoutId: null,
  scheduleSaving: false,
  scheduleEditUnlocked: false,
  payroll: null,
  payrollLoading: false,
  payrollError: "",
  tasks: null,
  salesGoalsData: null,
  handovers: null,
  handoverSaving: false,
  praise: null,
  praiseLoading: false,
  praiseSaving: false,
  praiseError: "",
  progress: null,
  progressLoading: false,
  progressError: "",
  openTotemSlot: null,
  tasksLoading: false,
  tasksError: "",
  tasksSaving: false,
  training: null,
  quiz: null,
  trainingLoading: false,
  trainingError: "",
  trainingSaving: false,
  selectedTrainingChapterId: "",
  requisitionCatalog: null,
  requisitionHistory: null,
  requisitionLoading: false,
  requisitionError: "",
  requisitionNotice: "",
  requisitionSaving: false,
  requisitionTab: "catalog",
  requisitionKind: "product",
  requisitionCategoryId: "all",
  requisitionSearch: "",
  requisitionCart: {},
  requisitionComment: "",
  requisitionEditId: null,
  requisitionUrgent: false,
  requisitionExpanded: {},
  requisitionShowRemaining: false,
  requisitionCostSummary: null,
  requisitionCostLoading: false,
  finance: null,
  financeLoading: false,
  financeError: "",
  financeMonth: null,
  financeNotice: "",
  financeFixedOpen: false,
  treasury: null,
  treasuryLoading: false,
  treasuryError: "",
  treasurySpendKind: "food",
  treasurySettingsOpen: false,
  treasuryAddOpen: false,
  treasuryCalOpen: false,
  treasuryNotice: "",
  shiftClosingInit: null,
  shiftClosingDate: null,
  shiftClosingRecord: null,
  shiftClosingForm: null,
  shiftClosingPhotos: {},
  shiftClosingLoading: false,
  shiftClosingSaving: false,
  shiftClosingError: "",
  admin: null,
  adminLoading: false,
  adminError: "",
  selectedAdminEmployeeId: "new",
  adminSaving: false,
  importResult: null,
  pin: "",
  error: ""
};

init();

async function init(){
  window.addEventListener("popstate", render);
  preventMobileDoubleTapZoom();
  try{
    const session = await apiGet("/api/me");
    state.user = session.user;
    state.services = session.services;
    state.summary = await apiGet("/api/summary");
  }catch{
    state.user = null;
  }finally{
    state.loading = false;
    render();
  }
}

function preventMobileDoubleTapZoom(){
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (event)=>{
    const now = Date.now();
    if(now - lastTouchEnd <= 320){
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive:false });
  document.addEventListener("gesturestart", (event)=>{
    event.preventDefault();
  }, { passive:false });
}

function render(){
  if(state.loading){
    app.innerHTML = `<div class="phone"><div class="loader">Etna</div></div>`;
    return;
  }

  if(!state.user){
    renderPin();
    return;
  }

  if(window.location.hash.startsWith("#praise") && !state.praiseHashHandled){
    state.praiseHashHandled = true;
    // #praise=<employeeId> — предзаполнить получателя (ссылка-поздравление из Telegram).
    const m = window.location.hash.match(/^#praise=(.+)$/);
    if(m) state.praisePrefillTo = decodeURIComponent(m[1]);
    history.replaceState(null, "", "/");
    openPraise();
    return;
  }

  const path = window.location.pathname;
  if(!path.startsWith("/grafik") && state.scheduleEditUnlocked){
    state.scheduleEditUnlocked = false;
    state.selectedScheduleCell = null;
    state.selectedScheduleDate = null;
  }
  if(path === "/" || path === ""){
    renderHub();
    return;
  }

  renderServicePage(path);
}

function renderPin(){
  app.innerHTML = `
    <div class="phone">
      <section class="screen">
        <div class="pin-wrap">
          <div class="logo"><img src="/assets/logo.png" alt="ЭТНА"></div>
          <div class="pin-sub">Введите PIN</div>
          <div class="dots">${[0,1,2,3].map((i)=>`<i class="${i < state.pin.length ? "f" : ""}"></i>`).join("")}</div>
          <div class="keypad">
            ${[1,2,3,4,5,6,7,8,9].map((n)=>`<button class="key" data-key="${n}">${n}</button>`).join("")}
            <button class="key blank"></button>
            <button class="key" data-key="0">0</button>
            <button class="key fn" data-key="back">⌫</button>
          </div>
          <div class="error">${escapeHtml(state.error)}</div>
        </div>
      </section>
    </div>
  `;

  app.querySelectorAll("[data-key]").forEach((button)=>{
    button.addEventListener("click", ()=>handleKey(button.dataset.key));
  });
}

async function handleKey(key){
  state.error = "";
  if(key === "back"){
    state.pin = state.pin.slice(0, -1);
    render();
    return;
  }
  if(!/^\d$/.test(key) || state.pin.length >= 4) return;
  state.pin += key;
  render();
  if(state.pin.length === 4){
    await login();
  }
}

async function login(){
  try{
    const requestedPath = window.location.pathname;
    const session = await apiPost("/api/auth/pin", { pin: state.pin });
    clearSessionData();
    state.user = session.user;
    state.services = session.services;
    state.summary = await apiGet("/api/summary");
    state.pin = "";
    history.replaceState(null, "", allowedServicePath(requestedPath, session.services) ? requestedPath : "/");
    render();
  }catch(error){
    state.pin = "";
    state.error = error.status === 429 ? "Пауза перед следующей попыткой" : "PIN не подошел";
    render();
  }
}

function renderHub(){
  const today = new Intl.DateTimeFormat("ru-RU", { weekday:"short", day:"numeric", month:"long" }).format(new Date());
  state.praisePrefillTo = null;
  if(state.weeklyStats === undefined && !state.weeklyStatsLoading) loadWeeklyStats();
  app.innerHTML = `
    <div class="phone">
      <section class="screen">
        <header class="top">
          <span class="mark"></span>
          <h1 class="brand-title">ЭТНА</h1>
        </header>
        <div class="greet">
          <div class="hi">Привет, ${escapeHtml(firstName(state.user.displayName))}</div>
        </div>
        ${renderBirthday()}
        ${renderDayPanel()}
        ${renderSalesGoals()}
        ${renderMerits()}
        ${renderWeeklyStats()}
        <h2 class="section-title">Сервисы</h2>
        <div class="nav">
          ${state.services.map(renderServiceCard).join("")}
        </div>
        <div class="hub-gap"></div>
        <button class="ghost logout" data-action="logout">Выйти</button>
      </section>
    </div>
  `;

  app.querySelectorAll("[data-url]").forEach((card)=>{
    card.addEventListener("click", ()=>{
      const url = card.dataset.url;
      if(url.startsWith("https://")){
        window.location.href = url;
        return;
      }
      history.pushState(null, "", url);
      render();
    });
  });
  app.querySelector("[data-action='logout']").addEventListener("click", logout);
  app.querySelector("[data-action='praise']")?.addEventListener("click", openPraise);
  app.querySelector("[data-action='progress']")?.addEventListener("click", openProgress);
  app.querySelectorAll("[data-praise-bday]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      state.praisePrefillTo = button.dataset.praiseBday;
      openPraise();
    });
  });
  app.querySelectorAll("[data-goal-inc]").forEach((button)=>{
    button.addEventListener("click", ()=>adjustSalesGoal(button.dataset.goalInc, 1));
  });
  app.querySelectorAll("[data-goal-dec]").forEach((button)=>{
    button.addEventListener("click", ()=>adjustSalesGoal(button.dataset.goalDec, -1));
  });
}

const MAX_MASK_LEVEL = 20;
function levelMaskUrl(level){
  const n = Math.min(Math.max(Number(level) || 1, 1), MAX_MASK_LEVEL);
  return `/assets/awards/level-${n}.png`;
}
function levelMaskImg(level){
  return `<img class="mask-img" src="${levelMaskUrl(level)}" alt="Уровень ${Number(level) || 1}">`;
}

function tenureLevel(startStr){
  if(!startStr) return null;
  const start = new Date(startStr);
  if(Number.isNaN(start.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if(now.getDate() < start.getDate()) months--;
  if(months < 0) months = 0;
  const level = Math.floor(months / 3) + 1;
  const into = months % 3;
  const toNext = 3 - into;
  return {
    level,
    tenureText: formatTenure(startStr),
    toNextText: `${toNext} ${pluralize(toNext, "месяц", "месяца", "месяцев")}`,
    pct: Math.round((into / 3) * 100)
  };
}

// Иконки наград монохромные; позже легко заменить на присланные SVG (apps/web/assets/awards/).
function heartIcon(){ return `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 21S3.5 14.6 3.5 8.9C3.5 6 5.7 4 8.2 4c1.7 0 3 .9 3.8 2.1C12.8 4.9 14.1 4 15.8 4c2.5 0 4.7 2 4.7 4.9C20.5 14.6 12 21 12 21z"/></svg>`; }
function meritStarIcon(){ return `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"/></svg>`; }
function shieldIcon(){ return `<svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M12 2l8 3v6c0 5-3.4 9.2-8 11-4.6-1.8-8-6-8-11V5z"/></svg>`; }

function renderBirthday(){
  const s = state.summary || {};
  const others = s.birthdaysToday || [];
  const blocks = [];
  if(s.isBirthdayToday){
    blocks.push(`
      <div class="bday-banner self">
        <div class="bb-title">С днём рождения, ${escapeHtml(firstName(state.user.displayName))}!</div>
        <div class="bb-sub">Команда Etna желает тебе отличного дня. Спасибо, что ты с нами.</div>
      </div>
    `);
  }
  for(const person of others){
    blocks.push(`
      <div class="bday-banner">
        <div class="bb-title">Сегодня день рождения у ${escapeHtml(person.nameGenitive || person.name)}</div>
        <div class="bb-sub">Поздравь и скажи спасибо — это приятно.</div>
        <button class="ghost brand-action bb-btn" type="button" data-praise-bday="${escapeAttr(person.id)}">Поздравить</button>
      </div>
    `);
  }
  return blocks.join("");
}

function renderMerits(){
  const s = state.summary || {};
  const praises = s.praisesReceived || 0;
  const scores = s.scoresTotal || 0;
  const level = tenureLevel(s.startDate);
  return `
    <h2 class="section-title">Заслуги</h2>
    <div class="merits">
      <div class="merit-top">
        <button class="award" data-action="progress">
          <div class="award-icon mask">${levelMaskImg(s.level ?? 1)}</div>
          <div class="award-meta">
            <b>Уровень ${s.level ?? 1}</b>
            <span>Ещё ${s.toNextPct ?? 100}% до повышения</span>
            <div class="award-bar meter thin ok"><i style="width:${s.progressPct ?? 0}%"></i></div>
          </div>
        </button>
        <button class="merit-tasks" data-url="/tasks">
          <span>Задачи на месяц</span>
          <b>${s.tasksDone ?? 0}/${s.tasksTotal ?? 0}</b>
        </button>
      </div>
      <div class="merit-badges">
        <div class="badge-stat"><span class="bi">${heartIcon()}</span><div class="bs-num"><span class="mult">×</span>${praises}</div><span class="bs-lbl">спасибо</span></div>
        <div class="badge-stat"><span class="bi bi-score">${meritStarIcon()}</span><div class="bs-num"><span class="mult">×</span>${scores}</div><span class="bs-lbl">оценки</span></div>
        <button class="badge-stat badge-praise" data-action="praise"><span class="praise-plus">＋</span><span class="bs-lbl">Спасибо</span></button>
      </div>
    </div>
    ${renderCashPlan()}
  `;
}

// Еженедельная «движуха»: итоги прошлой недели (Пн–Вс). Монохромно, без emoji (бренд).
async function loadWeeklyStats(){
  state.weeklyStatsLoading = true;
  try{
    state.weeklyStats = await apiGet("/api/weekly-stats");
  }catch{
    state.weeklyStats = null;
  }finally{
    state.weeklyStatsLoading = false;
    render();
  }
}

function renderWeeklyStats(){
  const w = state.weeklyStats;
  if(!w || !Array.isArray(w.items) || !w.items.length) return "";
  const range = `${formatWeekDay(w.weekStart)} — ${formatWeekDay(w.weekEnd)}`;
  return `
    <h2 class="section-title">Итоги недели</h2>
    <div class="weekly">
      <div class="weekly-range">${escapeHtml(range)}</div>
      ${w.items.map((item)=>`
        <div class="weekly-item">
          <span class="weekly-label">${escapeHtml(item.label)}</span>
          <span class="weekly-detail">${escapeHtml(item.detail)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function formatWeekDay(iso){
  if(!iso) return "";
  return new Intl.DateTimeFormat("ru-RU", { day:"numeric", month:"long" }).format(new Date(`${iso}T00:00:00`));
}

function dollarIcon(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.5 9.2 9.5 12 9.5s5 1.1 5 3-2.2 3-5 3-5-1.1-5-3"/></svg>`; }
function trophyIcon(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3"/><line x1="12" y1="13" x2="12" y2="17"/><path d="M9 20h6M10 17h4l1 3H9z"/></svg>`; }

// Профильная награда официанта за наличный план (только официантам — бэк отдаёт cashPlan).
function renderCashPlan(){
  const c = state.summary?.cashPlan;
  if(!c) return "";
  const streak = Math.max(0, Math.min(5, c.currentStreak || 0));
  let pips = "";
  for(let i = 0; i < 5; i++) pips += `<span class="cp-pip${i < streak ? " on" : ""}"></span>`;
  const toNext = c.streakToNext ?? (5 - streak);
  return `
    <div class="cp-card">
      <h2 class="section-title cp-title">Наличный план</h2>
      <div class="cp-stats">
        <div class="cp-stat"><span class="cp-ic cp-dollar">${dollarIcon()}</span><div class="cp-num"><span class="mult">×</span>${c.planShifts ?? 0}</div><span class="cp-lbl">смен с планом</span></div>
        <div class="cp-stat"><span class="cp-ic cp-trophy">${trophyIcon()}</span><div class="cp-num"><span class="mult">×</span>${c.trophies ?? 0}</div><span class="cp-lbl">серии</span></div>
      </div>
      <div class="cp-streak">
        <div class="cp-streak-pips">${pips}</div>
        <div class="cp-streak-sub">${streak} из 5 · ещё ${toNext} ${pluralize(toNext, "смена", "смены", "смен")} с планом до бонуса +1,5%</div>
      </div>
    </div>
  `;
}

function formatTenure(startStr){
  if(!startStr) return "";
  const start = new Date(startStr);
  if(Number.isNaN(start.getTime())) return "";
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if(now.getDate() < start.getDate()) months--;
  if(months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const parts = [];
  if(years) parts.push(`${years} ${pluralize(years, "год", "года", "лет")}`);
  if(rem) parts.push(`${rem} ${pluralize(rem, "месяц", "месяца", "месяцев")}`);
  if(!parts.length) return "меньше месяца";
  return parts.join(" ");
}

function lockIcon(){ return `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M7 10V7a5 5 0 0110 0v3h1a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a2 2 0 012-2h1zm2 0h6V7a3 3 0 00-6 0v3z"/></svg>`; }

async function openProgress(){
  state.progressLoading = true;
  state.progress = null;
  state.progressError = "";
  state.openTotemSlot = null;
  renderProgressScreen();
  try{
    state.progress = await apiGet("/api/progress");
  }catch(error){
    state.progressError = "Не удалось загрузить прогресс";
  }finally{
    state.progressLoading = false;
    renderProgressScreen();
  }
}

function renderProgressScreen(){
  const p = state.progress;
  app.innerHTML = `
    <div class="phone wide">
      <section class="screen service-page">
        <div class="backrow">
          <button class="iconbtn" aria-label="Назад" data-action="prog-back">${arrowLeftIcon()}</button>
          <h1 class="page-title">Мой прогресс</h1>
        </div>
        ${state.progressLoading
          ? `<div class="panel"><div class="loader compact">Загружаю</div></div>`
          : p ? `
            <div class="progress-hero">
              <div class="prog-hero-row">
                ${renderTotemSlot(p.totems, 1)}
                <div class="prog-badge mask">${levelMaskImg(p.level)}</div>
                ${renderTotemSlot(p.totems, 2)}
              </div>
              <div class="prog-title">Уровень ${p.level}</div>
              <div class="award-bar big meter ok"><i style="width:${p.progressPct}%"></i></div>
              <div class="prog-sub">${p.progressPct}% · ещё ${p.toNextPct}% до повышения</div>
              ${renderTotemDetail(p.totems)}
            </div>
            ${renderProgressTeam(p.team)}
            <h2 class="sec">За что начислено</h2>
            <div class="progress-history">
              ${(p.history || []).length ? p.history.map(renderProgressItem).join("") : `<div class="panel muted-line">Пока пусто — выполняй задания, получай спасибо</div>`}
            </div>
          ` : `<div class="panel muted-line">${escapeHtml(state.progressError || "Нет данных")}</div>`}
      </section>
    </div>
  `;
  app.querySelector("[data-action='prog-back']")?.addEventListener("click", ()=>{
    history.pushState(null, "", "/");
    render();
  });
  app.querySelectorAll("[data-totem-slot]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      const slot = Number(button.dataset.totemSlot);
      state.openTotemSlot = state.openTotemSlot === slot ? null : slot;
      renderProgressScreen();
    });
  });
}

// Тотем — редкая именная награда по бокам от куклы. Пустой слот = приглушённая заглушка.
function renderTotemSlot(totems, slot){
  const totem = (totems || []).find((t)=>Number(t.slot) === slot);
  if(!totem){
    return `<div class="totem-slot empty" aria-hidden="true"></div>`;
  }
  const active = state.openTotemSlot === slot ? " active" : "";
  return `
    <button class="totem-slot${active}" type="button" data-totem-slot="${slot}" aria-label="${escapeAttr(totem.title)}">
      <img class="totem-img" src="${escapeAttr(totem.image)}" alt="${escapeAttr(totem.title)}">
    </button>
  `;
}

// Описание выбранного тотема — раскрывается по тапу под куклой.
function renderTotemDetail(totems){
  const totem = (totems || []).find((t)=>Number(t.slot) === state.openTotemSlot);
  if(!totem) return "";
  return `
    <div class="totem-detail">
      <b>${escapeHtml(totem.title)}</b>
      ${totem.description ? `<span>${escapeHtml(totem.description)}</span>` : ""}
    </div>
  `;
}

// Сетка команды (только у руководителя): аватар-кукла уровня + имя + уровень.
function renderProgressTeam(team){
  if(!Array.isArray(team) || !team.length) return "";
  return `
    <h2 class="sec">Команда</h2>
    <div class="progress-team">
      ${team.map((m)=>`
        <div class="pteam-card">
          <div class="pteam-mask">${levelMaskImg(m.level)}</div>
          <div class="pteam-info">
            <b>${escapeHtml(firstName(m.name))}</b>
            <span>Уровень ${m.level}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderProgressItem(item){
  const meta = [item.note, item.createdAt ? formatDateTimeHuman(item.createdAt) : ""].filter(Boolean).join(" · ");
  return `
    <div class="ph-item">
      <span class="ph-pts">+${item.points}%</span>
      <div class="ph-main">
        <b>${escapeHtml(item.label)}</b>
        ${meta ? `<span>${escapeHtml(meta)}</span>` : ""}
      </div>
    </div>
  `;
}

function renderSalesGoals(){
  const goals = state.summary?.salesGoals || [];
  if(!goals.length) return "";
  return `<div class="sales-goals">${goals.map(renderSalesGoalCard).join("")}</div>`;
}

function renderSalesGoalCard(g){
  const pct = Math.min(100, Math.round((g.current / g.target) * 100));
  const done = g.current >= g.target;
  return `
    <div class="goal-card ${done ? "reached" : ""}">
      <div class="goal-head">
        <div class="goal-title">${escapeHtml(g.title)}${g.rewardAmount ? ` <span class="goal-reward">+${formatMoneyPlain(g.rewardAmount)} ₽</span>` : ""}</div>
        <div class="goal-count"><b>${g.current}</b> / ${g.target}</div>
      </div>
      <div class="goal-bar meter"><i style="width:${pct}%"></i></div>
      ${done
        ? `<div class="goal-status">Цель достигнута — ждёт подтверждения руководителя</div>`
        : `<div class="goal-actions">
            <button class="ghost mini" type="button" data-goal-dec="${escapeAttr(g.id)}">−1</button>
            <button class="ghost brand-action goal-plus" type="button" data-goal-inc="${escapeAttr(g.id)}">Продал +1</button>
          </div>`}
    </div>
  `;
}

async function adjustSalesGoal(id, delta){
  try{
    await apiPatch(`/api/sales-goals/${encodeURIComponent(id)}/progress`, { delta });
    state.summary = await apiGet("/api/summary");
    renderHub();
  }catch(error){
    /* ignore */
  }
}

function renderDayPanel(){
  const s = state.summary || {};
  const goalDate = new Intl.DateTimeFormat("ru-RU", { weekday:"long", day:"numeric", month:"long" }).format(new Date());
  const hasGoal = (s.revenuePlanToday || 0) > 0;
  return `
    <div class="day-panel">
      <div class="day-goal">Сегодня ${goalDate}${hasGoal ? ", и наша цель сегодня:" : ""}</div>
      <div class="day-blocks">
        <div class="day-block"><span>План выручки</span><b>${formatMoney(s.revenuePlanToday || 0)}</b></div>
        <div class="day-block"><span>Наличный план</span><b>${formatMoney(s.cashPlanToday || 0)}</b></div>
        <button class="day-block" data-url="/tasks"><span>План от коллег</span><b>${s.handoverCount ?? 0}</b></button>
      </div>
    </div>
  `;
}

async function openPraise(){
  state.praiseLoading = true;
  state.praiseError = "";
  renderPraiseScreen();
  try{
    state.praise = await apiGet("/api/praises");
  }catch(error){
    state.praiseError = "Не удалось загрузить";
  }finally{
    state.praiseLoading = false;
    renderPraiseScreen();
  }
}

function renderPraiseScreen(){
  const data = state.praise;
  app.innerHTML = `
    <div class="phone wide">
      <section class="screen service-page">
        <div class="backrow">
          <button class="iconbtn" aria-label="Назад" data-action="praise-back">${arrowLeftIcon()}</button>
          <h1 class="page-title">Спасибо коллеге</h1>
        </div>
        ${state.praiseLoading
          ? `<div class="panel"><div class="loader compact">Загружаю</div></div>`
          : data ? `
            <form class="panel" id="praiseForm">
              <label class="field">
                <span>Кого благодарим</span>
                <select name="toId" required>${(data.colleagues || []).map((c)=>`<option value="${escapeAttr(c.id)}" ${state.praisePrefillTo === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}</select>
              </label>
              <label class="field mt-10">
                <span>За что</span>
                <textarea name="body" maxlength="500" rows="3" placeholder="Спасибо за…" required></textarea>
              </label>
              ${state.praiseError ? `<div class="error ta-left">${escapeHtml(state.praiseError)}</div>` : ""}
              <button class="ghost brand-action mt-12" type="submit">Отправить спасибо</button>
            </form>
            <h2 class="sec">Лента благодарностей</h2>
            <div class="praise-list">
              ${(data.feed || []).length ? data.feed.map(renderPraiseItem).join("") : `<div class="panel muted-line">Пока пусто — будь первым</div>`}
            </div>
          ` : `<div class="panel muted-line">${escapeHtml(state.praiseError || "Нет данных")}</div>`}
      </section>
    </div>
  `;
  app.querySelector("[data-action='praise-back']")?.addEventListener("click", ()=>{
    history.pushState(null, "", "/");
    render();
  });
  const form = app.querySelector("#praiseForm");
  form?.addEventListener("submit", (event)=>{
    event.preventDefault();
    submitPraise(form);
  });
}

function renderPraiseItem(item){
  return `
    <div class="praise-item">
      <div class="praise-body">${escapeHtml(item.body)}</div>
      <div class="praise-meta"><b>${escapeHtml(item.toName)}</b> · от ${escapeHtml(item.fromName)} · ${escapeHtml(formatDateTimeHuman(item.createdAt))}</div>
    </div>
  `;
}

async function submitPraise(form){
  if(state.praiseSaving) return;
  const toId = form.elements.toId.value;
  const body = form.elements.body.value.trim();
  if(!toId || body.length < 2) return;
  state.praiseSaving = true;
  state.praiseError = "";
  try{
    await apiPost("/api/praises", { toId, body });
    state.praise = await apiGet("/api/praises");
  }catch(error){
    state.praiseError = "Не удалось отправить";
  }finally{
    state.praiseSaving = false;
    renderPraiseScreen();
  }
}

function renderServiceCard(service){
  const meta = serviceMeta[service.code] || serviceMeta.schedule;
  return `
    <button class="navcard" style="border-left-color:${meta.accent}" data-url="${escapeAttr(serviceUrl(service))}">
      <span class="icon" style="color:${meta.accent};background:${tintFor(service.code)}">${meta.icon()}</span>
      <span>
        <span class="t">${escapeHtml(service.title)}</span>
        <span class="d">${escapeHtml(meta.description)}</span>
      </span>
    </button>
  `;
}

function renderServicePage(path){
  const service = serviceForPath(path);
  if(!service){
    history.replaceState(null, "", "/");
    renderHub();
    return;
  }

  if(service.code === "schedule"){
    renderSchedulePage(service);
    return;
  }
  if(service.code === "shift_close"){
    renderShiftClosingPage(service);
    return;
  }
  if(service.code === "tasks"){
    renderTasksPage(service);
    return;
  }
  if(service.code === "training"){
    renderTrainingPage(service);
    return;
  }
  if(service.code === "requisition"){
    renderRequisitionPage(service);
    return;
  }
  if(service.code === "payroll"){
    renderPayrollPage(service);
    return;
  }
  if(service.code === "admin"){
    renderAdminPage(service);
    return;
  }
  if(service.code === "finance"){
    renderFinancePage(service);
    return;
  }
  if(service.code === "treasury"){
    renderTreasuryPage(service);
    return;
  }

  const statusText = "готовится";
  const extra = "";

  app.innerHTML = `
    <div class="phone">
      <section class="screen service-page">
        <div class="backrow">
          <button class="iconbtn" aria-label="Назад" data-action="back">${arrowLeftIcon()}</button>
          <h1 class="page-title">${escapeHtml(service.title)}</h1>
          <span class="status">${statusText}</span>
        </div>
        <div class="panel row">
          <span class="icon">${(serviceMeta[service.code] || serviceMeta.schedule).icon()}</span>
          <span class="grow">
            <span class="row-title">${escapeHtml(service.title)}</span>
            <span class="row-sub">Раздел подключен в структуру ЛК</span>
          </span>
        </div>
        ${extra ? `<div class="panel">${extra}</div>` : ""}
      </section>
    </div>
  `;
  app.querySelector("[data-action='back']").addEventListener("click", ()=>{
    history.pushState(null, "", "/");
    render();
  });
}

// ===== Касса (treasury) — планировщик cash-flow, owner-only. См. docs/treasury-planner.md =====
const TR_MONTHS = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];
function trShortDate(iso){
  if(!iso) return "";
  const [y,m,d] = iso.split("-").map(Number);
  return `${d} ${TR_MONTHS[m-1] || ""}`;
}
function trNum(el){
  if(!el) return NaN;
  return Number(String(el.value).replace(",", ".").replace(/\s/g, ""));
}

function renderTreasuryPage(service){
  if(!state.treasury && !state.treasuryLoading && !state.treasuryError){ loadTreasury(); }
  const body = state.treasuryLoading && !state.treasury
    ? `<div class="panel"><div class="loader compact">Загружаю кассу</div></div>`
    : state.treasuryError && !state.treasury
      ? `<div class="panel"><div class="row-title">Не удалось загрузить кассу</div><div class="row-sub">${escapeHtml(state.treasuryError)}</div></div>`
      : state.treasury ? renderTreasuryContent(state.treasury) : "";
  app.innerHTML = `
    <div class="phone wide">
      <section class="screen service-page">
        <div class="backrow">
          <button class="iconbtn" aria-label="Назад" data-action="back">${arrowLeftIcon()}</button>
          <h1 class="page-title">${escapeHtml(service.title)}</h1>
        </div>
        ${state.treasuryNotice ? `<div class="fin-notice">${escapeHtml(state.treasuryNotice)}</div>` : ""}
        ${body}
      </section>
    </div>
  `;
  app.querySelector("[data-action='back']").addEventListener("click", ()=>{
    history.pushState(null, "", "/");
    render();
  });
  bindTreasury();
}

async function loadTreasury(){
  state.treasuryLoading = true;
  state.treasuryError = "";
  render();
  try{
    state.treasury = await apiGet("/api/treasury");
  }catch(error){
    state.treasuryError = error.status === 403 ? "Раздел только для собственника" : "Проверь соединение и попробуй ещё раз";
  }finally{
    state.treasuryLoading = false;
    render();
  }
}

function renderTreasuryContent(t){
  const env = t.envelopes || {};
  const balVal = t.balanceAsOf ? Math.round(t.balance) : "";
  return `
    <div class="tr-balance">
      <div class="sec">Остаток на счёте</div>
      <div class="tr-row2">
        <input id="tr-balance" class="tr-input" inputmode="numeric" value="${balVal}" placeholder="введи остаток, ₽">
        <button class="btn brand-action" data-tr="save-balance">Сохранить</button>
      </div>
      <div class="tr-muted">${t.balanceAsOf ? `обновлён ${trShortDate(t.balanceAsOf)}` : "якорь прогноза — введи текущий остаток"}</div>
    </div>

    ${trFreeToday(t)}
    ${trAllocationBar(t.allocation)}

    <h2 class="sec">Конверты бюджета</h2>
    ${trEnvelopeCard("Закуп · бар + кухня", env.purchase)}
    ${trEnvelopeCard("Хозтовары", env.household)}

    <h2 class="sec">Внести трату</h2>
    ${trSpendForm()}

    ${(t.salary && t.salary.length) ? `<h2 class="sec">Зарплата</h2>${t.salary.map(trSalaryRow).join("")}` : ""}

    <h2 class="sec">Точки платежей</h2>
    ${(t.payments && t.payments.length) ? t.payments.map(trPaymentCopilka).join("") : `<div class="panel muted-line">Платежей нет — добавь первый</div>`}
    ${trAddPaymentForm()}
    ${((t.payments && t.payments.length) || (t.salary && t.salary.length)) ? trCalendar(t) : ""}

    <details class="tr-fold" ${state.treasurySettingsOpen ? "open" : ""} data-tr-fold="settings">
      <summary>Настройки ставок и подушки</summary>
      ${trSettingsForm(t.settings || {})}
    </details>
  `;
}

function trFreeToday(t){
  const earmark = Math.round(t.todayEarmark || 0);
  const free = Math.round(t.freeToday || 0);
  const neg = free < 0;
  return `
    <div class="tr-today ${neg ? "tr-today-bad" : ""}">
      <span>Сегодня отложи <b>${formatMoneyPlain(earmark)} ₽</b></span>
      <span>${neg ? "не хватает" : "свободно"} <b class="${neg ? "tr-free-bad" : "tr-free-ok"}">${formatMoneyPlain(Math.abs(free))} ₽</b></span>
    </div>
  `;
}

function trAllocationBar(a){
  if(!a || !a.revenue) return "";
  const parts = [
    ["ЗП", a.fot, "var(--line-strong)"],
    ["Закуп", a.purchase, "var(--brand)"],
    ["Хоз", a.household, "var(--gold)"],
    ["Резерв", a.reserve, "var(--teal)"],
    ["Свободно", a.free, "var(--green)"]
  ];
  const seg = parts.map(([,v,c])=>`<div style="width:${Math.max(0, (Number(v||0)/a.revenue)*100)}%;background:${c}"></div>`).join("");
  const legend = parts.map(([l,v,c])=>`<span class="tr-leg"><span class="tr-dot" style="background:${c}"></span>${l} ${formatMoneyPlain(v)}</span>`).join("");
  return `
    <div class="tr-alloc">
      <div class="tr-alloc-head"><span class="tr-alloc-title">Распределение · месяц</span><span class="tr-muted">${formatMoneyPlain(a.revenue)} ₽</span></div>
      <div class="tr-alloc-bar">${seg}</div>
      <div class="tr-alloc-legend">${legend}</div>
      ${a.free > 0 ? `<div class="tr-alloc-hint">Профицит ${formatMoneyPlain(a.free)} ₽ — можно направить на долги или подушку</div>` : ""}
    </div>
  `;
}

function trEnvelopeCard(title, e){
  if(!e) return "";
  const pct = e.accrued > 0 ? Math.max(0, Math.min(100, Math.round((e.available / e.accrued) * 100))) : 0;
  return `
    <div class="tr-env">
      <div class="tr-env-top"><span>${escapeHtml(title)}</span><span class="tr-rate">ставка ${e.pct}%</span></div>
      <div class="tr-env-big">${formatMoneyPlain(e.available)} ₽ <span>можно потратить</span></div>
      <div class="tr-env-bar"><i style="width:${pct}%"></i></div>
      <div class="tr-env-sub"><span>накоплено ${formatMoneyPlain(e.accrued)}</span><span>потрачено ${formatMoneyPlain(e.spent)}</span></div>
      ${e.todayAccrual ? `<div class="tr-env-today">+${formatMoneyPlain(e.todayAccrual)} ₽ сегодня · копится до дня заявки</div>` : ""}
    </div>
  `;
}

function trSpendForm(){
  const kinds = [["food","Продукты"],["household","Хозка"],["personal","Личные"],["other","Прочее"]];
  return `
    <div class="tr-spend">
      <div class="tr-chips">
        ${kinds.map(([k,l])=>`<button type="button" class="tr-chip ${state.treasurySpendKind === k ? "on" : ""}" data-tr-kind="${k}">${l}</button>`).join("")}
      </div>
      <div class="tr-row2">
        <input id="tr-spend-amount" class="tr-input" inputmode="numeric" placeholder="сумма, ₽">
        <button class="btn brand-action" data-tr="add-spend">Списать</button>
      </div>
      <input id="tr-spend-note" class="tr-input" placeholder="комментарий (необязательно)">
    </div>
  `;
}

function trPaymentCopilka(p){
  const statusText = p.statusFlag === "ok" ? "обеспечено"
    : p.statusFlag === "tight" ? "впритык"
    : `не хватает ${formatMoneyPlain(p.shortfall)} ₽`;
  return `
    <div class="tr-pay tr-${p.statusFlag}">
      <div class="tr-pay-top">
        <span><span class="tr-pay-date">${trShortDate(p.dueDate)}</span> <b>${escapeHtml(p.title)}</b>${p.recurring === "monthly" ? ` <span class="tr-recur">↻ ежемес.</span>` : ""}</span>
        <span class="tr-pay-amount">${formatMoneyPlain(p.amount)} ₽</span>
      </div>
      <div class="tr-pay-bar"><i style="width:${p.pctCovered}%"></i></div>
      <div class="tr-pay-bottom">
        <span class="tr-status tr-st-${p.statusFlag}">${statusText}</span>
        <span class="tr-pay-actions">
          <button class="tr-link" data-tr-pay="${escapeAttr(p.id)}">оплачен</button>
          <button class="tr-link tr-del" data-tr-del="${escapeAttr(p.id)}">удалить</button>
        </span>
      </div>
      ${p.statusFlag !== "ok" && p.perDay > 0 ? `<div class="tr-pay-perday">откладывай ${formatMoneyPlain(p.perDay)} ₽/день</div>` : ""}
      ${trPaymentSuggestions(p)}
    </div>
  `;
}

// ЗП — датированное обязательство (за прошлый месяц, срок 10-е). Read-only: выплата идёт в «Выплаты».
function trSalaryRow(s){
  const statusText = s.statusFlag === "ok" ? "обеспечено"
    : s.statusFlag === "tight" ? "впритык"
    : `не хватает ${formatMoneyPlain(s.shortfall)} ₽`;
  return `
    <div class="tr-pay tr-${s.statusFlag}">
      <div class="tr-pay-top">
        <span><span class="tr-pay-date">до ${trShortDate(s.dueDate)}</span> <b>${escapeHtml(s.title)}</b></span>
        <span class="tr-pay-amount">${formatMoneyPlain(s.amount)} ₽</span>
      </div>
      <div class="tr-pay-bar"><i style="width:${s.pctCovered}%"></i></div>
      <div class="tr-pay-bottom">
        <span class="tr-status tr-st-${s.statusFlag}">${statusText}</span>
        <span class="tr-muted">выплата в разделе «Выплаты»</span>
      </div>
      ${s.statusFlag !== "ok" && s.perDay > 0 ? `<div class="tr-pay-perday">откладывай ${formatMoneyPlain(s.perDay)} ₽/день</div>` : ""}
    </div>
  `;
}

function trPaymentSuggestions(p){
  const s = p.suggestions;
  if(!s) return "";
  const chips = [];
  if(s.moveToDate){
    chips.push(`<button class="tr-sug" data-tr-move="${escapeAttr(p.id)}" data-date="${s.moveToDate}">перенести → ${trShortDate(s.moveToDate)}</button>`);
  }
  if(s.splittable && s.splitLater > 0 && s.splitNow > 0 && s.splitLaterDate){
    chips.push(`<button class="tr-sug" data-tr-split="${escapeAttr(p.id)}">сплит ${formatMoneyPlain(s.splitNow)} + ${formatMoneyPlain(s.splitLater)}</button>`);
  }
  const reduceText = (s.reduce || []).length
    ? `<div class="tr-sug-reduce">до срока ещё уходит на: ${s.reduce.map((r)=>escapeHtml(r.title)).join(", ")} — подвинь одно, чтобы освободить резерв</div>`
    : "";
  if(!chips.length && !reduceText) return "";
  return `<div class="tr-sug-wrap">${chips.join("")}${reduceText}</div>`;
}

function trCalendar(t){
  const [y, m] = t.today.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstDow = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const rank = { ok: 1, tight: 2, risk: 3 };
  const byDay = new Map();
  [...(t.payments || []), ...(t.salary || [])].forEach((p)=>{
    const [py, pm, pd] = p.dueDate.split("-").map(Number);
    if(py === y && pm === m){
      const cur = byDay.get(pd);
      if(!cur || rank[p.statusFlag] > rank[cur]) byDay.set(pd, p.statusFlag);
    }
  });
  const todayD = Number(t.today.split("-")[2]);
  const cells = [];
  for(let i = 0; i < firstDow; i++) cells.push(`<div class="tr-cal-cell empty"></div>`);
  for(let d = 1; d <= daysInMonth; d++){
    const flag = byDay.get(d);
    const cls = `${flag ? ` tr-cal-${flag}` : ""}${d === todayD ? " tr-cal-today" : ""}`;
    cells.push(`<div class="tr-cal-cell${cls}"><span>${d}</span>${flag ? `<i class="tr-cal-dot tr-dot-${flag}"></i>` : ""}</div>`);
  }
  return `
    <details class="tr-fold" ${state.treasuryCalOpen ? "open" : ""} data-tr-fold="cal">
      <summary>Календарь месяца</summary>
      <div class="tr-cal-head">${["пн","вт","ср","чт","пт","сб","вс"].map((w)=>`<span>${w}</span>`).join("")}</div>
      <div class="tr-cal">${cells.join("")}</div>
    </details>
  `;
}

function trAddPaymentForm(){
  const cats = ["ЖКХ","Аренда","Налог","Долг","Закуп","Прочее"];
  return `
    <details class="tr-fold" ${state.treasuryAddOpen ? "open" : ""} data-tr-fold="add">
      <summary>＋ Точка платежа</summary>
      <div class="tr-add-body">
        <input id="tr-pay-title" class="tr-input" placeholder="название (ЖКХ, аренда…)">
        <div class="tr-row2">
          <input id="tr-pay-amount" class="tr-input" inputmode="numeric" placeholder="сумма, ₽">
          <input id="tr-pay-date" class="tr-input" type="date">
        </div>
        <select id="tr-pay-cat" class="tr-input">${cats.map((c)=>`<option>${c}</option>`).join("")}</select>
        <label class="tr-check"><input type="checkbox" id="tr-pay-recurring"> повторять ежемесячно</label>
        <button class="btn brand-action w-100" data-tr="add-pay">Добавить платёж</button>
      </div>
    </details>
  `;
}

function trSettingsForm(s){
  return `
    <div class="tr-set">
      <label class="tr-set-row"><span>Закуп, % выручки</span><input id="tr-set-purchase" class="tr-input" inputmode="decimal" value="${s.purchasePct ?? 30}"></label>
      <label class="tr-set-row"><span>Хоз, % выручки</span><input id="tr-set-household" class="tr-input" inputmode="decimal" value="${s.householdPct ?? 5}"></label>
      <label class="tr-set-row"><span>Подушка, ₽</span><input id="tr-set-buffer" class="tr-input" inputmode="numeric" value="${Math.round(s.safetyBuffer ?? 0)}"></label>
      <label class="tr-set-row"><span>Конверты копят с</span><input id="tr-set-start" class="tr-input" type="date" value="${s.accrualStart || ""}"></label>
      <button class="btn brand-action w-100" data-tr="save-settings">Сохранить настройки</button>
    </div>
  `;
}

function applyTreasury(data){
  state.treasury = data;
  render();
}

function bindTreasury(){
  app.querySelectorAll("[data-tr-kind]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      state.treasurySpendKind = button.dataset.trKind;
      app.querySelectorAll("[data-tr-kind]").forEach((b)=>b.classList.toggle("on", b === button));
    });
  });
  app.querySelectorAll("[data-tr-fold]").forEach((node)=>{
    node.addEventListener("toggle", ()=>{
      if(node.dataset.trFold === "settings") state.treasurySettingsOpen = node.open;
      if(node.dataset.trFold === "add") state.treasuryAddOpen = node.open;
      if(node.dataset.trFold === "cal") state.treasuryCalOpen = node.open;
    });
  });
  app.querySelectorAll("[data-tr-pay]").forEach((b)=>b.addEventListener("click", ()=>treasuryPay(b.dataset.trPay)));
  app.querySelectorAll("[data-tr-del]").forEach((b)=>b.addEventListener("click", ()=>treasuryDeletePayment(b.dataset.trDel)));
  app.querySelectorAll("[data-tr-move]").forEach((b)=>b.addEventListener("click", ()=>treasuryMovePayment(b.dataset.trMove, b.dataset.date)));
  app.querySelectorAll("[data-tr-split]").forEach((b)=>b.addEventListener("click", ()=>treasurySplitPayment(b.dataset.trSplit)));
  app.querySelectorAll("[data-tr]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      const action = button.dataset.tr;
      if(action === "save-balance") treasurySaveBalance();
      else if(action === "save-settings") treasurySaveSettings();
      else if(action === "add-pay") treasuryAddPayment();
      else if(action === "add-spend") treasuryAddSpend();
    });
  });
}

async function treasuryAction(promise, okMsg){
  state.treasuryNotice = "";
  try{
    const data = await promise;
    if(okMsg) state.treasuryNotice = okMsg;
    applyTreasury(data);
  }catch(error){
    state.treasuryNotice = error.status === 403 ? "Раздел только для собственника" : "Ошибка — проверь ввод и соединение";
    render();
  }
}

function treasurySaveBalance(){
  const v = trNum(document.getElementById("tr-balance"));
  if(!Number.isFinite(v) || v < 0){ state.treasuryNotice = "Введи сумму остатка"; render(); return; }
  treasuryAction(apiPost("/api/treasury/balance", { balance: Math.round(v) }), "Остаток обновлён");
}

function treasurySaveSettings(){
  const purchasePct = trNum(document.getElementById("tr-set-purchase"));
  const householdPct = trNum(document.getElementById("tr-set-household"));
  const safetyBuffer = trNum(document.getElementById("tr-set-buffer"));
  const startEl = document.getElementById("tr-set-start");
  const accrualStart = startEl && startEl.value ? startEl.value : undefined;
  if([purchasePct, householdPct, safetyBuffer].some((n)=>!Number.isFinite(n) || n < 0)){
    state.treasuryNotice = "Проверь значения настроек"; render(); return;
  }
  treasuryAction(apiPut("/api/treasury/settings", { purchasePct, householdPct, safetyBuffer: Math.round(safetyBuffer), accrualStart }), "Настройки сохранены");
}

function treasuryAddPayment(){
  const title = (document.getElementById("tr-pay-title")?.value || "").trim();
  const amount = trNum(document.getElementById("tr-pay-amount"));
  const dueDate = document.getElementById("tr-pay-date")?.value || "";
  const category = document.getElementById("tr-pay-cat")?.value || "Прочее";
  const recurring = document.getElementById("tr-pay-recurring")?.checked ? "monthly" : "none";
  if(!title){ state.treasuryNotice = "Укажи название платежа"; render(); return; }
  if(!Number.isFinite(amount) || amount <= 0){ state.treasuryNotice = "Укажи сумму платежа"; render(); return; }
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)){ state.treasuryNotice = "Укажи дату платежа"; render(); return; }
  state.treasuryAddOpen = true;
  treasuryAction(apiPost("/api/treasury/payments", { title, amount: Math.round(amount), dueDate, category, recurring }), "Платёж добавлен");
}

function treasuryAddSpend(){
  const amount = trNum(document.getElementById("tr-spend-amount"));
  const note = (document.getElementById("tr-spend-note")?.value || "").trim();
  if(!Number.isFinite(amount) || amount <= 0){ state.treasuryNotice = "Укажи сумму траты"; render(); return; }
  treasuryAction(apiPost("/api/treasury/spend", { kind: state.treasurySpendKind, amount: Math.round(amount), note }), "Трата внесена");
}

function treasuryPay(id){
  treasuryAction(apiPost(`/api/treasury/payments/${id}/pay`, {}), "Платёж отмечен оплаченным");
}

function treasuryDeletePayment(id){
  if(!confirm("Удалить платёж?")) return;
  treasuryAction(apiDelete(`/api/treasury/payments/${id}`), "Платёж удалён");
}

function trFindPayment(id){
  return (state.treasury?.payments || []).find((p)=>p.id === id);
}

function treasuryMovePayment(id, date){
  const p = trFindPayment(id);
  if(!p || !date) return;
  treasuryAction(apiPut(`/api/treasury/payments/${id}`, {
    title: p.title, amount: p.amount, dueDate: date, category: p.category, priority: p.priority, splittable: p.splittable
  }), `Перенесён на ${trShortDate(date)}`);
}

function treasurySplitPayment(id){
  const p = trFindPayment(id);
  if(!p || !p.suggestions) return;
  const s = p.suggestions;
  if(!(s.splitNow > 0 && s.splitLater > 0 && s.splitLaterDate)) return;
  treasuryAction(apiPost(`/api/treasury/payments/${id}/split`, {
    nowAmount: s.splitNow, laterAmount: s.splitLater, laterDate: s.splitLaterDate
  }), `Разбит: ${formatMoneyPlain(s.splitNow)} к сроку + ${formatMoneyPlain(s.splitLater)} позже`);
}

function renderTrainingPage(service){
  if(!state.training && !state.trainingLoading && !state.trainingError){
    loadTraining();
  }

  const body = state.trainingLoading && !state.training
    ? `<div class="panel"><div class="loader compact">Загружаю обучение</div></div>`
    : state.trainingError && !state.training
      ? `<div class="panel"><div class="row-title">Не удалось загрузить обучение</div><div class="row-sub">${escapeHtml(state.trainingError)}</div></div>`
      : state.training
        ? renderTrainingContent(state.training)
        : "";

  app.innerHTML = `
    <div class="phone wide training-phone">
      <section class="screen service-page training-screen">
        <div class="backrow">
          <button class="iconbtn" aria-label="Назад" data-action="back">${arrowLeftIcon()}</button>
          <h1 class="page-title">${escapeHtml(service.title)}</h1>
        </div>
        ${body}
      </section>
    </div>
  `;

  app.querySelector("[data-action='back']").addEventListener("click", ()=>{
    history.pushState(null, "", "/");
    render();
  });

  bindTrainingPage();
}

function renderTrainingContent(training){
  const chapters = trainingChapters(training);
  const selected = selectedTrainingChapter(training, chapters);
  return `
    <div class="training-hero">
      <div>
        <span class="training-kicker">Обучение</span>
        <h2>База знаний</h2>
        <p>Три независимых блока — база официанта, меню кухни и меню бара. Любой можно проходить с первого дня, в своём порядке.</p>
      </div>
      <div class="training-progress">
        <b>${training.progress?.percent || 0}%</b>
        <span>${training.progress?.readChapters || 0} из ${training.progress?.totalChapters || 0} глав прочитано</span>
      </div>
    </div>

    ${renderTrainingChallenge(training)}

    ${training.canManage ? renderTrainingManager(training) : ""}

    <div class="training-layout">
      <aside class="training-side">
        ${renderTrainingRoute(training.route, chapters)}
        <h2 class="sec">Разделы и главы</h2>
        <div class="training-chapters">
          ${(training.modules || []).length ? (training.modules || []).map((module)=>renderTrainingModuleNav(module, selected?.id)).join("") : `<div class="panel muted-line">Главы пока не добавлены</div>`}
        </div>
      </aside>
      <main class="training-main">
        ${selected ? renderTrainingChapter(selected) : `<div class="panel muted-line">Выберите главу</div>`}
      </main>
    </div>
    ${state.trainingError ? `<div class="error">${escapeHtml(state.trainingError)}</div>` : ""}
  `;
}

function renderTrainingChallenge(training){
  const left = training.challengeLeft ?? 0;
  const per = training.challengePerDay ?? 2;
  return `
    <div class="training-challenge">
      <div class="tc-text">
        <b>Проверить знания</b>
        <span>Случайные вопросы из всех разделов · +20% за тест · ${left > 0 ? `осталось ${left} из ${per} сегодня` : "на сегодня лимит исчерпан"}</span>
      </div>
      <button class="btn brand-action" type="button" data-challenge-start ${left > 0 ? "" : "disabled"}>Пройти</button>
    </div>
  `;
}

function renderTrainingManager(training){
  const dashboard = training.dashboard || {};
  const employees = dashboard.employees || [];
  return `
    <section class="training-manager">
      <div class="training-manager-head">
        <div>
          <h2 class="sec">Руководителю</h2>
          <div class="row-sub">Сотрудники, начавшие обучение и сдавшие хотя бы один тест</div>
        </div>
        <a class="ghost mini" href="https://admin.no-money-no-honey.ru/">Редактировать в NocoDB</a>
      </div>
      <div class="training-metrics">
        <div><span>Глав</span><b>${dashboard.totalChapters || 0}</b></div>
        <div><span>Сотрудников</span><b>${dashboard.employeesTotal || 0}</b></div>
        <div><span>Завершили</span><b>${dashboard.completedTotal || 0}</b></div>
        <div><span>Средний прогресс</span><b>${dashboard.averagePercent || 0}%</b></div>
      </div>
      <div class="training-team">
        ${employees.length ? employees.map(renderTrainingEmployeeProgress).join("") : `<div class="panel muted-line">Пока нет сотрудников с доступом к обучению</div>`}
      </div>
    </section>
  `;
}

function renderTrainingEmployeeProgress(employee){
  return `
    <div class="training-person">
      <div class="training-person-main">
        <b>${escapeHtml(employee.displayName)}</b>
        <span>${escapeHtml(roleLabel(employee.role))} · сдано тестов ${employee.testsPassed || 0}${employee.lastReadAt ? ` · ${escapeHtml(formatDateHuman(employee.lastReadAt.slice(0, 10)))}` : ""}</span>
      </div>
      <div class="training-person-progress">
        <i><span style="width:${Math.max(0, Math.min(100, employee.percent || 0))}%"></span></i>
        <b>${employee.readChapters || 0}/${employee.totalChapters || 0}</b>
      </div>
    </div>
  `;
}

function renderTrainingRoute(route, chapters){
  if(!route) return "";
  if(route.completed){
    return `
      <section class="training-route">
        <div class="route-done-bar">
          <span>${escapeHtml(route.title)} пройден</span>
          <button type="button" class="linklike" data-route-reset="${escapeAttr(route.id)}">вернуть</button>
        </div>
      </section>
    `;
  }
  const readIds = new Set(chapters.filter((chapter)=>chapter.isRead).map((chapter)=>chapter.id));
  return `
    <section class="training-route">
      <h2 class="sec">${escapeHtml(route.title)}</h2>
      <div class="training-days">
        ${(route.days || []).map((day)=>`
          <div class="training-day">
            <div class="training-day-num">${day.dayNumber}</div>
            <div class="training-day-body">
              <b>${escapeHtml(day.title)}</b>
              ${(day.items || []).map((item)=>item.chapterId ? `
                <button type="button" class="training-route-item ${readIds.has(item.chapterId) ? "read" : ""}" data-training-chapter="${escapeAttr(item.chapterId)}">
                  <span>${escapeHtml(item.title)}</span>
                </button>
              ` : `
                <div class="training-route-item muted">
                  <span>${escapeHtml(item.title)}</span>
                </div>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
      <button type="button" class="ghost brand-action route-done-btn" data-route-done="${escapeAttr(route.id)}">Путь пройден</button>
    </section>
  `;
}

function renderTrainingChapterButton(chapter, selectedId){
  const qz = chapter.quiz || {};
  let tag = chapter.isRead ? "прочитано" : "читать";
  if(chapter.locked) tag = "закрыто";
  else if(qz.passed) tag = "тест сдан";
  else if(qz.questionCount) tag = "нужен тест";
  return `
    <button type="button" class="training-chapter-btn ${selectedId === chapter.id ? "on" : ""} ${chapter.isRead ? "read" : ""} ${chapter.locked ? "locked" : ""} ${qz.passed ? "passed" : ""}" data-training-chapter="${escapeAttr(chapter.id)}">
      <span>${escapeHtml(chapter.title)}</span>
      <i>${tag}</i>
    </button>
  `;
}

function renderAttestationButton(module){
  const a = module.attestation || {};
  if(!a.questionCount) return "";
  if(a.passed) return `<div class="training-attest passed"><span>Аттестация</span><i>сдана${a.lastScore!=null?` · ${a.lastScore}%`:""}</i></div>`;
  if(!a.available) return `<div class="training-attest locked"><span>Аттестация</span><i>после всех глав</i></div>`;
  if(a.lockedUntil) return `<div class="training-attest fail"><span>Аттестация</span><i>повтор ${formatLockTime(a.lockedUntil)}</i></div>`;
  return `<button type="button" class="training-attest open" data-quiz-start="attestation:${escapeAttr(module.id)}"><span>Аттестация раздела</span><i>пройти · ${a.questionCount}в</i></button>`;
}

function renderTrainingModuleNav(module, selectedId){
  return `
    <div class="training-module-nav">
      <div class="tmn-title">${escapeHtml(module.title)}</div>
      ${(module.chapters || []).map((chapter)=>renderTrainingChapterButton(chapter, selectedId)).join("") || `<div class="muted-line">Глав нет</div>`}
      ${renderAttestationButton(module)}
    </div>
  `;
}

function formatLockTime(iso){
  if(!iso) return "позже";
  const left = Math.max(0, new Date(iso).getTime() - Date.now());
  const h = Math.floor(left/3600000);
  const m = Math.floor((left%3600000)/60000);
  const t = new Date(iso).toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" });
  return `через ${h>0?`${h} ч `:""}${m} мин (в ${t})`;
}

function renderTrainingChapter(chapter){
  if(chapter.locked){
    return `
      <article class="training-article">
        <div class="training-article-head"><div><h2>${escapeHtml(chapter.title)}</h2></div></div>
        <div class="quiz-gate locked">Эта глава откроется, когда закрепишь предыдущую тестом.</div>
      </article>
    `;
  }
  return `
    <article class="training-article">
      <div class="training-article-head">
        <div>
          <h2>${escapeHtml(chapter.title)}</h2>
          ${chapter.summary ? `<p>${escapeHtml(chapter.summary)}</p>` : ""}
        </div>
      </div>
      ${chapter.attachments?.length ? `
        <div class="training-attachments">
          ${chapter.attachments.map(renderTrainingAttachment).join("")}
        </div>
      ` : ""}
      <div class="training-body">
        ${trainingTextToHtml(chapter.body)}
      </div>
      ${renderChapterFooter(chapter)}
    </article>
  `;
}

// Подвал главы под материалом: пока не прочитал — кнопка «Отметить прочитанным».
// После прочтения она сменяется на «Пройти тест» (или статус сдачи).
function renderChapterFooter(chapter){
  const qz = chapter.quiz || {};
  if(!chapter.isRead){
    return `
      <div class="chapter-footer">
        <button class="btn" type="button" data-training-read="${escapeAttr(chapter.id)}">Отметить прочитанным</button>
      </div>
    `;
  }
  if(!qz.questionCount){
    return `<div class="chapter-footer"><div class="quiz-gate passed">Глава пройдена.</div></div>`;
  }
  if(qz.passed){
    return `<div class="chapter-footer"><div class="quiz-gate passed">Тест пройден${qz.lastScore!=null?` · ${qz.lastScore}%`:""}. Следующая глава открыта.</div></div>`;
  }
  if(qz.lockedUntil){
    return `<div class="chapter-footer"><div class="quiz-gate">Освежи материал и вернись к тесту ${formatLockTime(qz.lockedUntil)}.</div></div>`;
  }
  return `
    <div class="chapter-footer">
      <div class="quiz-gate-info soft">Закрепим прочитанное небольшим тестом — и двигаемся дальше.</div>
      <button class="btn brand-action" type="button" data-quiz-start="chapter:${escapeAttr(chapter.id)}">Пройти тест</button>
    </div>
  `;
}

function renderTrainingAttachment(attachment){
  const label = attachment.url ? "Открыть" : "Ожидает файла";
  const content = `
    <span>
      <b>${escapeHtml(attachment.title)}</b>
      <small>${escapeHtml(attachment.description || attachment.kind)}</small>
    </span>
    <i>${label}</i>
  `;
  return attachment.url
    ? `<a class="training-attachment" href="${escapeAttr(attachment.url)}" target="_blank" rel="noreferrer">${content}</a>`
    : `<div class="training-attachment muted">${content}</div>`;
}

function trainingTextToHtml(text){
  const lines = String(text || "").split("\n");
  const parts = [];
  let list = [];

  const flushList = ()=>{
    if(!list.length) return;
    parts.push(`<ul>${list.map((item)=>`<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  for(const raw of lines){
    const line = raw.trim();
    if(!line){
      flushList();
      continue;
    }
    if(line.startsWith("* ")){
      list.push(line.slice(2));
      continue;
    }
    flushList();
    if(/^\d+\.\d+\./.test(line)){
      parts.push(`<h3>${escapeHtml(line)}</h3>`);
    }else if(/^\d+\.\s/.test(line)){
      parts.push(`<p class="training-step">${escapeHtml(line)}</p>`);
    }else{
      parts.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  flushList();
  return parts.join("");
}

function trainingChapters(training){
  return (training.modules || []).flatMap((module)=>module.chapters || []);
}

function selectedTrainingChapter(training, chapters){
  if(!chapters.length) return null;
  const selected = chapters.find((chapter)=>chapter.id === state.selectedTrainingChapterId);
  if(selected) return selected;
  const firstUnread = chapters.find((chapter)=>!chapter.isRead);
  const next = firstUnread || chapters[0];
  state.selectedTrainingChapterId = next.id;
  return next;
}

function bindTrainingPage(){
  if(!state.training) return;
  app.querySelectorAll("[data-training-chapter]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      state.selectedTrainingChapterId = button.dataset.trainingChapter;
      render();
      // После выбора главы прокручиваем к началу текста для чтения.
      app.querySelector(".training-article")?.scrollIntoView({ behavior:"smooth", block:"start" });
    });
  });
  const readButton = app.querySelector("[data-training-read]");
  if(readButton){
    readButton.addEventListener("click", ()=>{
      markTrainingChapterRead(readButton.dataset.trainingRead);
    });
  }
  app.querySelectorAll("[data-quiz-start]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      const [scope, scopeId] = button.dataset.quizStart.split(":");
      startQuiz(scope, scopeId);
    });
  });
  const routeDone = app.querySelector("[data-route-done]");
  routeDone?.addEventListener("click", ()=>setRouteCompleted(routeDone.dataset.routeDone, true));
  const routeReset = app.querySelector("[data-route-reset]");
  routeReset?.addEventListener("click", ()=>setRouteCompleted(routeReset.dataset.routeReset, false));
  app.querySelector("[data-challenge-start]")?.addEventListener("click", startChallenge);
}

async function setRouteCompleted(routeId, done){
  if(!routeId || state.trainingSaving) return;
  state.trainingSaving = true;
  render();
  try{
    if(done){
      await apiPost(`/api/training/routes/${encodeURIComponent(routeId)}/complete`, {});
    }else{
      await apiDelete(`/api/training/routes/${encodeURIComponent(routeId)}/complete`);
    }
    state.training = await apiGet("/api/training/init");
  }catch(error){
    state.trainingError = "Не удалось сохранить";
  }finally{
    state.trainingSaving = false;
    render();
  }
}

let quizTimer = null;
function stopQuizTimer(){ if(quizTimer){ clearInterval(quizTimer); quizTimer = null; } }
function formatClock(s){ const m = Math.floor(s/60); return `${m}:${String(s%60).padStart(2,"0")}`; }

function beginQuiz(data, scope, scopeId){
  state.quiz = { scope, scopeId, attemptId: data.attemptId, questions: data.questions, answers: {}, durationSec: data.durationSec, endsAt: Date.now() + data.durationSec*1000, result: null, submitting: false };
  renderQuizScreen();
  stopQuizTimer();
  quizTimer = setInterval(()=>{
    const left = Math.max(0, Math.round((state.quiz.endsAt - Date.now())/1000));
    const el = document.getElementById("quizTimer");
    if(el){ el.textContent = formatClock(left); if(left <= 30) el.classList.add("low"); }
    if(left <= 0){ stopQuizTimer(); submitQuiz(true); }
  }, 1000);
}

async function startQuiz(scope, scopeId){
  try{
    const data = await apiPost(`/api/training/quiz/${scope}/${encodeURIComponent(scopeId)}/start`, {});
    beginQuiz(data, scope, scopeId);
  }catch(error){
    state.trainingError = error.code === "locked" ? "Тест временно заблокирован" : "Не удалось начать тест";
    render();
  }
}

async function startChallenge(){
  try{
    const data = await apiPost("/api/training/challenge/start", {});
    beginQuiz(data, "challenge", "challenge");
  }catch(error){
    state.trainingError = error.status === 429 ? "На сегодня лимит проверок исчерпан" : "Не удалось начать тест";
    render();
  }
}

function renderQuizScreen(){
  const q = state.quiz;
  if(!q) return;
  if(q.result){ renderQuizResult(); return; }
  app.innerHTML = `
    <div class="phone wide">
      <section class="screen service-page">
        <div class="quiz-bar">
          <div class="quiz-title">Тест${q.scope === "attestation" ? " · аттестация" : q.scope === "challenge" ? " · проверка знаний" : ""}</div>
          <div class="quiz-timer" id="quizTimer">${formatClock(Math.round(q.durationSec))}</div>
        </div>
        <div class="hint hint-block">Закрепим прочитанное — ответь на вопросы. Время ограничено, по окончании тест завершится сам.</div>
        <div class="quiz-questions">
          ${q.questions.map((qq, i)=>`
            <div class="quiz-q">
              <div class="quiz-q-prompt">${i+1}. ${escapeHtml(qq.prompt)}</div>
              <div class="quiz-opts">
                ${qq.options.map((o)=>`<label class="quiz-opt"><input type="radio" name="q-${escapeAttr(qq.id)}" value="${escapeAttr(o.id)}" data-q="${escapeAttr(qq.id)}"><span>${escapeHtml(o.label)}</span></label>`).join("")}
              </div>
            </div>
          `).join("")}
        </div>
        <div class="shift-footer"><button class="btn brand-action w-100" type="button" id="quizSubmit">Завершить тест</button></div>
      </section>
    </div>
  `;
  app.querySelectorAll("input[type=radio][data-q]").forEach((r)=>{
    r.addEventListener("change", ()=>{ state.quiz.answers[r.dataset.q] = r.value; });
  });
  app.querySelector("#quizSubmit")?.addEventListener("click", ()=>submitQuiz(false));
}

async function submitQuiz(auto){
  const q = state.quiz;
  if(!q || q.submitting) return;
  if(!auto){
    const answered = Object.keys(q.answers).length;
    if(answered < q.questions.length && !confirm(`Отвечено ${answered} из ${q.questions.length}. Завершить тест?`)) return;
  }
  q.submitting = true;
  stopQuizTimer();
  try{
    const answers = q.questions.map((qq)=>({ questionId: qq.id, optionId: q.answers[qq.id] || null }));
    const res = await apiPost(`/api/training/quiz/attempts/${encodeURIComponent(q.attemptId)}/submit`, { answers });
    state.quiz.result = res;
    renderQuizResult();
  }catch(error){
    q.submitting = false;
    alert("Не удалось отправить тест. Попробуй ещё раз.");
  }
}

function renderQuizResult(){
  const r = state.quiz.result;
  app.innerHTML = `
    <div class="phone wide">
      <section class="screen service-page">
        <div class="quiz-result ${r.passed ? "ok" : "fail"}">
          <div class="quiz-score">${r.scorePct}%</div>
          <div class="quiz-verdict">${r.passed ? "Тест пройден" : "Тест не пройден"}</div>
          <p>${r.passed
            ? "Отлично! Следующая глава открыта."
            : "Чуть не хватило — освежи материал и попробуй снова немного позже."}</p>
          <button class="btn brand-action" type="button" id="quizDone">${r.passed ? "Продолжить" : "Понятно"}</button>
        </div>
      </section>
    </div>
  `;
  app.querySelector("#quizDone")?.addEventListener("click", async ()=>{
    state.quiz = null;
    await loadTraining();
    await loadSummaryQuiet();
  });
}

async function loadSummaryQuiet(){
  try{ state.summary = await apiGet("/api/summary"); }catch(error){ /* ignore */ }
}

async function loadTraining(){
  state.trainingLoading = true;
  state.trainingError = "";
  render();
  try{
    state.training = await apiGet("/api/training/init");
  }catch(error){
    state.trainingError = error.status === 403 ? "Нет доступа к обучению" : "Проверь соединение и попробуй ещё раз";
  }finally{
    state.trainingLoading = false;
    render();
  }
}

async function markTrainingChapterRead(chapterId){
  if(!chapterId || state.trainingSaving) return;
  state.trainingSaving = true;
  state.trainingError = "";
  render();
  try{
    await apiPost(`/api/training/chapters/${encodeURIComponent(chapterId)}/read`, {});
    state.training = await apiGet("/api/training/init");
    state.summary = await apiGet("/api/summary");
  }catch(error){
    state.trainingError = "Не удалось сохранить отметку";
  }finally{
    state.trainingSaving = false;
    render();
  }
}

function renderTasksPage(service){
  if(!state.tasks && !state.tasksLoading && !state.tasksError){
    loadTasks();
  }

  const body = state.tasksLoading
    ? `<div class="panel"><div class="loader compact">Загружаю задачи</div></div>`
    : state.tasksError
      ? `<div class="panel"><div class="row-title">Не удалось загрузить задачи</div><div class="row-sub">${escapeHtml(state.tasksError)}</div></div>`
      : state.tasks
        ? renderTasksContent(state.tasks)
        : "";

  app.innerHTML = `
    <div class="phone wide tasks-phone">
      <section class="screen service-page tasks-screen">
        <div class="backrow">
          <button class="iconbtn" aria-label="Назад" data-action="back">${arrowLeftIcon()}</button>
          <h1 class="page-title">${escapeHtml(service.title)}</h1>
        </div>
        ${body}
      </section>
    </div>
  `;

  app.querySelector("[data-action='back']").addEventListener("click", ()=>{
    history.pushState(null, "", "/");
    render();
  });

  bindTasksPage();
}

function renderTasksContent(tasks){
  const team = tasks.teamSummary || {};
  const ownTasks = tasks.ownTasks || [];
  return `
    <div class="task-metrics">
      <div class="task-metric"><span>Мои в работе</span><b>${ownTasks.filter((task)=>task.status === "open").length}</b></div>
      <div class="task-metric"><span>Мои готово</span><b>${ownTasks.filter((task)=>task.status === "done").length}</b></div>
      ${tasks.canManage
        ? `<div class="task-metric ${team.awaiting ? "accent" : ""}"><span>На проверке</span><b>${team.awaiting || 0}</b></div>`
        : `<div class="task-metric"><span>У команды</span><b>${team.total || 0}</b></div>`}
      <div class="task-metric"><span>Сделано другими</span><b>${team.doneByOthers || 0}</b></div>
    </div>

    ${tasks.canManage ? `<button class="ghost brand-action plan-met-btn" type="button" data-action="plan-met">Общий план выполнен сегодня · +50% всем</button>` : ""}

    ${renderHandoverSection()}

    ${renderSalesGoalsManager()}

    ${tasks.canManage ? renderTaskCreatePanel(tasks) : ""}

    <h2 class="sec">Мои задачи</h2>
    <div class="task-list">
      ${ownTasks.length ? ownTasks.map((task)=>renderTaskCard(task, false)).join("") : `<div class="panel muted-line">Задач пока нет</div>`}
    </div>

    ${tasks.canManage ? `
      <h2 class="sec">Команда</h2>
      <div class="task-list">
        ${(tasks.teamTasks || []).length ? tasks.teamTasks.map((task)=>renderTaskCard(task, true)).join("") : `<div class="panel muted-line">Командных задач пока нет</div>`}
      </div>
    ` : ""}

    ${state.tasksError ? `<div class="error">${escapeHtml(state.tasksError)}</div>` : ""}
  `;
}

function renderHandoverSection(){
  const data = state.handovers;
  if(!data) return "";
  const notes = data.notes || [];
  const audienceOptions = [
    { value:"all", label:"Всем" },
    { value:"cook", label:"Поварам" },
    { value:"bar", label:"Барменам" },
    { value:"waiter", label:"Официантам" },
    { value:"dishwasher", label:"Мойке" }
  ];
  return `
    <h2 class="sec">План на завтра · передача смены</h2>
    <form class="panel handover-create" id="handoverForm">
      <textarea name="body" maxlength="1000" rows="2" placeholder="Что не успели, на что обратить внимание следующей смене"></textarea>
      <div class="handover-create-row">
        ${data.canManage
          ? `<select name="audience">${audienceOptions.map((option)=>`<option value="${option.value}">${option.label}</option>`).join("")}</select>`
          : `<span class="handover-aud-fixed">Для: ${escapeHtml(data.audienceLabel || "своей смены")}</span>`}
        <button class="ghost brand-action" type="submit">Оставить</button>
      </div>
    </form>
    <div class="handover-list">
      ${notes.length ? notes.map(renderHandoverNote).join("") : `<div class="panel muted-line">Записей для следующей смены пока нет</div>`}
    </div>
  `;
}

function renderHandoverNote(note){
  const canResolve = note.mine || state.handovers?.canManage;
  return `
    <div class="handover-note ${note.fromManager ? "from-manager" : ""}">
      <div class="handover-note-body">${escapeHtml(note.body)}</div>
      <div class="handover-note-foot">
        <div class="handover-note-meta">
          <span class="handover-badge">${escapeHtml(note.audienceLabel)}</span>
          ${note.fromManager ? `<span class="handover-badge manager">от руководителя</span>` : ""}
          ${note.authorName ? `<span>${escapeHtml(note.authorName)}</span>` : ""}
          <span>${escapeHtml(formatDateTimeHuman(note.createdAt))}</span>
        </div>
        ${canResolve ? `<button class="ghost mini" type="button" data-handover-resolve="${escapeAttr(note.id)}">Снять</button>` : ""}
      </div>
    </div>
  `;
}

function renderSalesGoalsManager(){
  const data = state.salesGoalsData;
  if(!data || !data.canManage) return "";
  const goals = data.goals || [];
  return `
    <h2 class="sec">Цели по продажам</h2>
    <form class="panel sales-goal-create" id="salesGoalForm">
      <div class="task-create-grid">
        <label class="field">
          <span>Сотрудник</span>
          <select name="employeeId" required>${(data.employees || []).map((e)=>`<option value="${escapeAttr(e.id)}">${escapeHtml(e.name)}</option>`).join("")}</select>
        </label>
        <label class="field task-title-field">
          <span>Что продаём</span>
          <input name="title" type="text" maxlength="120" autocomplete="off" placeholder="Например, десерты" required>
        </label>
        <label class="field">
          <span>Цель, шт</span>
          <input name="targetQty" type="number" min="1" max="100000" inputmode="numeric" placeholder="10" required>
        </label>
        <div class="field task-reward-field">
          <span>Премия</span>
          <div class="task-reward-row">
            <label class="reward-check"><input name="rewardOn" type="checkbox"> премия за достижение цели</label>
            <input name="rewardAmount" type="number" min="0" step="50" inputmode="numeric" placeholder="Сумма премии, ₽" data-goal-reward hidden>
          </div>
        </div>
        <button class="ghost brand-action" type="submit">Поставить цель</button>
      </div>
    </form>
    <div class="task-list">
      ${goals.length ? goals.map(renderSalesGoalManageCard).join("") : `<div class="panel muted-line">Активных целей нет</div>`}
    </div>
  `;
}

function renderSalesGoalManageCard(g){
  const done = g.current >= g.target;
  return `
    <div class="task-card">
      <div class="task-main">
        <div class="task-title-row">
          <span class="task-title">${escapeHtml(g.title)} · ${g.current}/${g.target}</span>
          <span class="task-status ${done ? "open" : "done"}">${done ? "Готова" : "В процессе"}</span>
        </div>
        <div class="task-meta">
          ${g.employeeName ? `<span>${escapeHtml(g.employeeName)}</span>` : ""}
          ${g.rewardAmount ? `<span class="task-reward">+${formatMoneyPlain(g.rewardAmount)} ₽</span>` : ""}
        </div>
      </div>
      <div class="task-actions">
        ${done ? `<button class="ghost mini brand-action" type="button" data-goal-confirm="${escapeAttr(g.id)}">Подтвердить</button>` : ""}
        <button class="ghost mini danger-action" type="button" data-goal-cancel="${escapeAttr(g.id)}">Снять</button>
      </div>
    </div>
  `;
}

async function createSalesGoalFromForm(form){
  const employeeId = form.elements.employeeId.value;
  const title = form.elements.title.value.trim();
  const targetQty = Number(form.elements.targetQty.value);
  const rewardOn = form.elements.rewardOn?.checked;
  const rewardValue = Number(form.elements.rewardAmount?.value || 0);
  const rewardAmount = rewardOn && rewardValue > 0 ? Math.round(rewardValue) : null;
  if(!employeeId || !title || !(targetQty > 0)) return;
  try{
    await apiPost("/api/sales-goals", { employeeId, title, targetQty, rewardAmount });
    state.salesGoalsData = await apiGet("/api/sales-goals");
    render();
  }catch(error){
    state.tasksError = "Не удалось поставить цель";
    render();
  }
}

async function confirmSalesGoal(id){
  try{
    await apiPatch(`/api/sales-goals/${encodeURIComponent(id)}/confirm`, {});
    state.salesGoalsData = await apiGet("/api/sales-goals");
    render();
  }catch(error){ /* ignore */ }
}

async function cancelSalesGoal(id){
  try{
    await apiDelete(`/api/sales-goals/${encodeURIComponent(id)}`);
    state.salesGoalsData = await apiGet("/api/sales-goals");
    render();
  }catch(error){ /* ignore */ }
}

function renderTaskCreatePanel(tasks){
  return `
    <form class="panel task-create" id="taskCreateForm">
      <div class="row-title">Назначить задачу</div>
      <div class="task-create-grid">
        <label class="field">
          <span>Кому</span>
          <select name="assignTo" required>
            <optgroup label="Сотрудник">
              ${(tasks.employees || []).map((employee)=>`
                <option value="${escapeAttr(employee.id)}">${escapeHtml(employee.name)}</option>
              `).join("")}
            </optgroup>
            <optgroup label="Вся смена (роль)">
              <option value="role:waiter">Все официанты</option>
              <option value="role:cook">Все повара</option>
              <option value="role:bar">Все бармены</option>
              <option value="role:dishwasher">Вся мойка</option>
            </optgroup>
          </select>
        </label>
        <label class="field task-title-field">
          <span>Задача</span>
          <input name="title" type="text" maxlength="200" autocomplete="off" placeholder="Что нужно сделать" required>
        </label>
        <label class="field">
          <span>Срок</span>
          <input name="deadlineDate" type="date">
        </label>
        <label class="field task-desc-field">
          <span>Описание</span>
          <textarea name="description" maxlength="2000" rows="2" placeholder="Детали, если нужно"></textarea>
        </label>
        <div class="field task-reward-field">
          <span>Премия</span>
          <div class="task-reward-row">
            <label class="reward-check"><input name="rewardOn" type="checkbox"> назначить премию за выполнение</label>
            <input name="rewardAmount" type="number" min="0" step="50" inputmode="numeric" placeholder="Сумма премии, ₽" data-reward-amount hidden>
          </div>
        </div>
        <button class="ghost brand-action" type="submit">Добавить</button>
      </div>
    </form>
  `;
}

function roleAudienceLabel(role){
  return { cook:"повара", bar:"бармены", waiter:"официанты", dishwasher:"мойка" }[role] || "смена";
}

function renderTaskCard(task, showEmployee){
  const isRole = Boolean(task.audienceRole);
  const done = task.status === "done";
  const approved = done && Boolean(task.approvedAt);
  const awaiting = done && !isRole && !task.approvedAt; // личная: отмечена выполненной, ждёт приёмки

  let statusLabel = "В работе", statusClass = "open";
  if(done && isRole){ statusLabel = "Готово"; statusClass = "done"; }
  else if(awaiting){ statusLabel = "На проверке"; statusClass = "pending"; }
  else if(approved){ statusLabel = "Принято"; statusClass = "done"; }

  const cardClass = awaiting ? "pending" : (done ? "done" : "open");
  const rewardLabel = task.rewardAmount
    ? `<span class="task-reward${approved ? " ok" : ""}">+${formatMoneyPlain(task.rewardAmount)} ₽${awaiting ? " · на проверке" : (approved ? " · начислена" : "")}</span>`
    : "";

  const actions = [];
  // Готово/Вернуть: сотруднику — пока не принято; руководителю (команда) — всегда (может вернуть).
  if(showEmployee || !approved){
    actions.push(`<button class="ghost mini" type="button" data-task-status="${escapeAttr(task.id)}" data-status="${done ? "open" : "done"}">${done ? "Вернуть" : "Готово"}</button>`);
  }
  // Подтвердить приёмку: руководителю для личной задачи на проверке.
  if(showEmployee && awaiting){
    actions.push(`<button class="ghost mini brand-action" type="button" data-task-approve="${escapeAttr(task.id)}">Подтвердить</button>`);
  }
  if(showEmployee){
    actions.push(`<button class="ghost mini danger-action" type="button" data-task-cancel="${escapeAttr(task.id)}">Снять</button>`);
  }

  return `
    <div class="task-card ${cardClass}">
      <div class="task-main">
        <div class="task-title-row">
          <span class="task-title">${escapeHtml(task.title)}</span>
          <span class="task-status ${statusClass}">${statusLabel}</span>
        </div>
        ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ""}
        <div class="task-meta">
          ${isRole ? `<span class="task-aud">Вся смена · ${roleAudienceLabel(task.audienceRole)}</span>` : (showEmployee && task.employeeName ? `<span>${escapeHtml(task.employeeName)}</span>` : "")}
          ${task.deadlineDate ? `<span>${escapeHtml(formatDateHuman(task.deadlineDate))}</span>` : ""}
          ${rewardLabel}
        </div>
      </div>
      <div class="task-actions">
        ${actions.join("")}
      </div>
    </div>
  `;
}

function bindTasksPage(){
  const form = app.querySelector("#taskCreateForm");
  if(form){
    form.addEventListener("submit", (event)=>{
      event.preventDefault();
      createTaskFromForm(form);
    });
    const rewardOn = form.elements.rewardOn;
    const rewardAmount = form.querySelector("[data-reward-amount]");
    rewardOn?.addEventListener("change", ()=>{
      rewardAmount.hidden = !rewardOn.checked;
      if(rewardOn.checked) rewardAmount.focus();
    });
  }

  app.querySelectorAll("[data-task-status]").forEach((button)=>{
    button.addEventListener("click", ()=>setTaskStatus(button.dataset.taskStatus, button.dataset.status));
  });

  app.querySelectorAll("[data-task-cancel]").forEach((button)=>{
    button.addEventListener("click", ()=>cancelTask(button.dataset.taskCancel));
  });

  app.querySelectorAll("[data-task-approve]").forEach((button)=>{
    button.addEventListener("click", ()=>approveTask(button.dataset.taskApprove));
  });

  const handoverForm = app.querySelector("#handoverForm");
  if(handoverForm){
    handoverForm.addEventListener("submit", (event)=>{
      event.preventDefault();
      submitHandover(handoverForm);
    });
  }
  app.querySelectorAll("[data-handover-resolve]").forEach((button)=>{
    button.addEventListener("click", ()=>resolveHandover(button.dataset.handoverResolve));
  });

  app.querySelector("[data-action='plan-met']")?.addEventListener("click", async ()=>{
    if(!confirm("Отметить, что общий план сегодня выполнен? Всем сотрудникам +50% к прогрессу.")) return;
    try{
      const res = await apiPost("/api/progress/plan-met", {});
      alert(res.alreadyAwarded ? "Сегодня план уже отмечен" : "Готово — +50% начислено всем");
    }catch(error){
      alert("Не удалось отметить");
    }
  });

  const goalForm = app.querySelector("#salesGoalForm");
  if(goalForm){
    goalForm.addEventListener("submit", (event)=>{
      event.preventDefault();
      createSalesGoalFromForm(goalForm);
    });
    const rewardOn = goalForm.elements.rewardOn;
    const rewardAmount = goalForm.querySelector("[data-goal-reward]");
    rewardOn?.addEventListener("change", ()=>{
      rewardAmount.hidden = !rewardOn.checked;
      if(rewardOn.checked) rewardAmount.focus();
    });
  }
  app.querySelectorAll("[data-goal-confirm]").forEach((button)=>{
    button.addEventListener("click", ()=>confirmSalesGoal(button.dataset.goalConfirm));
  });
  app.querySelectorAll("[data-goal-cancel]").forEach((button)=>{
    button.addEventListener("click", ()=>cancelSalesGoal(button.dataset.goalCancel));
  });
}

async function submitHandover(form){
  if(state.handoverSaving) return;
  const body = form.elements.body.value.trim();
  if(body.length < 2) return;
  const audience = form.elements.audience?.value;
  state.handoverSaving = true;
  try{
    await apiPost("/api/handovers", audience ? { body, audience } : { body });
    state.handovers = await apiGet("/api/handovers");
  }catch(error){
    state.tasksError = "Не удалось сохранить запись";
  }finally{
    state.handoverSaving = false;
    render();
  }
}

async function resolveHandover(id){
  if(!id) return;
  try{
    await apiPatch(`/api/handovers/${encodeURIComponent(id)}/resolve`, {});
    state.handovers = await apiGet("/api/handovers");
  }catch(error){
    /* ignore */
  }finally{
    render();
  }
}

async function loadTasks(){
  state.tasksLoading = true;
  state.tasksError = "";
  render();
  try{
    const [tasks, handovers, salesGoals] = await Promise.all([
      apiGet("/api/tasks"),
      apiGet("/api/handovers").catch(()=>null),
      apiGet("/api/sales-goals").catch(()=>null)
    ]);
    state.tasks = tasks;
    state.handovers = handovers;
    state.salesGoalsData = salesGoals;
  }catch(error){
    state.tasksError = error.status === 403 ? "Нет доступа к задачам" : "Проверь соединение и попробуй ещё раз";
  }finally{
    state.tasksLoading = false;
    render();
  }
}

async function createTaskFromForm(form){
  if(state.tasksSaving) return;
  const title = form.elements.title.value.trim();
  const assignTo = form.elements.assignTo.value;
  const deadlineDate = form.elements.deadlineDate.value || null;
  const description = form.elements.description?.value.trim() || null;
  const rewardOn = form.elements.rewardOn?.checked;
  const rewardValue = Number(form.elements.rewardAmount?.value || 0);
  const rewardAmount = rewardOn && rewardValue > 0 ? Math.round(rewardValue) : null;
  if(!title || !assignTo) return;
  const payload = assignTo.startsWith("role:")
    ? { title, description, audienceRole: assignTo.slice(5), deadlineDate, rewardAmount }
    : { title, description, employeeId: assignTo, deadlineDate, rewardAmount };
  await saveTasksAction(()=>apiPost("/api/tasks", payload));
}

async function setTaskStatus(id, status){
  if(!id || !status || state.tasksSaving) return;
  await saveTasksAction(()=>apiPatch(`/api/tasks/${encodeURIComponent(id)}/status`, { status }));
}

async function cancelTask(id){
  if(!id || state.tasksSaving) return;
  await saveTasksAction(()=>apiDelete(`/api/tasks/${encodeURIComponent(id)}`));
}

async function approveTask(id){
  if(!id || state.tasksSaving) return;
  await saveTasksAction(()=>apiPatch(`/api/tasks/${encodeURIComponent(id)}/approve`, {}));
}

async function saveTasksAction(action){
  state.tasksSaving = true;
  state.tasksError = "";
  render();
  try{
    await action();
    state.tasks = await apiGet("/api/tasks");
    state.summary = await apiGet("/api/summary");
  }catch(error){
    state.tasksError = "Не удалось сохранить";
  }finally{
    state.tasksSaving = false;
    render();
  }
}

function renderRequisitionPage(service){
  if(!state.requisitionCatalog && !state.requisitionLoading && !state.requisitionError){
    loadRequisitionData();
  }

  const body = state.requisitionLoading && !state.requisitionCatalog
    ? `<div class="panel"><div class="loader compact">Загружаю каталог</div></div>`
    : state.requisitionError && !state.requisitionCatalog
      ? `<div class="panel"><div class="row-title">Не удалось загрузить заявку</div><div class="row-sub">${escapeHtml(state.requisitionError)}</div></div>`
      : state.requisitionCatalog
        ? renderRequisitionContent()
        : "";

  app.innerHTML = `
    <div class="phone wide requisition-phone">
      <section class="screen service-page requisition-screen">
        <div class="backrow">
          <button class="iconbtn" aria-label="Назад" data-action="back">${arrowLeftIcon()}</button>
          <h1 class="page-title">${escapeHtml(service.title)}</h1>
        </div>
        ${body}
      </section>
    </div>
  `;

  app.querySelector("[data-action='back']").addEventListener("click", ()=>{
    history.pushState(null, "", "/");
    render();
  });

  bindRequisitionPage();
}

function renderRequisitionContent(){
  const total = requisitionCartItems().length;
  const ordering = state.requisitionTab === "catalog" || state.requisitionTab === "cart";
  const view = state.requisitionTab === "history"
    ? renderRequisitionHistoryTab()
    : state.requisitionTab === "cart"
      ? renderRequisitionCart()
      : renderRequisitionCatalog();
  return `
    <div class="req-tabs">
      <button class="${ordering ? "on" : ""}" data-req-tab="catalog">Заявка ${total ? `<b>${total}</b>` : ""}</button>
      <button class="${state.requisitionTab === "history" ? "on" : ""}" data-req-tab="history">Мои заявки</button>
    </div>
    ${view}
    ${state.requisitionNotice ? `<div class="req-notice">${escapeHtml(state.requisitionNotice)}</div>` : ""}
    ${state.requisitionError ? `<div class="error req-error">${escapeHtml(state.requisitionError)}</div>` : ""}
  `;
}

function renderRequisitionCatalog(){
  const categories = requisitionCategoriesForKind(state.requisitionKind);
  const allCount = requisitionItemsForKind(state.requisitionKind).length;
  const hasProduct = requisitionCategoriesForKind("product").length > 0;
  const hasHousehold = requisitionCategoriesForKind("household").length > 0;

  return `
    <div class="req-toolbar">
      <div class="req-segment">
        ${hasProduct ? `<button class="${state.requisitionKind === "product" ? "on" : ""}" data-req-kind="product">Продукты</button>` : ""}
        ${hasHousehold ? `<button class="${state.requisitionKind === "household" ? "on" : ""}" data-req-kind="household">Хозтовары</button>` : ""}
      </div>
      <label class="req-search">
        <input type="search" value="${escapeAttr(state.requisitionSearch)}" placeholder="Поиск по каталогу" data-req-search autocomplete="off">
      </label>
    </div>

    <div class="req-categories">
      <button class="req-chip ${state.requisitionCategoryId === "all" ? "on" : ""}" data-req-category="all">
        <i></i><span>Все</span><b>${allCount}</b>
      </button>
      ${categories.map((category)=>`
        <button class="req-chip ${state.requisitionCategoryId === category.id ? "on" : ""}" data-req-category="${escapeAttr(category.id)}">
          <i style="background:${escapeAttr(category.color)}"></i><span>${escapeHtml(category.name)}</span><b>${category.itemCount}</b>
        </button>
      `).join("")}
    </div>

    <div data-req-results>
      ${renderRequisitionCatalogResults()}
    </div>
  `;
}

function renderRequisitionCatalogResults(){
  const categories = requisitionCategoriesForKind(state.requisitionKind);
  const items = requisitionFilteredItems();
  const selectedCategory = categories.find((category)=>category.id === state.requisitionCategoryId);
  const cartTotal = requisitionCartItems().length;
  return `
    <div class="req-current">
      <span>${selectedCategory ? escapeHtml(selectedCategory.name) : "Все позиции"}</span>
      <b>${items.length}</b>
    </div>

    <div class="req-items">
      ${items.length ? items.map(renderRequisitionItem).join("") : `<div class="panel muted-line">Ничего не найдено</div>`}
    </div>

    ${cartTotal ? `
      <div class="req-sticky">
        <button class="brand-action req-submit-link" data-req-open-cart>
          В заявке ${cartTotal} ${pluralize(cartTotal, "позиция", "позиции", "позиций")} · Оформить
        </button>
      </div>
    ` : ""}
  `;
}

function renderRequisitionItem(item){
  const entry = state.requisitionCart[item.id];
  return `
    <div class="req-item ${entry ? "selected" : ""}">
      <span class="req-marker" style="background:${escapeAttr(item.categoryColor)}"></span>
      <span class="req-item-main">
        <b>${escapeHtml(item.name)}</b>
        <small>${escapeHtml(unitShort(item.unit))}${item.packLabel ? ` · ${escapeHtml(item.packLabel)}` : ""}${item.price ? ` · ${formatMoneyPlain(item.price)} ₽` : ""}</small>
      </span>
      ${entry ? `
        <span class="req-item-controls">
          <span class="req-stepper">
            <button type="button" aria-label="Меньше" data-req-dec="${escapeAttr(item.id)}">-</button>
            <b>${formatQty(entry.qty)} ${escapeHtml(unitShort(entry.unit))}</b>
            <button type="button" aria-label="Больше" data-req-inc="${escapeAttr(item.id)}">+</button>
          </span>
          <button class="req-urgent-toggle ${entry.urgent ? "on" : ""}" type="button" data-req-urgent="${escapeAttr(item.id)}">${entry.urgent ? "Срочно ✓" : "Срочно"}</button>
        </span>
      ` : `
        <button class="req-add" type="button" aria-label="Добавить в заявку" data-req-add="${escapeAttr(item.id)}">+</button>
      `}
    </div>
  `;
}

function renderRequisitionCart(){
  const items = requisitionCartItems();
  const productItems = items.filter((item)=>item.kind === "product");
  const householdItems = items.filter((item)=>item.kind === "household");
  const historyData = state.requisitionHistory || { requisitions:[], canManage:false };
  return `
    <div class="req-summary">
      <div>
        <span>Автор</span>
        <b>${escapeHtml(state.user.displayName)}</b>
      </div>
      <div>
        <span>Всего</span>
        <b>${items.length}</b>
      </div>
      <div>
        <span>Продукты</span>
        <b>${productItems.length}</b>
      </div>
      <div>
        <span>Хоз</span>
        <b>${householdItems.length}</b>
      </div>
    </div>

    ${state.requisitionEditId ? `
      <div class="req-edit-banner">
        Правка заявки — изменения обновят общее сообщение
        <button class="ghost mini" type="button" data-req-edit-cancel>Отменить</button>
      </div>
    ` : ""}

    ${renderFreeRequisitionPanel()}

    <form id="requisitionSendForm">
      <div class="req-cart-groups">
        ${renderRequisitionCartGroup("Продукты", productItems)}
        ${renderRequisitionCartGroup("Хозтовары", householdItems)}
      </div>

      <label class="field req-comment">
        <span>Комментарий</span>
        <textarea name="comment" maxlength="700" placeholder="Что важно учесть">${escapeHtml(state.requisitionComment)}</textarea>
      </label>

      <button class="brand-action req-submit-link" type="submit" ${items.length && !state.requisitionSaving ? "" : "disabled"}>
        ${state.requisitionSaving ? (state.requisitionEditId ? "Сохраняю" : "Отправляю") : (state.requisitionEditId ? "Сохранить изменения" : "Отправить заявку")}
      </button>
    </form>
  `;
}

function renderRequisitionHistoryTab(){
  const historyData = state.requisitionHistory || { requisitions:[], canManage:false };
  return `
    ${historyData.canManage ? renderRequisitionCostSummary() : ""}
    <div class="req-history-head">
      <h2 class="sec">Мои заявки</h2>
      ${historyData.canManage ? `<button class="req-filter-toggle ${state.requisitionShowRemaining ? "on" : ""}" type="button" data-req-remaining>Осталось купить</button>` : ""}
    </div>
    <div class="req-history">
      ${renderRequisitionHistory(historyData)}
    </div>
  `;
}

function renderRequisitionCostSummary(){
  if(state.requisitionCostSummary === null && !state.requisitionCostLoading){ loadRequisitionCostSummary(); }
  const cs = state.requisitionCostSummary;
  if(!cs) return `<div class="panel muted-line">Считаю закуп месяца…</div>`;
  return `
    <div class="cost-summary">
      <div class="cost-summary-head">
        <span>Контроль закупа · ${escapeHtml(formatScheduleMonth(cs.year, cs.month))}</span>
        <b>выручка ${cs.isForecast ? "(прогноз) " : ""}${formatMoneyPlain(cs.revenue)} ₽</b>
      </div>
      ${(cs.groups || []).map((g)=>{
        const pctOfBudget = g.budget > 0 ? Math.min(100, Math.round(g.spent / g.budget * 100)) : 0;
        return `
          <div class="cost-row ${g.over ? "over" : ""}">
            <div class="cost-row-top">
              <span>${escapeHtml(g.label)} · норма ${g.norm}%</span>
              <b>${formatMoneyPlain(g.spent)} / ${formatMoneyPlain(g.budget)} ₽</b>
            </div>
            <div class="cost-bar meter thin ok"><i style="width:${pctOfBudget}%"></i></div>
            <div class="cost-row-sub">${g.pct}% от выручки${g.over ? ` · перезакуп +${formatMoneyPlain(g.spent - g.budget)} ₽` : ` · в норме`}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

async function loadRequisitionCostSummary(){
  state.requisitionCostLoading = true;
  try{
    state.requisitionCostSummary = await apiGet("/api/requisitions/cost-summary");
  }catch(error){
    state.requisitionCostSummary = { groups: [], revenue: 0, year: 0, month: 0 };
  }finally{
    state.requisitionCostLoading = false;
    render();
  }
}

function renderRequisitionHistory(historyData){
  const onlyRemaining = historyData.canManage && state.requisitionShowRemaining;
  let records = historyData.requisitions || [];
  if(onlyRemaining) records = records.filter((record)=>(record.lines || []).some((line)=>!line.purchased));
  if(!records.length){
    return `<div class="panel muted-line">${onlyRemaining ? "Всё закуплено — список пуст" : "Заявок пока нет"}</div>`;
  }
  return records.map((record)=>renderRequisitionRecord(record, historyData.canManage, onlyRemaining)).join("");
}

function renderFreeRequisitionPanel(){
  const categories = requisitionCategoriesForKind(state.requisitionKind);
  const hasProduct = requisitionCategoriesForKind("product").length > 0;
  const hasHousehold = requisitionCategoriesForKind("household").length > 0;
  return `
    <form class="panel req-free" id="requisitionFreeForm">
      <div class="row-title">Другое</div>
      <div class="row-sub">Если позиции нет в каталоге, добавь её свободной строкой</div>
      <div class="req-free-grid">
        <label class="field">
          <span>Тип</span>
          <select name="freeKind">
            ${hasProduct ? `<option value="product" ${state.requisitionKind === "product" ? "selected" : ""}>Продукты</option>` : ""}
            ${hasHousehold ? `<option value="household" ${state.requisitionKind === "household" ? "selected" : ""}>Хозтовары</option>` : ""}
          </select>
        </label>
        <label class="field">
          <span>Категория</span>
          <select name="freeCategory">
            ${categories.map((category)=>`<option value="${escapeAttr(category.name)}">${escapeHtml(category.name)}</option>`).join("")}
          </select>
        </label>
        <label class="field req-free-name">
          <span>Название</span>
          <input name="freeName" type="text" maxlength="140" autocomplete="off" placeholder="Например, редкая специя">
        </label>
        <label class="field">
          <span>Кол-во</span>
          <input name="freeQty" type="number" min="0.1" max="9999" step="0.1" value="1">
        </label>
        <label class="field">
          <span>Ед.</span>
          <input name="freeUnit" type="text" maxlength="30" value="шт">
        </label>
        <button class="ghost" type="submit">Добавить</button>
      </div>
    </form>
  `;
}

function renderRequisitionCartGroup(title, items){
  return `
    <div class="req-cart-group">
      <div class="req-group-title"><span>${title}</span><b>${items.length}</b></div>
      ${items.length ? items.map(renderRequisitionCartLine).join("") : `<div class="muted-line">Пока пусто</div>`}
    </div>
  `;
}

function renderRequisitionCartLine(item){
  return `
    <div class="req-cart-line minimal">
      <span class="req-cart-name ${item.urgent ? "urgent" : ""}">${item.urgent ? "● " : ""}${escapeHtml(item.name)}</span>
      <b class="req-cart-qty">${formatQty(item.qty)} ${escapeHtml(unitShort(item.unit))}</b>
      <button class="req-cart-x" type="button" data-req-remove="${escapeAttr(item.key)}" aria-label="Убрать">✕</button>
    </div>
  `;
}

function renderRequisitionRecord(record, canManage, onlyRemaining){
  return `
    <div class="req-record">
      <div class="req-record-head">
        <span>
          <b>${escapeHtml(record.authorName || "Сотрудник")}</b>
          <small>${escapeHtml(formatDateTimeHuman(record.createdAt))}${record.urgent ? " · срочно" : ""}</small>
        </span>
        ${canManage ? `
          <select data-req-status="${escapeAttr(record.id)}">
            ${requisitionStatusOptions().map((option)=>`
              <option value="${option.value}" ${record.status === option.value ? "selected" : ""}>${option.label}</option>
            `).join("")}
          </select>
        ` : `<i class="req-status ${escapeAttr(record.status)}">${escapeHtml(record.statusLabel)}</i>`}
      </div>
      <div class="req-record-meta">
        ${record.totalLines} ${pluralize(record.totalLines, "позиция", "позиции", "позиций")} · продукты ${record.productLines} · хоз ${record.householdLines}${record.totalCost ? ` · ≈ ${formatMoneyPlain(record.totalCost)} ₽` : ""}
      </div>
      ${renderRequisitionRecordLines(record, canManage, onlyRemaining)}
      ${record.comment ? `<div class="req-record-comment">${escapeHtml(record.comment)}</div>` : ""}
      ${(!canManage && (record.status === "new" || record.status === "accepted")) ? `
        <div class="req-record-actions">
          <button class="ghost mini" type="button" data-req-edit="${escapeAttr(record.id)}">Изменить</button>
          <button class="ghost mini danger-action" type="button" data-req-delete="${escapeAttr(record.id)}">Удалить</button>
        </div>
      ` : ""}
    </div>
  `;
}

function renderRequisitionRecordLines(record, canManage, onlyRemaining){
  let lines = record.lines || [];
  if(onlyRemaining) lines = lines.filter((line)=>!line.purchased);
  const expanded = onlyRemaining || !!state.requisitionExpanded[record.id];
  const shown = expanded ? lines : lines.slice(0, 8);
  const boughtNote = (l)=> (l.purchasedQty != null && l.purchasedQty !== l.qty) ? ` <i class="rlc-diff">надо ${formatQty(l.qty)}</i>` : "";
  const line = (l)=> canManage
    ? `<div class="req-line-check ${l.purchased ? "done" : ""}">
         <label class="rlc-main">
           <input type="checkbox" data-req-line="${escapeAttr(record.id)}::${escapeAttr(l.id)}" ${l.purchased ? "checked" : ""}>
           <span class="${l.urgent ? "urgent" : ""}">${l.urgent ? "● " : ""}${escapeHtml(l.name)} <b>${formatQty(l.qty)} ${escapeHtml(unitShort(l.unit))}</b></span>
         </label>
         ${l.purchased ? `<span class="rlc-bought">куплено <input type="number" min="0" step="0.1" inputmode="decimal" value="${l.purchasedQty != null ? l.purchasedQty : l.qty}" data-req-bought="${escapeAttr(record.id)}::${escapeAttr(l.id)}"> ${escapeHtml(unitShort(l.unit))}</span>` : ""}
       </div>`
    : `<span class="${l.urgent ? "urgent" : ""} ${l.purchased ? "bought" : ""}">${l.purchased ? "✓ " : (l.urgent ? "● " : "")}${escapeHtml(l.name)} <b>${formatQty(l.purchasedQty != null ? l.purchasedQty : l.qty)} ${escapeHtml(unitShort(l.unit))}</b>${boughtNote(l)}</span>`;
  return `
    <div class="req-record-lines ${canManage ? "checklist" : ""}">
      ${shown.map(line).join("")}
      ${!onlyRemaining && lines.length > 8 ? `<button class="req-expand" type="button" data-req-expand="${escapeAttr(record.id)}">${expanded ? "Свернуть" : `Показать все (ещё ${lines.length - 8})`}</button>` : ""}
    </div>
  `;
}

function bindRequisitionPage(){
  app.querySelectorAll("[data-req-tab]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      state.requisitionTab = button.dataset.reqTab;
      state.requisitionError = "";
      state.requisitionNotice = "";
      render();
    });
  });

  app.querySelectorAll("[data-req-kind]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      state.requisitionKind = button.dataset.reqKind;
      state.requisitionCategoryId = "all";
      state.requisitionSearch = "";
      state.requisitionError = "";
      render();
    });
  });

  app.querySelectorAll("[data-req-category]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      state.requisitionCategoryId = button.dataset.reqCategory;
      render();
    });
  });

  const search = app.querySelector("[data-req-search]");
  if(search){
    search.addEventListener("input", ()=>{
      state.requisitionSearch = search.value;
      updateRequisitionCatalogResults();
    });
  }

  bindRequisitionCatalogControls();
  bindRequisitionCartControls();

  const freeForm = app.querySelector("#requisitionFreeForm");
  if(freeForm){
    const kind = freeForm.elements.freeKind;
    kind.addEventListener("change", ()=>{
      state.requisitionKind = kind.value;
      state.requisitionCategoryId = "all";
      render();
    });
    freeForm.addEventListener("submit", (event)=>{
      event.preventDefault();
      addFreeRequisitionItem(freeForm);
    });
  }

  const sendForm = app.querySelector("#requisitionSendForm");
  if(sendForm){
    sendForm.addEventListener("submit", (event)=>{
      event.preventDefault();
      sendRequisition(sendForm);
    });
  }

  app.querySelectorAll("[data-req-status]").forEach((select)=>{
    select.addEventListener("change", ()=>changeRequisitionStatus(select.dataset.reqStatus, select.value));
  });
  app.querySelectorAll("[data-req-expand]").forEach((button)=>{
    button.addEventListener("click", ()=>toggleRequisitionExpanded(button.dataset.reqExpand));
  });
  app.querySelectorAll("[data-req-edit]").forEach((button)=>{
    button.addEventListener("click", ()=>startEditRequisition(button.dataset.reqEdit));
  });
  app.querySelectorAll("[data-req-delete]").forEach((button)=>{
    button.addEventListener("click", ()=>deleteRequisition(button.dataset.reqDelete));
  });
  app.querySelector("[data-req-edit-cancel]")?.addEventListener("click", cancelEditRequisition);
  const remaining = app.querySelector("[data-req-remaining]");
  if(remaining){
    remaining.addEventListener("click", ()=>{
      state.requisitionShowRemaining = !state.requisitionShowRemaining;
      render();
    });
  }
  app.querySelectorAll("[data-req-line]").forEach((checkbox)=>{
    checkbox.addEventListener("change", ()=>{
      const [rid, lid] = checkbox.dataset.reqLine.split("::");
      toggleRequisitionLinePurchased(rid, lid, checkbox.checked);
    });
  });
  app.querySelectorAll("[data-req-bought]").forEach((input)=>{
    input.addEventListener("change", ()=>{
      const [rid, lid] = input.dataset.reqBought.split("::");
      const qty = Number(input.value);
      if(qty > 0) saveRequisitionLineBought(rid, lid, qty);
    });
  });
}

async function saveRequisitionLineBought(recordId, lineId, purchasedQty){
  try{
    const updated = await apiPatch(`/api/requisitions/${encodeURIComponent(recordId)}/lines/${encodeURIComponent(lineId)}`, { purchasedQty });
    const list = state.requisitionHistory?.requisitions || [];
    const idx = list.findIndex((record)=>record.id === recordId);
    if(idx !== -1) list[idx] = updated;
    state.requisitionCostSummary = null;
    render();
  }catch(error){
    state.requisitionError = "Не удалось сохранить количество";
    render();
  }
}

function toggleRequisitionExpanded(id){
  state.requisitionExpanded = { ...state.requisitionExpanded, [id]: !state.requisitionExpanded[id] };
  render();
}

async function toggleRequisitionLinePurchased(recordId, lineId, purchased){
  try{
    const updated = await apiPatch(`/api/requisitions/${encodeURIComponent(recordId)}/lines/${encodeURIComponent(lineId)}`, { purchased });
    const list = state.requisitionHistory?.requisitions || [];
    const idx = list.findIndex((record)=>record.id === recordId);
    if(idx !== -1) list[idx] = updated;
    state.requisitionCostSummary = null;
    render();
  }catch(error){
    state.requisitionError = "Не удалось сохранить отметку";
    render();
  }
}

function bindRequisitionCatalogControls(){
  app.querySelectorAll("[data-req-add]").forEach((button)=>{
    button.addEventListener("click", ()=>addRequisitionCatalogItem(button.dataset.reqAdd));
  });
  app.querySelectorAll("[data-req-inc]").forEach((button)=>{
    button.addEventListener("click", ()=>changeRequisitionEntry(button.dataset.reqInc, 1));
  });
  app.querySelectorAll("[data-req-dec]").forEach((button)=>{
    button.addEventListener("click", ()=>changeRequisitionEntry(button.dataset.reqDec, -1));
  });
  app.querySelectorAll("[data-req-urgent]").forEach((button)=>{
    button.addEventListener("click", ()=>toggleRequisitionUrgent(button.dataset.reqUrgent));
  });

  const openCart = app.querySelector("[data-req-open-cart]");
  if(openCart){
    openCart.addEventListener("click", ()=>{
      state.requisitionTab = "cart";
      render();
    });
  }
}

function bindRequisitionCartControls(){
  app.querySelectorAll("[data-req-remove]").forEach((button)=>{
    button.addEventListener("click", ()=>removeRequisitionEntry(button.dataset.reqRemove));
  });
  app.querySelectorAll("[data-req-urgent]").forEach((button)=>{
    button.addEventListener("click", ()=>toggleRequisitionUrgent(button.dataset.reqUrgent));
  });
}

function updateRequisitionCatalogResults(){
  const results = app.querySelector("[data-req-results]");
  if(!results) return;
  results.innerHTML = renderRequisitionCatalogResults();
  bindRequisitionCatalogControls();
}

async function loadRequisitionData(){
  state.requisitionLoading = true;
  state.requisitionError = "";
  state.requisitionNotice = "";
  render();
  try{
    const [catalog, historyData] = await Promise.all([
      apiGet("/api/requisitions/catalog"),
      apiGet("/api/requisitions")
    ]);
    state.requisitionCatalog = catalog;
    state.requisitionHistory = historyData;
    ensureRequisitionKindHasCategories();
  }catch(error){
    state.requisitionError = error.status === 403 ? "Нет доступа к заявке" : "Проверь соединение и попробуй ещё раз";
  }finally{
    state.requisitionLoading = false;
    render();
  }
}

async function refreshRequisitionData(){
  const [catalog, historyData] = await Promise.all([
    apiGet("/api/requisitions/catalog"),
    apiGet("/api/requisitions")
  ]);
  state.requisitionCatalog = catalog;
  state.requisitionHistory = historyData;
  state.requisitionCostSummary = null;
  ensureRequisitionKindHasCategories();
}

function ensureRequisitionKindHasCategories(){
  if(requisitionCategoriesForKind(state.requisitionKind).length) return;
  const hasProducts = requisitionCategoriesForKind("product").length;
  state.requisitionKind = hasProducts ? "product" : "household";
  state.requisitionCategoryId = "all";
}

function requisitionCategoriesForKind(kind){
  return (state.requisitionCatalog?.categories || []).filter((category)=>category.kind === kind && category.itemCount > 0);
}

function requisitionItemsForKind(kind){
  return (state.requisitionCatalog?.items || []).filter((item)=>item.kind === kind);
}

function requisitionFilteredItems(){
  const search = state.requisitionSearch.trim().toLowerCase().replaceAll("ё", "е");
  return requisitionItemsForKind(state.requisitionKind).filter((item)=>{
    if(state.requisitionCategoryId !== "all" && item.categoryId !== state.requisitionCategoryId) return false;
    if(!search) return true;
    return `${item.name} ${item.categoryName}`.toLowerCase().replaceAll("ё", "е").includes(search);
  });
}

function addRequisitionCatalogItem(id){
  const item = (state.requisitionCatalog?.items || []).find((candidate)=>candidate.id === id);
  if(!item) return;
  const current = state.requisitionCart[id];
  state.requisitionCart = {
    ...state.requisitionCart,
    [id]: current ? { ...current, qty: current.qty + 1 } : {
      key:id,
      catalogItemId:id,
      freeName:"",
      name:item.name,
      qty:1,
      unit:item.unit,
      kind:item.kind,
      categoryName:item.categoryName,
      urgent:false
    }
  };
  state.requisitionNotice = "";
  render();
}

function changeRequisitionEntry(key, delta){
  const current = state.requisitionCart[key];
  if(!current) return;
  const qty = Math.round((Number(current.qty || 0) + delta) * 10) / 10;
  if(qty <= 0){
    removeRequisitionEntry(key);
    return;
  }
  state.requisitionCart = {
    ...state.requisitionCart,
    [key]: { ...current, qty }
  };
  render();
}

function removeRequisitionEntry(key){
  if(!state.requisitionCart[key]) return;
  const next = { ...state.requisitionCart };
  delete next[key];
  state.requisitionCart = next;
  render();
}

function toggleRequisitionUrgent(key){
  const current = state.requisitionCart[key];
  if(!current) return;
  state.requisitionCart = {
    ...state.requisitionCart,
    [key]: { ...current, urgent: !current.urgent }
  };
  render();
}

function addFreeRequisitionItem(form){
  const freeName = form.elements.freeName.value.trim();
  const qty = Number(form.elements.freeQty.value);
  const unit = form.elements.freeUnit.value.trim() || "шт";
  const kind = form.elements.freeKind.value;
  const categoryName = form.elements.freeCategory.value;
  if(!freeName || !Number.isFinite(qty) || qty <= 0){
    state.requisitionError = "Заполни название и количество";
    render();
    return;
  }
  const key = `free:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  state.requisitionCart = {
    ...state.requisitionCart,
    [key]: {
      key,
      catalogItemId:null,
      freeName,
      name:freeName,
      qty:Math.round(qty * 100) / 100,
      unit,
      kind,
      categoryName,
      urgent:false
    }
  };
  state.requisitionError = "";
  state.requisitionNotice = "";
  form.reset();
  render();
}

async function sendRequisition(form){
  const items = requisitionCartItems();
  if(state.requisitionSaving || !items.length) return;
  const editId = state.requisitionEditId;
  state.requisitionSaving = true;
  state.requisitionError = "";
  state.requisitionNotice = "";
  state.requisitionComment = form.elements.comment.value.trim();
  render();
  const payload = {
    comment: state.requisitionComment,
    urgent: false,
    lines: items.map((item)=>({
      catalogItemId: item.catalogItemId,
      freeName: item.freeName,
      qty: item.qty,
      unit: item.unit,
      kind: item.kind,
      categoryName: item.categoryName,
      urgent: Boolean(item.urgent)
    }))
  };
  try{
    if(editId){
      await apiPut(`/api/requisitions/${encodeURIComponent(editId)}/lines`, payload);
    }else{
      await apiPost("/api/requisitions", payload);
    }
    state.requisitionCart = {};
    state.requisitionComment = "";
    state.requisitionEditId = null;
    state.requisitionNotice = editId ? "Заявка обновлена" : "Заявка отправлена";
    state.requisitionTab = "history";
    await refreshRequisitionData();
  }catch(error){
    state.requisitionError = error.code === "forbidden_catalog_item" || error.code === "forbidden_category"
      ? "Эта категория недоступна для твоей роли"
      : error.code === "requisition_locked"
        ? "Заявка уже закуплена — изменить нельзя"
        : editId ? "Не удалось сохранить изменения" : "Не удалось отправить заявку";
  }finally{
    state.requisitionSaving = false;
    render();
  }
}

// Загрузить позиции заявки в корзину для правки (key = catalogItemId | уникальный free-ключ).
function startEditRequisition(id){
  const data = state.requisitionHistory || { requisitions: [] };
  const record = (data.requisitions || []).find((r)=>r.id === id);
  if(!record) return;
  const cart = {};
  (record.lines || []).forEach((line, i)=>{
    const key = line.catalogItemId || `free:${id}:${i}`;
    cart[key] = {
      key,
      catalogItemId: line.catalogItemId || null,
      freeName: line.catalogItemId ? "" : (line.freeName || line.name),
      name: line.name,
      qty: line.qty,
      unit: line.unit,
      kind: line.kind,
      categoryName: line.categoryName,
      urgent: Boolean(line.urgent)
    };
  });
  state.requisitionCart = cart;
  state.requisitionComment = record.comment || "";
  state.requisitionEditId = id;
  state.requisitionTab = "cart";
  state.requisitionNotice = "";
  state.requisitionError = "";
  render();
}

function cancelEditRequisition(){
  state.requisitionEditId = null;
  state.requisitionCart = {};
  state.requisitionComment = "";
  state.requisitionTab = "history";
  render();
}

async function deleteRequisition(id){
  if(state.requisitionSaving || !id) return;
  if(!confirm("Удалить заявку? Она исчезнет из общего сообщения.")) return;
  state.requisitionSaving = true;
  state.requisitionError = "";
  state.requisitionNotice = "";
  render();
  try{
    await apiDelete(`/api/requisitions/${encodeURIComponent(id)}`);
    if(state.requisitionEditId === id){
      state.requisitionEditId = null;
      state.requisitionCart = {};
      state.requisitionComment = "";
    }
    state.requisitionNotice = "Заявка удалена";
    await refreshRequisitionData();
  }catch(error){
    state.requisitionError = error.code === "requisition_locked" ? "Заявка уже закуплена — удалить нельзя" : "Не удалось удалить";
  }finally{
    state.requisitionSaving = false;
    render();
  }
}

async function changeRequisitionStatus(id, status){
  if(state.requisitionSaving || !id || !status) return;
  state.requisitionSaving = true;
  state.requisitionError = "";
  state.requisitionNotice = "";
  render();
  try{
    await apiPatch(`/api/requisitions/${encodeURIComponent(id)}`, { status });
    await refreshRequisitionData();
  }catch(error){
    state.requisitionError = "Не удалось изменить статус";
  }finally{
    state.requisitionSaving = false;
    render();
  }
}

function requisitionCartItems(){
  return Object.values(state.requisitionCart || {});
}

function requisitionStatusOptions(){
  return [
    { value:"new", label:"Новая" },
    { value:"accepted", label:"Принята" },
    { value:"purchased", label:"Закуплена" },
    { value:"rejected", label:"Отклонена" }
  ];
}

function renderPayrollPage(service){
  const today = new Date();
  const year = state.payroll?.year || today.getFullYear();
  const month = state.payroll?.month || today.getMonth() + 1;

  if(!state.payroll && !state.payrollLoading && !state.payrollError){
    loadPayroll(year, month);
  }

  const body = state.payrollLoading
    ? `<div class="panel"><div class="loader compact">Загружаю выплаты</div></div>`
    : state.payrollError
      ? `<div class="panel"><div class="row-title">Не удалось загрузить выплаты</div><div class="row-sub">${escapeHtml(state.payrollError)}</div></div>`
      : state.payroll
        ? renderPayrollContent(state.payroll)
        : "";

  app.innerHTML = `
    <div class="phone wide payroll-phone">
      <section class="screen service-page payroll-screen">
        <div class="backrow">
          <button class="iconbtn" aria-label="Назад" data-action="back">${arrowLeftIcon()}</button>
          <h1 class="page-title">${escapeHtml(service.title)}</h1>
        </div>
        ${body}
      </section>
    </div>
  `;

  app.querySelector("[data-action='back']").addEventListener("click", ()=>{
    history.pushState(null, "", "/");
    render();
  });

  app.querySelectorAll("[data-payroll-month]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      const direction = button.dataset.payrollMonth === "next" ? 1 : -1;
      const base = new Date((state.payroll?.year || year), (state.payroll?.month || month) - 1 + direction, 1);
      state.payroll = null;
      loadPayroll(base.getFullYear(), base.getMonth() + 1);
    });
  });

  const obligForm = app.querySelector("#obligForm");
  obligForm?.addEventListener("submit", (event)=>{ event.preventDefault(); submitObligation(obligForm); });
  app.querySelectorAll("[data-oblig-pay]").forEach((button)=>{
    button.addEventListener("click", ()=>payObligation(button.dataset.obligPay));
  });
  app.querySelectorAll("[data-oblig-close]").forEach((button)=>{
    button.addEventListener("click", ()=>closeObligation(button.dataset.obligClose));
  });
}

function renderPayrollContent(payroll){
  const summary = payroll.summary || {};
  const hookahRows = payroll.hookah || [];
  const showHookah = summary.isHookahMaster || hookahRows.length > 0;
  const hookahTotal = hookahRows.reduce((s, r)=>s + Number(r.amount || 0), 0);
  const hookahCount = hookahRows.reduce((s, r)=>s + Number(r.count || 0), 0);
  return `
    <div class="monthbar">
      <button class="btn icon" data-payroll-month="prev">‹</button>
      <div class="mname">${formatScheduleMonth(payroll.year, payroll.month)}</div>
      <button class="btn icon" data-payroll-month="next">›</button>
    </div>

    <div class="payroll-hero">
      <div>
        <div class="mslabel">Твой доход за текущий месяц</div>
        <div class="payroll-balance">${formatMoneyPlain(summary.accrued || 0)} ₽</div>
        ${summary.pastDebt > 0 ? `<div class="payroll-debt">Долг за прошлые месяцы: ${formatMoneyPlain(summary.pastDebt)} ₽</div>` : ""}
      </div>
      <div class="payroll-next">
        <span>Ближайшая дата</span>
        <b>${summary.upcomingPayday ? escapeHtml(formatDateHuman(summary.upcomingPayday)) : "не назначена"}</b>
      </div>
    </div>

    <div class="payroll-metrics two">
      <div class="pay-metric pair">
        <div><span>Выплачено</span><b>${formatMoneyPlain(summary.paid || 0)} ₽</b></div>
        <div><span>Осталось выплатить</span><b>${formatMoneyPlain(summary.remaining || 0)} ₽</b></div>
      </div>
      <div class="pay-metric pair">
        <div><span>Смены</span><b>${summary.shifts || 0}</b></div>
        <div><span>Часы</span><b>${formatHours(summary.hours || 0)}</b></div>
      </div>
    </div>

    ${renderObligations(payroll)}

    ${showHookah ? `
      <details class="payroll-history hookah-history"${hookahRows.length ? " open" : ""}>
        <summary><span>Кальяны за месяц</span><b>${formatMoneyPlain(hookahTotal)} ₽${hookahCount ? ` · ${hookahCount} шт` : ""}</b></summary>
        <div class="payroll-list">
          ${hookahRows.length ? hookahRows.map((row)=>`
            <div class="payroll-row">
              <span>
                <b>${formatMoneyPlain(row.amount)} ₽</b>
                <small>${escapeHtml(formatDateHuman(row.workDate))} · ${row.count} × ${formatMoneyPlain(row.rate)} ₽</small>
              </span>
              <i>выдано</i>
            </div>
          `).join("") : `<div class="panel muted-line">В этом месяце кальянов пока нет</div>`}
        </div>
      </details>
    ` : ""}

    ${(payroll.taskRewards || []).length ? `
      <h2 class="sec">Премии за задачи</h2>
      <div class="payroll-list">
        ${payroll.taskRewards.map((row)=>`
          <div class="payroll-row">
            <span>
              <b>+${formatMoneyPlain(row.amount)} ₽</b>
              <small>${escapeHtml(row.title)} · ${escapeHtml(formatDateHuman(row.doneAt.slice(0, 10)))}</small>
            </span>
            <i>начислено</i>
          </div>
        `).join("")}
      </div>
    ` : ""}

    ${(payroll.goalRewards || []).length ? `
      <h2 class="sec">Премии за цели продаж</h2>
      <div class="payroll-list">
        ${payroll.goalRewards.map((row)=>`
          <div class="payroll-row">
            <span>
              <b>+${formatMoneyPlain(row.amount)} ₽</b>
              <small>${escapeHtml(row.title)} · ${escapeHtml(formatDateHuman(row.doneAt.slice(0, 10)))}</small>
            </span>
            <i>начислено</i>
          </div>
        `).join("")}
      </div>
    ` : ""}

    <details class="payroll-history"${(payroll.payouts || []).length ? "" : " data-empty"}>
      <summary><span>История выплат</span><b>${(payroll.payouts || []).length}</b></summary>
      <div class="payroll-list">
        ${(payroll.payouts || []).length ? payroll.payouts.map((payout)=>`
          <div class="payroll-row">
            <span>
              <b>${formatMoneyPlain(payout.amount)} ₽</b>
              <small>${escapeHtml(formatDateHuman(payout.workDate))}${payout.note ? ` · ${escapeHtml(payout.note)}` : ""}</small>
            </span>
            <i>выдано</i>
          </div>
        `).join("") : `<div class="panel muted-line">В этом месяце выплат пока нет</div>`}
      </div>
    </details>

    ${payroll.canManage ? renderObligationsManager(payroll) : ""}
  `;
}

function renderObligations(payroll){
  const list = payroll.obligations || [];
  if(!list.length) return "";
  return `
    <h2 class="sec">Тебе вернут</h2>
    <div class="oblig-list">
      ${list.map((o)=>{
        const pct = o.amountTotal > 0 ? Math.round((o.amountPaid / o.amountTotal) * 100) : 0;
        return `
          <div class="oblig-card">
            <div class="oblig-top">
              <span class="oblig-title">${escapeHtml(o.title)}</span>
              <b class="oblig-remain">${formatMoneyPlain(o.remaining)} ₽</b>
            </div>
            ${o.note ? `<div class="oblig-note">${escapeHtml(o.note)}</div>` : ""}
            <div class="oblig-bar meter thin ok"><i style="width:${pct}%"></i></div>
            <div class="oblig-sub">Уже вернули ${formatMoneyPlain(o.amountPaid)} из ${formatMoneyPlain(o.amountTotal)} ₽</div>
            ${(o.payments || []).length ? `<div class="oblig-pays">${o.payments.map((p)=>`<div class="oblig-pay"><span>${escapeHtml(formatDateHuman(p.workDate))}</span><b>+${formatMoneyPlain(p.amount)} ₽</b></div>`).join("")}</div>` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderObligationsManager(payroll){
  const emps = payroll.manageEmployees || [];
  const all = payroll.allObligations || [];
  return `
    <h2 class="sec">Личные обязательства · управление</h2>
    <form class="panel oblig-form" id="obligForm">
      <label class="field"><span>Сотрудник</span>
        <select name="employeeId" required>${emps.map((e)=>`<option value="${escapeAttr(e.id)}">${escapeHtml(e.name)}</option>`).join("")}</select>
      </label>
      <label class="field mt-10"><span>За что</span>
        <input name="title" maxlength="120" placeholder="Напр. премия за май" required>
      </label>
      <label class="field mt-10"><span>Сумма, ₽</span>
        <input name="amountTotal" type="number" min="1" step="1" inputmode="numeric" required>
      </label>
      <button class="ghost brand-action mt-12" type="submit">Добавить</button>
    </form>
    <div class="oblig-list mt-12">
      ${all.length ? all.map((o)=>`
        <div class="oblig-card manage">
          <div class="oblig-top">
            <span class="oblig-title">${escapeHtml(o.employeeName)} · ${escapeHtml(o.title)}</span>
            <b class="oblig-remain">${formatMoneyPlain(o.remaining)} ₽</b>
          </div>
          <div class="oblig-sub">Возвращено ${formatMoneyPlain(o.amountPaid)} из ${formatMoneyPlain(o.amountTotal)} ₽</div>
          <div class="oblig-actions">
            <input type="number" min="1" step="1" inputmode="numeric" placeholder="Сумма выплаты" data-oblig-pay-input="${escapeAttr(o.id)}">
            <button class="btn brand-action" type="button" data-oblig-pay="${escapeAttr(o.id)}">Выплатил</button>
            <button class="btn ghost" type="button" data-oblig-close="${escapeAttr(o.id)}">Закрыть</button>
          </div>
        </div>
      `).join("") : `<div class="panel muted-line">Активных обязательств нет</div>`}
    </div>
  `;
}

function reloadPayrollCurrent(){
  const y = state.payroll?.year;
  const m = state.payroll?.month;
  state.payroll = null;
  loadPayroll(y, m);
}

async function submitObligation(form){
  const employeeId = form.elements.employeeId.value;
  const title = form.elements.title.value.trim();
  const amountTotal = Number(form.elements.amountTotal.value);
  if(!employeeId || !title || !(amountTotal > 0)){ alert("Заполни сотрудника, за что и сумму"); return; }
  try{
    await apiPost("/api/payroll/obligations", { employeeId, title, amountTotal });
    reloadPayrollCurrent();
  }catch(error){ alert("Не удалось добавить"); }
}

async function payObligation(id){
  const input = app.querySelector(`[data-oblig-pay-input="${id}"]`);
  const amount = Number(input?.value);
  if(!(amount > 0)){ alert("Укажи сумму выплаты"); return; }
  try{
    await apiPost(`/api/payroll/obligations/${encodeURIComponent(id)}/pay`, { amount });
    reloadPayrollCurrent();
  }catch(error){ alert("Не удалось сохранить"); }
}

async function closeObligation(id){
  if(!confirm("Закрыть обязательство? Оно перестанет отображаться у сотрудника.")) return;
  try{
    await apiDelete(`/api/payroll/obligations/${encodeURIComponent(id)}`);
    reloadPayrollCurrent();
  }catch(error){ alert("Не удалось закрыть"); }
}

async function loadPayroll(year, month){
  state.payrollLoading = true;
  state.payrollError = "";
  render();
  try{
    state.payroll = await apiGet(`/api/payroll?year=${year}&month=${month}`);
  }catch(error){
    state.payrollError = error.status === 403 ? "Нет доступа к выплатам" : "Проверь соединение и попробуй ещё раз";
  }finally{
    state.payrollLoading = false;
    render();
  }
}

function serviceUrl(service){
  return service.code === "admin" ? "/admin" : service.url;
}

function serviceForPath(path){
  if(path === "/admin"){
    return state.services.find((item)=>item.code === "admin") || null;
  }
  return state.services.find((item)=>item.url === path) || null;
}

function allowedServicePath(path, services){
  if(path === "/" || path === "") return false;
  if(path === "/admin") return services.some((item)=>item.code === "admin");
  return services.some((item)=>item.url === path);
}

function renderAdminPage(service){
  if(!state.admin && !state.adminLoading && !state.adminError){
    loadAdmin();
  }

  const body = state.adminLoading
    ? `<div class="panel"><div class="loader compact">Загружаю сотрудников</div></div>`
    : state.adminError && !state.admin
      ? `<div class="panel"><div class="row-title">Не удалось загрузить админку</div><div class="row-sub">${escapeHtml(state.adminError)}</div></div>`
      : state.admin
        ? renderAdminContent(state.admin)
        : "";

  app.innerHTML = `
    <div class="phone wide admin-phone">
      <section class="screen service-page admin-screen">
        <div class="backrow">
          <button class="iconbtn" aria-label="Назад" data-action="back">${arrowLeftIcon()}</button>
          <h1 class="page-title">${escapeHtml(service.title)}</h1>
        </div>
        ${body}
        <div class="panel admin-tech">
          <span class="grow">
            <span class="row-title">Техническая база</span>
            <span class="row-sub">NocoDB остаётся для ручной проверки таблиц</span>
          </span>
          <a class="ghost" href="https://admin.no-money-no-honey.ru/">Открыть</a>
        </div>
      </section>
    </div>
  `;

  app.querySelector("[data-action='back']").addEventListener("click", ()=>{
    history.pushState(null, "", "/");
    render();
  });

  bindAdminPage();
}

function renderAdminContent(admin){
  return `
    <div class="admin-layout">
      <div class="panel admin-list">
        <div class="admin-list-head">
          <span>
            <span class="row-title">Сотрудники</span>
            <span class="row-sub">${admin.employees.length} в базе</span>
          </span>
          <button class="ghost mini" data-action="admin-new">Добавить</button>
        </div>
        <div class="admin-employees">
          <button class="admin-employee ${state.selectedAdminEmployeeId === "new" ? "on" : ""}" data-admin-employee="new">
            <span class="adm-name">Новый сотрудник</span>
            <span class="adm-meta">PIN и доступы</span>
          </button>
          ${admin.employees.map((employee)=>`
            <button class="admin-employee ${state.selectedAdminEmployeeId === employee.id ? "on" : ""} ${employee.isActive ? "" : "off"}" data-admin-employee="${escapeAttr(employee.id)}">
              <span class="adm-name">${escapeHtml(employee.displayName)}</span>
              <span class="adm-meta">${escapeHtml(employee.roleLabel)} · ${employee.hasPin ? "PIN есть" : "без PIN"}</span>
            </button>
          `).join("")}
        </div>
      </div>
      <div class="panel admin-form-panel">
        ${renderEmployeeForm(admin)}
      </div>
    </div>
  `;
}

function renderEmployeeForm(admin){
  const isNew = state.selectedAdminEmployeeId === "new";
  const employee = isNew
    ? emptyAdminEmployee(admin.services)
    : admin.employees.find((item)=>item.id === state.selectedAdminEmployeeId) || emptyAdminEmployee(admin.services);

  return `
    <form id="employeeForm" class="admin-form">
      <div class="editor-head">
        <span class="grow">
          <span class="row-title">${isNew ? "Добавить сотрудника" : escapeHtml(employee.displayName)}</span>
          <span class="row-sub">${isNew ? "Создание входа в личный кабинет" : "Редактирование карточки и доступов"}</span>
        </span>
        <span class="admin-save-state">${state.adminSaving ? "Сохраняю" : ""}</span>
      </div>

      <div class="admin-fields">
        <label class="field">
          <span>Имя</span>
          <input name="displayName" type="text" value="${escapeAttr(employee.displayName)}" autocomplete="off" required>
        </label>
        <label class="field">
          <span>Роль</span>
          <select name="role">
            ${roleOptions().map((option)=>`<option value="${option.value}" ${employee.role === option.value ? "selected" : ""}>${option.label}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          <span>${isNew ? "PIN" : "Новый PIN"}</span>
          <input name="pin" type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" placeholder="${isNew ? "4 цифры" : "не менять"}" ${isNew ? "required" : ""}>
        </label>
        <label class="checkrow active-toggle">
          <input name="isActive" type="checkbox" ${employee.isActive ? "checked" : ""}>
          <span>Активен</span>
        </label>
      </div>

      <div class="admin-fields schedule-settings">
        <label class="field">
          <span>В графике</span>
          <select name="scheduleRole">
            <option value="" ${!employee.scheduleRole ? "selected" : ""}>Не показывать</option>
            ${scheduleRoleOptions().map((option)=>`<option value="${option.value}" ${employee.scheduleRole === option.value ? "selected" : ""}>${option.label}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          <span>Оплата</span>
          <select name="payModel">
            <option value="" ${!employee.payModel ? "selected" : ""}>Авто</option>
            <option value="hourly" ${employee.payModel === "hourly" ? "selected" : ""}>Почасовая</option>
            <option value="fixed" ${employee.payModel === "fixed" ? "selected" : ""}>Фикс</option>
          </select>
        </label>
        <label class="field">
          <span>Часы</span>
          <input name="defaultHours" type="number" min="0" max="24" step="0.5" value="${employee.defaultHours ?? ""}" placeholder="12">
        </label>
        <label class="field">
          <span>Ставка/час</span>
          <input name="hourlyRate" type="number" min="0" step="1" value="${employee.hourlyRate ?? ""}" placeholder="250">
        </label>
      </div>

      <div class="admin-fields hookah-settings">
        <label class="checkrow active-toggle">
          <input name="isHookahMaster" type="checkbox" ${employee.isHookahMaster ? "checked" : ""}>
          <span>Кальянщик</span>
        </label>
        <label class="field">
          <span>Ставка за кальян</span>
          <input name="hookahRate" type="number" min="0" step="1" value="${employee.hookahRate ?? ""}" placeholder="300">
        </label>
      </div>

      <div class="two">
        <label class="field">
          <span>Дата начала работы</span>
          <input name="startDate" type="date" value="${employee.startDate || ""}">
        </label>
        <label class="field">
          <span>Дата рождения</span>
          <input name="birthDate" type="date" value="${employee.birthDate || ""}">
        </label>
      </div>
      <div class="hint">${employee.startDate ? `Стаж: ${escapeHtml(formatTenure(employee.startDate))}. ` : ""}От даты начала работы зависит и появление в графике — в месяцах до неё сотрудник не показывается.</div>

      <div class="field dismiss-field">
        <span>Увольнение</span>
        <div class="dismiss-row">
          <button type="button" class="ghost danger-action" data-dismiss-toggle ${employee.scheduleUntil ? "hidden" : ""}>Уволить</button>
          <input name="dismissDate" type="date" value="${employee.scheduleUntil ? employee.scheduleUntil.slice(0,10) : ""}" ${employee.scheduleUntil ? "" : "hidden"}>
          <button type="button" class="ghost" data-dismiss-clear ${employee.scheduleUntil ? "" : "hidden"}>Отменить увольнение</button>
        </div>
      </div>
      <div class="hint">Укажи дату увольнения — сотрудник пропадёт из графика со следующего месяца. Прошлые месяцы со сменами сохранятся.</div>

      <div class="access-box">
        <div class="row-title">Доступы</div>
        <div class="row-sub">Раздел виден сотруднику только при включённом доступе</div>
        <div class="access-grid">
          ${admin.services.map((service)=>renderServiceAccess(service, employee)).join("")}
        </div>
      </div>

      ${state.adminError ? `<div class="error admin-form-error">${escapeHtml(state.adminError)}</div>` : ""}

      <div class="admin-actions">
        ${isNew || employee.id === state.user?.id ? "" : `<button class="ghost danger-action" type="button" data-action="admin-delete">Удалить</button>`}
        <button class="ghost brand-action" type="submit">${isNew ? "Создать" : "Сохранить"}</button>
        ${isNew ? "" : `<button class="ghost" type="button" data-action="admin-reset">Сбросить</button>`}
      </div>
    </form>
  `;
}

function renderServiceAccess(service, employee){
  const access = employee.services.find((item)=>item.code === service.code) || { canView:false, canEdit:false };
  return `
    <div class="access-row" data-admin-service="${escapeAttr(service.code)}">
      <div class="access-title">
        <span class="mini-icon" style="color:${(serviceMeta[service.code] || serviceMeta.schedule).accent}">${(serviceMeta[service.code] || serviceMeta.schedule).icon()}</span>
        <span>${escapeHtml(service.title)}</span>
      </div>
      <label><input name="canView" type="checkbox" ${access.canView ? "checked" : ""}> Видит</label>
      <label><input name="canEdit" type="checkbox" ${access.canEdit ? "checked" : ""}> Меняет</label>
    </div>
  `;
}

function bindAdminPage(){
  if(!state.admin) return;

  const newButton = app.querySelector("[data-action='admin-new']");
  if(newButton){
    newButton.addEventListener("click", ()=>{
      state.selectedAdminEmployeeId = "new";
      state.adminError = "";
      render();
    });
  }

  app.querySelectorAll("[data-admin-employee]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      state.selectedAdminEmployeeId = button.dataset.adminEmployee;
      state.adminError = "";
      render();
    });
  });

  const form = app.querySelector("#employeeForm");
  if(form){
    form.addEventListener("submit", (event)=>{
      event.preventDefault();
      saveAdminEmployee();
    });
    // «Уволить» — показать календарь даты увольнения; «Отменить увольнение» — очистить.
    const dismissInput = form.querySelector("input[name='dismissDate']");
    form.querySelector("[data-dismiss-toggle]")?.addEventListener("click", (e)=>{
      e.target.hidden = true;
      if(dismissInput){ dismissInput.hidden = false; dismissInput.focus(); if(dismissInput.showPicker) try{ dismissInput.showPicker(); }catch{} }
    });
    form.querySelector("[data-dismiss-clear]")?.addEventListener("click", (e)=>{
      if(dismissInput) dismissInput.value = "";
      e.target.hidden = true;
      if(dismissInput) dismissInput.hidden = true;
      const toggle = form.querySelector("[data-dismiss-toggle]");
      if(toggle) toggle.hidden = false;
    });
  }

  const reset = app.querySelector("[data-action='admin-reset']");
  if(reset){
    reset.addEventListener("click", render);
  }

  const del = app.querySelector("[data-action='admin-delete']");
  if(del){
    del.addEventListener("click", async ()=>{
      const id = state.selectedAdminEmployeeId;
      const emp = (state.admin?.employees || []).find((item)=>item.id === id);
      const name = emp?.displayName || "сотрудника";
      if(!confirm(`Удалить ${name}? Сотрудник исчезнет из списка. История смен и выплат сохранится.`)) return;
      try{
        await apiDelete(`/api/admin/employees/${encodeURIComponent(id)}`);
        state.selectedAdminEmployeeId = "new";
        state.admin = await apiGet("/api/admin/employees");
        render();
      }catch(error){
        state.adminError = "Не удалось удалить сотрудника";
        render();
      }
    });
  }

  const role = app.querySelector("select[name='role']");
  const scheduleRole = app.querySelector("select[name='scheduleRole']");
  const payModel = app.querySelector("select[name='payModel']");
  if(role && scheduleRole && payModel){
    role.addEventListener("change", ()=>{
      if(role.value === "dishwasher"){
        scheduleRole.value = "dish";
        payModel.value = "fixed";
      }else if(["cook","bar","waiter"].includes(role.value) && !scheduleRole.value){
        scheduleRole.value = role.value;
        payModel.value = "hourly";
      }
    });
  }
}

async function loadAdmin(){
  state.adminLoading = true;
  state.adminError = "";
  render();
  try{
    state.admin = await apiGet("/api/admin/employees");
  }catch(error){
    state.adminError = "Проверь права доступа и соединение";
  }finally{
    state.adminLoading = false;
    render();
  }
}

async function saveAdminEmployee(){
  if(state.adminSaving) return;
  const isNew = state.selectedAdminEmployeeId === "new";
  const body = collectAdminEmployeeForm(isNew);
  if(!body) return;

  state.adminSaving = true;
  state.adminError = "";
  render();
  try{
    const result = isNew
      ? await apiPost("/api/admin/employees", body)
      : await apiPatch(`/api/admin/employees/${encodeURIComponent(state.selectedAdminEmployeeId)}`, body);
    state.selectedAdminEmployeeId = result.id;
    state.admin = await apiGet("/api/admin/employees");
    state.summary = await apiGet("/api/summary");
  }catch(error){
    state.adminError = adminErrorText(error);
  }finally{
    state.adminSaving = false;
    render();
  }
}

function collectAdminEmployeeForm(isNew){
  const form = app.querySelector("#employeeForm");
  if(!form) return null;
  const pin = form.elements.pin.value.trim();
  if(isNew && !/^\d{4}$/.test(pin)){
    state.adminError = "PIN должен быть из 4 цифр";
    render();
    return null;
  }
  if(pin && !/^\d{4}$/.test(pin)){
    state.adminError = "Новый PIN должен быть из 4 цифр";
    render();
    return null;
  }

  const body = {
    displayName: form.elements.displayName.value.trim(),
    role: form.elements.role.value,
    isActive: form.elements.isActive.checked,
    scheduleRole: form.elements.scheduleRole.value || null,
    defaultHours: numberOrNull(form.elements.defaultHours.value),
    hourlyRate: integerOrNull(form.elements.hourlyRate.value),
    payModel: form.elements.payModel.value || null,
    isHookahMaster: form.elements.isHookahMaster.checked,
    hookahRate: integerOrNull(form.elements.hookahRate.value),
    startDate: form.elements.startDate.value || null,
    birthDate: form.elements.birthDate.value || null,
    scheduleUntil: form.elements.dismissDate.value || null,
    services: Array.from(app.querySelectorAll("[data-admin-service]")).map((row)=>{
      const canEdit = row.querySelector("input[name='canEdit']").checked;
      const canView = row.querySelector("input[name='canView']").checked || canEdit;
      return {
        code: row.dataset.adminService,
        canView,
        canEdit
      };
    })
  };
  if(pin) body.pin = pin;
  return body;
}

function emptyAdminEmployee(services){
  return {
    id: "new",
    displayName: "",
    role: "other",
    roleLabel: "Сотрудник",
    isActive: true,
    scheduleRole: "waiter",
    defaultHours: 12,
    hourlyRate: 250,
    payModel: "hourly",
    isHookahMaster: false,
    hookahRate: 300,
    startDate: "",
    birthDate: "",
    scheduleUntil: "",
    hasPin: false,
    services: services.map((service)=>({
      code: service.code,
      title: service.title,
      canView: service.code === "schedule",
      canEdit: false
    }))
  };
}

function roleOptions(){
  return [
    { value:"other", label:"Сотрудник" },
    { value:"waiter", label:"Официант" },
    { value:"bar", label:"Бармен" },
    { value:"cook", label:"Повар" },
    { value:"dishwasher", label:"Мойщица" },
    { value:"manager", label:"Управляющий" },
    { value:"owner", label:"Руководитель" }
  ];
}

function scheduleRoleOptions(){
  return [
    { value:"waiter", label:"Официант" },
    { value:"bar", label:"Бармен" },
    { value:"cook", label:"Повар" },
    { value:"dish", label:"Мойщица" },
    { value:"other", label:"Другое" }
  ];
}

function numberOrNull(value){
  if(value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integerOrNull(value){
  if(value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function adminErrorText(error){
  if(error.code === "pin_exists") return "Такой PIN уже используется";
  if(error.code === "employee_exists") return "Сотрудник с таким именем уже есть";
  if(error.code === "cannot_disable_self") return "Нельзя отключить самого себя";
  if(error.code === "cannot_remove_own_admin") return "Нельзя снять свою админку";
  return error.status === 403 ? "Недостаточно прав" : "Не удалось сохранить";
}

function renderShiftClosingPage(service){
  if(!state.shiftClosingInit && !state.shiftClosingLoading && !state.shiftClosingError){
    loadShiftClosing();
  }

  // Статистика/дашборд закрытий перенесены в раздел «Финансы» (для руководителя).
  const body = state.shiftClosingLoading
    ? `<div class="panel"><div class="loader compact">Загружаю смену</div></div>`
    : state.shiftClosingError && !state.shiftClosingInit
      ? `<div class="panel"><div class="row-title">Не удалось загрузить закрытие смены</div><div class="row-sub">${escapeHtml(state.shiftClosingError)}</div></div>`
      : state.shiftClosingInit && state.shiftClosingForm
        ? renderShiftClosingForm()
        : "";

  app.innerHTML = `
    <div class="phone wide shift-close-phone">
      <section class="screen service-page shift-close-screen">
        <div class="backrow">
          <button class="iconbtn" aria-label="Назад" data-action="back">${arrowLeftIcon()}</button>
          <h1 class="page-title">${escapeHtml(service.title)}</h1>
        </div>
        ${body}
      </section>
    </div>
  `;

  app.querySelector("[data-action='back']").addEventListener("click", ()=>{
    history.pushState(null, "", "/");
    render();
  });

  bindShiftClosingForm();
}

const FIN_SHORT = { food:"Продукты", bar:"Напитки", household:"Хозка", rent:"Аренда", utilities:"Коммуналка", marketing:"Маркетинг", accounting:"Бухгалтерия", software:"Связь/ПО", repair:"Ремонт", other:"Прочее" };

function renderFinancePage(service){
  if(!state.finance && !state.financeLoading && !state.financeError){ loadFinance(); }
  if(!state.shiftDashboard && !state.shiftDashboardLoading){ loadShiftDashboard(); }
  const body = state.financeLoading && !state.finance
    ? `<div class="panel"><div class="loader compact">Загружаю финансы</div></div>`
    : state.financeError && !state.finance
      ? `<div class="panel"><div class="row-title">Не удалось загрузить финансы</div><div class="row-sub">${escapeHtml(state.financeError)}</div></div>`
      : state.finance ? renderFinanceContent(state.finance) : "";
  app.innerHTML = `
    <div class="phone wide shift-close-phone">
      <section class="screen service-page shift-close-screen">
        <div class="backrow">
          <button class="iconbtn" aria-label="Назад" data-action="back">${arrowLeftIcon()}</button>
          <h1 class="page-title">${escapeHtml(service.title)}</h1>
        </div>
        ${body}
        <details class="fin-closings"><summary>Закрытия смен (детально)</summary><div>${renderShiftDashboard()}</div></details>
      </section>
    </div>
  `;
  app.querySelector("[data-action='back']").addEventListener("click", ()=>{
    history.pushState(null, "", "/");
    render();
  });
  bindFinancePage();
  bindShiftDashboard();
}

function renderFinanceContent(f){
  const rev = f.revenue || {};
  return `
    <div class="monthbar">
      <button class="btn icon" data-fin-month="prev">‹</button>
      <div class="mname">${formatScheduleMonth(f.year, f.month)}</div>
      <button class="btn icon" data-fin-month="next">›</button>
    </div>

    <div class="payroll-hero">
      <div>
        <div class="mslabel">Выручка ${rev.isForecast ? "(прогноз месяца)" : "за месяц"}</div>
        <div class="payroll-balance">${formatMoneyPlain(rev.predicted || 0)} ₽</div>
        ${rev.isForecast ? `<div class="fin-sub">факт на сегодня: ${formatMoneyPlain(rev.actualSoFar || 0)} ₽ · ${rev.daysPassed || 0} дн</div>` : ""}
      </div>
      <div class="payroll-next">
        <span>EBITDA</span>
        <b class="${(f.totals.ebitdaPct || 0) >= (f.totals.ebitdaNorm || 0) ? "fin-ok" : "fin-bad"}">${formatMoneyPlain(f.totals.ebitda || 0)} ₽ · ${f.totals.ebitdaPct || 0}%</b>
      </div>
    </div>

    <div class="fin-entry">
      <div class="row-title">Внести расход</div>
      <input id="finAmount" type="number" min="1" step="1" inputmode="numeric" placeholder="сумма, ₽">
      <div class="fin-cats">
        ${(f.expenseArticles || []).map((a)=>`<button type="button" data-fin-cat="${a.key}">${escapeHtml(FIN_SHORT[a.key] || a.label)}</button>`).join("")}
      </div>
      ${state.financeNotice ? `<div class="fin-notice">${escapeHtml(state.financeNotice)}</div>` : ""}
    </div>

    ${(f.recentExpenses || []).length ? `
    <details class="fin-recent">
      <summary>Расходы месяца (${f.recentExpenses.length})</summary>
      <div class="payroll-list">
        ${f.recentExpenses.map((e)=>`
          <div class="payroll-row">
            <span><b>${formatMoneyPlain(e.amount)} ₽</b><small>${escapeHtml(f.articleLabels[e.article] || e.article)} · ${escapeHtml(formatDateHuman(e.date))}${e.comment ? ` · ${escapeHtml(e.comment)}` : ""}</small></span>
            <button class="ghost mini danger-action" type="button" data-fin-del="${escapeAttr(e.id)}">Удалить</button>
          </div>
        `).join("")}
      </div>
    </details>` : ""}
  `;
}

async function loadFinance(month){
  state.financeLoading = true;
  state.financeError = "";
  if(month) state.financeMonth = month;
  render();
  try{
    const url = state.financeMonth ? `/api/finance?month=${encodeURIComponent(state.financeMonth)}` : "/api/finance";
    state.finance = await apiGet(url);
  }catch(error){
    state.financeError = error.status === 403 ? "Раздел только для руководителя" : "Проверь соединение и попробуй ещё раз";
  }finally{
    state.financeLoading = false;
    render();
  }
}

function bindFinancePage(){
  app.querySelectorAll("[data-fin-month]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      const dir = button.dataset.finMonth === "next" ? 1 : -1;
      const base = new Date((state.finance?.year || new Date().getFullYear()), (state.finance?.month || 1) - 1 + dir, 1);
      state.financeNotice = "";
      state.finance = null;
      loadFinance(`${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}`);
    });
  });
  app.querySelectorAll("[data-fin-cat]").forEach((button)=>{
    button.addEventListener("click", ()=>addFinanceExpense(button.dataset.finCat));
  });
  app.querySelectorAll("[data-fin-del]").forEach((button)=>{
    button.addEventListener("click", ()=>deleteFinanceExpense(button.dataset.finDel));
  });
  const fixedForm = app.querySelector("#finFixedForm");
  fixedForm?.addEventListener("submit", (event)=>{ event.preventDefault(); saveFinanceFixed(fixedForm); });
  const fixedDetails = app.querySelector(".fin-fixed");
  fixedDetails?.addEventListener("toggle", ()=>{ state.financeFixedOpen = fixedDetails.open; });
}

async function addFinanceExpense(article){
  const input = app.querySelector("#finAmount");
  const amount = Number(input?.value);
  if(!(amount > 0)){ state.financeNotice = "Сначала введи сумму"; render(); return; }
  try{
    await apiPost("/api/finance/expenses", { article, amount: Math.round(amount) });
    state.financeNotice = `Записано: ${FIN_SHORT[article] || article} · ${formatMoneyPlain(Math.round(amount))} ₽`;
    state.finance = null;
    await loadFinance();
  }catch(error){
    state.financeNotice = "Не удалось записать расход";
    render();
  }
}

async function deleteFinanceExpense(id){
  try{
    await apiDelete(`/api/finance/expenses/${encodeURIComponent(id)}`);
    state.finance = null;
    await loadFinance();
  }catch(error){
    state.financeNotice = "Не удалось удалить";
    render();
  }
}

async function saveFinanceFixed(form){
  const items = (state.finance?.fixed || []).map((x)=>({
    article: x.article,
    amount: Math.round(Number(form.elements[`fix_${x.article}`]?.value) || 0)
  }));
  try{
    await apiPut("/api/finance/fixed", { items });
    state.financeNotice = "Постоянные платежи сохранены";
    state.financeFixedOpen = true;
    state.finance = null;
    await loadFinance();
  }catch(error){
    state.financeNotice = "Не удалось сохранить";
    render();
  }
}

async function loadShiftDashboard(month){
  state.shiftDashboardLoading = true;
  if(month) state.shiftDashboardMonth = month;
  render();
  try{
    const url = state.shiftDashboardMonth
      ? `/api/shift-closing/dashboard?month=${encodeURIComponent(state.shiftDashboardMonth)}`
      : "/api/shift-closing/dashboard";
    const data = await apiGet(url);
    state.shiftDashboard = data;
    state.shiftDashboardMonth = `${data.year}-${String(data.month).padStart(2,"0")}`;
  }catch(error){
    state.shiftDashboard = null;
  }finally{
    state.shiftDashboardLoading = false;
    render();
  }
}

function shiftDashMonthDelta(ym, delta){
  const [y, m] = String(ym).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2,"0")}`;
}

function renderShiftDashboard(){
  if(state.shiftDashboardLoading && !state.shiftDashboard){
    return `<div class="panel"><div class="loader compact">Загружаю сводку</div></div>`;
  }
  const d = state.shiftDashboard;
  if(!d) return "";
  const k = (n)=> `${Math.round(Number(n||0)/1000)}к`;
  const wdNames = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
  const weekdays = (d.weekdayAvg||[]).map((w,i)=>`${wdNames[i]} — ${w.avg ? k(w.avg) : "—"}`).join(" · ");
  const latest = d.latest;
  const goalClass = d.ahead ? "ok" : "warn";
  const goalLabel = d.ahead ? "Опережение плана" : "Нужно доп. в день";
  const goalValue = d.ahead ? `+${formatMoneyPlain(d.balance)} ₽` : `${formatMoneyPlain(d.needPerDay)} ₽`;
  const goalSub = d.ahead
    ? "по итогам прошедших дней"
    : `чтобы догнать план · осталось ${d.remainingDays} дн.`;

  return `
    <section class="dash">
      <div class="monthbar">
        <button class="btn icon" data-dash-month="prev">‹</button>
        <div class="mname">${formatScheduleMonth(d.year, d.month)}</div>
        <button class="btn icon" data-dash-month="next">›</button>
      </div>
      <div class="dash-top">
        <div class="dash-metric"><span>Выручка за месяц</span><b>${formatMoneyPlain(d.monthRevenue)} ₽</b><small>план ${k(d.monthPlan)} · ${d.monthPercent}%</small></div>
        <div class="dash-metric"><span>За день${latest ? " · " + escapeHtml(formatDateShort(latest.date)) : ""}</span><b>${latest ? formatMoneyPlain(latest.revenue) : 0} ₽</b><small>${latest ? `план ${k(latest.plan)} · ${latest.percent}%` : "нет данных"}</small></div>
        <div class="dash-metric ${goalClass}"><span>${goalLabel}</span><b>${goalValue}</b><small>${goalSub}</small></div>
      </div>
      <div class="dash-weekdays"><span class="dash-cap">Средняя по дням недели</span>${weekdays}</div>
      <div class="dash-days">
        ${(d.days||[]).slice().reverse().map((day)=>`
          <div class="dash-day">
            <span class="dd-date">${escapeHtml(formatDateShort(day.date))}</span>
            <span class="dd-rev">${formatMoneyPlain(day.revenue)} ₽ <i class="${day.diff>=0?"up":"down"}">${day.diff>=0?"+":""}${formatMoneyPlain(day.diff)}</i></span>
            <span class="dd-acc">на счёт ${formatMoneyPlain(day.toAccount)} ₽</span>
          </div>
        `).join("") || `<div class="muted-line">Нет закрытых смен за месяц</div>`}
      </div>
    </section>
  `;
}

function bindShiftDashboard(){
  app.querySelectorAll("[data-dash-month]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      const base = state.shiftDashboardMonth;
      if(!base) return;
      loadShiftDashboard(shiftDashMonthDelta(base, button.dataset.dashMonth === "next" ? 1 : -1));
    });
  });
}

function renderShiftClosingForm(){
  const init = state.shiftClosingInit;
  const form = state.shiftClosingForm;
  const preview = computeShiftClosingPreview(form, init);
  const existing = state.shiftClosingRecord;
  const serverShiftDate = init.serverShiftDate || init.workDate;
  const canGoNext = init.workDate < serverShiftDate;
  // Разницу показываем только после ввода фактического остатка (иначе пустое поле даёт ложное расхождение).
  const openingDiff = form.openingCashActual == null ? 0 : Number(preview.openingCashDiff || 0);

  return `
    <form id="shiftClosingForm" class="shift-close-form">
      <header class="shift-close-head">
        <div class="shift-head-main">
          <div class="shift-date-nav">
            <button class="iconbtn small" type="button" data-shift-date="prev" aria-label="Предыдущий день">${arrowLeftIcon()}</button>
            <div class="shift-date-label">
              <span class="shift-date-cap">Смена за</span>
              <span class="shift-date-day">${escapeHtml(formatDateHuman(init.workDate))}</span>
            </div>
            <button class="iconbtn small" type="button" data-shift-date="next" ${canGoNext ? "" : "disabled"} aria-label="Следующий день">${arrowRightIcon()}</button>
          </div>
        </div>
      </header>

      <h2 class="sec">Касса на открытии</h2>
      ${autoRow("Расчётный остаток (со вчера)", preview.openingCashExpected)}
      ${moneyField("openingCashActual", "Фактический остаток (пересчитай кассу)", form.openingCashActual)}
      ${openingDiff !== 0 ? `<div class="shift-cash-alert">Расхождение на открытии: <b>${formatMoneyPlain(openingDiff)} ₽</b> — зафиксировано.</div>` : ""}

      <h2 class="sec">Доходы</h2>
      <div class="two">
        ${moneyField("terminal1", "Терминал 1", form.terminal1)}
        ${moneyField("terminal2", "Терминал 2", form.terminal2)}
      </div>
      <div class="two">
        ${moneyField("netmonet", "Нетмонет", form.netmonet)}
        ${moneyField("yandexFood", "Яндекс.Еда", form.yandexFood)}
      </div>
      ${autoRow("Безнал итого", preview.cashlessTotal)}
      ${moneyField("cashRevenue", "Наличные", form.cashRevenue)}
      <div class="extra-box">
        <div class="extra-head">
          <span class="row-title">Переводы</span>
          <button class="ghost mini" type="button" data-shift-action="add-transfer">Добавить</button>
        </div>
        ${(form.transfers || []).map((line, index)=>`
          <div class="extra-row transfer-row" data-transfer-row="${index}">
            <select class="inp" name="transferEmployeeId" data-transfer-employee="${index}">
              ${(init.transferEmployees || []).map((employee)=>`
                <option value="${escapeAttr(employee.id)}" ${line.employeeId === employee.id ? "selected" : ""}>${escapeHtml(employee.name)}</option>
              `).join("") || `<option value="">Нет сотрудников</option>`}
            </select>
            <input name="transferAmount" type="number" min="0" step="1" value="${line.amount || ""}" placeholder="сумма">
            <button class="ghost mini danger-action" type="button" data-remove-transfer="${index}">×</button>
          </div>
        `).join("") || `<div class="muted-line">Переводов нет</div>`}
      </div>
      ${autoRow("Переводы итого", preview.transferRevenue)}
      ${resultRow("Выручка итого", preview.revenueTotal, "big")}

      <h2 class="sec">Расходы из кассы</h2>
      ${moneyField("washCost", "Мойка", form.washCost)}
      <div class="extra-box">
        <div class="extra-head">
          <span class="row-title">Кальяны</span>
          <button class="ghost mini" type="button" data-shift-action="add-hookah">Добавить</button>
        </div>
        ${(form.hookah || []).map((line, index)=>`
          <div class="extra-row hookah-row" data-hookah-row="${index}">
            <select class="inp" name="hookahEmployeeId" data-hookah-employee="${index}">
              ${(init.hookahEmployees || []).length ? (init.hookahEmployees || []).map((employee)=>`
                <option value="${escapeAttr(employee.id)}" ${line.employeeId === employee.id ? "selected" : ""}>${escapeHtml(employee.name)} · ${formatMoneyPlain(employee.rate)} ₽</option>
              `).join("") : `<option value="">Нет активных кальянщиков</option>`}
            </select>
            <input name="hookahCount" type="number" min="0" step="1" value="${line.count || ""}" placeholder="шт">
            <button class="ghost mini danger-action" type="button" data-remove-hookah="${index}">×</button>
          </div>
        `).join("") || `<div class="muted-line">Кальянов нет</div>`}
      </div>
      ${autoRow("Выпл. кальяны итого", preview.hookahPayout)}
      <div class="extra-box">
        <div class="extra-head">
          <span class="row-title">Доп. расходы</span>
          <button class="ghost mini" type="button" data-shift-action="add-expense">Добавить</button>
        </div>
        ${form.extraExpenses.map((expense, index)=>`
          <div class="extra-row" data-expense-row="${index}">
            <input name="extraAmount" type="number" min="0" step="1" value="${expense.amount || ""}" placeholder="сумма">
            <input name="extraComment" type="text" value="${escapeAttr(expense.comment || "")}" placeholder="комментарий">
            <button class="ghost mini danger-action" type="button" data-remove-expense="${index}">×</button>
          </div>
        `).join("") || `<div class="muted-line">Дополнительных расходов нет</div>`}
      </div>
      ${autoRow("Доп. расходы итого", preview.extraExpensesTotal)}

      <h2 class="sec">Прочее</h2>
      ${moneyField("taxiAmount", "Такси", form.taxiAmount)}
      <div class="hint">Если такси оплачивается наличными, оставьте 0, а сумму внесите в «Дополнительные расходы».</div>

      <h2 class="sec">Инкассация</h2>
      ${moneyField("collectionAmount", "Изъято из кассы", form.collectionAmount)}

      <h2 class="sec">Касса на закрытии</h2>
      ${moneyField("closingCashActual", "Фактический остаток (пересчитай кассу)", form.closingCashActual)}
      ${autoRow("Расчётный остаток", preview.closingCashExpected)}
      ${form.closingCashActual == null ? "" : resultRow("Разница", preview.closingCashDiff, preview.closingCashDiff === 0 ? "ok" : "warn", preview.closingCashDiff === 0 ? "" : (preview.closingCashDiff < 0 ? "недосдача" : "излишек"))}

      <h2 class="sec">Фото чеков</h2>
      <div class="photo-grid">
        ${photoInput("terminal_1", "Терминал 1")}
        ${photoInput("terminal_2", "Терминал 2")}
        ${photoInput("shift_close", "Закрытие смены")}
        ${photoInput("other", "Другое")}
      </div>
      ${existing?.photos?.length ? `<div class="hint">Загружено фото: ${existing.photos.length}</div>` : ""}

      <h2 class="sec">Комментарий</h2>
      <label class="field">
        <textarea name="comment" class="inp ta" placeholder="Комментарий к смене">${escapeHtml(form.comment || "")}</textarea>
      </label>

      ${state.shiftClosingError ? `<div class="error shift-error">${escapeHtml(state.shiftClosingError)}</div>` : ""}
      ${state.shiftClosingNotice ? `<div class="shift-notice">${escapeHtml(state.shiftClosingNotice)}</div>` : ""}

      <div class="shift-footer">
        <button class="btn brand-action" type="submit">Отправить отчёт</button>
      </div>
    </form>
  `;
}

function moneyField(name, label, value){
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input class="inp" name="${name}" data-shift-money="${name}" type="number" inputmode="numeric" min="0" step="1" placeholder="0" value="${value == null ? "" : Number(value)}">
    </label>
  `;
}

function autoField(label, value){
  return `
    <div class="field">
      <span>${escapeHtml(label)}</span>
      <div class="inp auto-inp">${formatMoneyPlain(value)} ₽</div>
    </div>
  `;
}

function autoRow(label, value){
  return `
    <div class="auto">
      <span class="l">${escapeHtml(label)}</span>
      <span class="badge">авто</span>
      <span class="v">${formatMoneyPlain(value)} ₽</span>
    </div>
  `;
}

function resultRow(label, value, variant = "", sub = ""){
  return `
    <div class="result ${variant}">
      <div class="l">${escapeHtml(label)}${sub ? `<span class="sub">${escapeHtml(sub)}</span>` : ""}</div>
      <div class="v">${formatMoneyPlain(value)} ₽</div>
    </div>
  `;
}

function photoInput(type, label){
  const selected = state.shiftClosingPhotos[type];
  return `
    <label class="photo-input">
      <span>${escapeHtml(label)}</span>
      <input type="file" accept="image/*" data-photo-type="${type}">
      <b>${selected ? escapeHtml(selected.filename) : "Выбрать фото"}</b>
    </label>
  `;
}

function bindShiftClosingForm(){
  const form = app.querySelector("#shiftClosingForm");
  if(!form || !state.shiftClosingForm) return;

  form.addEventListener("submit", (event)=>{
    event.preventDefault();
    submitShiftClosing();
  });

  app.querySelectorAll("[data-shift-date]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      const base = state.shiftClosingInit?.workDate;
      if(!base) return;
      const delta = button.dataset.shiftDate === "next" ? 1 : -1;
      loadShiftClosing(shiftDateByDelta(base, delta));
    });
  });

  app.querySelectorAll("[data-shift-money]").forEach((input)=>{
    input.addEventListener("input", ()=>{
      state.shiftClosingForm[input.name] = integerOrNull(input.value);
    });
    input.addEventListener("change", ()=>{
      collectShiftClosingForm();
      render();
    });
  });

  app.querySelector("[data-shift-action='add-hookah']")?.addEventListener("click", ()=>{
    collectShiftClosingForm();
    const def = (state.shiftClosingInit?.hookahEmployees || [])[0];
    state.shiftClosingForm.hookah.push({ employeeId: def?.id || "", count: 0 });
    render();
  });

  app.querySelectorAll("[data-remove-hookah]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      collectShiftClosingForm();
      state.shiftClosingForm.hookah.splice(Number(button.dataset.removeHookah), 1);
      render();
    });
  });

  app.querySelectorAll("[data-hookah-row] select[name='hookahEmployeeId'], [data-hookah-row] input[name='hookahCount']").forEach((input)=>{
    input.addEventListener("change", ()=>{
      collectShiftClosingForm();
      render();
    });
  });

  app.querySelector("[data-shift-action='add-transfer']")?.addEventListener("click", ()=>{
    collectShiftClosingForm();
    const def = (state.shiftClosingInit?.transferEmployees || [])[0];
    state.shiftClosingForm.transfers.push({ employeeId: def?.id || "", amount: 0 });
    render();
  });

  app.querySelectorAll("[data-remove-transfer]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      collectShiftClosingForm();
      state.shiftClosingForm.transfers.splice(Number(button.dataset.removeTransfer), 1);
      render();
    });
  });

  app.querySelectorAll("[data-transfer-row] select, [data-transfer-row] input").forEach((input)=>{
    input.addEventListener("change", ()=>{
      collectShiftClosingForm();
      render();
    });
  });

  app.querySelector("[data-shift-action='add-expense']")?.addEventListener("click", ()=>{
    collectShiftClosingForm();
    state.shiftClosingForm.extraExpenses.push({ amount:0, comment:"" });
    render();
  });

  app.querySelectorAll("[data-remove-expense]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      collectShiftClosingForm();
      state.shiftClosingForm.extraExpenses.splice(Number(button.dataset.removeExpense), 1);
      render();
    });
  });

  app.querySelectorAll("[data-photo-type]").forEach((input)=>{
    input.addEventListener("change", ()=>handleShiftPhoto(input));
  });

  app.querySelector("[data-shift-action='send-telegram']")?.addEventListener("click", resendShiftTelegram);
}

function shiftInitUrl(date){
  return date ? `/api/shift-closing/init?date=${encodeURIComponent(date)}` : "/api/shift-closing/init";
}

function shiftDateByDelta(dateStr, delta){
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function moscowNow(){
  const parts = new Intl.DateTimeFormat("ru-RU", { timeZone:"Europe/Moscow", hour:"2-digit", minute:"2-digit", hour12:false }).formatToParts(new Date());
  const hh = parts.find((p)=>p.type === "hour")?.value || "00";
  const mm = parts.find((p)=>p.type === "minute")?.value || "00";
  return { hh, mm, hour: Number(hh) };
}

async function loadShiftClosing(date){
  state.shiftClosingLoading = true;
  state.shiftClosingError = "";
  state.shiftClosingNotice = "";
  if(date !== undefined) state.shiftClosingDate = date;
  render();
  try{
    const init = await apiGet(shiftInitUrl(state.shiftClosingDate));
    state.shiftClosingInit = init;
    // Пустая форма при перелистывании дат: ранее внесённые значения НЕ показываем (privacy).
    state.shiftClosingRecord = null;
    state.shiftClosingForm = shiftClosingFormFrom(init, null);
    state.shiftClosingPhotos = {};
  }catch(error){
    state.shiftClosingError = error.status === 403 ? "Нет доступа к закрытию смены" : "Проверь соединение и попробуй ещё раз";
  }finally{
    state.shiftClosingLoading = false;
    render();
  }
}

function shiftClosingFormFrom(init, record){
  const values = record?.values || {};
  // Денежные поля стартуют пустыми (null), чтобы сотрудник заполнил каждое вручную — даже если там 0.
  // При редактировании ранее сохранённого отчёта показываем фактические значения (в т.ч. 0).
  const money = (key)=> record ? (values[key] ?? 0) : null;
  return {
    workDate: record?.workDate || init.workDate,
    openingCashActual: money("openingCashActual"),
    terminal1: money("terminal1"),
    terminal2: money("terminal2"),
    netmonet: money("netmonet"),
    yandexFood: money("yandexFood"),
    cashRevenue: money("cashRevenue"),
    washCost: money("washCost"),
    hookah: (record?.hookah || []).map((line)=>({ employeeId: line.employeeId, count: line.count || 0 })),
    transfers: (record?.transfers || []).map((line)=>({ employeeId: line.employeeId, amount: line.amount || 0 })),
    taxiAmount: money("taxiAmount"),
    collectionAmount: money("collectionAmount"),
    closingCashActual: money("closingCashActual"),
    extraExpenses: (record?.extraExpenses || []).map((expense)=>({
      amount: expense.amount || 0,
      comment: expense.comment || ""
    })),
    comment: values.comment || ""
  };
}

function collectShiftClosingForm(){
  const form = app.querySelector("#shiftClosingForm");
  if(!form || !state.shiftClosingForm) return state.shiftClosingForm;

  const next = { ...state.shiftClosingForm };
  ["openingCashActual","terminal1","terminal2","netmonet","yandexFood","cashRevenue","washCost","taxiAmount","collectionAmount","closingCashActual"].forEach((field)=>{
    next[field] = integerOrNull(form.elements[field]?.value);
  });
  next.comment = form.elements.comment?.value || "";
  next.extraExpenses = Array.from(app.querySelectorAll("[data-expense-row]")).map((row)=>({
    amount: integerOrNull(row.querySelector("input[name='extraAmount']")?.value) || 0,
    comment: row.querySelector("input[name='extraComment']")?.value || ""
  })).filter((expense)=>expense.amount > 0 || expense.comment.trim());
  next.hookah = Array.from(app.querySelectorAll("[data-hookah-row]")).map((row)=>({
    employeeId: row.querySelector("select[name='hookahEmployeeId']")?.value || "",
    count: integerOrNull(row.querySelector("input[name='hookahCount']")?.value) || 0
  }));
  next.transfers = Array.from(app.querySelectorAll("[data-transfer-row]")).map((row)=>({
    employeeId: row.querySelector("select[name='transferEmployeeId']")?.value || "",
    amount: integerOrNull(row.querySelector("input[name='transferAmount']")?.value) || 0
  }));
  state.shiftClosingForm = next;
  return next;
}

function computeShiftClosingPreview(form, init){
  const extraExpensesTotal = (form.extraExpenses || []).reduce((sum, expense)=>sum + Number(expense.amount || 0), 0);
  const hookahRateById = new Map((init.hookahEmployees || []).map((employee)=>[employee.id, Number(employee.rate || 0)]));
  const hookahCount = (form.hookah || []).reduce((sum, line)=>sum + Number(line.count || 0), 0);
  const hookahPayout = (form.hookah || []).reduce((sum, line)=>sum + Number(line.count || 0) * (hookahRateById.get(line.employeeId) || 0), 0);
  const transferRevenue = (form.transfers || []).reduce((sum, line)=>sum + Number(line.amount || 0), 0);
  const cashlessTotal = Number(form.terminal1 || 0) + Number(form.terminal2 || 0) + Number(form.netmonet || 0) + Number(form.yandexFood || 0);
  const revenueTotal = cashlessTotal + Number(form.cashRevenue || 0) + transferRevenue;
  const closingCashExpected =
    Number(form.openingCashActual || 0)
    + Number(form.cashRevenue || 0)
    - Number(form.washCost || 0)
    - hookahPayout
    - extraExpensesTotal
    - Number(form.collectionAmount || 0);
  const revenuePlan = Number(init.revenuePlan || 0);
  return {
    openingCashExpected: Number(init.openingCashExpected || 0),
    openingCashDiff: Number(form.openingCashActual || 0) - Number(init.openingCashExpected || 0),
    hookahCount,
    transferRevenue,
    cashlessTotal,
    revenueTotal,
    hookahPayout,
    extraExpensesTotal,
    closingCashExpected,
    closingCashDiff: Number(form.closingCashActual || 0) - closingCashExpected,
    revenuePlan,
    revenuePlanPercent: revenuePlan > 0 ? (revenueTotal / revenuePlan) * 100 : 0
  };
}

async function handleShiftPhoto(input){
  const file = input.files?.[0];
  if(!file) return;
  const dataUrl = await readFileAsDataUrl(file);
  state.shiftClosingPhotos[input.dataset.photoType] = {
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    dataUrl
  };
  render();
}

function readFileAsDataUrl(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>resolve(String(reader.result || ""));
    reader.onerror = ()=>reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const REQUIRED_SHIFT_FIELDS = [
  ["openingCashActual", "Остаток на открытии"],
  ["terminal1", "Терминал 1"],
  ["terminal2", "Терминал 2"],
  ["netmonet", "Нетмонет"],
  ["yandexFood", "Яндекс.Еда"],
  ["cashRevenue", "Наличные"],
  ["washCost", "Мойка"],
  ["taxiAmount", "Такси"],
  ["collectionAmount", "Инкассация"],
  ["closingCashActual", "Остаток на закрытии"]
];

function firstMissingShiftField(){
  const formEl = app.querySelector("#shiftClosingForm");
  if(!formEl) return null;
  for(const [name, label] of REQUIRED_SHIFT_FIELDS){
    const input = formEl.elements[name];
    if(!input || String(input.value).trim() === "") return { name, label };
  }
  return null;
}

async function submitShiftClosing(){
  if(state.shiftClosingSaving) return;

  const missing = firstMissingShiftField();
  if(missing){
    collectShiftClosingForm();
    state.shiftClosingNotice = "";
    state.shiftClosingError = `Заполните обязательное поле «${missing.label}» (можно 0)`;
    render();
    const input = app.querySelector(`#shiftClosingForm [name='${missing.name}']`);
    if(input){ input.classList.add("field-invalid"); input.scrollIntoView({ behavior:"smooth", block:"center" }); }
    return;
  }

  const form = collectShiftClosingForm();
  state.shiftClosingSaving = true;
  state.shiftClosingError = "";
  state.shiftClosingNotice = "";
  render();
  try{
    const payload = shiftClosingPayload(form);
    const record = await apiPost("/api/shift-closing", payload);
    await uploadShiftPhotos(record.id);
    // Фото загружены — теперь шлём отчёты в Telegram (руководителю с фото + команде).
    try{ await apiPost(`/api/shift-closing/${encodeURIComponent(record.id)}/send-telegram-report`, { audience:"both" }); }catch(e){ /* отчёт не критичен для закрытия */ }
    // Отчёт отправлен — снова пустая форма (значения не показываем).
    state.shiftClosingInit = await apiGet(shiftInitUrl(state.shiftClosingDate));
    state.shiftClosingRecord = null;
    state.shiftClosingForm = shiftClosingFormFrom(state.shiftClosingInit, null);
    state.shiftClosingPhotos = {};
    state.shiftClosingNotice = "Отчёт отправлен";
  }catch(error){
    state.shiftClosingError = error.code === "shift_already_closed" ? "Отчёт за эту дату уже отправлен" : "Не удалось отправить отчёт";
  }finally{
    state.shiftClosingSaving = false;
    render();
  }
}

function shiftClosingPayload(form){
  return {
    workDate: form.workDate,
    hookah: (form.hookah || [])
      .map((line)=>({ employeeId: line.employeeId, count: Number(line.count || 0) }))
      .filter((line)=>line.employeeId && line.count > 0),
    openingCashActual: Number(form.openingCashActual || 0),
    terminal1: Number(form.terminal1 || 0),
    terminal2: Number(form.terminal2 || 0),
    netmonet: Number(form.netmonet || 0),
    yandexFood: Number(form.yandexFood || 0),
    cashRevenue: Number(form.cashRevenue || 0),
    transfers: (form.transfers || [])
      .map((line)=>({ employeeId: line.employeeId, amount: Number(line.amount || 0) }))
      .filter((line)=>line.employeeId && line.amount > 0),
    washCost: Number(form.washCost || 0),
    taxiAmount: Number(form.taxiAmount || 0),
    collectionAmount: Number(form.collectionAmount || 0),
    closingCashActual: Number(form.closingCashActual || 0),
    extraExpenses: (form.extraExpenses || []).map((expense)=>({
      amount: Number(expense.amount || 0),
      comment: expense.comment || ""
    })),
    comment: form.comment || ""
  };
}

async function uploadShiftPhotos(shiftClosingId){
  const entries = Object.entries(state.shiftClosingPhotos || {});
  for(const [photoType, photo] of entries){
    await apiPost(`/api/shift-closing/${encodeURIComponent(shiftClosingId)}/photos`, {
      photoType,
      filename: photo.filename,
      mimeType: photo.mimeType,
      dataUrl: photo.dataUrl
    });
  }
}

async function resendShiftTelegram(){
  if(!state.shiftClosingRecord?.id || state.shiftClosingSaving) return;
  state.shiftClosingSaving = true;
  state.shiftClosingError = "";
  render();
  try{
    await apiPost(`/api/shift-closing/${encodeURIComponent(state.shiftClosingRecord.id)}/send-telegram-report`, { audience:"both" });
    state.shiftClosingRecord = await apiGet(`/api/shift-closing/${encodeURIComponent(state.shiftClosingRecord.id)}`);
  }catch(error){
    state.shiftClosingError = "Не удалось отправить Telegram";
  }finally{
    state.shiftClosingSaving = false;
    render();
  }
}

function renderSchedulePage(service){
  const today = new Date();
  const year = state.schedule?.year || today.getFullYear();
  const month = state.schedule?.month || today.getMonth() + 1;

  if(!state.schedule && !state.scheduleLoading && !state.scheduleError){
    loadSchedule(year, month);
  }

  const body = state.scheduleLoading
    ? `<div class="panel"><div class="loader compact">Загружаю график</div></div>`
    : state.scheduleError
      ? `<div class="panel"><div class="row-title">Не удалось загрузить график</div><div class="row-sub">${escapeHtml(state.scheduleError)}</div></div>`
      : state.schedule
        ? renderScheduleContent(state.schedule)
        : `<div class="panel"><div class="row-title">График пока пустой</div><div class="row-sub">Импортируй JSON-бэкап старого календаря</div></div>`;

  const importBox = renderScheduleImport(service);
  const editUnlocked = isScheduleEditingUnlocked(service);

  app.innerHTML = `
    <div class="phone wide schedule-phone">
      <section class="screen service-page schedule-screen ${editUnlocked ? "edit-unlocked" : "edit-locked"}">
        <div class="backrow">
          <button class="iconbtn" aria-label="Назад" data-action="back">${arrowLeftIcon()}</button>
          <h1 class="page-title">${escapeHtml(service.title)}</h1>
          ${renderScheduleLockControl(service)}
        </div>
        ${renderScheduleEditor(service)}
        ${renderScheduleDateEditor(service)}
        ${renderRosterEditor(service)}
        ${renderEventPopup()}
        ${renderMyHoursEditor()}
        ${state.scheduleSaveError ? `<div class="panel save-error">${escapeHtml(state.scheduleSaveError)}</div>` : ""}
        ${body}
        ${importBox}
      </section>
    </div>
  `;

  app.querySelector("[data-action='back']").addEventListener("click", ()=>{
    state.scheduleEditUnlocked = false;
    history.pushState(null, "", "/");
    render();
  });

  app.querySelector("[data-schedule-lock]")?.addEventListener("click", ()=>{
    state.scheduleEditUnlocked = !state.scheduleEditUnlocked;
    state.selectedScheduleCell = null;
    state.selectedScheduleDate = null;
    state.selectedMyHoursDate = null;
    state.selectedRosterEmployeeId = null;
    render();
  });

  const fileInput = app.querySelector("#scheduleImportFile");
  if(fileInput){
    fileInput.addEventListener("change", handleScheduleImport);
  }

  bindScheduleCells(service);
  bindScheduleDates(service);

  app.querySelectorAll("[data-month-action]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      const direction = button.dataset.monthAction === "next" ? 1 : -1;
      const base = new Date((state.schedule?.year || year), (state.schedule?.month || month) - 1 + direction, 1);
      state.selectedScheduleCell = null;
      state.selectedScheduleDate = null;
      state.selectedMyHoursDate = null;
      state.selectedRosterEmployeeId = null;
      state.selectedEventDate = null;
      state.schedule = null;
      loadSchedule(base.getFullYear(), base.getMonth() + 1);
    });
  });

  bindScheduleEditor();
  bindScheduleDateEditor();
  bindRosterEditor();
  bindEventPopup();
  bindMyHoursEditor();

  // Клик по имени сотрудника в шапке (замок открыт) — ставка/состав на месяц.
  app.querySelectorAll("[data-emp-header]").forEach((th)=>{
    th.addEventListener("click", ()=>{
      state.selectedRosterEmployeeId = th.dataset.empHeader;
      state.selectedScheduleCell = null;
      state.selectedScheduleDate = null;
      state.selectedMyHoursDate = null;
      state.scheduleSaveError = "";
      render();
    });
  });
}

function renderScheduleImport(service){
  if(!isScheduleEditingUnlocked(service)) return "";
  return `
    <details class="import-panel">
      <summary>
        <span class="mini-icon">${uploadIcon()}</span>
        <span>Импорт JSON</span>
      </summary>
      <div class="import-body">
        <span class="row-sub">Запасная функция для старого JSON-бэкапа</span>
        <label class="ghost file-btn">
          Выбрать файл
          <input id="scheduleImportFile" type="file" accept="application/json,.json">
        </label>
        ${state.importResult ? `<div class="import-result">${escapeHtml(state.importResult)}</div>` : ""}
      </div>
    </details>
  `;
}

function renderScheduleLockControl(service){
  if(!service.can_edit) return "";
  const unlocked = isScheduleEditingUnlocked(service);
  return `
    <button class="ghost mini schedule-lock-btn ${unlocked ? "unlocked" : ""}" type="button" data-schedule-lock="1">
      ${unlocked ? "Заблокировать" : "Разблокировать"}
    </button>
  `;
}

function isScheduleEditingUnlocked(service){
  return Boolean(service?.can_edit && state.scheduleEditUnlocked);
}

function renderScheduleContent(schedule){
  const monthTitle = formatScheduleMonth(schedule.year, schedule.month);
  const totals = buildScheduleTotals(schedule);
  return `
    <div class="monthbar">
      <button class="btn icon" data-month-action="prev">‹</button>
      <div class="mname">${monthTitle}</div>
      <button class="btn icon" data-month-action="next">›</button>
    </div>
    ${schedule.canSeeMoney ? renderMoneySummary(schedule, totals) : ""}
    ${state.scheduleEditUnlocked
      ? `<div class="hint hint-block-sm">Клик по ячейке — поставить/снять смену. Двойной клик — задать нестандартные часы. Клик по дате — выплаты и оценки.</div>`
      : (hasOwnEditableShift(schedule) ? `<div class="hint hint-block-sm">Нажми на свою смену, чтобы уточнить отработанные часы (если ушёл раньше).</div>` : "")}
    ${schedule.employees.length ? renderScheduleTable(schedule) : renderEmptySchedule()}
    ${schedule.canSeeMoney ? `
      <h2 class="sec">Итоги за месяц</h2>
      ${renderRoleTotals(schedule, totals)}
      <div class="cards">
        ${renderSummaryCards(schedule, totals)}
      </div>
    ` : ""}
  `;
}

// Есть ли у текущего сотрудника хотя бы одна своя почасовая смена в прошлом/сегодня (для подсказки).
function hasOwnEditableShift(schedule){
  const uid = state.user?.id;
  if(!uid) return false;
  const today = todayIsoDate();
  return (schedule.days || []).some((day)=>{
    if(day.date > today) return false;
    const shift = day.shifts?.[uid];
    if(!shift) return false;
    const employee = schedule.employees.find((e)=>e.id === uid);
    return !isFixedShift(employee, shift);
  });
}

function renderEmptySchedule(){
  return `
    <div class="panel">
      <div class="row-title">В базе ещё нет смен</div>
      <div class="row-sub">После импорта здесь появится месячный график</div>
    </div>
  `;
}

function renderScheduleTable(schedule){
  const totals = buildScheduleTotals(schedule);
  return `
    <div class="gridwrap">
      <table class="schedule-grid">
        <thead>
          <tr>
            <th class="colDate"><div class="dcell"><div class="dwd">дата</div></div></th>
            ${schedule.employees.map(renderEmployeeHeader).join("")}
            <th class="colSum"><div class="dcell"><div class="dwd">Σ</div></div></th>
            ${schedule.canSeeMoney ? `<th class="colMoney"><div class="dcell"><div class="dwd">ФОТ</div></div></th><th class="colPlan"><div class="dcell"><div class="dwd">План</div></div></th>` : ""}
          </tr>
        </thead>
        <tbody>
          ${schedule.days.map((day)=>renderScheduleDay(day, schedule.employees, schedule.canSeeMoney)).join("")}
        </tbody>
        ${schedule.canSeeMoney ? `<tfoot>${renderScheduleFooter(schedule, totals)}</tfoot>` : ""}
      </table>
    </div>
  `;
}

function renderScheduleDay(day, employees, canSeeMoney){
  const date = new Date(`${day.date}T00:00:00`);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const today = new Date();
  const isToday = date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
  return `
    <tr class="${isWeekend ? "we" : ""} ${isToday ? "today" : ""}">
      <td class="colDate markDate${day.eventTitle ? " hasEvent" : ""}" data-schedule-date="${escapeAttr(day.date)}"${day.eventTitle ? ` title="${escapeAttr(day.eventTitle)}"` : ""}>
        <div class="dcell">
          <span class="dnum">${date.getDate()}</span>
          <span class="dwd">${weekdayShort(date)}</span>
          ${day.isDeadline ? `<div class="dmarks"><span class="markIcon star" title="Дедлайн">☆</span></div>` : ""}
        </div>
      </td>
      ${employees.map((employee)=>renderShiftCell(day, employee, canSeeMoney)).join("")}
      <td class="colSum"><span class="cv">${day.coverage || ""}</span></td>
      ${canSeeMoney ? `<td class="colMoney"><span class="mv">${day.fot ? formatMoneyPlain(day.fot) : ""}</span></td><td class="colPlan"><span class="pv">${day.fot ? escapeHtml(day.revenuePlan) : ""}</span></td>` : ""}
    </tr>
  `;
}

function renderShiftCell(day, employee, canSeeMoney){
  const shift = day.shifts[employee.id];
  const hasPayday = day.plannedPayEmployeeIds.includes(employee.id);
  const hasPayout = day.payouts.some((payout)=>payout.employee_id === employee.id || payout.employeeId === employee.id);
  const score = day.scores.find((item)=>item.employee_id === employee.id || item.employeeId === employee.id)?.score;
  const classes = [
    "cell",
    shift ? "on" : "",
    hasPayday ? "payday" : "",
    hasPayout && shift ? "payout" : "",
    hasPayout && !shift ? "payoutEmpty" : ""
  ].filter(Boolean).join(" ");

  const isEvent = shift?.payModel === "event";
  const label = !shift
    ? ""
    : isEvent
      ? "К"
      : isFixedShift(employee, shift)
        ? !canSeeMoney || shift.payAmount == null ? "✓" : compactCellMoney(shift.payAmount)
        : shift.hours == null ? "•" : formatHours(shift.hours);
  const dayPart = isEvent ? null : shift?.dayPart;
  const dpClass = dayPart === "morning" ? " dp-morning" : dayPart === "evening" ? " dp-evening" : "";
  const dpTitle = isEvent
    ? (day.eventTitle ? `Корпоратив: ${day.eventTitle}` : "Корпоратив")
    : dayPart === "morning" ? "Утренняя смена" : dayPart === "evening" ? "Вечерняя смена" : "";
  const valueClass = (isEvent ? "h ev" : isFixedShift(employee, shift) ? "h fx" : "h") + dpClass;
  const isBirthday = employee.birthDate && day.date.slice(5) === employee.birthDate.slice(5);
  let bdayAge = null;
  if(isBirthday && employee.birthDate.length >= 4){
    const a = Number(day.date.slice(0,4)) - Number(employee.birthDate.slice(0,4));
    if(a > 0 && a < 100) bdayAge = a;
  }
  const bdayTitle = isBirthday
    ? `День рождения · ${employee.name}${bdayAge!=null ? ` · исполнится ${bdayAge} ${pluralize(bdayAge,"год","года","лет")}` : ""}`
    : "";

  return `
    <td class="${classes}${isBirthday ? " bday" : ""}" data-schedule-cell="1" data-date="${escapeAttr(day.date)}" data-employee="${escapeAttr(employee.id)}">
      <span class="${valueClass}"${dpTitle ? ` title="${escapeAttr(dpTitle)}"` : ""} style="${shift && !isEvent ? `background:${roleColor(shift.roleOverride || employee.role)}` : ""}">${label}</span>
      ${isBirthday ? `<span class="bday-mark" title="${escapeAttr(bdayTitle)}">ДР${bdayAge!=null ? `<i>${bdayAge}</i>` : ""}</span>` : ""}
      ${renderScoreDots(score)}
    </td>
  `;
}

function renderEmployeeHeader(employee){
  const editable = state.scheduleEditUnlocked;
  return `
    <th class="emp${editable ? " emp-editable" : ""}" title="${escapeAttr(employee.name)}"${editable ? ` data-emp-header="${escapeAttr(employee.id)}"` : ""}>
      <div class="nm">${escapeHtml(shortScheduleName(employee.name))}</div>
      <div class="bar" style="background:${roleColor(employee.role)}"></div>
    </th>
  `;
}

function renderScheduleFooter(schedule, totals){
  return `
    <tr>
      <td class="colDate"><div class="dcell">ИТОГО</div></td>
      ${schedule.employees.map((employee)=>{
        const total = totals.byEmployee.get(employee.id) || emptyEmployeeTotal();
        const second = isFixedPayEmployee(employee) ? "смен" : `${formatHours(total.hours)}ч`;
        return `
          <td class="tt">
            <div class="sh" style="color:${roleColor(employee.role)}">${total.shifts || ""}</div>
            <div class="hr">${second}</div>
            ${total.remaining != null ? `<div class="pay">${formatMoneyPlain(total.remaining)}</div>` : ""}
          </td>
        `;
      }).join("")}
      <td class="colSum"></td>
      ${schedule.canSeeMoney ? `
        <td class="colMoney tt">
          <div class="sh" style="color:var(--brand)">${formatMoneyPlain(schedule.summary.totalFot)}</div>
          <div class="hr">ФОТ</div>
          <div class="paid">выд ${formatMoneyPlain(schedule.summary.totalPaid)}</div>
          <div class="rest">ост ${formatMoneyPlain(schedule.summary.totalRemaining)}</div>
        </td>
        <td class="colPlan tt">
          <div class="sh">${escapeHtml(schedule.summary.revenuePlan || "0")}</div>
          <div class="hr">план</div>
        </td>
      ` : ""}
    </tr>
  `;
}

function renderMoneySummary(schedule){
  return `
    <div class="moneySummary">
      <div class="msmain">
        <div class="mslabel">ФОТ за месяц</div>
        <div class="msbig">${formatMoneyPlain(schedule.summary.totalFot)} ₽</div>
      </div>
      <div class="msrow">
        <span>Дней с сменами: <b>${schedule.summary.workingDays || 0}</b></span>
        <span>План выручки при ФОТ 23-28%: <b>${escapeHtml(schedule.summary.revenuePlan || "0")}</b></span>
        <span>Выдано: <b>${formatMoneyPlain(schedule.summary.totalPaid)} ₽</b></span>
        <span>Остаток: <b>${formatMoneyPlain(schedule.summary.totalRemaining)} ₽</b></span>
      </div>
    </div>
  `;
}

function renderRoleTotals(schedule, totals){
  const items = Array.from(totals.byRole.entries())
    .filter(([, total])=>total.shifts > 0)
    .map(([role, total])=>{
      const hours = role === "dish" || role === "dishwasher" ? "" : ` · ${formatHours(total.hours)}ч`;
      const money = schedule.canSeeMoney ? ` · ${formatMoneyPlain(total.pay)} ₽` : "";
      return `
        <span class="rt">
          <span class="dot" style="background:${roleColor(role)}"></span>
          ${escapeHtml(rolePlural(role))}: <b>${total.shifts}</b> смен${hours}${money}
        </span>
      `;
    })
    .join("");
  return `<div class="roleTotals">${items}</div>`;
}

function renderSummaryCards(schedule, totals){
  return schedule.employees
    .filter((employee)=>schedule.canSeeMoney || employee.id === state.user?.id)
    .map((employee)=>{
      const total = totals.byEmployee.get(employee.id) || emptyEmployeeTotal();
      const showMoney = total.remaining != null;
      return `
        <div class="scard" style="border-left-color:${roleColor(employee.role)}">
          <div class="nm">${escapeHtml(employee.name)}</div>
          <div class="rl">${escapeHtml(employee.roleLabel)}</div>
          <div class="nums">
            <div><span class="big" style="color:${roleColor(employee.role)}">${total.shifts}</span><span class="unit">смен</span></div>
            ${isFixedPayEmployee(employee) ? "" : `<div><span class="big">${formatHours(total.hours)}</span><span class="unit">часов</span></div>`}
            ${showMoney ? `<div><span class="big pay" style="color:var(--brand)">${formatMoneyPlain(total.remaining)}</span><span class="unit">₽ к выплате</span></div>` : ""}
            ${showMoney && total.paid ? `<div class="payMeta">начислено ${formatMoneyPlain(total.accrued)} ₽ · выдано ${formatMoneyPlain(total.paid)} ₽</div>` : ""}
            ${scoreStatsHtml(total.scores)}
          </div>
        </div>
      `;
    })
    .join("");
}

function buildScheduleTotals(schedule){
  const byEmployee = new Map();
  const byRole = new Map();
  schedule.employees.forEach((employee)=>{
    byEmployee.set(employee.id, emptyEmployeeTotal());
    if(!byRole.has(employee.role)) byRole.set(employee.role, { shifts:0, hours:0, pay:0 });
  });

  schedule.days.forEach((day)=>{
    schedule.employees.forEach((employee)=>{
      const shift = day.shifts[employee.id];
      if(!shift) return;
      const total = byEmployee.get(employee.id) || emptyEmployeeTotal();
      total.shifts += 1;
      if(!isFixedShift(employee, shift)) total.hours += Number(shift.hours || 0);
      if(shift.payAmount != null) total.pay += Number(shift.payAmount || 0);
      byEmployee.set(employee.id, total);

      const roleTotal = byRole.get(employee.role) || { shifts:0, hours:0, pay:0 };
      roleTotal.shifts += 1;
      if(!isFixedShift(employee, shift)) roleTotal.hours += Number(shift.hours || 0);
      if(shift.payAmount != null) roleTotal.pay += Number(shift.payAmount || 0);
      byRole.set(employee.role, roleTotal);
    });

    day.scores.forEach((score)=>{
      const employeeId = score.employee_id || score.employeeId;
      const total = byEmployee.get(employeeId);
      if(total && score.score in total.scores) total.scores[score.score] += 1;
    });
  });

  // Выплачено/начислено/остаток берём с бэкенда: он считает выплаты по месяцу назначения (apply_month)
  // и включает премии/цели/кальяны в «начислено» (как в ЛК). total.pay (ФОТ смен) оставляем для ролей/подвала.
  schedule.employees.forEach((employee)=>{
    const total = byEmployee.get(employee.id);
    if(!total) return;
    const bt = employee.totals || {};
    total.paid = bt.paid == null ? null : Number(bt.paid || 0);
    total.accrued = bt.accrued == null ? total.pay : Number(bt.accrued || 0);
    total.remaining = bt.remaining == null ? null : Number(bt.remaining || 0);
  });

  return { byEmployee, byRole };
}

function emptyEmployeeTotal(){
  return { shifts:0, hours:0, pay:0, paid:0, accrued:0, remaining:0, scores:{ green:0, yellow:0, red:0 } };
}

function renderScheduleEditor(service){
  if(!isScheduleEditingUnlocked(service) || !state.schedule || !state.selectedScheduleCell) return "";
  const context = selectedScheduleContext();
  if(!context) return "";

  const { day, employee, shift } = context;
  const dateLabel = formatDateHuman(day.date);
  const defaultRole = employee.role;
  const kind = state.scheduleEditorKind || (shift?.payModel === "event" ? "event" : "shift");
  const selRole = state.scheduleEditorRole || shift?.roleOverride || defaultRole;
  const roleIsFixed = selRole === "dish" || selRole === "dishwasher";
  const isOverride = selRole !== defaultRole;
  const fixedValue = Math.round(shift?.payAmount || 3000);
  const hoursValue = formatInputNumber(shift?.hours || employee.defaultHours || 12);
  const rateValue = (shift && shift.hours > 0 && shift.payAmount)
    ? Math.round(shift.payAmount / shift.hours)
    : Math.round(employee.hourlyRate || 0);
  const roleOpts = scheduleRoleOptions().map((o)=>`<option value="${o.value}" ${selRole === o.value ? "selected" : ""}>${o.label}</option>`).join("");

  const eventAmount = shift?.payModel === "event" ? Math.round(shift.payAmount || 0) : "";
  const eventTitle = day.eventTitle || "";
  const eventNote = day.eventNote || "";

  const kindSelect = `
      <label class="field">
        <span>Тип смены</span>
        <select id="shiftKind" data-editor-kind>
          <option value="shift" ${kind !== "event" ? "selected" : ""}>Обычная</option>
          <option value="event" ${kind === "event" ? "selected" : ""}>Корпоратив / спецмероприятие</option>
        </select>
      </label>`;

  const body = kind === "event"
    ? `
      <div class="editor-grid mt-10">
        <label class="field"><span>Выплата за мероприятие, ₽</span>
          <input id="eventAmount" type="number" min="0" step="100" inputmode="numeric" value="${escapeAttr(eventAmount)}" placeholder="напр. 5000"></label>
      </div>
      <label class="field mt-10"><span>Название мероприятия</span>
        <input id="eventTitle" type="text" maxlength="120" value="${escapeAttr(eventTitle)}" placeholder="напр. Корпоратив «Газпром»"></label>
      <label class="field mt-10"><span>Кратко для сотрудников</span>
        <textarea id="eventNote" maxlength="1000" rows="2" placeholder="Во сколько, форма одежды, что важно знать">${escapeHtml(eventNote)}</textarea></label>
      <div class="editor-grid mt-10">
        <button class="ghost brand-action" data-editor-action="save-shift">${shift ? "Сохранить" : "Поставить"}</button>
        ${shift ? `<button class="ghost danger-action" data-editor-action="delete-shift">Снять смену</button>` : ""}
      </div>
      <div class="hint hint-block-sm">Разовая выплата (не почасовая). Инфо о мероприятии увидят сотрудники по клику на дату.</div>`
    : roleIsFixed ? `
        <div class="editor-grid mt-10">
          <label class="field"><span>Своя сумма</span>
            <input id="shiftValue" type="number" min="0" step="100" value="${escapeAttr(fixedValue)}"></label>
          <button class="ghost brand-action" data-editor-action="save-shift">${shift ? "Сохранить" : "Поставить"}</button>
          ${shift ? `<button class="ghost danger-action" data-editor-action="delete-shift">Снять смену</button>` : ""}
        </div>
        <div class="fixed-pay-row">
          ${[3000,4000,6000,8000].map((amount)=>`<button class="fixed-pay ${fixedValue === amount ? "on" : ""}" data-fixed-pay="${amount}">${formatMoneyPlain(amount)}</button>`).join("")}
        </div>
      ` : `
        <div class="editor-grid editor-grid-2 mt-10">
          <label class="field"><span>Часы</span>
            <input id="shiftValue" type="number" min="0" step="0.5" value="${escapeAttr(hoursValue)}"></label>
          <label class="field"><span>Ставка/час</span>
            <input id="shiftRate" type="number" min="0" step="10" value="${escapeAttr(rateValue)}"></label>
        </div>
        <div class="editor-grid mt-10">
          <button class="ghost brand-action" data-editor-action="save-shift">${shift ? "Сохранить" : "Поставить"}</button>
          ${shift ? `<button class="ghost danger-action" data-editor-action="delete-shift">Снять смену</button>` : ""}
        </div>
      `;

  const subLabel = kind === "event" ? "корпоратив" : (isOverride ? "роль на день" : (roleIsFixed ? "ставка смены" : "нестандартные часы"));

  return `
    <div class="panel editor-panel">
      <div class="editor-head">
        <span class="grow">
          <span class="row-title">${escapeHtml(employee.name)}</span>
          <span class="row-sub">${dateLabel} · ${subLabel}</span>
        </span>
        <button class="iconbtn small" data-editor-action="close">×</button>
      </div>

      ${kindSelect}

      ${kind === "event" ? "" : `
      <label class="field mt-10">
        <span>Должность в этот день</span>
        <select id="shiftRole" data-editor-role>${roleOpts}</select>
      </label>

      <label class="field mt-10">
        <span>Часть дня</span>
        <select id="shiftDayPart">
          <option value="" ${!shift?.dayPart ? "selected" : ""}>Весь день</option>
          <option value="morning" ${shift?.dayPart === "morning" ? "selected" : ""}>Утренняя</option>
          <option value="evening" ${shift?.dayPart === "evening" ? "selected" : ""}>Вечерняя</option>
        </select>
      </label>`}

      ${body}

      ${kind !== "event" && isOverride ? `<div class="hint hint-block-sm">Этот день будет цветом роли «${escapeHtml(roleLabelOf(selRole))}»</div>` : ""}
      ${state.scheduleSaving ? `<div class="import-result">Сохраняю</div>` : ""}
    </div>
  `;
}

function roleLabelOf(role){
  return (scheduleRoleOptions().find((o)=>o.value === role) || {}).label || role;
}

function renderScheduleDateEditor(service){
  if(!isScheduleEditingUnlocked(service) || !state.schedule || !state.selectedScheduleDate) return "";
  const context = selectedDateContext();
  if(!context) return "";

  const { day, employee, employeePayouts, score } = context;
  const dateLabel = formatDateHuman(day.date);

  return `
    <div class="panel date-editor-panel">
      <div class="editor-head">
        <span class="grow">
          <span class="row-title">${dateLabel}</span>
          <span class="row-sub">Выплаты, оценки, зарплатные дни и дедлайн</span>
        </span>
        <button class="iconbtn small" data-date-action="close">×</button>
      </div>

      <div class="date-editor-grid">
        <label class="checkrow deadline-check">
          <input id="dateDeadlineToggle" type="checkbox" ${day.isDeadline ? "checked" : ""}>
          <span>Дедлайн</span>
        </label>
        <label class="field employee-select">
          <span>Сотрудник</span>
          <select id="dateEmployeeSelect">
            ${state.schedule.employees.map((item)=>`
              <option value="${escapeAttr(item.id)}" ${item.id === employee.id ? "selected" : ""}>${escapeHtml(item.name)}</option>
            `).join("")}
          </select>
        </label>
        <label class="checkrow payday-check">
          <input id="datePaydayToggle" type="checkbox" ${day.plannedPayEmployeeIds.includes(employee.id) ? "checked" : ""}>
          <span>День зарплаты</span>
        </label>
      </div>

      <div class="score-row">
        <span class="row-sub">Оценка</span>
        ${["green","yellow","red"].map((value)=>`<button class="score-pick ${value}${score === value ? " on" : ""}" data-date-score="${value}" title="${scoreLabel(value)}"></button>`).join("")}
        ${score ? `<button class="ghost mini" data-date-action="clear-score">Снять</button>` : ""}
      </div>

      <div class="payout-editor">
        <div class="row-sub">Выплаты за день</div>
        ${(day.payouts || []).length ? (day.payouts || []).map((payout)=>{
          const pid = payout.employee_id || payout.employeeId;
          const nm = (state.schedule.employees.find((e)=>e.id === pid) || {}).name || "Сотрудник";
          const ym = payout.applyMonth || day.date.slice(0, 7);
          if(state.editingPayoutId === payout.id){
            return `
            <div class="payout-item editing">
              <div class="payout-edit">
                <input type="number" min="0" step="100" inputmode="numeric" value="${payout.amount}" data-payout-edit-amount="${escapeAttr(payout.id)}" placeholder="сумма, ₽">
                <select data-payout-edit-month="${escapeAttr(payout.id)}" title="За какой месяц">${payoutMonthOptions(ym)}</select>
                <button class="ghost mini brand-action" data-payout-save="${escapeAttr(payout.id)}">Сохранить</button>
                <button class="ghost mini" data-payout-cancel>Отмена</button>
              </div>
            </div>`;
          }
          const purpose = payout.obligationTitle
            ? `обязательство: ${payout.obligationTitle}`
            : `за ${formatYearMonth(ym)}`;
          return `
          <div class="payout-item">
            <span><b>${escapeHtml(nm)}</b> · ${formatMoneyPlain(payout.amount)} ₽ <i class="payout-period">${escapeHtml(purpose)}</i></span>
            <span class="payout-item-actions">
              <button class="ghost mini" data-payout-edit="${escapeAttr(payout.id)}">Изменить</button>
              <button class="ghost mini danger-action" data-date-delete-payout="${escapeAttr(payout.id)}">Удалить</button>
            </span>
          </div>`;
        }).join("") : `<div class="muted-line">Выплат за этот день нет</div>`}
        <div class="payout-add">
          <select id="datePayoutEmployee">
            ${state.schedule.employees.map((item)=>`<option value="${escapeAttr(item.id)}" ${item.id === employee.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
          </select>
          <input id="datePayoutAmount" type="number" min="0" step="100" inputmode="numeric" placeholder="сумма, ₽">
          <select id="datePayoutMonth" title="За какой месяц">${payoutMonthOptions(day.date.slice(0, 7))}</select>
          ${(state.schedule.obligations || []).length ? `
            <select id="datePayoutObligation" title="Привязать к обязательству">
              <option value="">— без обязательства —</option>
              ${state.schedule.obligations.map((o)=>`<option value="${escapeAttr(o.id)}">${escapeHtml((state.schedule.employees.find((e)=>e.id === o.employeeId) || {}).name || "")} · ${escapeHtml(o.title)} (ост. ${formatMoneyPlain(o.remaining)} ₽)</option>`).join("")}
            </select>
          ` : ""}
          <button class="ghost brand-action" data-date-action="add-payout">Добавить выплату</button>
        </div>
      </div>

      ${state.scheduleSaving ? `<div class="import-result">Сохраняю</div>` : ""}
    </div>
  `;
}

// Редактор «состав/ставка на месяц» (замок открыт): клик по имени в шапке.
function renderRosterEditor(service){
  if(!isScheduleEditingUnlocked(service) || !state.schedule || !state.selectedRosterEmployeeId) return "";
  const employee = state.schedule.employees.find((e)=>e.id === state.selectedRosterEmployeeId);
  if(!employee) return "";
  const monthTitle = formatScheduleMonth(state.schedule.year, state.schedule.month);
  const isFixed = isFixedPayEmployee(employee);
  const rateValue = employee.hourlyRate ?? employee.baseRate ?? "";
  const base = employee.baseRate ?? 0;

  return `
    <div class="panel editor-panel">
      <div class="editor-head">
        <span class="grow">
          <span class="row-title">${escapeHtml(employee.name)}</span>
          <span class="row-sub">${escapeHtml(monthTitle)} · ставка и состав на месяц</span>
        </span>
        <button class="iconbtn small" data-roster-action="close">×</button>
      </div>

      ${isFixed ? `
        <div class="hint hint-block-sm">У этой должности фиксированная оплата — индивидуальная ставка/час не применяется.</div>
      ` : `
        <label class="field"><span>Ставка/час на ${escapeHtml(monthTitle)}</span>
          <input id="rosterRate" type="number" min="0" step="10" value="${escapeAttr(rateValue)}"></label>
        <div class="hint hint-block-sm">Штатная ставка: ${base ? formatMoneyPlain(base) : "—"} ₽${employee.rateOverride ? " · сейчас задана своя на этот месяц" : ""}. Меняет смены только этого месяца — прошлые периоды без изменений.</div>
        <div class="editor-grid editor-grid-2 mt-10">
          <button class="ghost brand-action" data-roster-action="save-rate">Сохранить ставку</button>
          ${employee.rateOverride ? `<button class="ghost" data-roster-action="reset-rate">Сбросить к штатной</button>` : ""}
        </div>
      `}

      <div class="roster-sep"></div>
      <div class="hint hint-block-sm">Состав месяца: скрой тех, кто больше не работает (история прошлых месяцев сохранится).</div>
      <button class="ghost danger-action" data-roster-action="hide-from">Убрать из графика с ${escapeHtml(monthTitle)}</button>

      ${state.scheduleSaving ? `<div class="import-result">Сохраняю</div>` : ""}
    </div>
  `;
}

function bindRosterEditor(){
  if(!state.selectedRosterEmployeeId) return;
  const employee = state.schedule?.employees.find((e)=>e.id === state.selectedRosterEmployeeId);
  if(!employee) return;

  app.querySelector("[data-roster-action='close']")?.addEventListener("click", ()=>{
    state.selectedRosterEmployeeId = null;
    render();
  });
  app.querySelector("[data-roster-action='save-rate']")?.addEventListener("click", ()=>{
    const rate = Number(app.querySelector("#rosterRate")?.value);
    if(!Number.isFinite(rate) || rate <= 0){ state.scheduleSaveError = "Укажи ставку"; render(); return; }
    saveMonthRate(employee.id, Math.round(rate));
  });
  app.querySelector("[data-roster-action='reset-rate']")?.addEventListener("click", ()=>saveMonthRate(employee.id, null));
  app.querySelector("[data-roster-action='hide-from']")?.addEventListener("click", ()=>hideEmployeeFromMonth(employee.id));
}

async function saveMonthRate(employeeId, rate){
  state.selectedRosterEmployeeId = null;
  await saveAndReload(()=>apiPut("/api/schedule/month-rate", {
    year: state.schedule.year,
    month: state.schedule.month,
    employeeId,
    rate
  }));
}

// «Убрать с этого месяца» = в графике по предыдущий месяц (schedule_until = месяц−1, первое число).
async function hideEmployeeFromMonth(employeeId){
  const y = state.schedule.year;
  const m = state.schedule.month;
  const prev = new Date(y, m - 2, 1); // m-1 это текущий (1-indexed), ещё −1 = предыдущий
  const until = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;
  state.selectedRosterEmployeeId = null;
  await saveAndReload(()=>apiPut("/api/schedule/roster-window", { employeeId, scheduleUntil: until }));
}

// Окно с инфо о корпоративе (видит любой по клику на дату с меткой «К»).
function renderEventPopup(){
  if(!state.schedule || !state.selectedEventDate) return "";
  const day = state.schedule.days.find((d)=>d.date === state.selectedEventDate);
  if(!day || !day.eventTitle) return "";
  return `
    <div class="panel editor-panel event-popup">
      <div class="editor-head">
        <span class="grow">
          <span class="row-title">${escapeHtml(day.eventTitle)}</span>
          <span class="row-sub">${formatDateHuman(day.date)} · корпоратив</span>
        </span>
        <button class="iconbtn small" data-event-action="close">×</button>
      </div>
      ${day.eventNote ? `<div class="event-note">${escapeHtml(day.eventNote)}</div>` : `<div class="hint hint-block-sm">Подробности уточняй у руководителя.</div>`}
    </div>
  `;
}

function bindEventPopup(){
  if(!state.selectedEventDate) return;
  app.querySelector("[data-event-action='close']")?.addEventListener("click", ()=>{
    state.selectedEventDate = null;
    render();
  });
}

function renderMyHoursEditor(){
  if(!state.schedule || !state.selectedMyHoursDate) return "";
  const context = scheduleContext(state.selectedMyHoursDate, state.user?.id);
  if(!context || !context.shift || isFixedShift(context.employee, context.shift)) return "";

  const { day, shift } = context;
  const planned = Number(shift.hours || 0);
  const start = shift.startTime ? String(shift.startTime).slice(0, 5) : "";
  const end = shift.endTime ? String(shift.endTime).slice(0, 5) : "";

  return `
    <div class="panel editor-panel">
      <div class="editor-head">
        <span class="grow">
          <span class="row-title">Мои часы за смену</span>
          <span class="row-sub">${formatDateHuman(day.date)} · по графику ${formatHours(planned)} ч</span>
        </span>
        <button class="iconbtn small" data-myhours-action="close">×</button>
      </div>

      <div class="editor-grid editor-grid-2 mt-10">
        <label class="field"><span>Начало смены</span>
          <input id="myStart" type="time" value="${escapeAttr(start)}"></label>
        <label class="field"><span>Конец смены</span>
          <input id="myEnd" type="time" value="${escapeAttr(end)}"></label>
      </div>

      <div class="hint hint-block-sm" data-myhours-preview>Укажи время — посчитаю часы автоматически</div>

      <div class="editor-grid mt-10">
        <button class="ghost brand-action" data-myhours-action="save">Сохранить часы</button>
      </div>

      <div class="hint hint-block-sm">Часы можно указать только в меньшую сторону — если ушёл раньше плана.</div>
      ${state.scheduleSaving ? `<div class="import-result">Сохраняю</div>` : ""}
    </div>
  `;
}

// Часы между «началом» и «концом» (минутная точность). Конец ≤ начала = ночная смена (+24ч). Зеркало бэкенда.
function computeShiftHours(start, end){
  const m = /^(\d{2}):(\d{2})$/.exec(start || "");
  const n = /^(\d{2}):(\d{2})$/.exec(end || "");
  if(!m || !n) return null;
  let minutes = (Number(n[1]) * 60 + Number(n[2])) - (Number(m[1]) * 60 + Number(m[2]));
  if(minutes <= 0) minutes += 24 * 60;
  return minutes / 60;
}

function updateMyHoursPreview(planned){
  const node = app.querySelector("[data-myhours-preview]");
  if(!node) return;
  const start = app.querySelector("#myStart")?.value;
  const end = app.querySelector("#myEnd")?.value;
  if(!start || !end){ node.textContent = "Укажи время — посчитаю часы автоматически"; node.classList.remove("danger"); return; }
  const h = computeShiftHours(start, end);
  if(h == null || h <= 0){ node.textContent = "Проверь время смены"; node.classList.add("danger"); return; }
  if(h > planned + 0.001){
    node.textContent = `Получится ${formatHours(h)} ч — больше плана (${formatHours(planned)} ч). Можно только меньше.`;
    node.classList.add("danger");
    return;
  }
  node.textContent = `Получится ${formatHours(h)} ч`;
  node.classList.remove("danger");
}

function bindMyHoursEditor(){
  if(!state.selectedMyHoursDate) return;
  const context = scheduleContext(state.selectedMyHoursDate, state.user?.id);
  if(!context || !context.shift) return;
  const planned = Number(context.shift.hours || 0);

  app.querySelector("[data-myhours-action='close']")?.addEventListener("click", ()=>{
    state.selectedMyHoursDate = null;
    render();
  });
  app.querySelectorAll("#myStart, #myEnd").forEach((input)=>{
    input.addEventListener("input", ()=>updateMyHoursPreview(planned));
  });
  app.querySelector("[data-myhours-action='save']")?.addEventListener("click", ()=>saveMyHours(context));
  updateMyHoursPreview(planned);
}

async function saveMyHours(context){
  const start = app.querySelector("#myStart")?.value;
  const end = app.querySelector("#myEnd")?.value;
  if(!start || !end){ state.scheduleSaveError = "Укажи начало и конец смены"; render(); return; }
  const planned = Number(context.shift?.hours || 0);
  const h = computeShiftHours(start, end);
  if(h == null || h <= 0){ state.scheduleSaveError = "Проверь время смены"; render(); return; }
  if(h > planned + 0.001){
    state.scheduleSaveError = `Часы можно только уменьшить (по графику ${formatHours(planned)} ч)`;
    render();
    return;
  }
  state.selectedMyHoursDate = null;
  await saveAndReload(()=>apiPatch("/api/schedule/my-hours", {
    workDate: context.day.date,
    startTime: start,
    endTime: end
  }));
}

function bindScheduleCells(service){
  const unlocked = isScheduleEditingUnlocked(service);
  app.querySelectorAll("[data-schedule-cell]").forEach((cell)=>{
    if(unlocked){
      // Управление графиком (руководитель): одиночный клик — поставить/снять смену;
      // двойной клик / правый клик — редактор (нестандартные часы). Без долгого тапа.
      let clickTimer = null;

      cell.addEventListener("click", ()=>{
        if(clickTimer){ clearTimeout(clickTimer); clickTimer = null; return; }
        clickTimer = setTimeout(()=>{ clickTimer = null; quickEditScheduleCell(cell); }, 220);
      });

      cell.addEventListener("dblclick", (event)=>{
        event.preventDefault();
        if(clickTimer){ clearTimeout(clickTimer); clickTimer = null; }
        openScheduleEditor(cell);
      });

      cell.addEventListener("contextmenu", (event)=>{
        event.preventDefault();
        if(clickTimer){ clearTimeout(clickTimer); clickTimer = null; }
        openScheduleEditor(cell);
      });
      return;
    }

    // Замок закрыт: сотрудник может уточнить СВОИ отработанные часы (только своя строка,
    // только почасовая смена, только сегодня/прошлое). Клик по своей ячейке со сменой.
    if(cell.dataset.employee !== state.user?.id) return;
    if(!isSelfEditableCell(cell.dataset.date, cell.dataset.employee)) return;
    cell.classList.add("self-editable");
    cell.addEventListener("click", ()=>openMyHoursEditor(cell));
  });
}

// Своя ячейка пригодна для правки часов: есть почасовая смена и дата не в будущем.
function isSelfEditableCell(date, employeeId){
  const ctx = scheduleContext(date, employeeId);
  if(!ctx || !ctx.shift || isFixedShift(ctx.employee, ctx.shift)) return false;
  return date <= todayIsoDate();
}

function todayIsoDate(){
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function openMyHoursEditor(cell){
  if(!cell?.dataset.date) return;
  state.selectedMyHoursDate = cell.dataset.date;
  state.selectedScheduleCell = null;
  state.selectedScheduleDate = null;
  state.scheduleSaveError = "";
  render();
}

function bindScheduleDates(service){
  const unlocked = isScheduleEditingUnlocked(service);
  app.querySelectorAll("[data-schedule-date]").forEach((cell)=>{
    const date = cell.dataset.scheduleDate;
    if(unlocked){
      cell.addEventListener("click", ()=>openDateEditor(date));
      return;
    }
    // Сотрудник (или замок закрыт): клик по дате с корпоративом — окно с инфо о мероприятии.
    const day = state.schedule?.days.find((d)=>d.date === date);
    if(day?.eventTitle){
      cell.addEventListener("click", ()=>{
        state.selectedEventDate = date;
        render();
      });
    }
  });
}

function openScheduleEditor(cell){
  if(!cell || !cell.dataset.date || !cell.dataset.employee) return;
  state.selectedScheduleCell = {
    date: cell.dataset.date,
    employeeId: cell.dataset.employee
  };
  state.selectedScheduleDate = null;
  state.scheduleEditorRole = null;
  state.scheduleEditorKind = null;
  state.scheduleSaveError = "";
  render();
}

function openDateEditor(date){
  if(!state.schedule || !date) return;
  const day = state.schedule.days.find((item)=>item.date === date);
  if(!day) return;
  const currentEmployee = state.schedule.employees.find((employee)=>employee.id === state.selectedDateEmployeeId);
  const firstShiftEmployeeId = Object.keys(day.shifts || {})[0];
  const firstEmployee = currentEmployee || state.schedule.employees.find((employee)=>employee.id === firstShiftEmployeeId) || state.schedule.employees[0];
  state.selectedScheduleCell = null;
  state.selectedScheduleDate = date;
  state.selectedDateEmployeeId = firstEmployee?.id || null;
  state.scheduleSaveError = "";
  render();
}

async function quickEditScheduleCell(cell){
  if(state.scheduleSaving) return;
  const context = scheduleContextByCell(cell);
  if(!context) return;
  if(isFixedPayEmployee(context.employee)){
    openScheduleEditor(cell);
    return;
  }
  state.selectedScheduleCell = null;
  if(context.shift){
    await deleteSelectedShift(context);
    return;
  }
  await saveShiftFor(context, { hours: Number(context.employee.defaultHours || 12) });
}

function scheduleContextByCell(cell){
  if(!state.schedule || !cell) return null;
  return scheduleContext(cell.dataset.date, cell.dataset.employee);
}

function bindScheduleEditor(){
  const context = selectedScheduleContext();
  if(!context) return;

  const close = app.querySelector("[data-editor-action='close']");
  if(close){
    close.addEventListener("click", ()=>{
      state.selectedScheduleCell = null;
      render();
    });
  }

  const kindSel = app.querySelector("[data-editor-kind]");
  if(kindSel){
    kindSel.addEventListener("change", ()=>{
      state.scheduleEditorKind = kindSel.value;
      render();
    });
  }

  const roleSel = app.querySelector("[data-editor-role]");
  if(roleSel){
    roleSel.addEventListener("change", ()=>{
      state.scheduleEditorRole = roleSel.value;
      render();
    });
  }

  const saveShift = app.querySelector("[data-editor-action='save-shift']");
  if(saveShift){
    saveShift.addEventListener("click", ()=>saveSelectedShift(context));
  }

  const deleteShift = app.querySelector("[data-editor-action='delete-shift']");
  if(deleteShift){
    deleteShift.addEventListener("click", ()=>deleteSelectedShift(context));
  }

  app.querySelectorAll("[data-fixed-pay]").forEach((button)=>{
    button.addEventListener("click", ()=>saveFixedPreset(context, Number(button.dataset.fixedPay)));
  });
}

function bindScheduleDateEditor(){
  const context = selectedDateContext();
  if(!context) return;

  const close = app.querySelector("[data-date-action='close']");
  if(close){
    close.addEventListener("click", ()=>{
      state.selectedScheduleDate = null;
      state.editingPayoutId = null;
      render();
    });
  }

  const employeeSelect = app.querySelector("#dateEmployeeSelect");
  if(employeeSelect){
    employeeSelect.addEventListener("change", ()=>{
      state.selectedDateEmployeeId = employeeSelect.value;
      render();
    });
  }

  const deadlineToggle = app.querySelector("#dateDeadlineToggle");
  if(deadlineToggle){
    deadlineToggle.addEventListener("change", ()=>setDeadline(context.day.date, deadlineToggle.checked));
  }

  const paydayToggle = app.querySelector("#datePaydayToggle");
  if(paydayToggle){
    paydayToggle.addEventListener("change", ()=>setPayday(context.day.date, context.employee.id, paydayToggle.checked));
  }

  app.querySelectorAll("[data-date-score]").forEach((button)=>{
    button.addEventListener("click", ()=>setScore(context, button.dataset.dateScore));
  });

  const clearScore = app.querySelector("[data-date-action='clear-score']");
  if(clearScore){
    clearScore.addEventListener("click", ()=>clearScoreFor(context));
  }

  const addPayout = app.querySelector("[data-date-action='add-payout']");
  if(addPayout){
    addPayout.addEventListener("click", ()=>addPayoutFor(context, "#datePayoutAmount"));
  }

  app.querySelectorAll("[data-date-delete-payout]").forEach((button)=>{
    button.addEventListener("click", ()=>deletePayout(button.dataset.dateDeletePayout));
  });
  app.querySelectorAll("[data-payout-edit]").forEach((button)=>{
    button.addEventListener("click", ()=>{ state.editingPayoutId = button.dataset.payoutEdit; render(); });
  });
  app.querySelector("[data-payout-cancel]")?.addEventListener("click", ()=>{ state.editingPayoutId = null; render(); });
  app.querySelectorAll("[data-payout-save]").forEach((button)=>{
    button.addEventListener("click", ()=>savePayoutEdit(button.dataset.payoutSave));
  });
}

async function savePayoutEdit(id){
  if(!id) return;
  const amountInput = app.querySelector(`[data-payout-edit-amount="${CSS.escape(id)}"]`);
  const monthSelect = app.querySelector(`[data-payout-edit-month="${CSS.escape(id)}"]`);
  const amount = Number(amountInput?.value);
  if(!Number.isFinite(amount) || amount <= 0) return;
  const applyMonth = monthSelect?.value || undefined;
  state.editingPayoutId = null;
  await saveAndReload(()=>apiPatch(`/api/schedule/payouts/${encodeURIComponent(id)}`, {
    amount: Math.round(amount),
    applyMonth
  }));
}

function selectedScheduleContext(){
  if(!state.schedule || !state.selectedScheduleCell) return null;
  return scheduleContext(state.selectedScheduleCell.date, state.selectedScheduleCell.employeeId);
}

function selectedDateContext(){
  if(!state.schedule || !state.selectedScheduleDate) return null;
  const day = state.schedule.days.find((item)=>item.date === state.selectedScheduleDate);
  if(!day) return null;
  const employee = state.schedule.employees.find((item)=>item.id === state.selectedDateEmployeeId) || state.schedule.employees[0];
  if(!employee) return null;
  const employeePayouts = day.payouts.filter((payout)=>payout.employee_id === employee.id || payout.employeeId === employee.id);
  const score = day.scores.find((item)=>item.employee_id === employee.id || item.employeeId === employee.id)?.score || null;
  return { day, employee, employeePayouts, score };
}

function scheduleContext(date, employeeId){
  if(!state.schedule || !date || !employeeId) return null;
  const day = state.schedule.days.find((item)=>item.date === date);
  const employee = state.schedule.employees.find((item)=>item.id === employeeId);
  if(!day || !employee) return null;
  const shift = day.shifts[employee.id] || null;
  const employeePayouts = day.payouts.filter((payout)=>payout.employee_id === employee.id || payout.employeeId === employee.id);
  const score = day.scores.find((item)=>item.employee_id === employee.id || item.employeeId === employee.id)?.score || null;
  return { day, employee, shift, employeePayouts, score };
}

function selectedDayPart(){
  const sel = app.querySelector("#shiftDayPart");
  return sel ? (sel.value || null) : null;
}

async function saveSelectedShift(context){
  // Корпоратив: разовая выплата + инфо о мероприятии.
  if(app.querySelector("#shiftKind")?.value === "event"){
    const amount = Number(app.querySelector("#eventAmount")?.value);
    if(!Number.isFinite(amount) || amount <= 0){ state.scheduleSaveError = "Укажи выплату за мероприятие"; render(); return; }
    await saveShiftFor(context, {
      corporate: true,
      payAmount: Math.round(amount),
      eventTitle: app.querySelector("#eventTitle")?.value.trim() || null,
      eventNote: app.querySelector("#eventNote")?.value.trim() || null
    });
    return;
  }
  const value = Number(app.querySelector("#shiftValue")?.value);
  if(!Number.isFinite(value) || value <= 0) return;
  const roleSel = app.querySelector("#shiftRole");
  const roleOverride = roleSel ? roleSel.value : undefined;
  const dayPart = selectedDayPart();
  const roleIsFixed = roleOverride === "dish" || roleOverride === "dishwasher";
  if(roleIsFixed){
    await saveShiftFor(context, { payAmount: Math.round(value), roleOverride, dayPart });
    return;
  }
  const rate = Number(app.querySelector("#shiftRate")?.value);
  await saveShiftFor(context, {
    hours: value,
    rate: Number.isFinite(rate) && rate > 0 ? Math.round(rate) : undefined,
    roleOverride,
    dayPart
  });
}

async function saveShiftFor(context, values){
  const body = {
    workDate: context.day.date,
    employeeId: context.employee.id
  };
  if(values.payAmount != null) body.payAmount = Math.round(values.payAmount);
  if(values.hours != null) body.hours = values.hours;
  if(values.rate != null) body.rate = values.rate;
  if(values.roleOverride !== undefined) body.roleOverride = values.roleOverride;
  if(values.dayPart !== undefined) body.dayPart = values.dayPart || null;
  if(values.corporate) body.corporate = true;
  if(values.eventTitle !== undefined) body.eventTitle = values.eventTitle;
  if(values.eventNote !== undefined) body.eventNote = values.eventNote;
  await saveAndReload(()=>apiPut("/api/schedule/shifts", body));
}

async function saveFixedPreset(context, payAmount){
  const roleSel = app.querySelector("#shiftRole");
  const roleOverride = roleSel ? roleSel.value : undefined;
  const dayPart = selectedDayPart();
  state.selectedScheduleCell = null;
  await saveShiftFor(context, { payAmount, roleOverride, dayPart });
}

async function deleteSelectedShift(context){
  await saveAndReload(()=>apiDelete("/api/schedule/shifts", {
    workDate: context.day.date,
    employeeId: context.employee.id
  }));
}

async function setDeadline(workDate, isDeadline){
  await saveAndReload(()=>apiPatch("/api/schedule/days", { workDate, isDeadline }));
}

async function setPayday(workDate, employeeId, enabled){
  const body = { workDate, employeeId };
  await saveAndReload(()=>enabled
    ? apiPut("/api/schedule/planned-paydays", body)
    : apiDelete("/api/schedule/planned-paydays", body)
  );
}

async function setScore(context, score){
  if(context.score === score){
    await clearScoreFor(context);
    return;
  }
  await saveAndReload(()=>apiPut("/api/schedule/scores", {
    workDate: context.day.date,
    employeeId: context.employee.id,
    score
  }));
}

async function clearScoreFor(context){
  await saveAndReload(()=>apiDelete("/api/schedule/scores", {
    workDate: context.day.date,
    employeeId: context.employee.id
  }));
}

function formatYearMonth(ym){
  const months = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
  const [y, m] = String(ym || "").split("-").map(Number);
  if(!y || !m) return "—";
  return `${months[m - 1]} ${y}`;
}

function payoutMonthOptions(selectedYM){
  const months = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
  const baseY = state.schedule?.year || new Date().getFullYear();
  const baseM = state.schedule?.month || new Date().getMonth() + 1;
  const opts = [];
  for(let i = 0; i < 9; i++){
    const d = new Date(baseY, baseM - 1 - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push(`<option value="${ym}" ${ym === selectedYM ? "selected" : ""}>${months[d.getMonth()]} ${d.getFullYear()}</option>`);
  }
  return opts.join("");
}

async function addPayoutFor(context, inputSelector = "#datePayoutAmount"){
  const amount = Number(app.querySelector(inputSelector)?.value);
  if(!Number.isFinite(amount) || amount <= 0) return;
  const applyMonth = app.querySelector("#datePayoutMonth")?.value || undefined;
  const obligationId = app.querySelector("#datePayoutObligation")?.value || null;
  let employeeId = app.querySelector("#datePayoutEmployee")?.value || context.employee.id;
  // Если выбрано обязательство — выплата идёт его сотруднику (для согласованности).
  if(obligationId){
    const o = (state.schedule.obligations || []).find((x)=>x.id === obligationId);
    if(o) employeeId = o.employeeId;
  }
  await saveAndReload(()=>apiPost("/api/schedule/payouts", {
    workDate: context.day.date,
    employeeId,
    amount: Math.round(amount),
    applyMonth,
    obligationId
  }));
}

async function deletePayout(id){
  if(!id) return;
  await saveAndReload(()=>apiDelete(`/api/schedule/payouts/${encodeURIComponent(id)}`));
}

async function saveAndReload(action){
  if(state.scheduleSaving) return;
  state.scheduleSaving = true;
  state.scheduleSaveError = "";
  render();
  try{
    await action();
    const year = state.schedule?.year || new Date().getFullYear();
    const month = state.schedule?.month || new Date().getMonth() + 1;
    state.schedule = await apiGet(`/api/schedule?year=${year}&month=${month}`);
    state.summary = await apiGet("/api/summary");
    state.scheduleError = "";
  }catch(error){
    state.scheduleSaveError = "Не удалось сохранить";
  }finally{
    state.scheduleSaving = false;
    render();
  }
}

function renderEmployeeTotal(employee){
  const totals = employee.totals || {};
  return `
    <div class="panel total-card">
      <div class="row">
        <span class="grow">
          <span class="row-title">${escapeHtml(employee.name)}</span>
          <span class="row-sub">${escapeHtml(employee.roleLabel)} · смен ${totals.shifts || 0}</span>
        </span>
        <span class="money">${formatMoneyPlain(totals.accrued || 0)} ₽</span>
      </div>
      <div class="row-sub">Выдано ${formatMoneyPlain(totals.paid || 0)} ₽ · остаток ${formatMoneyPlain(totals.remaining || 0)} ₽</div>
    </div>
  `;
}

async function loadSchedule(year, month){
  state.scheduleLoading = true;
  state.scheduleError = "";
  state.scheduleSaveError = "";
  render();
  try{
    state.schedule = await apiGet(`/api/schedule?year=${year}&month=${month}`);
  }catch(error){
    state.scheduleError = "Проверь соединение и попробуй ещё раз";
  }finally{
    state.scheduleLoading = false;
    render();
  }
}

async function handleScheduleImport(event){
  const file = event.target.files?.[0];
  if(!file) return;
  state.importResult = "Загружаю бэкап";
  render();
  try{
    const backup = JSON.parse(await file.text());
    const result = await apiPost("/api/schedule/import", { backup });
    state.importResult = `Импортировано: сотрудники ${result.employees}, смены ${result.shifts}, выплаты ${result.payouts}`;
    state.schedule = null;
    state.scheduleError = "";
    await loadSchedule(backup.year || new Date().getFullYear(), Number.isInteger(backup.month) ? backup.month + 1 : new Date().getMonth() + 1);
  }catch(error){
    state.importResult = "Не удалось импортировать JSON";
    render();
  }
}

async function logout(){
  await apiPost("/api/auth/logout", {});
  state.user = null;
  state.services = [];
  clearSessionData();
  history.replaceState(null, "", "/");
  render();
}

// Полный сброс кэша разделов между аккаунтами (иначе следующий вошедший видит чужие данные).
function clearSessionData(){
  state.summary = null;
  state.schedule = null;
  state.weeklyStats = undefined;
  state.weeklyStatsLoading = false;
  state.selectedScheduleCell = null;
  state.selectedScheduleDate = null;
  state.selectedDateEmployeeId = null;
  state.selectedMyHoursDate = null;
  state.selectedRosterEmployeeId = null;
  state.selectedEventDate = null;
  state.scheduleEditUnlocked = false;
  state.payroll = null;
  state.tasks = null;
  state.salesGoalsData = null;
  state.handovers = null;
  state.praise = null;
  state.praisePrefillTo = null;
  state.progress = null;
  state.training = null;
  state.quiz = null;
  state.selectedTrainingChapterId = "";
  state.requisitionCatalog = null;
  state.requisitionHistory = null;
  state.requisitionCart = {};
  state.requisitionComment = "";
  state.requisitionUrgent = false;
  state.requisitionNotice = "";
  state.shiftClosingInit = null;
  state.shiftClosingDate = null;
  state.shiftClosingRecord = null;
  state.shiftClosingForm = null;
  state.shiftClosingPhotos = {};
  state.admin = null;
  state.selectedAdminEmployeeId = "new";
}

async function apiGet(url){
  const response = await fetch(url, { credentials:"same-origin" });
  if(!response.ok) throw await withStatus(response);
  return response.json();
}

async function apiPost(url, body){
  const response = await fetch(url, {
    method:"POST",
    credentials:"same-origin",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(body)
  });
  if(!response.ok) throw await withStatus(response);
  return response.json();
}

async function apiPut(url, body){
  return apiSend("PUT", url, body);
}

async function apiPatch(url, body){
  return apiSend("PATCH", url, body);
}

async function apiDelete(url, body){
  return apiSend("DELETE", url, body);
}

async function apiSend(method, url, body){
  const options = {
    method,
    credentials:"same-origin"
  };
  if(body !== undefined){
    options.headers = { "Content-Type":"application/json" };
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if(!response.ok) throw await withStatus(response);
  return response.json();
}

async function withStatus(response){
  const error = new Error(response.statusText);
  error.status = response.status;
  try{
    const body = await response.json();
    error.code = body?.error;
  }catch{
    error.code = "";
  }
  return error;
}

function firstName(name){
  return name.split(/\s+/)[0] || name;
}

function roleLabel(role){
  return {
    owner:"Руководитель",
    manager:"Управляющий",
    cook:"Повар",
    bar:"Бармен",
    waiter:"Официант",
    dishwasher:"Мойщица",
    other:"Сотрудник"
  }[role] || "Сотрудник";
}

function formatMoney(value){
  if(!value) return "0";
  if(value >= 1000) return `${Math.round(value / 1000)}к`;
  return String(value);
}

function formatHours(value){
  if(value == null) return "";
  // Округляем до 1 знака после запятой (убирает «хвост» от суммирования дробных часов).
  const r = Math.round(Number(value) * 10) / 10;
  return String(r).replace(".", ",");
}

function shortName(name){
  const parts = String(name).trim().split(/\s+/);
  if(parts.length === 1) return parts[0].slice(0, 8);
  return `${parts[0]} ${parts[1][0]}.`;
}

function formatInputNumber(value){
  return String(Number(value || 0)).replace(",", ".");
}

function formatDateHuman(date){
  return new Intl.DateTimeFormat("ru-RU", { day:"numeric", month:"long", weekday:"short" }).format(new Date(`${date}T00:00:00`));
}

function formatDateShort(date){
  return new Intl.DateTimeFormat("ru-RU", { day:"2-digit", month:"2-digit", weekday:"short" }).format(new Date(`${date}T00:00:00`));
}

function formatDateTimeHuman(value){
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }).format(date);
}

function formatQty(value){
  return String(Number(value || 0)).replace(".", ",").replace(/,0$/, "");
}

// Краткая форма единицы (как на бэке): «2 коробка» → «2 кор.». Снимает склонение и экономит место.
const UNIT_SHORT = {
  "пакет":"пак.","упаковка":"уп.","бутылка":"бут.","коробка":"кор.","банка":"бан.","пачка":"пач.",
  "штука":"шт","штук":"шт","шт":"шт","килограмм":"кг","кг":"кг","литр":"л","л":"л"
};
function unitShort(unit){
  const key = String(unit ?? "").trim().toLowerCase();
  return UNIT_SHORT[key] || String(unit ?? "").trim();
}

function pluralize(value, one, few, many){
  const n = Math.abs(Number(value || 0));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if(mod10 === 1 && mod100 !== 11) return one;
  if(mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function formatScheduleMonth(year, month){
  const months = ["январь","февраль","март","апрель","май","июнь","июль","август","сентябрь","октябрь","ноябрь","декабрь"];
  return `${months[month - 1] || ""} ${year}`;
}

function weekdayShort(date){
  return ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"][date.getDay()];
}

function scoreLabel(value){
  return { green:"Зелёная", yellow:"Жёлтая", red:"Красная" }[value] || "";
}

function isFixedPayEmployee(employee){
  return employee.payModel === "fixed" || employee.role === "dish" || employee.role === "dishwasher";
}

function isFixedShift(employee, shift){
  return shift?.payModel === "fixed" || isFixedPayEmployee(employee);
}

function roleColor(role){
  return {
    cook:"var(--cook)",
    bar:"var(--bar)",
    waiter:"var(--waiter)",
    dish:"var(--dish)",
    dishwasher:"var(--dish)",
    owner:"var(--brand)",
    manager:"var(--brand)",
    other:"var(--ink-soft)"
  }[role] || "var(--ink-soft)";
}

function rolePlural(role){
  return {
    cook:"Повары",
    bar:"Бармены",
    waiter:"Официанты",
    dish:"Мойщицы",
    dishwasher:"Мойщицы",
    owner:"Руководство",
    manager:"Управляющие",
    other:"Сотрудники"
  }[role] || "Сотрудники";
}

function shortScheduleName(name){
  const trimmed = String(name).trim();
  if(trimmed.length <= 7) return trimmed;
  const first = trimmed.split(/\s+/)[0] || trimmed;
  return first.length <= 8 ? first : `${first.slice(0, 7)}…`;
}

function formatMoneyPlain(value){
  return Math.round(Number(value || 0)).toLocaleString("ru-RU");
}

function formatPercent(value){
  return `${Math.round(Number(value || 0))}%`;
}

function compactCellMoney(value){
  // Выплаты — целиком, без сокращений (точность до рубля важна).
  return String(Math.round(Number(value || 0)));
}

function renderScoreDots(score){
  const cls = scoreDotClass(score);
  return cls ? `<span class="scoreDots"><span class="scoreDot ${cls}"></span></span>` : "";
}

function scoreDotClass(score){
  return { green:"g", yellow:"y", red:"r", g:"g", y:"y", r:"r" }[score] || "";
}

function scoreStatsHtml(scores){
  if(!scores || (!scores.green && !scores.yellow && !scores.red)) return "";
  return `
    <div class="scoreStats">
      <span><i class="scoreDot g"></i>${scores.green || 0}</span>
      <span><i class="scoreDot y"></i>${scores.yellow || 0}</span>
      <span><i class="scoreDot r"></i>${scores.red || 0}</span>
    </div>
  `;
}

function escapeHtml(value){
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value){
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function tintFor(code){
  return {
    schedule:"var(--brand-tint)",
    shift_close:"var(--teal-tint)",
    tasks:"var(--gold-tint)",
    training:"var(--brand-tint)",
    requisition:"var(--green-tint)",
    payroll:"var(--green-tint)",
    admin:"var(--ink-tint)",
    finance:"var(--gold-tint)",
    treasury:"var(--gold-tint)"
  }[code] || "var(--brand-tint)";
}

function calendarIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v14H3V7a2 2 0 0 1 2-2Z"/></svg>`;
}

function checkIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6 9 17l-5-5"/></svg>`;
}

function starIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/></svg>`;
}

function rubleIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M7 11h8a4 4 0 0 0 0-8h-7v18M7 15h9M7 19h6"/></svg>`;
}

function boxIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/></svg>`;
}

function bookIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z"/><path d="M8 6h8M8 10h6"/></svg>`;
}

function settingsIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1A1.7 1.7 0 0 0 10 3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1A1.7 1.7 0 0 0 21 10h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>`;
}

function arrowLeftIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="19" height="19"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;
}

function arrowRightIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="19" height="19"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
}

function uploadIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v12M7 8l5-5 5 5M5 21h14"/></svg>`;
}
