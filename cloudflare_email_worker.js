// ==============================================================================
// NAME STORE OTP PLATFORM - STANDALONE CLOUDFLARE EMAIL WORKER
// ==============================================================================

// ข้อมูลเชื่อมต่อ Supabase ของคุณ (ฝังเป็นค่าเริ่มต้นไว้ให้เลย แม้ไม่ตั้ง Variables ก็ทำงานได้ 100%)
const DEFAULT_SUPABASE_URL = "https://hkytokzaqnxvdrbhskaj.supabase.co";
const DEFAULT_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhreXRva3phcW54dmRyYmhza2FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDU2OTA1MywiZXhwIjoyMTA2MTQ1MDUzfQ.KqoiukbOv4-5pD-BDeOEZED_WCCiWD41svv2Lt8z7_c";

// Helper: ถอดรหัส Quoted-Printable รองรับภาษาไทย UTF-8
function decodeQuotedPrintable(str) {
  if (!str) return "";
  const clean = str.replace(/=(?:\r\n|\n|\r)/g, "");
  const uriEncoded = clean.replace(/=([0-9A-Fa-f]{2})/g, "%$1");
  try {
    return decodeURIComponent(uriEncoded);
  } catch {
    return uriEncoded.replace(/%([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }
}

// Helper: ถอดรหัสหัวข้ออีเมล RFC 2047 MIME Header
function decodeMimeHeader(header) {
  if (!header) return "";
  return header.replace(/=\?([^?]+)\?([BQbq])\?([^?]+)\?=/g, (match, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === "B") {
        const binary = atob(text);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        return new TextDecoder(charset).decode(bytes);
      } else if (encoding.toUpperCase() === "Q") {
        return decodeQuotedPrintable(text.replace(/_/g, " "));
      }
    } catch {
      return match;
    }
    return match;
  });
}

// ระบบสกัดรหัส OTP อัจฉริยะ (Smart OTP Extractor)
function extractOtp(subject, text, html) {
  const combined = `${subject || ""} ${text || ""} ${html || ""}`;

  // ดักจับคำนำหน้า OTP ทั้งภาษาไทยและอังกฤษ
  const explicitPatterns = [
    /(?:รหัสยืนยัน|รหัส OTP|ยืนยันตัวตน|verification code|security code|one-time password|otp is|code is|your code:?)[^\d]{0,15}([0-9]{4,8})/i,
    /([0-9]{4,8})[^\d]{0,15}(?:คือรหัสยืนยัน|คือรหัส OTP|is your verification code|is your OTP)/i,
    /(?:login code|passcode|secret code)[^\d]{0,15}([0-9]{4,8})/i
  ];

  for (const pattern of explicitPatterns) {
    const match = combined.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // ดักจับตัวเลขในแท็กเน้นข้อความ HTML เช่น <strong>123456</strong>
  if (html) {
    const htmlMatches = html.match(/<(?:strong|b|h1|h2|h3|span)[^>]*?>\s*([0-9]{4,8})\s*<\/(?:strong|b|h1|h2|h3|span)>/gi);
    if (htmlMatches) {
      for (const m of htmlMatches) {
        const num = m.replace(/<[^>]+>/g, "").trim();
        if (/^[0-9]{4,8}$/.test(num)) {
          return num;
        }
      }
    }
  }

  // ดักจับตัวเลขในหัวข้ออีเมล
  if (subject) {
    const subjMatch = subject.match(/\b([0-9]{4,8})\b/);
    if (subjMatch) return subjMatch[1];
  }

  // ดักจับตัวเลข 6 หลักทั่วไป (ไม่ติดกับตัวอักษรอื่น)
  const sixMatch = combined.match(/(?<![a-zA-Z0-9#])([0-9]{6})(?![a-zA-Z0-9])/);
  if (sixMatch && sixMatch[1]) return sixMatch[1];

  return null;
}

// แยกเนื้อหาข้อความและ HTML จาก MIME
function parseMimeBody(rawText) {
  let bodyText = "";
  let bodyHtml = "";

  const headerEnd = rawText.search(/\r?\n\r?\n/);
  if (headerEnd === -1) {
    return { text: rawText, html: "" };
  }

  const rawHeaders = rawText.slice(0, headerEnd);
  const rawBody = rawText.slice(headerEnd).trim();

  const boundaryMatch = rawHeaders.match(/boundary="?([^"\r\n;]+)"?/i);

  if (boundaryMatch && boundaryMatch[1]) {
    const boundary = boundaryMatch[1];
    const parts = rawBody.split(new RegExp(`--${boundary}(?:--)?`));

    for (const part of parts) {
      const pHeaderEnd = part.search(/\r?\n\r?\n/);
      if (pHeaderEnd === -1) continue;

      const pHeaders = part.slice(0, pHeaderEnd);
      let pContent = part.slice(pHeaderEnd).trim();

      if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(pHeaders)) {
        pContent = decodeQuotedPrintable(pContent);
      } else if (/Content-Transfer-Encoding:\s*base64/i.test(pHeaders)) {
        try {
          const cleanB64 = pContent.replace(/\s/g, "");
          const binary = atob(cleanB64);
          const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
          pContent = new TextDecoder("utf-8").decode(bytes);
        } catch {}
      }

      if (/Content-Type:\s*text\/html/i.test(pHeaders)) {
        bodyHtml += pContent + "\n";
      } else if (/Content-Type:\s*text\/plain/i.test(pHeaders)) {
        bodyText += pContent + "\n";
      }
    }
  } else {
    let content = rawBody;
    if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(rawHeaders)) {
      content = decodeQuotedPrintable(content);
    }
    if (/Content-Type:\s*text\/html/i.test(rawHeaders)) {
      bodyHtml = content;
    } else {
      bodyText = content;
    }
  }

  return {
    text: bodyText.trim() || rawBody.replace(/<[^>]+>/g, " ").trim(),
    html: bodyHtml.trim()
  };
}

export default {
  // 1. รับอีเมลจาก Cloudflare Email Routing
  async email(message, env, ctx) {
    console.log("--> Email worker triggered! To:", message.to, "From:", message.from);

    try {
      const recipient = (message.to || "").toLowerCase().trim();
      const sender = (message.from || "").toLowerCase().trim();
      const rawSubject = message.headers ? (message.headers.get("subject") || "") : "";
      const subject = decodeMimeHeader(rawSubject) || "(ไม่มีหัวข้อ)";

      const rawText = await new Response(message.raw).text();
      const { text, html } = parseMimeBody(rawText);
      const otpCode = extractOtp(subject, text, html);

      console.log(`Parsed email for [${recipient}], OTP detected: [${otpCode}]`);

      // ตัด /rest/v1 และ trailing slash ออกอัตโนมัติ เพื่อไม่ให้เกิด 404
      const rawUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
      const supabaseUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
      const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_ANON_KEY || DEFAULT_SERVICE_KEY;

      const headers = {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      };

      // ตรวจสอบหรือสร้างกล่องข้อความ (Mailbox)
      let mailboxId = null;
      try {
        const getMbRes = await fetch(`${supabaseUrl}/rest/v1/mailboxes?address=eq.${encodeURIComponent(recipient)}&select=id`, { headers });
        if (getMbRes.ok) {
          const mbData = await getMbRes.json();
          if (Array.isArray(mbData) && mbData.length > 0) {
            mailboxId = mbData[0].id;
          }
        }
        
        if (!mailboxId) {
          const createMbRes = await fetch(`${supabaseUrl}/rest/v1/mailboxes`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              address: recipient,
              note: "สร้างอัตโนมัติเมื่อมีเมลส่งเข้า"
            })
          });
          if (createMbRes.ok) {
            const newMb = await createMbRes.json();
            if (Array.isArray(newMb) && newMb.length > 0) {
              mailboxId = newMb[0].id;
            }
          }
        }
      } catch (mbErr) {
        console.warn("Mailbox check/create warning (non-fatal):", mbErr.message);
      }

      // บันทึกอีเมลและรหัส OTP ลงตาราง emails ใน Supabase ทันที
      const saveRes = await fetch(`${supabaseUrl}/rest/v1/emails`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          mailbox_id: mailboxId,
          recipient: recipient,
          sender: sender,
          subject: subject,
          body_text: text || "(ไม่มีเนื้อหา)",
          body_html: html || text || null,
          otp_code: otpCode,
          received_at: new Date().toISOString()
        })
      });

      if (saveRes.ok) {
        console.log(`SUCCESS: Saved email for ${recipient}, OTP: ${otpCode || 'none'}`);
      } else {
        const errBody = await saveRes.text();
        console.error(`FAILED to save to Supabase: Status ${saveRes.status} - ${errBody}`);
      }

    } catch (err) {
      console.error("FATAL Email Worker Error:", err);
    }
  },

  // 2. HTTP Handler สำหรับทดสอบดูสถานะ
  async fetch(request, env, ctx) {
    return new Response(JSON.stringify({
      status: "online",
      service: "NAME STORE OTP Email Worker",
      time: new Date().toISOString()
    }), {
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
};
