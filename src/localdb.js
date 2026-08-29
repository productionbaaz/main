import { uid, normLabel, STATUS_OPTIONS } from './utils';

/* ============================================================
   Everything lives in localStorage on this one device/browser.
   No server, no network call, ever — that's what makes it instant.
   The trade-off: this device's data is not shared with any other
   device. Bring data over between devices using Export/Import CSV
   on each sheet.
   ============================================================ */

const LS_USERS = 'baaz_users';
const LS_SESSION = 'baaz_session';
const LS_REGISTRY = 'baaz_registry';
const LS_BANK = 'baaz_bank_details';
const colsKey = (id) => 'baaz_cols_' + id;
const rowsKey = (id) => 'baaz_rows_' + id;

function loadJSON(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch (e) {
    return fallback;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ---------------- password hashing ----------------
   There is no server here, so this can never be "real" security — anyone
   with access to this browser's dev tools can inspect everything. This
   still hashes (SHA-256 + a random salt per user) rather than storing
   plain text, so a password isn't sitting there in cleartext if someone
   glances at storage, and a manager gets "reset" rather than "view" for
   employee passwords, same as before. */
async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function makeSalt() {
  const arr = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function hashPassword(password, salt) {
  return sha256Hex(password + ':' + salt);
}
async function verifyPassword(password, salt, hash) {
  return (await hashPassword(password, salt)) === hash;
}

/* ---------------- default sheet structures (columns only — no seed rows) ---------------- */
const STATUS_LIST = ['Pending', 'In Progress', 'Completed', 'On Hold'];
const PRIORITY_LIST = ['Low', 'Medium', 'High'];
const CLIENT_STATUS_LIST = ['One Time', 'Long Term'];
const COMM_MODE_LIST = ['Upwork', 'Trello', 'Slack', 'Discord', 'Email', 'WhatsApp', 'Fiverr', 'Zoom', 'Other'];
const CONTRACT_TYPE_LIST = ['Per Video', 'Per Project', 'Hourly', 'Monthly Retainer', 'Milestone-Based', 'Other'];
const PAYMENT_STATUS_LIST = ['Unpaid', 'Partial', 'Paid'];
const PAYMENT_MODE_LIST = ['Bank Transfer', 'PayPal', 'Payoneer', 'Upwork Payment', 'Wise', 'Cash', 'Other'];
const FEEDBACK_STATUS_LIST = ['Pending', 'Reviewed', 'Actioned'];
const TERM_LIST = ['Long Term', 'Short Term', 'One Time'];
const BUDGET_PROGRESS_LIST = ['Waiting', 'In Progress', 'Completed'];
const ATTENDANCE_ACTION_LIST = ['Check In', 'Check Out'];
const CLIENT_TYPE_LIST = ['Weekly Client', 'Occasional Client'];
const WORK_STATUS_LIST = ['Active', 'Inactive'];
const DESIGNATION_LIST = ['Manager', 'Senior Video Editor', 'Video Editor', 'Sales Officer', 'Office Boy', 'Internship'];
const DEPARTMENT_LIST = ['Management', 'Editing'];
const EMPLOYEE_STATUS_LIST = ['Active', 'Resigned', 'Terminated', 'Not Active'];
const ASSET_CATEGORY_LIST = ['Furniture', 'Electrical', 'Interior', 'Equipment', 'Networking', 'Utility', 'Other'];
const ASSET_STATUS_LIST = ['Active', 'Inactive', 'Under Repair'];
const EDITING_STATUS_LIST = ['Pending', 'In Progress', 'Completed'];

const SHEET_DEFS = {
  'client-tracking': { name: 'Client Tracking', icon: 'clients', columns: [
    { key: 'sr', label: 'SR.', type: 'text', width: 44 },
    { key: 'year', label: 'Year', type: 'text', width: 56 },
    { key: 'month', label: 'Month', type: 'text', width: 44 },
    { key: 'clientName', label: 'Client', type: 'text', width: 130 },
    { key: 'company', label: 'Company / Brand', type: 'text', width: 120 },
    { key: 'projectTitle', label: 'Project Title', type: 'text', width: 170 },
    { key: 'startDate', label: 'Start', type: 'date' },
    { key: 'deadline', label: 'Deadline', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: STATUS_LIST },
    { key: 'priority', label: 'Priority', type: 'select', options: PRIORITY_LIST },
    { key: 'clientStatus', label: 'Client Status', type: 'select', options: CLIENT_STATUS_LIST },
    { key: 'commMode', label: 'Comm. Mode', type: 'select', options: COMM_MODE_LIST },
    { key: 'budgetVideo', label: 'Budget/Video', type: 'text' },
    { key: 'budgetMonth', label: 'Budget/Month', type: 'text' },
    { key: 'contractType', label: 'Contract Type', type: 'select', options: CONTRACT_TYPE_LIST },
    { key: 'milestone', label: 'Milestone', type: 'text' },
    { key: 'milestoneDone', label: 'Milestone Done', type: 'text' },
    { key: 'paymentStatus', label: 'Payment Status', type: 'select', options: PAYMENT_STATUS_LIST },
    { key: 'paymentMode', label: 'Payment Mode', type: 'select', options: PAYMENT_MODE_LIST },
    { key: 'feedback', label: 'Feedback', type: 'text' },
    { key: 'feedbackStatus', label: 'Feedback Status', type: 'select', options: FEEDBACK_STATUS_LIST },
    { key: 'assigned', label: 'Assigned Editor', type: 'text' },
    { key: 'progress', label: 'Progress', type: 'number' },
    { key: 'revisions', label: 'Revisions', type: 'number' },
    { key: 'contractEnd', label: 'Contract End', type: 'date' },
    { key: 'complete', label: 'Complete', type: 'checkbox' }
  ]},
  'salaries-expenses': { name: 'Salaries & Expenses', icon: 'money', columns: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'category', label: 'Category', type: 'select', options: ['Utilities', 'Software/Tools', 'Office Supplies', 'Equipment', 'Salaries', 'Other'] },
    { key: 'item', label: 'Item Description', type: 'text', width: 180 },
    { key: 'paymentMethod', label: 'Payment Method', type: 'select', options: PAYMENT_STATUS_LIST.length ? ['Cash', 'Bank Transfer', 'Online Payment'] : [] },
    { key: 'amount', label: 'Amount', type: 'text', width: 100 },
    { key: 'status', label: 'Paid/Unpaid', type: 'select', options: PAYMENT_STATUS_LIST },
    { key: 'remarks', label: 'Remarks', type: 'text', width: 160 }
  ]},
  'monthly-budget': { name: 'Monthly Budget Summary', icon: 'chart', columns: [
    { key: 'sr', label: 'Sr.No', type: 'text', width: 50 },
    { key: 'clientName', label: 'Client Name', type: 'text', width: 160 },
    { key: 'term', label: 'Term', type: 'select', options: TERM_LIST },
    { key: 'requirement', label: 'Requirement of Videos', type: 'text', width: 200 },
    { key: 'progress', label: 'Remain Work Progress', type: 'select', options: BUDGET_PROGRESS_LIST },
    { key: 'budget', label: 'Total Budget / Client', type: 'text', width: 120 }
  ]},
  'attendance': { name: 'Attendance (Check In/Out)', icon: 'clock', columns: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'employee', label: 'Employee Name', type: 'text', width: 160 },
    { key: 'action', label: 'Action', type: 'select', options: ATTENDANCE_ACTION_LIST },
    { key: 'time', label: 'Time', type: 'text', width: 100 }
  ]},
  'ongoing-clients': { name: 'On Going Client List', icon: 'clients', columns: [
    { key: 'sr', label: 'SR No', type: 'text', width: 44 },
    { key: 'editor', label: 'Editor', type: 'text', width: 130 },
    { key: 'client', label: 'Client', type: 'text', width: 160 },
    { key: 'deadline', label: 'Deadline', type: 'text', width: 140 },
    { key: 'perWeek', label: 'Per Week', type: 'text', width: 160 },
    { key: 'reservedDays', label: 'Reserved Days', type: 'text', width: 120 },
    { key: 'clientStatus', label: 'Client Status', type: 'select', options: CLIENT_TYPE_LIST },
    { key: 'workStatus', label: 'Work Status', type: 'select', options: WORK_STATUS_LIST }
  ]},
  'employee-details': { name: 'Employee Details', icon: 'users', columns: [
    { key: 'sr', label: 'Sr. No', type: 'text', width: 44 },
    { key: 'employeeName', label: 'Employee Name', type: 'text', width: 160 },
    { key: 'fatherName', label: "Father's Name", type: 'text', width: 140 },
    { key: 'cnic', label: 'CNIC', type: 'text', width: 130 },
    { key: 'contact', label: 'Contact No.', type: 'text', width: 120 },
    { key: 'email', label: 'Email', type: 'text', width: 180 },
    { key: 'designation', label: 'Designation', type: 'select', options: DESIGNATION_LIST },
    { key: 'department', label: 'Department', type: 'select', options: DEPARTMENT_LIST },
    { key: 'basicSalary', label: 'Basic Salary', type: 'text', width: 100 },
    { key: 'allowance', label: 'Allowance', type: 'text', width: 90 },
    { key: 'totalSalary', label: 'Total Salary', type: 'text', width: 100 },
    { key: 'joiningDate', label: 'Joining Date', type: 'date' },
    { key: 'address', label: 'Address', type: 'text', width: 220 },
    { key: 'status', label: 'Current Status', type: 'select', options: EMPLOYEE_STATUS_LIST },
    { key: 'bank', label: 'Bank', type: 'text', width: 160 },
    { key: 'accountTitle', label: 'Account Title', type: 'text', width: 140 },
    { key: 'accountNumber', label: 'Account Number', type: 'text', width: 160 },
    { key: 'resignationDate', label: 'Resignation Date', type: 'date' },
    { key: 'remarks', label: 'Remarks', type: 'text', width: 140 }
  ]},
  'salary-increment': { name: 'Salary Increment', icon: 'money', columns: [
    { key: 'sr', label: 'SR. No', type: 'text', width: 44 },
    { key: 'employeeName', label: 'Employee Name', type: 'text', width: 160 },
    { key: 'joiningDate', label: 'Joining Date', type: 'date' },
    { key: 'basicSalary', label: 'Basic Salary', type: 'text', width: 100 },
    { key: 'incrementDate', label: 'Date of Increment', type: 'date' },
    { key: 'increment', label: 'Increment', type: 'text', width: 90 },
    { key: 'salaryAfter', label: 'Salary After Increment', type: 'text', width: 130 },
    { key: 'reason', label: 'Reason of Increment', type: 'text', width: 220 }
  ]},
  'office-assets': { name: 'Office Assets', icon: 'box', columns: [
    { key: 'sr', label: 'SR No', type: 'text', width: 44 },
    { key: 'assetName', label: 'Asset Name', type: 'text', width: 180 },
    { key: 'category', label: 'Category', type: 'select', options: ASSET_CATEGORY_LIST },
    { key: 'quantity', label: 'Quantity', type: 'text', width: 90 },
    { key: 'location', label: 'Location', type: 'text', width: 140 },
    { key: 'assignedTo', label: 'Assigned To', type: 'text', width: 120 },
    { key: 'status', label: 'Status', type: 'select', options: ASSET_STATUS_LIST }
  ]},
  'company-loan': { name: 'Company Loan Tracker', icon: 'bank', columns: [
    { key: 'month', label: 'Month', type: 'text', width: 70 },
    { key: 'description', label: 'Description', type: 'text', width: 260 },
    { key: 'submitDate', label: 'Submit Date', type: 'date' },
    { key: 'amount', label: 'Amount', type: 'text', width: 100 },
    { key: 'status', label: 'Paid/Unpaid', type: 'select', options: PAYMENT_STATUS_LIST },
    { key: 'accountDetails', label: 'Account Details', type: 'text', width: 260 }
  ]},
  'client-work-log': { name: 'Client Work Log', icon: 'briefcase', columns: [
    { key: 'sr', label: 'Sr.No', type: 'text', width: 44 },
    { key: 'clientName', label: 'Client Name', type: 'text', width: 150 },
    { key: 'projectName', label: 'Project Name', type: 'text', width: 260 },
    { key: 'startDate', label: 'Start Date', type: 'date' },
    { key: 'submitDate', label: 'Submit Date', type: 'date' },
    { key: 'budget', label: 'Budget', type: 'text', width: 90 },
    { key: 'paymentStatus', label: 'Paid/Unpaid', type: 'select', options: PAYMENT_STATUS_LIST },
    { key: 'editingStatus', label: 'Editing Status', type: 'select', options: EDITING_STATUS_LIST }
  ]},
  'daily-report': { name: 'Employees Daily Report', icon: 'clock', columns: [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'employee', label: 'Employee', type: 'text', width: 140 },
    { key: 'checkIn', label: 'Check-in Time', type: 'text', width: 90 },
    { key: 'checkOut', label: 'Check-out Time', type: 'text', width: 90 },
    { key: 'clientName', label: 'Client Name', type: 'text', width: 140 },
    { key: 'projectName', label: 'Project Name', type: 'text', width: 180 },
    { key: 'currentDay', label: 'Current Project Day', type: 'text', width: 100 },
    { key: 'totalDuration', label: 'Total Project Duration', type: 'text', width: 120 },
    { key: 'workCompleted', label: 'Work Completed Today', type: 'text', width: 160 },
    { key: 'remainingDuration', label: 'Remaining Duration', type: 'text', width: 120 },
    { key: 'workPerformed', label: 'Work Performed', type: 'text', width: 200 },
    { key: 'tasksCompleted', label: 'Tasks Completed', type: 'text', width: 140 },
    { key: 'pendingTasks', label: 'Pending Tasks', type: 'text', width: 140 },
    { key: 'timeSpent', label: 'Time Spent on Project', type: 'text', width: 120 },
    { key: 'issues', label: 'Issues / Delays', type: 'text', width: 160 }
  ]}
};

