import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { localdb } from './localdb';

const PortalContext = createContext(null);
export function usePortal() {
  return useContext(PortalContext);
}

export function PortalProvider({ portalMode, children }) {
  const [user, setUser] = useState(null);
  const [registry, setRegistry] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [bankDetails, setBankDetailsState] = useState({});
  const [sheets, setSheets] = useState({});
  const [activeView, setActiveView] = useState('dashboard');
  const [booted, setBooted] = useState(false);
  const [authScreen, setAuthScreen] = useState(portalMode === 'gate' ? 'gate' : portalMode);

  const clearSession = useCallback(() => {
    setUser(null); setSheets({}); setRegistry([]); setEmployees([]);
    setActiveView('dashboard');
    setAuthScreen(portalMode === 'gate' ? 'gate' : portalMode);
  }, [portalMode]);

  useEffect(() => {
    localdb.whoAmI().then((r) => setUser(r.user)).catch(() => {}).finally(() => setBooted(true));
  }, []);

  useEffect(() => {
    if (user) {
      localdb.getRegistry().then((r) => setRegistry(r.registry)).catch(() => {});
    }
  }, [user]);

  const login = useCallback(async (email, password) => {
    const r = await localdb.login({ email, password });
    setUser(r.user);
  }, []);

  const signup = useCallback(async (name, email, password, role) => {
    const r = await localdb.signup({ name, email, password, role });
    setUser(r.user);
  }, []);

  const employeeLogin = useCallback(async (email, password) => {
    const r = await localdb.employeeLogin({ email, password });
    setUser(r.user);
  }, []);

  const logout = useCallback(async () => {
    await localdb.logout();
    clearSession();
  }, [clearSession]);

  const ownerOrManagerExists = useCallback(async () => {
    return localdb.ownerOrManagerExists();
  }, []);

  const loadSheet = useCallback(async (sheetId) => {
    const r = await localdb.getSheet({ sheetId });
    setSheets((prev) => ({ ...prev, [sheetId]: { columns: r.columns, rows: r.rows } }));
    return r;
  }, []);

  const ensureSheet = useCallback(async (sheetId) => {
    let has = false;
    setSheets((prev) => { has = !!prev[sheetId]; return prev; });
    if (!has) await loadSheet(sheetId);
  }, [loadSheet]);

  /* Optimistic in the sense that there's no visible delay at all — this
     is genuinely instant since it's just a localStorage write, no
     network round-trip to wait on or roll back from. */
  const saveRow = useCallback(async (sheetId, row) => {
    const r = await localdb.saveRow({ sheetId, row });
    setSheets((prev) => {
      const list = prev[sheetId] ? [...prev[sheetId].rows] : [];
      const isNew = String(row.id).startsWith('new-');
      if (isNew) list.push(r.row);
      else {
        const idx = list.findIndex((x) => x.id === row.id);
        if (idx !== -1) list[idx] = r.row; else list.push(r.row);
      }
      return { ...prev, [sheetId]: { ...prev[sheetId], rows: list } };
    });
    return r.row;
  }, []);

  const deleteRow = useCallback(async (sheetId, rowId) => {
    await localdb.deleteRow({ sheetId, rowId });
    setSheets((prev) => ({ ...prev, [sheetId]: { ...prev[sheetId], rows: prev[sheetId].rows.filter((r) => r.id !== rowId) } }));
  }, []);

  const importCSV = useCallback(async (sheetId, columns, rows) => {
    await localdb.importCSV({ sheetId, columns, rows });
    setSheets((prev) => ({ ...prev, [sheetId]: { columns, rows } }));
  }, []);

  const loadEmployees = useCallback(async () => {
    const r = await localdb.listEmployees();
    setEmployees(r.employees);
    return r.employees;
  }, []);

  const loadRegistry = useCallback(async () => {
    const r = await localdb.getRegistry();
    setRegistry(r.registry);
    return r.registry;
  }, []);

  const loadBankDetails = useCallback(async () => {
    const r = await localdb.getBankDetails();
    setBankDetailsState(r.details);
    return r.details;
  }, []);

  const createEmployeeAccount = useCallback(async (name, email, password, profilePic) => {
    await localdb.createEmployee({ name, email, password, profilePic });
    await loadEmployees();
  }, [loadEmployees]);

  const resetEmployeePassword = useCallback(async (employeeId, newPassword) => {
    await localdb.resetEmployeePassword({ employeeId, newPassword });
  }, []);

  const deleteEmployee = useCallback(async (employeeId) => {
    await localdb.deleteEmployee({ employeeId });
    await loadEmployees();
    await loadRegistry();
  }, [loadEmployees, loadRegistry]);

  const createSheet = useCallback(async (name, assignedEmployees, columns) => {
    const r = await localdb.createSheet({ name, assignedEmployees, columns });
    await loadRegistry();
    return r.id;
  }, [loadRegistry]);

  const deleteSheet = useCallback(async (sheetId) => {
    await localdb.deleteSheet({ sheetId });
    setSheets((prev) => { const next = { ...prev }; delete next[sheetId]; return next; });
    await loadRegistry();
  }, [loadRegistry]);

  const assignSheet = useCallback(async (sheetId, employeeId, assign) => {
    await localdb.assignSheet({ sheetId, employeeId, assign });
    setRegistry((prev) => prev.map((e) => {
      if (e.id !== sheetId) return e;
      const set = new Set(e.assignedEmployees || []);
      if (assign) set.add(employeeId); else set.delete(employeeId);
      return { ...e, assignedEmployees: Array.from(set) };
    }));
  }, []);

  const saveBankDetails = useCallback(async (details) => {
    await localdb.saveBankDetails({ details });
    setBankDetailsState(details);
  }, []);

  const updateProfile = useCallback(async (fields) => {
    const r = await localdb.updateProfile(fields);
    setUser(r.user);
    return r.user;
  }, []);

  const accessibleSheetIds = useCallback((u) => {
    if (!u || u.role !== 'employee') return registry.map((e) => e.id);
    return registry.filter((e) => e.id === 'daily-report' || (e.assignedEmployees || []).includes(u.id)).map((e) => e.id);
  }, [registry]);

  const value = {
    portalMode, authScreen, setAuthScreen,
    user, registry, employees, bankDetails, sheets, activeView, setActiveView,
    booted,
    login, signup, employeeLogin, logout, ownerOrManagerExists,
    loadSheet, ensureSheet, saveRow, deleteRow, importCSV,
    loadEmployees, loadRegistry, loadBankDetails,
    createEmployeeAccount, resetEmployeePassword, deleteEmployee,
    createSheet, deleteSheet, assignSheet, saveBankDetails,
    updateProfile, accessibleSheetIds
  };

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}
