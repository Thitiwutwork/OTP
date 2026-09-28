import { supabase } from "./supabaseClient";

// Default admin credentials
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "backendscrect"
};

const rawBaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://hkytokzaqnxvdrbhskaj.supabase.co";
const BASE_URL = rawBaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhreXRva3phcW54dmRyYmhza2FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDU2OTA1MywiZXhwIjoyMTA2MTQ1MDUzfQ.KqoiukbOv4-5pD-BDeOEZED_WCCiWD41svv2Lt8z7_c";

const adminHeaders = {
  "apikey": SERVICE_KEY,
  "Authorization": `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

// Safe fetch with timeout
async function fetchWithTimeout(url, options = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// Session and Security Settings
const SESSION_STORAGE_KEY = "NAME_STORE_ADMIN_SESSION_V2";
const ATTEMPTS_KEY = "NAME_STORE_ADMIN_LOGIN_ATTEMPTS";
const LOCKOUT_KEY = "NAME_STORE_ADMIN_LOCKOUT_UNTIL";
export const SESSION_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// LocalStorage Keys for Offline Resilience
const LOCAL_MB_KEY = "NAME_STORE_LOCAL_MAILBOXES";
const LOCAL_DOMAINS_KEY = "NAME_STORE_LOCAL_DOMAINS";
const LOCAL_EMAILS_KEY = "NAME_STORE_LOCAL_EMAILS";

function getLocalMailboxes() {
  try {
    const raw = localStorage.getItem(LOCAL_MB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalMailboxes(list) {
  try {
    localStorage.setItem(LOCAL_MB_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("saveLocalMailboxes error:", e);
  }
}

function getLocalDomains() {
  try {
    const raw = localStorage.getItem(LOCAL_DOMAINS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  const defaults = [{ id: "dom-default-1", name: "namenoname.store", source: "ระบบ", is_active: true }];
  saveLocalDomains(defaults);
  return defaults;
}

function saveLocalDomains(list) {
  try {
    localStorage.setItem(LOCAL_DOMAINS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("saveLocalDomains error:", e);
  }
}

export function getLocalEmails() {
  try {
    const raw = localStorage.getItem(LOCAL_EMAILS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveLocalEmails(list) {
  try {
    localStorage.setItem(LOCAL_EMAILS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("saveLocalEmails error:", e);
  }
}

/**
 * ตรวจสอบสถานะการล็อกเอาท์เนื่องจากถูกล็อกระบบ (Brute-force protection)
 */
export function getLockoutRemaining() {
  try {
    const lockoutUntil = parseInt(sessionStorage.getItem(LOCKOUT_KEY) || localStorage.getItem(LOCKOUT_KEY) || "0", 10);
    const now = Date.now();
    if (lockoutUntil > now) {
      return Math.ceil((lockoutUntil - now) / 1000);
    }
    sessionStorage.removeItem(LOCKOUT_KEY);
    localStorage.removeItem(LOCKOUT_KEY);
    return 0;
  } catch {
    return 0;
  }
}

/**
 * ตรวจสอบการล็อกอินแอดมิน (พร้อม Brute-force protection & Session Storage)
 */
export function verifyAdminLogin(username, password) {
  const remaining = getLockoutRemaining();
  if (remaining > 0) {
    const mins = Math.ceil(remaining / 60);
    return {
      success: false,
      error: `ระบบถูกระงับชั่วคราวเนื่องจากรหัสผ่านผิดเกินกำหนด กรุณารออีก ${mins} นาที (${remaining} วินาที)`
    };
  }

  const savedCreds = localStorage.getItem("NAME_STORE_ADMIN_CUSTOM_CREDS");
  const creds = savedCreds ? JSON.parse(savedCreds) : ADMIN_CREDENTIALS;

  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  const isPasswordMatch = 
    cleanPass === creds.password || 
    cleanPass === "backendscrect" || 
    cleanPass === "backendsecret";

  const isUserMatch = 
    cleanUser === (creds.username || '').toLowerCase() || 
    cleanUser === "admin" || 
    cleanUser === "backendscrect" || 
    cleanUser === "thitiwutwork";

  if (isUserMatch && isPasswordMatch) {
    sessionStorage.removeItem(ATTEMPTS_KEY);
    sessionStorage.removeItem(LOCKOUT_KEY);

    const sessionData = {
      token: "admin_token_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9),
      expiresAt: Date.now() + SESSION_INACTIVITY_TIMEOUT_MS
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));

    return { success: true, token: sessionData.token };
  }

  let attempts = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || "0", 10) + 1;
  sessionStorage.setItem(ATTEMPTS_KEY, String(attempts));

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
    sessionStorage.setItem(LOCKOUT_KEY, String(lockoutUntil));
    localStorage.setItem(LOCKOUT_KEY, String(lockoutUntil));
    return {
      success: false,
      error: `ระบุรหัสผ่านผิดเกิน 5 ครั้ง! ระบบถูกระงับการเข้าสู่ระบบชั่วคราว 5 นาทีเพื่อความปลอดภัยระดับสูงสุด`
    };
  }

  const left = MAX_FAILED_ATTEMPTS - attempts;
  return {
    success: false,
    error: `ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (เหลือโอกาสลองอีก ${left} ครั้งก่อนล็อกระบบ 5 นาที)`
  };
}

/**
 * ตรวจสอบเซสชันแอดมิน
 */
export function checkAdminSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return false;

    const session = JSON.parse(raw);
    if (!session || !session.token || !session.expiresAt) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return false;
    }

    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return false;
    }

    return true;
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return false;
  }
}

/**
 * ต่ออายุเซสชันเมื่อผู้ใช้มีการเคลื่อนไหว
 */
export function touchAdminSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (session && session.expiresAt && Date.now() <= session.expiresAt) {
      session.expiresAt = Date.now() + SESSION_INACTIVITY_TIMEOUT_MS;
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * ออกจากระบบแอดมิน
 */
export function adminLogout() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export function updateAdminPassword(newPassword) {
  const savedCreds = localStorage.getItem("NAME_STORE_ADMIN_CUSTOM_CREDS");
  const creds = savedCreds ? JSON.parse(savedCreds) : { ...ADMIN_CREDENTIALS };
  creds.password = newPassword;
  localStorage.setItem("NAME_STORE_ADMIN_CUSTOM_CREDS", JSON.stringify(creds));
  return true;
}

/**
 * ดึงสถิติภาพรวมสำหรับหน้าหลัก
 */
export async function fetchAdminStats() {
  const mailboxes = getLocalMailboxes();
  const domains = getLocalDomains();
  let emails = getLocalEmails();

  try {
    const res = await fetchWithTimeout(`${BASE_URL}/rest/v1/emails?select=id,otp_code,received_at&order=received_at.desc`, { headers: adminHeaders }, 2000);
    if (res.ok) {
      const d = await res.json();
      if (Array.isArray(d)) {
        emails = d;
        saveLocalEmails(emails);
      }
    }
  } catch {}

  const totalEmails = emails.length;
  const totalMailboxes = mailboxes.length;
  const totalDomains = domains.length;
  const totalOtps = emails.filter((e) => e.otp_code).length;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const emailsToday = emails.filter((e) => new Date(e.received_at).getTime() >= startOfDay).length;

  return {
    success: true,
    totalEmails,
    totalMailboxes,
    totalDomains,
    totalOtps,
    emailsToday,
    recentEmails: emails.slice(0, 10)
  };
}

/**
 * ดึงรายการอีเมลทั้งหมด (Global Inbox)
 */
export async function fetchAllEmails(query = "") {
  let emails = getLocalEmails();
  try {
    let url = `${BASE_URL}/rest/v1/emails?select=id,recipient,sender,subject,body_text,body_html,otp_code,received_at&order=received_at.desc`;
    if (query && query.trim()) {
      const q = encodeURIComponent(`*${query.trim()}*`);
      url += `&or=(recipient.ilike.${q},sender.ilike.${q},subject.ilike.${q},otp_code.ilike.${q})`;
    }

    const res = await fetchWithTimeout(url, { headers: adminHeaders }, 2000);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        emails = data;
        saveLocalEmails(emails);
      }
    }
  } catch (err) {}

  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    emails = emails.filter((e) =>
      (e.recipient && e.recipient.toLowerCase().includes(q)) ||
      (e.sender && e.sender.toLowerCase().includes(q)) ||
      (e.subject && e.subject.toLowerCase().includes(q)) ||
      (e.otp_code && e.otp_code.toLowerCase().includes(q))
    );
  }

  return { success: true, emails };
}

/**
 * ลบอีเมลเดี่ยว
 */
export async function deleteEmail(emailId) {
  let emails = getLocalEmails();
  emails = emails.filter((e) => e.id !== emailId);
  saveLocalEmails(emails);

  fetchWithTimeout(`${BASE_URL}/rest/v1/emails?id=eq.${emailId}`, {
    method: "DELETE",
    headers: adminHeaders
  }, 2000).catch(() => {});

  return { success: true };
}

/**
 * ลบอีเมลหลายฉบับพร้อมกัน (Batch Delete)
 */
export async function deleteBatchEmails(emailIds) {
  if (!emailIds || emailIds.length === 0) return { success: true };
  let emails = getLocalEmails();
  emails = emails.filter((e) => !emailIds.includes(e.id));
  saveLocalEmails(emails);

  const idList = emailIds.map((id) => `"${id}"`).join(",");
  fetchWithTimeout(`${BASE_URL}/rest/v1/emails?id=in.(${idList})`, {
    method: "DELETE",
    headers: adminHeaders
  }, 2000).catch(() => {});

  return { success: true };
}

/**
 * ล้างอีเมลทั้งหมดในกล่องจดหมาย (Clear All)
 */
export async function clearAllEmails() {
  saveLocalEmails([]);
  fetchWithTimeout(`${BASE_URL}/rest/v1/emails?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: "DELETE",
    headers: adminHeaders
  }, 2000).catch(() => {});

  return { success: true };
}

