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
  payroll: {
    accent: "var(--green)",
    description: "Начисления",
    icon: rubleIcon
  },
  admin: {
    accent: "var(--ink)",
    description: "Управление",
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
  selectedScheduleCell: null,
  scheduleSaving: false,
  importResult: null,
  pin: "",
  error: ""
};

init();

async function init(){
  window.addEventListener("popstate", render);
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
          <div class="logo"><span>E</span></div>
          <div class="pin-title">no-money-no-honey</div>
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
    const session = await apiPost("/api/auth/pin", { pin: state.pin });
    state.user = session.user;
    state.services = session.services;
    state.summary = await apiGet("/api/summary");
    state.pin = "";
    history.replaceState(null, "", "/");
    render();
  }catch(error){
    state.pin = "";
    state.error = error.status === 429 ? "Пауза перед следующей попыткой" : "PIN не подошел";
    render();
  }
}

function renderHub(){
  const role = roleLabel(state.user.role);
  const today = new Intl.DateTimeFormat("ru-RU", { weekday:"short", day:"numeric", month:"long" }).format(new Date());
  app.innerHTML = `
    <div class="phone">
      <section class="screen">
        <header class="top">
          <span class="mark"></span>
          <h1 class="brand-title">Etna</h1>
          <span class="top-meta">${today}</span>
        </header>
        <div class="greet">
          <div class="hi">Привет, ${escapeHtml(firstName(state.user.displayName))}</div>
          <span class="role">${escapeHtml(role)}</span>
        </div>
        <div class="stats">
          <div class="stat"><div class="k">Смен</div><div class="v">${state.summary?.shiftsCount ?? 0}</div></div>
          <div class="stat"><div class="k">Задач</div><div class="v">${state.summary?.tasksOpen ?? 0}</div></div>
          <div class="stat"><div class="k">Выдано</div><div class="v">${formatMoney(state.summary?.paidTotal ?? 0)}</div></div>
        </div>
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
}

function renderServiceCard(service){
  const meta = serviceMeta[service.code] || serviceMeta.schedule;
  return `
    <button class="navcard" style="border-left-color:${meta.accent}" data-url="${escapeAttr(service.url)}">
      <span class="icon" style="color:${meta.accent};background:${tintFor(service.code)}">${meta.icon()}</span>
      <span>
        <span class="t">${escapeHtml(service.title)}</span>
        <span class="d">${escapeHtml(meta.description)}</span>
      </span>
    </button>
  `;
}

function renderServicePage(path){
  const service = state.services.find((item)=>item.url === path);
  if(!service){
    history.replaceState(null, "", "/");
    renderHub();
    return;
  }

  if(service.code === "schedule"){
    renderSchedulePage(service);
    return;
  }

  const statusText = service.code === "schedule" ? "резерв: GitHub Pages" : "готовится";
  const extra = service.code === "schedule"
    ? `<a class="ghost" href="https://etna-35.github.io/grafik/">Открыть текущий график</a>`
    : "";

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

  const importBox = service.can_edit
    ? `
      <div class="panel import-panel">
        <div class="row">
          <span class="grow">
            <span class="row-title">Импорт старого графика</span>
            <span class="row-sub">JSON-бэкап из текущего календаря</span>
          </span>
          <label class="ghost file-btn">
            Выбрать
            <input id="scheduleImportFile" type="file" accept="application/json,.json">
          </label>
        </div>
        ${state.importResult ? `<div class="import-result">${escapeHtml(state.importResult)}</div>` : ""}
      </div>
    `
    : "";

  app.innerHTML = `
    <div class="phone wide">
      <section class="screen service-page">
        <div class="backrow">
          <button class="iconbtn" data-action="back">${arrowLeftIcon()}</button>
          <h1 class="page-title">${escapeHtml(service.title)}</h1>
          <span class="status">Postgres</span>
        </div>
        ${importBox}
        ${renderScheduleEditor(service)}
        ${body}
        <div class="panel">
          <a class="ghost" href="https://etna-35.github.io/grafik/">Открыть старый график</a>
        </div>
      </section>
    </div>
  `;

  app.querySelector("[data-action='back']").addEventListener("click", ()=>{
    history.pushState(null, "", "/");
    render();
  });

  const fileInput = app.querySelector("#scheduleImportFile");
  if(fileInput){
    fileInput.addEventListener("change", handleScheduleImport);
  }

  app.querySelectorAll("[data-schedule-cell]").forEach((cell)=>{
    cell.addEventListener("click", ()=>{
      if(!service.can_edit) return;
      state.selectedScheduleCell = {
        date: cell.dataset.date,
        employeeId: cell.dataset.employee
      };
      render();
    });
  });

  app.querySelectorAll("[data-month-action]").forEach((button)=>{
    button.addEventListener("click", ()=>{
      const direction = button.dataset.monthAction === "next" ? 1 : -1;
      const base = new Date((state.schedule?.year || year), (state.schedule?.month || month) - 1 + direction, 1);
      state.selectedScheduleCell = null;
      state.schedule = null;
      loadSchedule(base.getFullYear(), base.getMonth() + 1);
    });
  });

  bindScheduleEditor();
}

function renderScheduleContent(schedule){
  const monthTitle = new Intl.DateTimeFormat("ru-RU", { month:"long", year:"numeric" })
    .format(new Date(schedule.year, schedule.month - 1, 1));
  return `
    <div class="schedule-head">
      <div class="month-row">
        <button class="iconbtn small" data-month-action="prev">${arrowLeftIcon()}</button>
        <div class="hi small">${monthTitle}</div>
        <button class="iconbtn small" data-month-action="next">${arrowRightIcon()}</button>
      </div>
      <div class="schedule-summary">
        ${schedule.canSeeMoney
          ? `
            <div class="stat"><div class="k">ФОТ</div><div class="v">${formatMoney(schedule.summary.totalFot)}</div></div>
            <div class="stat"><div class="k">Выдано</div><div class="v">${formatMoney(schedule.summary.totalPaid)}</div></div>
            <div class="stat"><div class="k">План</div><div class="v">${escapeHtml(schedule.summary.revenuePlan)}</div></div>
          `
          : `
            <div class="stat"><div class="k">Начислено</div><div class="v">${formatMoney(schedule.summary.totalFot)}</div></div>
            <div class="stat"><div class="k">Выдано</div><div class="v">${formatMoney(schedule.summary.totalPaid)}</div></div>
            <div class="stat"><div class="k">Остаток</div><div class="v">${formatMoney(schedule.summary.totalRemaining)}</div></div>
          `}
      </div>
    </div>
    ${schedule.employees.length ? renderScheduleTable(schedule) : renderEmptySchedule()}
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
  return `
    <div class="schedule-wrap">
      <table class="schedule-table">
        <thead>
          <tr>
            <th>Дата</th>
            ${schedule.employees.map((employee)=>`<th>${escapeHtml(shortName(employee.name))}</th>`).join("")}
            ${schedule.canSeeMoney ? `<th>ФОТ</th>` : ""}
          </tr>
        </thead>
        <tbody>
          ${schedule.days.map((day)=>renderScheduleDay(day, schedule.employees, schedule.canSeeMoney)).join("")}
        </tbody>
      </table>
    </div>
    <div class="employee-totals">
      ${schedule.employees.filter((employee)=>schedule.canSeeMoney || employee.id === state.user?.id).map(renderEmployeeTotal).join("")}
    </div>
  `;
}

