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
  }
};

let state = {
  loading: true,
  user: null,
  services: [],
  summary: null,
  schedule: null,
  scheduleLoading: false,
  scheduleError: "",
  scheduleSaveError: "",
  selectedScheduleCell: null,
  selectedScheduleDate: null,
  selectedDateEmployeeId: null,
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
  requisitionUrgent: false,
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
        ${renderDayPanel()}
        ${renderSalesGoals()}
        ${renderMerits()}
        <h2 class="section-title">Сервисы</h2>
        <div class="nav">
          ${state.services.map(renderServiceCard).join("")}
        </div>
        <h2 class="section-title"></h2>
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
            <div class="award-bar"><i style="width:${s.progressPct ?? 0}%"></i></div>
          </div>
        </button>
        <button class="merit-tasks" data-url="/tasks">
          <span>Задачи на месяц</span>
          <b>${s.tasksDone ?? 0}/${s.tasksTotal ?? 0}</b>
        </button>
      </div>
      <div class="merit-badges">
        <div class="badge-stat"><span class="bi">${heartIcon()}</span><div class="bs-num"><span class="mult">×</span>${praises}</div><span class="bs-lbl">похвалы</span></div>
        <div class="badge-stat"><span class="bi bi-score">${meritStarIcon()}</span><div class="bs-num"><span class="mult">×</span>${scores}</div><span class="bs-lbl">оценки</span></div>
        <button class="badge-stat badge-praise" data-action="praise"><span class="praise-plus">＋</span><span class="bs-lbl">Спасибо</span></button>
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
          <button class="iconbtn" data-action="prog-back">${arrowLeftIcon()}</button>
          <h1 class="page-title">Мой прогресс</h1>
        </div>
        ${state.progressLoading
          ? `<div class="panel"><div class="loader compact">Загружаю</div></div>`
          : p ? `
            <div class="progress-next">
              <div class="prog-lock">${lockIcon()}</div>
              <div><b>Уровень ${p.level + 1}</b><span>Скрыт — откроется, когда заполнишь шкалу</span></div>
            </div>
            <div class="progress-hero">
              <div class="prog-badge mask">${levelMaskImg(p.level)}</div>
              <div class="prog-title">Уровень ${p.level}</div>
              <div class="award-bar big"><i style="width:${p.progressPct}%"></i></div>
              <div class="prog-sub">${p.progressPct}% · ещё ${p.toNextPct}% до уровня ${p.level + 1}</div>
            </div>
            <h2 class="sec">За что начислено</h2>
            <div class="progress-history">
              ${(p.history || []).length ? p.history.map(renderProgressItem).join("") : `<div class="panel muted-line">Пока пусто — выполняй задания, получай похвалы</div>`}
            </div>
          ` : `<div class="panel muted-line">${escapeHtml(state.progressError || "Нет данных")}</div>`}
      </section>
    </div>
  `;
  app.querySelector("[data-action='prog-back']")?.addEventListener("click", ()=>{
    history.pushState(null, "", "/");
    render();
  });
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
      <div class="goal-bar"><i style="width:${pct}%"></i></div>
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
          <button class="iconbtn" data-action="praise-back">${arrowLeftIcon()}</button>
          <h1 class="page-title">Похвалить коллегу</h1>
        </div>
        ${state.praiseLoading
          ? `<div class="panel"><div class="loader compact">Загружаю</div></div>`
          : data ? `
            <form class="panel" id="praiseForm">
              <label class="field">
                <span>Кого благодарим</span>
                <select name="toId" required>${(data.colleagues || []).map((c)=>`<option value="${escapeAttr(c.id)}">${escapeHtml(c.name)}</option>`).join("")}</select>
              </label>
              <label class="field" style="margin-top:10px">
                <span>За что</span>
                <textarea name="body" maxlength="500" rows="3" placeholder="Спасибо за…" required></textarea>
              </label>
              ${state.praiseError ? `<div class="error" style="text-align:left">${escapeHtml(state.praiseError)}</div>` : ""}
              <button class="ghost brand-action" type="submit" style="margin-top:12px">Отправить похвалу</button>
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

  const statusText = "готовится";
  const extra = "";

  app.innerHTML = `
    <div class="phone">
      <section class="screen service-page">
        <div class="backrow">
          <button class="iconbtn" data-action="back">${arrowLeftIcon()}</button>
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
          <button class="iconbtn" data-action="back">${arrowLeftIcon()}</button>
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

function renderTrainingManager(training){
  const dashboard = training.dashboard || {};
  const employees = dashboard.employees || [];
  return `
    <section class="training-manager">
      <div class="training-manager-head">
        <div>
          <h2 class="sec">Руководителю</h2>
          <div class="row-sub">Прогресс чтения базы знаний по сотрудникам с доступом к разделу</div>
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
        <span>${escapeHtml(roleLabel(employee.role))}${employee.lastReadAt ? ` · ${escapeHtml(formatDateHuman(employee.lastReadAt.slice(0, 10)))}` : ""}</span>
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
        <div class="quiz-gate locked">Глава закрыта. Сначала пройдите тест предыдущей главы — тогда откроется эта.</div>
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
        <button class="ghost brand-action" type="button" data-training-read="${escapeAttr(chapter.id)}" ${chapter.isRead ? "disabled" : ""}>
          ${chapter.isRead ? "Прочитано" : "Отметить прочитанным"}
        </button>
      </div>
      ${chapter.attachments?.length ? `
        <div class="training-attachments">
          ${chapter.attachments.map(renderTrainingAttachment).join("")}
        </div>
      ` : ""}
      <div class="training-body">
        ${trainingTextToHtml(chapter.body)}
      </div>
      ${renderChapterQuiz(chapter)}
    </article>
  `;
}

function renderChapterQuiz(chapter){
  const qz = chapter.quiz || {};
  if(!qz.questionCount) return "";
  if(qz.passed) return `<div class="quiz-gate passed">Тест по главе пройден${qz.lastScore!=null?` · ${qz.lastScore}%`:""}. Следующая глава открыта.</div>`;
  if(qz.lockedUntil) return `<div class="quiz-gate fail">Результат ниже 80%. Доизучи материал и вернись к тесту ${formatLockTime(qz.lockedUntil)}.</div>`;
  const mins = Math.max(1, Math.round((qz.durationSec || qz.questionCount*90)/60));
  return `
    <div class="quiz-gate">
      <div class="quiz-gate-info">Чтобы открыть следующую главу — пройдите тест. Вопросов: ${qz.questionCount}, время ~${mins} мин, порог 80%. Правильность во время теста не показывается.</div>
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
}