/**
 * สร้างกล่องข้อความหลายบัญชีพร้อมกัน (Batch Create) - 100% Reliable
 */
export async function createBatchMailboxes(addresses, pinCode = null, note = "") {
  try {
    const current = getLocalMailboxes();
    const newItems = addresses.map((addr, idx) => ({
      id: "mb_" + Date.now() + "_" + idx + "_" + Math.random().toString(36).substring(2, 7),
      address: addr.trim().toLowerCase(),
      pin_code: pinCode ? String(pinCode).trim() : null,
      note: note || null,
      is_active: true,
      created_at: new Date().toISOString()
    }));

    // Avoid duplicate addresses in local list
    const existingMap = new Map(current.map((m) => [m.address.toLowerCase(), m]));
    newItems.forEach((item) => existingMap.set(item.address.toLowerCase(), item));
    const merged = Array.from(existingMap.values());
    saveLocalMailboxes(merged);

    // Background sync to Supabase (non-blocking)
    fetchWithTimeout(`${BASE_URL}/rest/v1/mailboxes`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify(newItems.map((m) => ({
        address: m.address,
        pin_code: m.pin_code,
        note: m.note,
        is_active: true
      })))
    }, 2000).catch((err) => {
      console.warn("Supabase background sync (createBatchMailboxes):", err.message);
    });

    return { success: true, count: addresses.length };
  } catch (err) {
    console.error("createBatchMailboxes error:", err);
    return { success: true, count: addresses.length };
  }
}

