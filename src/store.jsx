import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiCall } from './api';

const PortalContext = createContext(null);
export function usePortal() {
  return useContext(PortalContext);
}

const SESSION_KEY = 'baaz_session_cache';

export function PortalProvider({ portalMode, children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [registry, setRegistry] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [bankDetails, setBankDetailsState] = useState({});
  const [sheets, setSheets] = useState({});
  const [activeView, setActiveView] = useState('dashboard');
  const [booted, setBooted] = useState(false);
  const [authScreen, setAuthScreen] = useState(portalMode === 'gate' ? 'gate' : portalMode);
  const [loading, setLoading] = useState(false);

  const persistSession = useCallback((tok, usr) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: tok, user: usr }));
  }, []);
  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setToken(null); setUser(null); setSheets({}); setRegistry([]); setEmployees([]);
    setActiveView('dashboard');
    setAuthScreen(portalMode === 'gate' ? 'gate' : portalMode);
  }, [portalMode]);

  // boot: restore + verify any cached session
  useEffect(() => {
    const cached = localStorage.getItem(SESSION_KEY);
    if (cached) {
      try {
        const { token: t, user: u } = JSON.parse(cached);
        apiCall('whoAmI', {}, t)
          .then((r) => { setToken(t); setUser(r.user); })
          .catch(() => { localStorage.removeItem(SESSION_KEY); })
          .finally(() => setBooted(true));
        return;
      } catch (e) { /* fall through */ }
    }
    setBooted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // once logged in, load the sheet registry
  useEffect(() => {
    if (user && token) {
      apiCall('getRegistry', {}, token).then((r) => setRegistry(r.registry)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const login = useCallback(async (email, password) => {
    const r = await apiCall('login', { email, password });
    setToken(r.token); setUser(r.user); persistSession(r.token, r.user);
  }, [persistSession]);

  const signup = useCallback(async (name, email, password, role) => {
    const r = await apiCall('signup', { name, email, password, role });
    setToken(r.token); setUser(r.user); persistSession(r.token, r.user);
  }, [persistSession]);

  const employeeLogin = useCallback(async (email, password) => {
    const r = await apiCall('employeeLogin', { email, password });
    setToken(r.token); setUser(r.user); persistSession(r.token, r.user);
  }, [persistSession]);

  const logout = useCallback(async () => {
    try { await apiCall('logout', {}, token); } catch (e) { /* still log out locally */ }
    clearSession();
  }, [token, clearSession]);

  const ownerOrManagerExists = useCallback(async () => {
    const r = await apiCall('ownerOrManagerExists', {});
    return r.exists;
  }, []);

  const loadSheet = useCallback(async (sheetId) => {
    const r = await apiCall('getSheet', { sheetId }, token);
    setSheets((prev) => ({ ...prev, [sheetId]: { columns: r.columns, rows: r.rows } }));
    return r;
  }, [token]);

  const ensureSheet = useCallback(async (sheetId) => {
    let has = false;
    setSheets((prev) => { has = !!prev[sheetId]; return prev; });
    if (!has) await loadSheet(sheetId);
  }, [loadSheet]);

  const saveRow = useCallback(async (sheetId, row) => {
    const r = await apiCall('saveRow', { sheetId, row }, token);
    setSheets((prev) => {
      const list = prev[sheetId] ? [...prev[sheetId].rows] : [];
      const isNew = String(row.id).startsWith('new-');
      if (isNew) list.push(r.row);
      else {
        const idx = list.findIndex((x) => x.id === row.id);
        if (idx !== -1) list[idx] = r.row;
      }
      return { ...prev, [sheetId]: { ...prev[sheetId], rows: list } };
    });
    return r.row;
  }, [token]);

  const deleteRow = useCallback(async (sheetId, rowId) => {
    await apiCall('deleteRow', { sheetId, rowId }, token);
    setSheets((prev) => ({ ...prev, [sheetId]: { ...prev[sheetId], rows: prev[sheetId].rows.filter((r) => r.id !== rowId) } }));
  }, [token]);

  const importCSV = useCallback(async (sheetId, columns, rows) => {
    await apiCall('importCSV', { sheetId, columns, rows }, token);
    setSheets((prev) => ({ ...prev, [sheetId]: { columns, rows } }));
  }, [token]);

  const loadEmployees = useCallback(async () => {
    const r = await apiCall('listEmployees', {}, token);
    setEmployees(r.employees);
    return r.employees;
  }, [token]);

  const loadRegistry = useCallback(async () => {
    const r = await apiCall('getRegistry', {}, token);
    setRegistry(r.registry);
    return r.registry;
  }, [token]);

  const loadBankDetails = useCallback(async () => {
    const r = await apiCall('getBankDetails', {}, token);
    setBankDetailsState(r.details);
    return r.details;
  }, [token]);

  const createEmployeeAccount = useCallback(async (name, email, password, profilePic) => {
    await apiCall('createEmployee', { name, email, password, profilePic }, token);
    await loadEmployees();
  }, [token, loadEmployees]);

  const resetEmployeePassword = useCallback(async (employeeId, newPassword) => {
    await apiCall('resetEmployeePassword', { employeeId, newPassword }, token);
  }, [token]);

  const deleteEmployee = useCallback(async (employeeId) => {
    await apiCall('deleteEmployee', { employeeId }, token);
    await loadEmployees();
    await loadRegistry();
  }, [token, loadEmployees, loadRegistry]);

  const createSheet = useCallback(async (name, assignedEmployees, columns) => {
    const r = await apiCall('createSheet', { name, assignedEmployees, columns }, token);
    await loadRegistry();
    return r.id;
  }, [token, loadRegistry]);

  const deleteSheet = useCallback(async (sheetId) => {
    await apiCall('deleteSheet', { sheetId }, token);
    setSheets((prev) => { const next = { ...prev }; delete next[sheetId]; return next; });
    await loadRegistry();
  }, [token, loadRegistry]);

  const assignSheet = useCallback(async (sheetId, employeeId, assign) => {
    await apiCall('assignSheet', { sheetId, employeeId, assign }, token);
    setRegistry((prev) => prev.map((e) => {
      if (e.id !== sheetId) return e;
      const set = new Set(e.assignedEmployees || []);
      if (assign) set.add(employeeId); else set.delete(employeeId);
      return { ...e, assignedEmployees: Array.from(set) };
    }));
  }, [token]);

  const saveBankDetails = useCallback(async (details) => {
    await apiCall('saveBankDetails', { details }, token);
    setBankDetailsState(details);
  }, [token]);

  const updateProfile = useCallback(async (fields) => {
    const r = await apiCall('updateProfile', fields, token);
    setUser(r.user);
    persistSession(token, r.user);
    return r.user;
  }, [token, persistSession]);

  const accessibleSheetIds = useCallback((u) => {
    if (!u || u.role !== 'employee') return registry.map((e) => e.id);
    return registry.filter((e) => e.id === 'daily-report' || (e.assignedEmployees || []).includes(u.id)).map((e) => e.id);
  }, [registry]);

  const value = {
    portalMode, authScreen, setAuthScreen,
    token, user, registry, employees, bankDetails, sheets, activeView, setActiveView,
    loading, setLoading, booted,
    login, signup, employeeLogin, logout, ownerOrManagerExists,
    loadSheet, ensureSheet, saveRow, deleteRow, importCSV,
    loadEmployees, loadRegistry, loadBankDetails,
    createEmployeeAccount, resetEmployeePassword, deleteEmployee,
    createSheet, deleteSheet, assignSheet, saveBankDetails,
    updateProfile, accessibleSheetIds
  };

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}
