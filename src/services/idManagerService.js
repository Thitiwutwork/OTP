import { INITIAL_ID_DATA } from "../data/initialIdData";

const STORAGE_KEY = "NAME_ID_MANAGER_ITEMS_V2";
const LAST_SYNC_KEY = "NAME_ID_MANAGER_LAST_SYNC_TIME";
const SYSTEM_CLOUD_ADDRESS = "__app_id_manager_state__@system.local";

const rawBaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://hkytokzaqnxvdrbhskaj.supabase.co";
const BASE_URL = rawBaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const API_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhreXRva3phcW54dmRyYmhza2FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDU2OTA1MywiZXhwIjoyMTA2MTQ1MDUzfQ.KqoiukbOv4-5pD-BDeOEZED_WCCiWD41svv2Lt8z7_c";

const cloudHeaders = {
  "apikey": API_KEY,
  "Authorization": `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

export const STATUS_OPTIONS = [
  { label: "ยังไม่ได้สมัคร", value: "ยังไม่ได้สมัคร", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { label: "ยังไม่ส่ง", value: "ยังไม่ส่ง", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { label: "ส่งแล้ว", value: "ส่งแล้ว", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }
];

// In-memory state and listeners
let memoryList = null;
let syncStatus = {
  state: "idle", // 'idle' | 'syncing' | 'synced' | 'error'
  lastSyncTime: typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_SYNC_KEY) : null,
  error: null
};

const statusListeners = new Set();
const dataListeners = new Set();

function emitStatusChange() {
  statusListeners.forEach((fn) => {
    try {
      fn({ ...syncStatus });
    } catch (e) {
      console.error("status listener error:", e);
    }
  });
}

function emitDataChange(items) {
  dataListeners.forEach((fn) => {
    try {
      fn(items);
    } catch (e) {
      console.error("data listener error:", e);
    }
  });
}

export function subscribeToSyncStatus(listener) {
  statusListeners.add(listener);
  listener({ ...syncStatus });
  return () => statusListeners.delete(listener);
}

export function subscribeToIdList(listener) {
  dataListeners.add(listener);
  return () => dataListeners.delete(listener);
}

export function getSyncStatus() {
  return { ...syncStatus };
}

// Local read
export function getIdList() {
  if (memoryList) return memoryList;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryList = parsed;
        return parsed;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ID_DATA));
    memoryList = INITIAL_ID_DATA;
    return INITIAL_ID_DATA;
  } catch (err) {
    console.error("Error reading ID list:", err);
    memoryList = INITIAL_ID_DATA;
    return INITIAL_ID_DATA;
  }
}

// Cloud save queue / debounce
let saveTimeout = null;
let pendingItemsToSave = null;

async function executeCloudSave(items) {
  syncStatus.state = "syncing";
  syncStatus.error = null;
  emitStatusChange();

  try {
    const payload = {
      address: SYSTEM_CLOUD_ADDRESS,
      note: JSON.stringify(items),
      filter_type: "id_manager_state",
      is_active: false,
      updated_at: new Date().toISOString()
    };

    // Check if system record exists
    const checkUrl = `${BASE_URL}/rest/v1/mailboxes?address=eq.${encodeURIComponent(SYSTEM_CLOUD_ADDRESS)}&select=id`;
    const checkRes = await fetch(checkUrl, { headers: cloudHeaders });
    const checkData = await checkRes.json();

    if (Array.isArray(checkData) && checkData.length > 0) {
      // Record exists -> PATCH
      const recordId = checkData[0].id;
      const patchUrl = `${BASE_URL}/rest/v1/mailboxes?id=eq.${recordId}`;
      const patchRes = await fetch(patchUrl, {
        method: "PATCH",
        headers: cloudHeaders,
        body: JSON.stringify({
          note: payload.note,
          updated_at: payload.updated_at
        })
      });

      if (!patchRes.ok) {
        throw new Error(`PATCH failed with status ${patchRes.status}`);
      }
    } else {
      // Record does not exist -> POST
      const postUrl = `${BASE_URL}/rest/v1/mailboxes`;
      const postRes = await fetch(postUrl, {
        method: "POST",
        headers: cloudHeaders,
        body: JSON.stringify(payload)
      });

      if (!postRes.ok) {
        throw new Error(`POST failed with status ${postRes.status}`);
      }
    }

    const nowIso = new Date().toISOString();
    syncStatus.state = "synced";
    syncStatus.lastSyncTime = nowIso;
    syncStatus.error = null;
    try {
      localStorage.setItem(LAST_SYNC_KEY, nowIso);
    } catch {}
    emitStatusChange();
    return true;
  } catch (err) {
    console.error("Cloud save failed:", err);
    syncStatus.state = "error";
    syncStatus.error = err.message || "บันทึกลงคลาวด์ไม่สำเร็จ";
    emitStatusChange();
    return false;
  }
}

export function saveIdList(items, immediate = false) {
  memoryList = items;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error("Error saving to localStorage:", err);
  }

  pendingItemsToSave = items;

  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  if (immediate) {
    return executeCloudSave(items);
  } else {
    syncStatus.state = "syncing";
    emitStatusChange();
    saveTimeout = setTimeout(() => {
      if (pendingItemsToSave) {
        executeCloudSave(pendingItemsToSave);
      }
    }, 400);
    return true;
  }
}

/**
 * Fetch latest ID List from Supabase Cloud
 */
export async function fetchIdListFromCloud() {
  syncStatus.state = "syncing";
  syncStatus.error = null;
  emitStatusChange();

  try {
    const url = `${BASE_URL}/rest/v1/mailboxes?address=eq.${encodeURIComponent(SYSTEM_CLOUD_ADDRESS)}&select=id,note,updated_at`;
    const res = await fetch(url, { headers: cloudHeaders });
    
    if (!res.ok) {
      throw new Error(`Fetch cloud failed: ${res.status}`);
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0 && data[0].note) {
      const parsed = JSON.parse(data[0].note);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryList = parsed;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          if (data[0].updated_at) {
            localStorage.setItem(LAST_SYNC_KEY, data[0].updated_at);
            syncStatus.lastSyncTime = data[0].updated_at;
          }
        } catch {}

        syncStatus.state = "synced";
        syncStatus.error = null;
        emitStatusChange();
        emitDataChange(parsed);
        return { success: true, items: parsed, updatedAt: data[0].updated_at };
      }
    }

    // If cloud record doesn't exist yet, initialize it
    const current = getIdList();
    await executeCloudSave(current);
    return { success: true, items: current, updatedAt: new Date().toISOString() };
  } catch (err) {
    console.error("fetchIdListFromCloud error:", err);
    syncStatus.state = "error";
    syncStatus.error = err.message || "ไม่สามารถเชื่อมต่อคลาวด์ได้";
    emitStatusChange();
    return { success: false, items: getIdList(), error: err.message };
  }
}

export function updateIdStatus(id, newStatus) {
  const list = getIdList();
  const updated = list.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        status: newStatus,
        updated_at: new Date().toISOString()
      };
    }
    return item;
  });
  saveIdList(updated, true); // Immediate cloud save for status change
  return updated;
}

export function updateIdField(id, field, value) {
  const list = getIdList();
  const updated = list.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        [field]: typeof value === 'string' ? value.trim() : value,
        updated_at: new Date().toISOString()
      };
    }
    return item;
  });
  saveIdList(updated, false); // Debounced cloud save for text fields
  return updated;
}

export function updateIdDetails(id, { username, status, note, tr }) {
  const list = getIdList();
  const updated = list.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        username: username ? username.trim() : item.username,
        status: status || item.status,
        note: typeof note === 'string' ? note.trim() : item.note,
        tr: typeof tr === 'string' ? tr.trim() : item.tr,
        updated_at: new Date().toISOString()
      };
    }
    return item;
  });
  saveIdList(updated, true);
  return updated;
}

export function batchUpdateIdStatus(ids, newStatus) {
  if (!ids || ids.length === 0) return getIdList();
  const idSet = new Set(ids);
  const list = getIdList();
  const updated = list.map((item) => {
    if (idSet.has(item.id)) {
      return {
        ...item,
        status: newStatus,
        updated_at: new Date().toISOString()
      };
    }
    return item;
  });
  saveIdList(updated, true);
  return updated;
}

export function addNewId(username, status = "ยังไม่ได้สมัคร", note = "", tr = "") {
  const list = getIdList();
  const newItem = {
    id: "id_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    username: username.trim(),
    status: status || "ยังไม่ได้สมัคร",
    note: note ? note.trim() : "",
    tr: tr ? tr.trim() : "",
    updated_at: new Date().toISOString()
  };
  const updated = [newItem, ...list];
  saveIdList(updated, true);
  return updated;
}

export function deleteId(id) {
  const list = getIdList();
  const updated = list.filter((item) => item.id !== id);
  saveIdList(updated, true);
  return updated;
}

export function resetToDefault() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ID_DATA));
  memoryList = INITIAL_ID_DATA;
  saveIdList(INITIAL_ID_DATA, true);
  return INITIAL_ID_DATA;
}

export function exportToCsv() {
  const list = getIdList();
  const headers = ["ID", "สถานะ (Dropdown)", "ไอเทม / หมายเหตุ", "TR"];
  
  const rows = list.map((item) => [
    `"${(item.username || "").replace(/"/g, '""')}"`,
    `"${(item.status || "").replace(/"/g, '""')}"`,
    `"${(item.note || "").replace(/"/g, '""')}"`,
    `"${(item.tr || "").replace(/"/g, '""')}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `จัดการข้อมูล_ID_พร้อมสถานะ_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