function ensureSeeded() {
  let reg = loadJSON(LS_REGISTRY, null);
  if (reg === null) {
    reg = Object.keys(SHEET_DEFS).map((id) => ({ id, name: SHEET_DEFS[id].name, icon: SHEET_DEFS[id].icon, assignedEmployees: [] }));
    saveJSON(LS_REGISTRY, reg);
  }
  reg.forEach((entry) => {
    if (loadJSON(colsKey(entry.id), null) === null) {
      saveJSON(colsKey(entry.id), (SHEET_DEFS[entry.id] && SHEET_DEFS[entry.id].columns) || [
        { key: 'title', label: 'Title', type: 'text', width: 200 },
        { key: 'notes', label: 'Notes', type: 'text', width: 220 },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS }
      ]);
    }
    if (loadJSON(rowsKey(entry.id), null) === null) saveJSON(rowsKey(entry.id), []);
  });
}
ensureSeeded();

/* ---------------- users ---------------- */
function getUsers() { return loadJSON(LS_USERS, []); }
function setUsers(users) { saveJSON(LS_USERS, users); }
function publicUser(u) { return { id: u.id, name: u.name, email: u.email, role: u.role, profilePic: u.profilePic || '' }; }
function getUserByEmail(email) { return getUsers().find((u) => u.email.toLowerCase() === String(email).toLowerCase()); }
function getUserById(id) { return getUsers().find((u) => u.id === id); }