let quizTimer = null;
function stopQuizTimer(){ if(quizTimer){ clearInterval(quizTimer); quizTimer = null; } }
function formatClock(s){ const m = Math.floor(s/60); return `${m}:${String(s%60).padStart(2,"0")}`; }

async function startQuiz(scope, scopeId){
  try{
    const data = await apiPost(`/api/training/quiz/${scope}/${encodeURIComponent(scopeId)}/start`, {});
    state.quiz = { scope, scopeId, attemptId: data.attemptId, questions: data.questions, answers: {}, durationSec: data.durationSec, endsAt: Date.now() + data.durationSec*1000, result: null, submitting: false };
    renderQuizScreen();
    stopQuizTimer();
    quizTimer = setInterval(()=>{
      const left = Math.max(0, Math.round((state.quiz.endsAt - Date.now())/1000));
      const el = document.getElementById("quizTimer");
      if(el){ el.textContent = formatClock(left); if(left <= 30) el.classList.add("low"); }
      if(left <= 0){ stopQuizTimer(); submitQuiz(true); }
    }, 1000);
  }catch(error){
    state.trainingError = error.code === "locked" ? "Тест временно заблокирован" : "Не удалось начать тест";
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
          <div class="quiz-title">Тест${q.scope === "attestation" ? " · аттестация" : ""}</div>
          <div class="quiz-timer" id="quizTimer">${formatClock(Math.round(q.durationSec))}</div>
        </div>
        <div class="hint" style="margin:0 2px 12px">Правильность ответов не показывается. Порог — 80%. Время ограничено: по истечении тест завершится автоматически.</div>
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
        <div class="shift-footer"><button class="btn brand-action" type="button" id="quizSubmit" style="width:100%">Завершить тест</button></div>
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
            : `Нужно не меньше ${r.passPct || 80}%. Дополнительно изучи информацию и вернись к тесту через 2 часа.`}</p>
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
          <button class="iconbtn" data-action="back">${arrowLeftIcon()}</button>
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
      <div class="task-metric"><span>У команды</span><b>${team.total || 0}</b></div>
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
  const done = task.status === "done";
  return `
    <div class="task-card ${done ? "done" : "open"}">
      <div class="task-main">
        <div class="task-title-row">
          <span class="task-title">${escapeHtml(task.title)}</span>
          <span class="task-status ${done ? "done" : "open"}">${done ? "Готово" : "В работе"}</span>
        </div>
        ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ""}
        <div class="task-meta">
          ${task.audienceRole ? `<span class="task-aud">Вся смена · ${roleAudienceLabel(task.audienceRole)}</span>` : (showEmployee && task.employeeName ? `<span>${escapeHtml(task.employeeName)}</span>` : "")}
          ${task.deadlineDate ? `<span>${escapeHtml(formatDateHuman(task.deadlineDate))}</span>` : ""}
          ${task.rewardAmount ? `<span class="task-reward">+${formatMoneyPlain(task.rewardAmount)} ₽</span>` : ""}
        </div>
      </div>
      <div class="task-actions">
        <button class="ghost mini" type="button" data-task-status="${escapeAttr(task.id)}" data-status="${done ? "open" : "done"}">
          ${done ? "Вернуть" : "Готово"}
        </button>
        ${showEmployee ? `<button class="ghost mini danger-action" type="button" data-task-cancel="${escapeAttr(task.id)}">Снять</button>` : ""}
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
          <button class="iconbtn" data-action="back">${arrowLeftIcon()}</button>
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
  return `
    <div class="req-tabs">
      <button class="${state.requisitionTab === "catalog" ? "on" : ""}" data-req-tab="catalog">Каталог</button>
      <button class="${state.requisitionTab === "cart" ? "on" : ""}" data-req-tab="cart">Моя заявка ${total ? `<b>${total}</b>` : ""}</button>
    </div>
    ${state.requisitionTab === "catalog" ? renderRequisitionCatalog() : renderRequisitionCart()}
    ${state.requisitionNotice ? `<div class="req-notice">${escapeHtml(state.requisitionNotice)}</div>` : ""}
    ${state.requisitionError ? `<div class="error req-error">${escapeHtml(state.requisitionError)}</div>` : ""}
  `;
}

function renderRequisitionCatalog(){
  const categories = requisitionCategoriesForKind(state.requisitionKind);
  const allCount = requisitionItemsForKind(state.requisitionKind).length;

  return `
    <div class="req-toolbar">
      <div class="req-segment">
        <button class="${state.requisitionKind === "product" ? "on" : ""}" data-req-kind="product">Продукты</button>
        <button class="${state.requisitionKind === "household" ? "on" : ""}" data-req-kind="household">Хозтовары</button>
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
        <small>${escapeHtml(item.unit)}</small>
      </span>
      ${entry ? `
        <span class="req-stepper">
          <button type="button" data-req-dec="${escapeAttr(item.id)}">-</button>
          <b>${formatQty(entry.qty)} ${escapeHtml(entry.unit)}</b>
          <button type="button" data-req-inc="${escapeAttr(item.id)}">+</button>
        </span>
      ` : `
        <button class="req-add" type="button" data-req-add="${escapeAttr(item.id)}">+</button>
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
        ${state.requisitionSaving ? "Отправляю" : "Отправить заявку"}
      </button>
    </form>

    <h2 class="sec">История заявок</h2>
    <div class="req-history">
      ${historyData.requisitions.length ? historyData.requisitions.map((record)=>renderRequisitionRecord(record, historyData.canManage)).join("") : `<div class="panel muted-line">Заявок пока нет</div>`}
    </div>
  `;
}

function renderFreeRequisitionPanel(){
  const categories = requisitionCategoriesForKind(state.requisitionKind);
  return `
    <form class="panel req-free" id="requisitionFreeForm">
      <div class="row-title">Другое</div>
      <div class="row-sub">Если позиции нет в каталоге, добавь её свободной строкой</div>
      <div class="req-free-grid">
        <label class="field">
          <span>Тип</span>
          <select name="freeKind">
            <option value="product" ${state.requisitionKind === "product" ? "selected" : ""}>Продукты</option>
            <option value="household" ${state.requisitionKind === "household" ? "selected" : ""}>Хозтовары</option>
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
    <div class="req-cart-line">
      <span class="req-item-main">
        <b>${escapeHtml(item.name)}</b>
        <small>${escapeHtml(item.unit)}</small>
        <button class="req-urgent-toggle ${item.urgent ? "on" : ""}" type="button" data-req-urgent="${escapeAttr(item.key)}">${item.urgent ? "Срочно ✓" : "Срочно"}</button>
      </span>
      <span class="req-stepper">
        <button type="button" data-req-dec="${escapeAttr(item.key)}">-</button>
        <b>${formatQty(item.qty)} ${escapeHtml(item.unit)}</b>
        <button type="button" data-req-inc="${escapeAttr(item.key)}">+</button>
      </span>
      <button class="ghost mini" type="button" data-req-remove="${escapeAttr(item.key)}">Убрать</button>
    </div>
  `;
}

function renderRequisitionRecord(record, canManage){
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
        ${record.totalLines} ${pluralize(record.totalLines, "позиция", "позиции", "позиций")} · продукты ${record.productLines} · хоз ${record.householdLines}
      </div>
      <div class="req-record-lines">
        ${(record.lines || []).slice(0, 8).map((line)=>`
          <span class="${line.urgent ? "urgent" : ""}">${line.urgent ? "● " : ""}${escapeHtml(line.name)} <b>${formatQty(line.qty)} ${escapeHtml(line.unit)}</b></span>
        `).join("")}
        ${(record.lines || []).length > 8 ? `<span>ещё ${(record.lines || []).length - 8}</span>` : ""}
      </div>
      ${record.comment ? `<div class="req-record-comment">${escapeHtml(record.comment)}</div>` : ""}
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
  state.requisitionSaving = true;
  state.requisitionError = "";
  state.requisitionNotice = "";
  state.requisitionComment = form.elements.comment.value.trim();
  render();
  try{
    await apiPost("/api/requisitions", {
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
    });
    state.requisitionCart = {};
    state.requisitionComment = "";
    state.requisitionNotice = "Заявка отправлена";
    await refreshRequisitionData();
  }catch(error){
    state.requisitionError = error.code === "forbidden_catalog_item" || error.code === "forbidden_category"
      ? "Эта категория недоступна для твоей роли"
      : "Не удалось отправить заявку";
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
          <button class="iconbtn" data-action="back">${arrowLeftIcon()}</button>
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
}

function renderPayrollContent(payroll){
  const summary = payroll.summary || {};
  const hookahRows = payroll.hookah || [];
  const showHookah = summary.isHookahMaster || hookahRows.length > 0;
  return `
    <div class="monthbar">
      <button class="btn icon" data-payroll-month="prev">‹</button>
      <div class="mname">${formatScheduleMonth(payroll.year, payroll.month)}</div>
      <button class="btn icon" data-payroll-month="next">›</button>
    </div>

    <div class="payroll-hero">
      <div>
        <div class="mslabel">Остаток к выплате</div>
        <div class="payroll-balance">${formatMoneyPlain(summary.remaining || 0)} ₽</div>
      </div>
      <div class="payroll-next">
        <span>Ближайшая дата</span>
        <b>${summary.upcomingPayday ? escapeHtml(formatDateHuman(summary.upcomingPayday)) : "не назначена"}</b>
      </div>
    </div>

    <div class="payroll-metrics">
      <div class="pay-metric"><span>Начислено</span><b>${formatMoneyPlain(summary.accrued || 0)} ₽</b></div>
      <div class="pay-metric"><span>Выдано</span><b>${formatMoneyPlain(summary.paid || 0)} ₽</b></div>
      ${showHookah ? `<div class="pay-metric"><span>Кальяны</span><b>${formatMoneyPlain(summary.hookahAccrued || 0)} ₽</b></div>` : ""}
      ${summary.taskRewardCount || summary.goalRewardCount ? `<div class="pay-metric"><span>Премии</span><b>${formatMoneyPlain((summary.taskRewardAccrued || 0) + (summary.goalRewardAccrued || 0))} ₽</b></div>` : ""}
      <div class="pay-metric"><span>Смены</span><b>${summary.shifts || 0}</b></div>
      <div class="pay-metric"><span>Часы</span><b>${formatHours(summary.hours || 0)}</b></div>
    </div>

    ${showHookah ? `
      <h2 class="sec">Кальяны</h2>
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

    <h2 class="sec">История выплат ЗП</h2>
    <div class="payroll-list">
      ${(payroll.payouts || []).length ? payroll.payouts.map((payout)=>`
        <div class="payroll-row">
          <span>
            <b>${formatMoneyPlain(payout.amount)} ₽</b>
            <small>${escapeHtml(formatDateHuman(payout.workDate))}</small>
          </span>
          <i>выдано</i>
        </div>
      `).join("") : `<div class="panel muted-line">В этом месяце выплат пока нет</div>`}
    </div>

    <h2 class="sec">Начисления по сменам</h2>
    <div class="payroll-list">
      ${(payroll.shifts || []).length ? payroll.shifts.map((shift)=>`
        <div class="payroll-row">
          <span>
            <b>${formatMoneyPlain(shift.payAmount)} ₽</b>
            <small>${escapeHtml(formatDateHuman(shift.workDate))}${shift.hours ? ` · ${formatHours(shift.hours)} ч` : ""}</small>
          </span>
          <i>${shift.payModel === "fixed" ? "фикс" : "смена"}</i>
        </div>
      `).join("") : `<div class="panel muted-line">В этом месяце смен пока нет</div>`}
    </div>
  `;
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
          <button class="iconbtn" data-action="back">${arrowLeftIcon()}</button>
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
      ${employee.startDate ? `<div class="hint">Стаж: ${escapeHtml(formatTenure(employee.startDate))}</div>` : ""}

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
          <button class="iconbtn" data-action="back">${arrowLeftIcon()}</button>
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

function renderShiftClosingForm(){
  const init = state.shiftClosingInit;
  const form = state.shiftClosingForm;
  const preview = computeShiftClosingPreview(form, init);
  const existing = state.shiftClosingRecord;
  const cashDiffOk = Math.abs(preview.closingCashDiff) <= init.cashDiffLimit;
  const msk = moscowNow();
  const nightWarn = msk.hour < 6;
  const serverShiftDate = init.serverShiftDate || init.workDate;
  const canGoNext = init.workDate < serverShiftDate;

  return `
    <form id="shiftClosingForm" class="shift-close-form">
      <header class="shift-close-head">
        <div class="shift-head-main">
          <div class="whorow">
            <span class="chip"><span class="dot"></span>${escapeHtml(firstName(init.user.displayName))}</span>
            <span class="chip muted">МСК ${msk.hh}:${msk.mm}</span>
          </div>
          <div class="shift-date-nav">
            <button class="iconbtn small" type="button" data-shift-date="prev" aria-label="Предыдущий день">${arrowLeftIcon()}</button>
            <div class="shift-date-label">
              <span class="shift-date-cap">Смена за</span>
              <span class="shift-date-day">${escapeHtml(formatDateHuman(init.workDate))}</span>
            </div>
            <button class="iconbtn small" type="button" data-shift-date="next" ${canGoNext ? "" : "disabled"} aria-label="Следующий день">${arrowRightIcon()}</button>
          </div>
          ${existing ? `<div class="row-sub">Запись уже есть, изменения обновят закрытие смены</div>` : ""}
        </div>
        ${existing ? `<button class="ghost mini" type="button" data-shift-action="send-telegram">Telegram</button>` : ""}
      </header>
      ${nightWarn ? `<div class="shift-night-warn">Сейчас ${msk.hh}:${msk.mm} по МСК — день уже сменился. Проверь, что закрываешь смену за <b>${escapeHtml(formatDateHuman(init.workDate))}</b>, а не за сегодня.</div>` : ""}

      <h2 class="sec">Касса на открытии</h2>
      ${moneyField("openingCashActual", "Фактический остаток (пересчитай кассу)", form.openingCashActual)}
      ${autoRow("Расчётный остаток", preview.openingCashExpected)}

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
      <div class="two">
        ${moneyField("cashRevenue", "Наличные", form.cashRevenue)}
        ${moneyField("transferRevenue", "Переводы", form.transferRevenue)}
      </div>
      ${resultRow("Выручка итого", preview.revenueTotal, "big")}

      <h2 class="sec">Расходы из кассы</h2>
      ${moneyField("washCost", "Мойка", form.washCost)}
      <div class="two">
        ${hookahEmployeeField(form.hookahEmployeeId, init.hookahEmployees || [])}
        ${numberField("hookahCount", "Кальяны, шт", form.hookahCount)}
      </div>
      ${autoRow(preview.hookahEmployeeName ? `Выпл. кальяны · ${preview.hookahEmployeeName} (${preview.hookahCount} × ${formatMoneyPlain(preview.hookahRate)})` : `Выпл. кальяны (${preview.hookahCount} × ${formatMoneyPlain(preview.hookahRate)})`, preview.hookahPayout)}
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
      <div class="hint">Не вычитается из кассы.</div>

      <h2 class="sec">Инкассация</h2>
      ${moneyField("collectionAmount", "Изъято из кассы", form.collectionAmount)}

      <h2 class="sec">Касса на закрытии</h2>
      ${moneyField("closingCashActual", "Фактический остаток (пересчитай кассу)", form.closingCashActual)}
      ${autoRow("Расчётный остаток", preview.closingCashExpected)}
      ${resultRow("Разница", preview.closingCashDiff, cashDiffOk ? "ok" : "warn", cashDiffOk ? `в пределах нормы (порог ${formatMoneyPlain(init.cashDiffLimit)} ₽)` : `выше порога ${formatMoneyPlain(init.cashDiffLimit)} ₽`)}

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

      <div class="shift-footer">
        <button class="btn brand-action" type="submit">${existing ? "Обновить смену" : "Закрыть смену"}</button>
      </div>
    </form>
  `;
}

function moneyField(name, label, value){
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input class="inp" name="${name}" data-shift-money="${name}" type="number" inputmode="numeric" min="0" step="1" placeholder="0" value="${value ? Number(value) : ""}">
    </label>
  `;
}

function numberField(name, label, value){
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input class="inp" name="${name}" data-shift-money="${name}" type="number" inputmode="numeric" min="0" step="1" placeholder="0" value="${value ? Number(value) : ""}">
    </label>
  `;
}

function hookahEmployeeField(value, employees){
  return `
    <label class="field">
      <span>Кальянщик</span>
      <select class="inp" name="hookahEmployeeId" data-shift-hookah-employee>
        ${employees.length ? employees.map((employee)=>`
          <option value="${escapeAttr(employee.id)}" ${value === employee.id ? "selected" : ""}>
            ${escapeHtml(employee.name)} · ${formatMoneyPlain(employee.rate)} ₽
          </option>
        `).join("") : `<option value="">Нет активных кальянщиков</option>`}
      </select>
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
      state.shiftClosingForm[input.name] = integerOrNull(input.value) || 0;
    });
    input.addEventListener("change", ()=>{
      collectShiftClosingForm();
      render();
    });
  });

  app.querySelector("[data-shift-hookah-employee]")?.addEventListener("change", (event)=>{
    state.shiftClosingForm.hookahEmployeeId = event.target.value || "";
    collectShiftClosingForm();
    render();
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
  if(date !== undefined) state.shiftClosingDate = date;
  render();
  try{
    const init = await apiGet(shiftInitUrl(state.shiftClosingDate));
    state.shiftClosingInit = init;
    state.shiftClosingRecord = init.existing;
    state.shiftClosingForm = shiftClosingFormFrom(init, init.existing);
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
  return {
    workDate: record?.workDate || init.workDate,
    openingCashActual: values.openingCashActual ?? init.openingCashExpected ?? 0,
    terminal1: values.terminal1 || 0,
    terminal2: values.terminal2 || 0,
    netmonet: values.netmonet || 0,
    yandexFood: values.yandexFood || 0,
    cashRevenue: values.cashRevenue || 0,
    transferRevenue: values.transferRevenue || 0,
    washCost: values.washCost || 0,
    hookahEmployeeId: record?.hookahEmployee?.id || init.hookahEmployee?.id || "",
    hookahCount: values.hookahCount || 0,
    taxiAmount: values.taxiAmount || 0,
    collectionAmount: values.collectionAmount || 0,
    closingCashActual: values.closingCashActual || 0,
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
  ["openingCashActual","terminal1","terminal2","netmonet","yandexFood","cashRevenue","transferRevenue","washCost","hookahCount","taxiAmount","collectionAmount","closingCashActual"].forEach((field)=>{
    next[field] = integerOrNull(form.elements[field]?.value) || 0;
  });
  next.hookahEmployeeId = form.elements.hookahEmployeeId?.value || "";
  next.comment = form.elements.comment?.value || "";
  next.extraExpenses = Array.from(app.querySelectorAll("[data-expense-row]")).map((row)=>({
    amount: integerOrNull(row.querySelector("input[name='extraAmount']")?.value) || 0,
    comment: row.querySelector("input[name='extraComment']")?.value || ""
  })).filter((expense)=>expense.amount > 0 || expense.comment.trim());
  state.shiftClosingForm = next;
  return next;
}

function computeShiftClosingPreview(form, init){
  const extraExpensesTotal = (form.extraExpenses || []).reduce((sum, expense)=>sum + Number(expense.amount || 0), 0);
  const hookahEmployee = (init.hookahEmployees || []).find((employee)=>employee.id === form.hookahEmployeeId) || init.hookahEmployee || {};
  const hookahRate = Number(hookahEmployee.rate || 0);
  const hookahCount = Number(form.hookahCount || 0);
  const cashlessTotal = Number(form.terminal1 || 0) + Number(form.terminal2 || 0) + Number(form.netmonet || 0) + Number(form.yandexFood || 0);
  const revenueTotal = cashlessTotal + Number(form.cashRevenue || 0) + Number(form.transferRevenue || 0);
  const hookahPayout = hookahCount * hookahRate;
  const closingCashExpected =
    Number(form.openingCashActual || 0)
    + Number(form.cashRevenue || 0)
    + Number(form.transferRevenue || 0)
    - Number(form.washCost || 0)
    - hookahPayout
    - extraExpensesTotal
    - Number(form.collectionAmount || 0);
  const revenuePlan = Number(init.revenuePlan || 0);
  return {
    openingCashExpected: Number(init.openingCashExpected || 0),
    openingCashDiff: Number(form.openingCashActual || 0) - Number(init.openingCashExpected || 0),
    hookahCount,
    hookahRate,
    hookahEmployeeName: hookahEmployee.name || "",
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

async function submitShiftClosing(){
  if(state.shiftClosingSaving) return;
  const form = collectShiftClosingForm();
  state.shiftClosingSaving = true;
  state.shiftClosingError = "";
  render();
  try{
    const payload = shiftClosingPayload(form);
    const record = state.shiftClosingRecord?.id
      ? await apiPatch(`/api/shift-closing/${encodeURIComponent(state.shiftClosingRecord.id)}`, payload)
      : await apiPost("/api/shift-closing", payload);
    state.shiftClosingRecord = record;
    await uploadShiftPhotos(record.id);
    state.shiftClosingInit = await apiGet(shiftInitUrl(state.shiftClosingDate));
    state.shiftClosingRecord = state.shiftClosingInit.existing || record;
    state.shiftClosingForm = shiftClosingFormFrom(state.shiftClosingInit, state.shiftClosingRecord);
    state.shiftClosingPhotos = {};
  }catch(error){
    state.shiftClosingError = error.code === "shift_already_closed" ? "Смена за эту дату уже закрыта" : "Не удалось закрыть смену";
  }finally{
    state.shiftClosingSaving = false;
    render();
  }
}

function shiftClosingPayload(form){
  return {
    workDate: form.workDate,
    hookahEmployeeId: form.hookahEmployeeId || null,
    openingCashActual: Number(form.openingCashActual || 0),
    terminal1: Number(form.terminal1 || 0),
    terminal2: Number(form.terminal2 || 0),
    netmonet: Number(form.netmonet || 0),
    yandexFood: Number(form.yandexFood || 0),
    cashRevenue: Number(form.cashRevenue || 0),
    transferRevenue: Number(form.transferRevenue || 0),
    washCost: Number(form.washCost || 0),
    hookahCount: Number(form.hookahCount || 0),
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
          <button class="iconbtn" data-action="back">${arrowLeftIcon()}</button>
          <h1 class="page-title">${escapeHtml(service.title)}</h1>
          ${renderScheduleLockControl(service)}
        </div>
        ${renderScheduleEditor(service)}
        ${renderScheduleDateEditor(service)}
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
      state.schedule = null;
      loadSchedule(base.getFullYear(), base.getMonth() + 1);
    });
  });

  bindScheduleEditor();
  bindScheduleDateEditor();
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
      <td class="colDate markDate" data-schedule-date="${escapeAttr(day.date)}">
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

  const label = shift
    ? isFixedShift(employee, shift)
      ? !canSeeMoney || shift.payAmount == null ? "✓" : compactCellMoney(shift.payAmount)
      : shift.hours == null ? "•" : formatHours(shift.hours)
    : "";
  const valueClass = isFixedShift(employee, shift) ? "h fx" : "h";
  const isBirthday = employee.birthDate && day.date.slice(5) === employee.birthDate.slice(5);

  return `
    <td class="${classes}${isBirthday ? " bday" : ""}" data-schedule-cell="1" data-date="${escapeAttr(day.date)}" data-employee="${escapeAttr(employee.id)}">
      <span class="${valueClass}" style="${shift ? `background:${roleColor(employee.role)}` : ""}">${label}</span>
      ${isBirthday ? `<span class="bday-mark" title="День рождения · ${escapeAttr(employee.name)}">ДР</span>` : ""}
      ${renderScoreDots(score)}
    </td>
  `;
}

function renderEmployeeHeader(employee){
  return `
    <th class="emp" title="${escapeAttr(employee.name)}">
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
            ${showMoney && total.paid ? `<div class="payMeta">начислено ${formatMoneyPlain(total.pay)} ₽ · выдано ${formatMoneyPlain(total.paid)} ₽</div>` : ""}
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

    day.payouts.forEach((payout)=>{
      const employeeId = payout.employee_id || payout.employeeId;
      const total = byEmployee.get(employeeId);
      if(total) total.paid += Number(payout.amount || 0);
    });

    day.scores.forEach((score)=>{
      const employeeId = score.employee_id || score.employeeId;
      const total = byEmployee.get(employeeId);
      if(total && score.score in total.scores) total.scores[score.score] += 1;
    });
  });

  byEmployee.forEach((total)=>{
    total.remaining = total.pay == null || total.paid == null ? null : Math.max(0, total.pay - total.paid);
  });

  return { byEmployee, byRole };
}

function emptyEmployeeTotal(){
  return { shifts:0, hours:0, pay:0, paid:0, remaining:0, scores:{ green:0, yellow:0, red:0 } };
}

function renderScheduleEditor(service){
  if(!isScheduleEditingUnlocked(service) || !state.schedule || !state.selectedScheduleCell) return "";
  const context = selectedScheduleContext();
  if(!context) return "";

  const { day, employee, shift } = context;
  const isFixed = isFixedPayEmployee(employee);
  const dateLabel = formatDateHuman(day.date);
  const shiftValue = isFixed
    ? Math.round(shift?.payAmount || 3000)
    : formatInputNumber(shift?.hours || employee.defaultHours || 12);

  return `
    <div class="panel editor-panel">
      <div class="editor-head">
        <span class="grow">
          <span class="row-title">${escapeHtml(employee.name)}</span>
          <span class="row-sub">${dateLabel} · ${isFixed ? "ставка смены" : "нестандартные часы"}</span>
        </span>
        <button class="iconbtn small" data-editor-action="close">×</button>
      </div>

      <div class="editor-grid">
        <label class="field">
          <span>${isFixed ? "Своя сумма" : "Часы"}</span>
          <input id="shiftValue" type="number" min="0" step="${isFixed ? "100" : "0.5"}" value="${escapeAttr(shiftValue)}">
        </label>
        <button class="ghost brand-action" data-editor-action="save-shift">${shift ? "Сохранить" : "Поставить"}</button>
        ${shift ? `<button class="ghost danger-action" data-editor-action="delete-shift">Снять смену</button>` : ""}
      </div>

      ${isFixed ? `
        <div class="fixed-pay-row">
          ${[3000,4000,6000,8000].map((amount)=>`
            <button class="fixed-pay ${Math.round(shift?.payAmount || 0) === amount ? "on" : ""}" data-fixed-pay="${amount}">
              ${formatMoneyPlain(amount)}
            </button>
          `).join("")}
        </div>
      ` : ""}

      ${state.scheduleSaving ? `<div class="import-result">Сохраняю</div>` : ""}
    </div>
  `;
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
        <div class="row-sub">Фактические выплаты</div>
        ${employeePayouts.length ? employeePayouts.map((payout)=>`
          <div class="payout-item">
            <span>${formatMoney(payout.amount)}</span>
            <button class="ghost mini danger-action" data-date-delete-payout="${escapeAttr(payout.id)}">Удалить</button>
          </div>
        `).join("") : `<div class="muted-line">Выплат нет</div>`}
        <div class="payout-add">
          <input id="datePayoutAmount" type="number" min="0" step="100" placeholder="сумма">
          <button class="ghost" data-date-action="add-payout">Добавить</button>
        </div>
      </div>

      ${state.scheduleSaving ? `<div class="import-result">Сохраняю</div>` : ""}
    </div>
  `;
}

function bindScheduleCells(service){
  app.querySelectorAll("[data-schedule-cell]").forEach((cell)=>{
    if(!isScheduleEditingUnlocked(service)) return;

    let pressTimer = null;
    let longPressed = false;

    cell.addEventListener("pointerdown", (event)=>{
      if(event.button && event.button !== 0) return;
      longPressed = false;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(()=>{
        longPressed = true;
        openScheduleEditor(cell);
      }, 460);
    });

    cell.addEventListener("pointerup", (event)=>{
      clearTimeout(pressTimer);
      if(longPressed){
        event.preventDefault();
        return;
      }
      quickEditScheduleCell(cell);
    });

    cell.addEventListener("pointerleave", ()=>{
      clearTimeout(pressTimer);
    });

    cell.addEventListener("contextmenu", (event)=>{
      event.preventDefault();
      clearTimeout(pressTimer);
      openScheduleEditor(cell);
    });
  });
}

function bindScheduleDates(service){
  app.querySelectorAll("[data-schedule-date]").forEach((cell)=>{
    if(!isScheduleEditingUnlocked(service)) return;
    cell.addEventListener("click", ()=>{
      openDateEditor(cell.dataset.scheduleDate);
    });
  });
}

function openScheduleEditor(cell){
  if(!cell || !cell.dataset.date || !cell.dataset.employee) return;
  state.selectedScheduleCell = {
    date: cell.dataset.date,
    employeeId: cell.dataset.employee
  };
  state.selectedScheduleDate = null;
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

async function saveSelectedShift(context){
  const value = Number(app.querySelector("#shiftValue")?.value);
  if(!Number.isFinite(value) || value <= 0) return;
  if(isFixedPayEmployee(context.employee)){
    await saveShiftFor(context, { payAmount: Math.round(value) });
    return;
  }
  await saveShiftFor(context, { hours: value });
}

async function saveShiftFor(context, values){
  const body = {
    workDate: context.day.date,
    employeeId: context.employee.id
  };
  if(values.payAmount != null) body.payAmount = Math.round(values.payAmount);
  if(values.hours != null) body.hours = values.hours;
  await saveAndReload(()=>apiPut("/api/schedule/shifts", body));
}

async function saveFixedPreset(context, payAmount){
  state.selectedScheduleCell = null;
  await saveShiftFor(context, { payAmount });
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

async function addPayoutFor(context, inputSelector = "#payoutAmount"){
  const amount = Number(app.querySelector(inputSelector)?.value);
  if(!Number.isFinite(amount) || amount <= 0) return;
  await saveAndReload(()=>apiPost("/api/schedule/payouts", {
    workDate: context.day.date,
    employeeId: context.employee.id,
    amount: Math.round(amount)
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
        <span class="money">${formatMoney(totals.accrued || 0)}</span>
      </div>
      <div class="row-sub">Выдано ${formatMoney(totals.paid || 0)} · остаток ${formatMoney(totals.remaining || 0)}</div>
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
  state.summary = null;
  state.schedule = null;
  state.scheduleEditUnlocked = false;
  state.payroll = null;
  state.tasks = null;
  state.requisitionCatalog = null;
  state.requisitionHistory = null;
  state.requisitionCart = {};
  state.requisitionComment = "";
  state.requisitionUrgent = false;
  state.requisitionNotice = "";
  history.replaceState(null, "", "/");
  render();
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
  return Number(value).toString().replace(".5", ",5");
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

function formatDateTimeHuman(value){
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }).format(date);
}

function formatQty(value){
  return String(Number(value || 0)).replace(".", ",").replace(/,0$/, "");
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
  const amount = Number(value || 0);
  if(amount >= 1000) return `${Math.round(amount / 1000)}к`;
  return String(Math.round(amount));
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
    schedule:"rgba(143,36,51,.08)",
    shift_close:"rgba(47,111,107,.08)",
    tasks:"rgba(176,122,30,.1)",
    training:"rgba(143,36,51,.08)",
    requisition:"rgba(47,111,79,.1)",
    payroll:"rgba(47,111,79,.09)",
    admin:"rgba(42,35,32,.08)"
  }[code] || "rgba(143,36,51,.08)";
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