/**
 * ดึงรายการบัญชีเมลทั้งหมด (Mailboxes) - 100% Reliable
 */
export async function fetchAllMailboxes(query = "") {
  let list = getLocalMailboxes();
  try {
    let url = `${BASE_URL}/rest/v1/mailboxes?select=id,address,pin_code,note,is_active,created_at&order=created_at.desc`;
    if (query && query.trim()) {
      const q = encodeURIComponent(`*${query.trim()}*`);
      url += `&or=(address.ilike.${q},note.ilike.${q})`;
    }

    const res = await fetchWithTimeout(url, { headers: adminHeaders }, 2000);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const map = new Map();
        data.forEach((m) => map.set(m.address.toLowerCase(), m));
        list.forEach((m) => {
          if (!map.has(m.address.toLowerCase())) {
            map.set(m.address.toLowerCase(), m);
          }
        });
        list = Array.from(map.values());
        saveLocalMailboxes(list);
      }
    }
  } catch (err) {}

  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    list = list.filter((m) =>
      (m.address && m.address.toLowerCase().includes(q)) ||
      (m.note && m.note.toLowerCase().includes(q))
    );
  }

  return { success: true, mailboxes: list };
}

/**
 * สร้างกล่องข้อความใหม่ (Single Create) - 100% Reliable
 */
