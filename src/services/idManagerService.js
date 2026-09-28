import { INITIAL_ID_DATA } from "../data/initialIdData";

const STORAGE_KEY = "NAME_ID_MANAGER_ITEMS_V1";

export const STATUS_OPTIONS = [
  { label: "ยังไม่ได้สมัคร", value: "ยังไม่ได้สมัคร", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { label: "ยังไม่ส่ง", value: "ยังไม่ส่ง", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { label: "ส่งแล้ว", value: "ส่งแล้ว", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }
];

export function getIdList() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ID_DATA));
    return INITIAL_ID_DATA;
  } catch (err) {
    console.error("Error reading ID list:", err);
    return INITIAL_ID_DATA;
  }
}

export function saveIdList(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch (err) {
    console.error("Error saving ID list:", err);
    return false;
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
  saveIdList(updated);
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
  saveIdList(updated);
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
  saveIdList(updated);
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
  saveIdList(updated);
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
  saveIdList(updated);
  return updated;
}

export function deleteId(id) {
  const list = getIdList();
  const updated = list.filter((item) => item.id !== id);
  saveIdList(updated);
  return updated;
}

export function resetToDefault() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ID_DATA));
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
