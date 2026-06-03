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

function serviceUrl(service){
  return service.code === "admin" ? "/admin" : service.url;
}

function serviceForPath(path){
  if(path === "/admin"){
    return state.services.find((item)=>item.code === "admin") || null;
  }
  return state.services.find((item)=>item.url === path) || null;
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
          <span class="status">ЛК</span>
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
          <input name="hourlyRate" type="number" min="0" step="50" value="${employee.hourlyRate ?? ""}" placeholder="250">
        </label>
      </div>

      <div class="access-box">
        <div class="row-title">Доступы</div>
        <div class="row-sub">Раздел виден сотруднику только при включённом доступе</div>
        <div class="access-grid">
          ${admin.services.map((service)=>renderServiceAccess(service, employee)).join("")}
        </div>
      </div>

      ${state.adminError ? `<div class="error admin-form-error">${escapeHtml(state.adminError)}</div>` : ""}

      <div class="admin-actions">
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

  app.innerHTML = `
    <div class="phone wide schedule-phone">
      <section class="screen service-page schedule-screen">
        <div class="backrow">
          <button class="iconbtn" data-action="back">${arrowLeftIcon()}</button>
          <h1 class="page-title">${escapeHtml(service.title)}</h1>
          <span class="status">Postgres</span>
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
    history.pushState(null, "", "/");
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
  if(!service.can_edit) return "";
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

function renderScheduleContent(schedule){
  const monthTitle = formatScheduleMonth(schedule.year, schedule.month);
  const totals = buildScheduleTotals(schedule);
  return `
    <div class="monthbar">
      <button class="btn icon" data-month-action="prev">‹</button>
      <div class="mname">${monthTitle}</div>
      <button class="btn icon" data-month-action="next">›</button>
    </div>
    ${renderMoneySummary(schedule, totals)}
    ${schedule.employees.length ? renderScheduleTable(schedule) : renderEmptySchedule()}
    <h2 class="sec">Итоги за месяц</h2>
    ${renderRoleTotals(schedule, totals)}
    <div class="cards">
      ${renderSummaryCards(schedule, totals)}
    </div>
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
        <tfoot>
          ${renderScheduleFooter(schedule, totals)}
        </tfoot>
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
      ${employees.map((employee)=>renderShiftCell(day, employee)).join("")}
      <td class="colSum"><span class="cv">${day.coverage || ""}</span></td>
      ${canSeeMoney ? `<td class="colMoney"><span class="mv">${day.fot ? formatMoneyPlain(day.fot) : ""}</span></td><td class="colPlan"><span class="pv">${day.fot ? escapeHtml(day.revenuePlan) : ""}</span></td>` : ""}
    </tr>
  `;
}

function renderShiftCell(day, employee){
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
      ? shift.payAmount == null ? "✓" : compactCellMoney(shift.payAmount)
      : shift.hours == null ? "•" : formatHours(shift.hours)
    : "";
  const valueClass = isFixedShift(employee, shift) ? "h fx" : "h";

  return `
    <td class="${classes}" data-schedule-cell="1" data-date="${escapeAttr(day.date)}" data-employee="${escapeAttr(employee.id)}">
      <span class="${valueClass}" style="${shift ? `background:${roleColor(employee.role)}` : ""}">${label}</span>
      ${renderScoreDots(score)}
    </td>
  `;
}

function renderEmployeeHeader(employee){
  const sub = isFixedPayEmployee(employee) ? "фикс" : `${formatHours(employee.defaultHours || 12)}ч`;
  return `
    <th class="emp" title="${escapeAttr(employee.name)}">
      <div class="nm">${escapeHtml(shortScheduleName(employee.name))}</div>
      <div class="rl">${escapeHtml(sub)}</div>
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
  if(schedule.canSeeMoney){
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

  return `
    <div class="moneySummary employee-money">
      <div class="msmain">
        <div class="mslabel">Мой расчет</div>
        <div class="msbig">${formatMoneyPlain(schedule.summary.totalRemaining)} ₽</div>
      </div>
      <div class="msrow">
        <span>Начислено: <b>${formatMoneyPlain(schedule.summary.totalFot)} ₽</b></span>
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
  if(!service.can_edit || !state.schedule || !state.selectedScheduleCell) return "";
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
  if(!service.can_edit || !state.schedule || !state.selectedScheduleDate) return "";
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
    if(!service.can_edit) return;

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
    if(!service.can_edit) return;
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

function uploadIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v12M7 8l5-5 5 5M5 21h14"/></svg>`;
}