/* ---------------- attendance auto-log ---------------- */
function logAttendance(employeeName, action) {
  const cols = loadJSON(colsKey('attendance'), []);
  const now = new Date();
  const row = { id: uid() };
  cols.forEach((c) => {
    if (c.key === 'date') row[c.key] = now.toISOString().slice(0, 10);
    else if (c.key === 'employee') row[c.key] = employeeName;
    else if (c.key === 'action') row[c.key] = action;
    else if (c.key === 'time') row[c.key] = now.toTimeString().slice(0, 5);
    else row[c.key] = '';
  });
  const rows = loadJSON(rowsKey('attendance'), []);
  rows.push(row);
  saveJSON(rowsKey('attendance'), rows);
}

/* ============================================================
   Public API — same shape/names the store expects, all local,
   all effectively instant (only `await` because password hashing
   uses the async Web Crypto API).
   ============================================================ */
export const localdb = {
  async ownerOrManagerExists() {
    return getUsers().some((u) => u.role === 'owner' || u.role === 'manager');
  },

  async signup({ name, email, password, role }) {
    if (await this.ownerOrManagerExists()) throw new Error('Sign-up is closed — an Owner/Manager account already exists.');
    if (!name || !email || !password) throw new Error('Name, email and password are required.');
    if (getUserByEmail(email)) throw new Error('An account with this email already exists.');
    const salt = makeSalt();
    const user = { id: uid(), name, email: email.toLowerCase(), passwordSalt: salt, passwordHash: await hashPassword(password, salt), role: role === 'manager' ? 'manager' : 'owner', profilePic: '', createdAt: new Date().toISOString() };
    const users = getUsers(); users.push(user); setUsers(users);
    saveJSON(LS_SESSION, { userId: user.id });
    return { user: publicUser(user) };
  },

  async login({ email, password }) {
    const user = getUserByEmail(email);
    if (!user || (user.role !== 'owner' && user.role !== 'manager')) throw new Error('No matching account found.');
    if (!(await verifyPassword(password, user.passwordSalt, user.passwordHash))) throw new Error('No matching account found.');
    saveJSON(LS_SESSION, { userId: user.id });
    return { user: publicUser(user) };
  },

  async employeeLogin({ email, password }) {
    const user = getUserByEmail(email);
    if (!user || user.role !== 'employee') throw new Error('No matching employee account found.');
    if (!(await verifyPassword(password, user.passwordSalt, user.passwordHash))) throw new Error('No matching employee account found.');
    saveJSON(LS_SESSION, { userId: user.id });
    logAttendance(user.name, 'Check In');
    return { user: publicUser(user) };
  },

  async logout() {
    const session = loadJSON(LS_SESSION, null);
    if (session) {
      const user = getUserById(session.userId);
      if (user && user.role === 'employee') logAttendance(user.name, 'Check Out');
    }
    localStorage.removeItem(LS_SESSION);
  },

  async whoAmI() {
    const session = loadJSON(LS_SESSION, null);
    if (!session) throw new Error('Not logged in.');
    const user = getUserById(session.userId);
    if (!user) throw new Error('Not logged in.');
    return { user: publicUser(user) };
  },

  async updateProfile(fields) {
    const session = loadJSON(LS_SESSION, null);
    if (!session) throw new Error('Not logged in.');
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === session.userId);
    if (idx === -1) throw new Error('Account not found.');
    const updated = { ...users[idx] };
    if (fields.name) updated.name = fields.name;
    if (fields.email) updated.email = fields.email.toLowerCase();
    if (fields.profilePic) updated.profilePic = fields.profilePic;
    if (fields.password) {
      const salt = makeSalt();
      updated.passwordSalt = salt;
      updated.passwordHash = await hashPassword(fields.password, salt);
    }
    users[idx] = updated;
    setUsers(users);
    return { user: publicUser(updated) };
  },

  async createEmployee({ name, email, password, profilePic }) {
    if (!name || !email || !password) throw new Error('Name, email and password are required.');
    if (getUserByEmail(email)) throw new Error('An account with this email already exists.');
    const salt = makeSalt();
    const user = { id: uid(), name, email: email.toLowerCase(), passwordSalt: salt, passwordHash: await hashPassword(password, salt), role: 'employee', profilePic: profilePic || '', createdAt: new Date().toISOString() };
    const users = getUsers(); users.push(user); setUsers(users);
    return { user: publicUser(user) };
  },

  async listEmployees() {
    return { employees: getUsers().filter((u) => u.role === 'employee').map(publicUser) };
  },

  async resetEmployeePassword({ employeeId, newPassword }) {
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === employeeId);
    if (idx === -1) throw new Error('Employee not found.');
    const salt = makeSalt();
    users[idx] = { ...users[idx], passwordSalt: salt, passwordHash: await hashPassword(newPassword, salt) };
    setUsers(users);
  },

  async deleteEmployee({ employeeId }) {
    setUsers(getUsers().filter((u) => u.id !== employeeId));
    const reg = loadJSON(LS_REGISTRY, []);
    saveJSON(LS_REGISTRY, reg.map((e) => ({ ...e, assignedEmployees: (e.assignedEmployees || []).filter((id) => id !== employeeId) })));
  },

  async getRegistry() {
    return { registry: loadJSON(LS_REGISTRY, []) };
  },

  async createSheet({ name, assignedEmployees, columns }) {
    const reg = loadJSON(LS_REGISTRY, []);
    const id = 'sheet-' + normLabel(name).slice(0, 20) + '-' + uid().slice(0, 4);
    const icons = ['clients', 'money', 'chart', 'clock', 'users', 'box', 'bank', 'briefcase'];
    const icon = icons[reg.length % icons.length];
    reg.push({ id, name, icon, assignedEmployees: assignedEmployees || [] });
    saveJSON(LS_REGISTRY, reg);
    saveJSON(colsKey(id), columns);
    saveJSON(rowsKey(id), []);
    return { id };
  },

  async deleteSheet({ sheetId }) {
    const reg = loadJSON(LS_REGISTRY, []);
    saveJSON(LS_REGISTRY, reg.filter((e) => e.id !== sheetId));
    localStorage.removeItem(colsKey(sheetId));
    localStorage.removeItem(rowsKey(sheetId));
  },

  async assignSheet({ sheetId, employeeId, assign }) {
    const reg = loadJSON(LS_REGISTRY, []);
    saveJSON(LS_REGISTRY, reg.map((e) => {
      if (e.id !== sheetId) return e;
      const set = new Set(e.assignedEmployees || []);
      if (assign) set.add(employeeId); else set.delete(employeeId);
      return { ...e, assignedEmployees: Array.from(set) };
    }));
  },

  async getSheet({ sheetId }) {
    const session = loadJSON(LS_SESSION, null);
    const user = session ? getUserById(session.userId) : null;
    const columns = loadJSON(colsKey(sheetId), []);
    let rows = loadJSON(rowsKey(sheetId), []);
    if (user && user.role === 'employee' && (sheetId === 'daily-report' || sheetId === 'attendance')) {
      const empCol = columns.find((c) => c.key === 'employee');
      if (empCol) rows = rows.filter((r) => normLabel(r[empCol.key]) === normLabel(user.name));
    }
    return { columns, rows };
  },

  async saveRow({ sheetId, row }) {
    const session = loadJSON(LS_SESSION, null);
    const user = session ? getUserById(session.userId) : null;
    const columns = loadJSON(colsKey(sheetId), []);
    if (user && user.role === 'employee' && (sheetId === 'daily-report' || sheetId === 'attendance')) {
      const empCol = columns.find((c) => c.key === 'employee');
      if (empCol) row[empCol.key] = user.name;
    }
    const isNew = !row.id || String(row.id).startsWith('new-');
    const finalRow = isNew ? { ...row, id: uid() } : row;
    const rows = loadJSON(rowsKey(sheetId), []);
    const idx = rows.findIndex((r) => r.id === (isNew ? row.id : row.id));
    let newRows;
    if (isNew) newRows = [...rows, finalRow];
    else {
      const i = rows.findIndex((r) => r.id === row.id);
      newRows = i === -1 ? [...rows, finalRow] : rows.map((r) => (r.id === row.id ? finalRow : r));
    }
    saveJSON(rowsKey(sheetId), newRows);
    return { row: finalRow };
  },

  async deleteRow({ sheetId, rowId }) {
    const rows = loadJSON(rowsKey(sheetId), []);
    saveJSON(rowsKey(sheetId), rows.filter((r) => r.id !== rowId));
  },

  async importCSV({ sheetId, columns, rows }) {
    saveJSON(colsKey(sheetId), columns);
    saveJSON(rowsKey(sheetId), rows.map((r) => ({ ...r, id: r.id || uid() })));
  },

  async getBankDetails() {
    return { details: loadJSON(LS_BANK, {}) };
  },
  async saveBankDetails({ details }) {
    saveJSON(LS_BANK, details);
  }
};