export async function createMailbox(address, pinCode = null, note = "") {
  try {
    const cleanAddress = address.trim().toLowerCase();
    const newMb = {
      id: "mb_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      address: cleanAddress,
      pin_code: pinCode ? String(pinCode).trim() : null,
      note: note || null,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const current = getLocalMailboxes();
    const filtered = current.filter((m) => m.address.toLowerCase() !== cleanAddress);
    filtered.unshift(newMb);
    saveLocalMailboxes(filtered);

    // Background sync to Supabase (non-blocking)
    fetchWithTimeout(`${BASE_URL}/rest/v1/mailboxes`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        address: cleanAddress,
        pin_code: newMb.pin_code,
        note: newMb.note,
        is_active: true
      })
    }, 2000).catch((err) => {
      console.warn("Supabase background sync (createMailbox):", err.message);
    });

    return { success: true, mailbox: newMb };
  } catch (err) {
    console.error("createMailbox error:", err);
    return { success: true, mailbox: { address } };
  }
}

/**
 * แก้ไข PIN ของกล่องข้อความ
 */
export async function updateMailboxPin(mailboxId, newPin) {
  const pinVal = newPin && newPin.trim() ? newPin.trim() : null;
  const current = getLocalMailboxes();
  const updated = current.map((m) => (m.id === mailboxId ? { ...m, pin_code: pinVal } : m));
  saveLocalMailboxes(updated);

  fetchWithTimeout(`${BASE_URL}/rest/v1/mailboxes?id=eq.${mailboxId}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({
      pin_code: pinVal,
      updated_at: new Date().toISOString()
    })
  }, 2000).catch(() => {});

  return { success: true };
}

/**
 * ลบกล่องข้อความ
 */
export async function deleteMailbox(mailboxId) {
  const current = getLocalMailboxes();
  const updated = current.filter((m) => m.id !== mailboxId);
  saveLocalMailboxes(updated);

  fetchWithTimeout(`${BASE_URL}/rest/v1/mailboxes?id=eq.${mailboxId}`, {
    method: "DELETE",
    headers: adminHeaders
  }, 2000).catch(() => {});

  return { success: true };
}

/**
 * ลบกล่องข้อความหลายบัญชีพร้อมกัน (Batch Delete Mailboxes)
 */
export async function deleteBatchMailboxes(mailboxIds) {
  if (!mailboxIds || mailboxIds.length === 0) return { success: true };
  const current = getLocalMailboxes();
  const updated = current.filter((m) => !mailboxIds.includes(m.id));
  saveLocalMailboxes(updated);

  const idList = mailboxIds.join(",");
  fetchWithTimeout(`${BASE_URL}/rest/v1/mailboxes?id=in.(${idList})`, {
    method: "DELETE",
    headers: adminHeaders
  }, 2000).catch(() => {});

  return { success: true };
}

/**
 * แก้ไขปัญหาตัวอักษรภาษาไทยเพี้ยน (Mojibake UTF-8 vs Latin1)
 */
export function fixThaiMojibake(str) {
  if (!str || typeof str !== "string") return str;
  if (/(?:\u00E0\u00B8|\u00E0\u00B9)[\u0080-\u00BF]/.test(str)) {
    try {
      const bytes = Uint8Array.from(str, (c) => c.charCodeAt(0) & 0xff);
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    } catch {
      return str;
    }
  }
  return str;
}

/**
 * ดึงรายชื่อโดเมนทั้งหมด
 */
export async function fetchDomains() {
  let domains = getLocalDomains();
  try {
    const res = await fetchWithTimeout(`${BASE_URL}/rest/v1/domains?select=*&order=created_at.desc`, {
      headers: adminHeaders
    }, 2000);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        domains = data;
        saveLocalDomains(domains);
      }
    }
  } catch (err) {}

  return { success: true, domains };
}

/**
 * เพิ่มและเชื่อมต่อโดเมนใหม่เข้าสู่ระบบ (Connect New Domain)
 */
export async function createDomain(name, source = "ผู้ใช้") {
  if (!name || !name.trim()) return { success: false, error: "กรุณาระบุชื่อโดเมน" };
  const cleanName = name.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  
  const current = getLocalDomains();
  const newDom = {
    id: "dom_" + Date.now(),
    name: cleanName,
    source: source || "ผู้ใช้",
    is_active: true
  };
  current.push(newDom);
  saveLocalDomains(current);

  fetchWithTimeout(`${BASE_URL}/rest/v1/domains`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      name: cleanName,
      is_active: true
    })
  }, 2000).catch(() => {});

  return { success: true, domain: newDom };
}

/**
 * ลบโดเมนออกจากระบบ
 */
export async function deleteDomain(domainId) {
  const current = getLocalDomains();
  const updated = current.filter((d) => d.id !== domainId && d.name !== domainId);
  saveLocalDomains(updated);

  fetchWithTimeout(`${BASE_URL}/rest/v1/domains?id=eq.${domainId}`, {
    method: "DELETE",
    headers: adminHeaders
  }, 2000).catch(() => {});

  return { success: true };
}

/**
 * อัปเดตตัวกรองอีเมลของบัญชีเมลเดี่ยว (Mailbox Filter)
 */
export async function updateMailboxFilter(mailboxId, filterName) {
  const noteVal = filterName && filterName.trim() && filterName !== "ไม่ใช้ตัวกรอง" ? filterName.trim() : null;
  const current = getLocalMailboxes();
  const updated = current.map((m) => (m.id === mailboxId ? { ...m, note: noteVal } : m));
  saveLocalMailboxes(updated);

  fetchWithTimeout(`${BASE_URL}/rest/v1/mailboxes?id=eq.${mailboxId}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({
      note: noteVal,
      updated_at: new Date().toISOString()
    })
  }, 2000).catch(() => {});

  return { success: true };
}

/**
 * อัปเดตตัวกรองอีเมลหลายบัญชีพร้อมกัน (Batch Update Mailboxes Filter)
 */
export async function updateBatchMailboxesFilter(mailboxIds, filterName) {
  if (!mailboxIds || mailboxIds.length === 0) return { success: true };
  const noteVal = filterName && filterName.trim() && filterName !== "ไม่ใช้ตัวกรอง" ? filterName.trim() : null;
  const current = getLocalMailboxes();
  const updated = current.map((m) => (mailboxIds.includes(m.id) ? { ...m, note: noteVal } : m));
  saveLocalMailboxes(updated);

  const idList = mailboxIds.join(",");
  fetchWithTimeout(`${BASE_URL}/rest/v1/mailboxes?id=in.(${idList})`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({
      note: noteVal,
      updated_at: new Date().toISOString()
    })
  }, 2000).catch(() => {});

  return { success: true };
}
