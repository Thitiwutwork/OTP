# BA STORE - OTP Mailbox Web App 📬

ระบบกล่องข้อความและดึงรหัสยืนยัน OTP อัตโนมัติ 24 ชั่วโมง แยกออกมาเป็นเว็บอิสระสำหรับใช้งานร่วมกับร้านค้า BA STORE

## ✨ คุณสมบัติเด่น (Features)
- 🚀 **ดึงรหัส OTP อัตโนมัติ (Intelligent OTP Detection)**: ตรวจจับและสกัดรหัสตัวเลขยืนยัน OTP จากหัวข้อและเนื้อหาอีเมลอย่างแม่นยำ พร้อมปุ่มกดคัดลอกใน 1 คลิก
- ⚡ **Direct Browser Fetch (เร็ว & ปลอดภัย 100%)**: ส่งคำขอดึงอีเมลจากเบราว์เซอร์ผู้ใช้โดยตรงสู่ Maily Space REST API หมดปัญหาเรื่อง Cloudflare WAF บล็อก IP เซิร์ฟเวอร์
- 🛡️ **Public Mailbox Fallback**: ระบบสำรองเชื่อมต่อผ่าน Public Mailbox API หาก REST API ขัดข้อง มั่นใจได้ว่าดึงข้อความได้แน่นอน
- 🎯 **Strict Exact Matching**: ค้นหาเฉพาะอีเมลที่ระบุตรงตัวเป๊ะๆ 100% ไม่มีการเดาหรือสุ่มข้ามกล่องเมล ข้อมูลแยกขาดจากกันชัดเจน
- 🔄 **Auto-Refresh Countdown**: มีระบบนับถอยหลังตรวจหาข้อความใหม่อัตโนมัติทุก 5 วินาที พร้อมปุ่มกดรีเฟรชเองได้ตลอดเวลา
- 🎨 **BA STORE Signature Theme**: ดีไซน์น่ารัก โทนสีชมพูพาสเทล Glassmorphism สวยงามตามเอกลักษณ์ของร้าน BA STORE
- 📱 **Mobile Responsive**: รองรับการใช้งานทั้งบนมือถือ แท็บเล็ต และคอมพิวเตอร์อย่างสมบูรณ์แบบ

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)
- **Framework**: React 19 + Vite 8
- **Styling**: Tailwind CSS v4 + Google Fonts (Prompt)
- **Icons**: Lucide React
- **API**: Maily Space REST & Public Mailbox APIs
- **Deployment**: Ready for Vercel / Netlify / GitHub Pages / Cloudflare Pages

## 🚀 วิธีการติดตั้งและรันในเครื่อง (Local Development)
```bash
# ติดตั้ง dependencies
npm install

# เริ่มต้น Local Dev Server
npm run dev

# บิลด์สำหรับ Production
npm run build
```

## 🌐 การ Deploy บน Vercel
1. เข้าเว็บไซต์ [Vercel](https://vercel.com/)
2. กดปุ่ม **"Add New Project"** และเลือก Repository `Ba_Store_OTP`
3. ตั้งค่า Framework Preset เป็น **Vite**
4. กด **Deploy** ได้ทันทีโดยไม่ต้องตั้งค่า Environment Variables เพิ่มเติม