function renderScheduleDay(day, employees, canSeeMoney){
  const date = new Date(`${day.date}T00:00:00`);
  const dateLabel = new Intl.DateTimeFormat("ru-RU", { day:"2-digit", weekday:"short" }).format(date);
  return `
    <tr>
      <td class="date-cell">
        <span>${dateLabel}</span>
        ${day.isDeadline ? `<span class="mini-mark">☆</span>` : ""}
      </td>
      ${employees.map((employee)=>renderShiftCell(day, employee)).join("")}
      ${canSeeMoney ? `<td class="fot-cell">${day.fot ? formatMoney(day.fot) : ""}</td>` : ""}
    </tr>
  `;
}

function renderShiftCell(day, employee){
  const shift = day.shifts[employee.id];
  const hasPayday = day.plannedPayEmployeeIds.includes(employee.id);
  const hasPayout = day.payouts.some((payout)=>payout.employee_id === employee.id || payout.employeeId === employee.id);
  const score = day.scores.find((item)=>item.employee_id === employee.id || item.employeeId === employee.id)?.score;
  const classes = [
    "shift-cell",
    shift ? "on" : "",
    hasPayday ? "payday" : "",
    hasPayout ? "payout" : ""
  ].filter(Boolean).join(" ");

  const label = shift
    ? shift.payModel === "fixed"
      ? shift.payAmount == null ? "•" : formatMoney(shift.payAmount)
      : shift.hours == null ? "•" : `${formatHours(shift.hours)}ч`
    : "";

  return `
    <td class="${classes}" data-schedule-cell="1" data-date="${escapeAttr(day.date)}" data-employee="${escapeAttr(employee.id)}">
      <span>${label}</span>
      ${score ? `<i class="score ${escapeAttr(score)}"></i>` : ""}
    </td>
  `;
}

