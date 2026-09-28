import { supabase, isSupabaseConfigured } from "./supabaseClient";

/**
 * ค้นหาข้อมูล Mailbox จากอีเมล
 * @param {string} emailAddress - เช่น user@namenoname.store
 */
export async function getMailboxInfo(emailAddress) {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: "SUPABASE_NOT_CONFIGURED" };
  }

  const normalized = emailAddress.toLowerCase().trim();

  try {
    const { data, error } = await supabase
      .from("mailboxes")
      .select("id, address, pin_code, note, is_active")
      .eq("address", normalized)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return { success: true, exists: false, mailbox: null };
    }

    return {
      success: true,
      exists: true,
      mailbox: {
        id: data.id,
        address: data.address,
        hasPin: Boolean(data.pin_code && String(data.pin_code).trim().length > 0),
        note: data.note,
        isActive: data.is_active
      }
    };
  } catch (err) {
    console.error("getMailboxInfo error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * ตรวจสอบรหัส PIN ของ Mailbox
 * @param {string} emailAddress
 * @param {string} pin
 */
export async function verifyMailboxPin(emailAddress, pin) {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: "SUPABASE_NOT_CONFIGURED" };
  }

  const normalized = emailAddress.toLowerCase().trim();

  try {
    const { data, error } = await supabase
      .from("mailboxes")
      .select("id, pin_code")
      .eq("address", normalized)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, error: "MAILBOX_NOT_FOUND" };

    const isMatch = String(data.pin_code || "").trim() === String(pin || "").trim();
    return { success: true, isMatch, mailboxId: data.id };
  } catch (err) {
    console.error("verifyMailboxPin error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * ดึงรายการอีเมลทั้งหมดใน Mailbox
 * @param {string} mailboxId 
 */
export async function fetchEmails(mailboxId) {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, emails: [] };
  }

  try {
    const { data, error } = await supabase
      .from("emails")
      .select("id, sender, subject, body_text, body_html, otp_code, received_at")
      .eq("mailbox_id", mailboxId)
      .order("received_at", { ascending: false });

    if (error) throw error;

    return { success: true, emails: data || [] };
  } catch (err) {
    console.error("fetchEmails error:", err);
    return { success: false, emails: [], error: err.message };
  }
}

/**
 * ติดตามอีเมลใหม่แบบ Realtime
 * @param {string} mailboxId 
 * @param {Function} onNewEmail 
 */
export function subscribeToNewEmails(mailboxId, onNewEmail) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channel = supabase
    .channel(`realtime-emails-${mailboxId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "emails",
        filter: `mailbox_id=eq.${mailboxId}`
      },
      (payload) => {
        if (payload && payload.new) {
          onNewEmail(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