function renderScheduleEditor(service){
  if(!service.can_edit || !state.schedule || !state.selectedScheduleCell) return "";
  const context = selectedScheduleContext();
  if(!context) return "";

  const { day, employee, shift, employeePayouts, score } = context;
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
          <span class="row-sub">${dateLabel} · ${escapeHtml(employee.roleLabel)}</span>
        </span>
        <button class="iconbtn small" data-editor-action="close">×</button>
      </div>

      <div class="editor-grid">
        <label class="field">
          <span>${isFixed ? "Сумма смены" : "Часы"}</span>
          <input id="shiftValue" type="number" min="0" step="${isFixed ? "100" : "0.5"}" value="${escapeAttr(shiftValue)}">
        </label>
        <button class="ghost brand-action" data-editor-action="save-shift">${shift ? "Сохранить" : "Поставить"}</button>
        ${shift ? `<button class="ghost danger-action" data-editor-action="delete-shift">Снять смену</button>` : ""}
      </div>

      <div class="toggle-row">
        <label><input id="deadlineToggle" type="checkbox" ${day.isDeadline ? "checked" : ""}> Дедлайн</label>
        <label><input id="paydayToggle" type="checkbox" ${day.plannedPayEmployeeIds.includes(employee.id) ? "checked" : ""}> День зарплаты</label>
      </div>

      <div class="score-row">
        <span class="row-sub">Оценка</span>
        ${["green","yellow","red"].map((value)=>`<button class="score-pick ${value}${score === value ? " on" : ""}" data-score="${value}" title="${scoreLabel(value)}"></button>`).join("")}
        ${score ? `<button class="ghost mini" data-editor-action="clear-score">Снять</button>` : ""}
      </div>

      <div class="payout-editor">
        <div class="row-sub">Фактические выплаты</div>
        ${employeePayouts.length ? employeePayouts.map((payout)=>`
          <div class="payout-item">
            <span>${formatMoney(payout.amount)}</span>
            <button class="ghost mini danger-action" data-delete-payout="${escapeAttr(payout.id)}">Удалить</button>
          </div>
        `).join("") : `<div class="muted-line">Выплат нет</div>`}
        <div class="payout-add">
          <input id="payoutAmount" type="number" min="0" step="100" placeholder="сумма">
          <button class="ghost" data-editor-action="add-payout">Добавить</button>
        </div>
      </div>

      ${state.scheduleSaving ? `<div class="import-result">Сохраняю</div>` : ""}
    </div>
  `;
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

  const deadlineToggle = app.querySelector("#deadlineToggle");
  if(deadlineToggle){
    deadlineToggle.addEventListener("change", ()=>setDeadline(context.day.date, deadlineToggle.checked));
  }

  const paydayToggle = app.querySelector("#paydayToggle");
  if(paydayToggle){
    paydayToggle.addEventListener("change", ()=>setPayday(context.day.date, context.employee.id, paydayToggle.checked));
  }

  app.querySelectorAll("[data-score]").forEach((button)=>{
    button.addEventListener("click", ()=>setScore(context, button.dataset.score));
  });

  const clearScore = app.querySelector("[data-editor-action='clear-score']");
  if(clearScore){
    clearScore.addEventListener("click", ()=>clearScoreFor(context));
  }

  const addPayout = app.querySelector("[data-editor-action='add-payout']");
  if(addPayout){
    addPayout.addEventListener("click", ()=>addPayoutFor(context));
  }

  app.querySelectorAll("[data-delete-payout]").forEach((button)=>{
    button.addEventListener("click", ()=>deletePayout(button.dataset.deletePayout));
  });
}

function selectedScheduleContext(){
  if(!state.schedule || !state.selectedScheduleCell) return null;
  const day = state.schedule.days.find((item)=>item.date === state.selectedScheduleCell.date);
  const employee = state.schedule.employees.find((item)=>item.id === state.selectedScheduleCell.employeeId);
  if(!day || !employee) return null;
  const shift = day.shifts[employee.id] || null;
  const employeePayouts = day.payouts.filter((payout)=>payout.employee_id === employee.id || payout.employeeId === employee.id);
  const score = day.scores.find((item)=>item.employee_id === employee.id || item.employeeId === employee.id)?.score || null;
  return { day, employee, shift, employeePayouts, score };
}

async function saveSelectedShift(context){
  const value = Number(app.querySelector("#shiftValue")?.value);
  if(!Number.isFinite(value) || value <= 0) return;
  const body = {
    workDate: context.day.date,
    employeeId: context.employee.id
  };
  if(isFixedPayEmployee(context.employee)) body.payAmount = Math.round(value);
  else body.hours = value;
  await saveAndReload(()=>apiPut("/api/schedule/shifts", body));
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

async function addPayoutFor(context){
  const amount = Number(app.querySelector("#payoutAmount")?.value);
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
  render();
  try{
    await action();
    const year = state.schedule?.year || new Date().getFullYear();
    const month = state.schedule?.month || new Date().getMonth() + 1;
    state.schedule = await apiGet(`/api/schedule?year=${year}&month=${month}`);
    state.summary = await apiGet("/api/summary");
  }catch(error){
    state.scheduleError = "Не удалось сохранить";
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
  history.replaceState(null, "", "/");
  render();
}

async function apiGet(url){
  const response = await fetch(url, { credentials:"same-origin" });
  if(!response.ok) throw withStatus(response);
  return response.json();
}

async function apiPost(url, body){
  const response = await fetch(url, {
    method:"POST",
    credentials:"same-origin",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(body)
  });
  if(!response.ok) throw withStatus(response);
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
    credentials:"same-origin",
    headers:{ "Content-Type":"application/json" }
  };
  if(body !== undefined) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  if(!response.ok) throw withStatus(response);
  return response.json();
}

function withStatus(response){
  const error = new Error(response.statusText);
  error.status = response.status;
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

function scoreLabel(value){
  return { green:"Зелёная", yellow:"Жёлтая", red:"Красная" }[value] || "";
}

function isFixedPayEmployee(employee){
  return employee.payModel === "fixed" || employee.role === "dish" || employee.role === "dishwasher";
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

function settingsIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1A1.7 1.7 0 0 0 10 3V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1A1.7 1.7 0 0 0 21 10h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>`;
}

function arrowLeftIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="19" height="19"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;
}

function arrowRightIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="19" height="19"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
}
