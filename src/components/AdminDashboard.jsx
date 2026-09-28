import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Inbox,
  Globe,
  Settings,
  LogOut,
  Search,
  Eye,
  Trash2,
  Plus,
  RefreshCw,
  KeyRound,
  Lock,
  Unlock,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  X,
  Mail,
  Filter,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Menu,
  Gamepad2
} from "lucide-react";
import IdManagerTab from "./IdManagerTab";
import {
  fetchAdminStats,
  fetchAllEmails,
  deleteEmail,
  deleteBatchEmails,
  clearAllEmails,
  fetchAllMailboxes,
  createMailbox,
  createBatchMailboxes,
  updateMailboxPin,
  deleteMailbox,
  deleteBatchMailboxes,
  fetchDomains,
  createDomain,
  deleteDomain,
  updateMailboxFilter,
  updateBatchMailboxesFilter,
  adminLogout,
  updateAdminPassword,
  fixThaiMojibake
} from "../services/adminService";

export default function AdminDashboard({ onExitToClient }) {
  // Tabs: "overview" | "mailboxes" | "inbox" | "filters" | "settings"
  const [activeTab, setActiveTab] = useState("inbox");
  const [selectedDomainDrillDown, setSelectedDomainDrillDown] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [stats, setStats] = useState({
    totalEmails: 0,
    totalMailboxes: 0,
    totalDomains: 1,
    totalOtps: 0,
    emailsToday: 0,
    recentEmails: []
  });

  // Data states
  const [emails, setEmails] = useState([]);
  const [mailboxes, setMailboxes] = useState([]);
  const [domains, setDomains] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Batch email selection
  const [selectedEmailIds, setSelectedEmailIds] = useState([]);

  // Pagination for Inbox
  const [inboxPage, setInboxPage] = useState(1);
  const pageSize = 15;

  // View Mail Modal
  const [viewingMail, setViewingMail] = useState(null);
  const [copiedOtp, setCopiedOtp] = useState(false);

  // Create Mailbox Modal (Image 1 replica)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [targetCreateDomain, setTargetCreateDomain] = useState("namenoname.store");
  const [pinMode, setPinMode] = useState("none"); // "none" | "random" | "custom"
  const [customPinVal, setCustomPinVal] = useState("");
  const [useFilterCheckbox, setUseFilterCheckbox] = useState(false);
  const [selectedCreateFilter, setSelectedCreateFilter] = useState("Alibaba Login OTP");
  const [singlePrefix, setSinglePrefix] = useState("");
  const [batchCount, setBatchCount] = useState(10);
  const [isCreatingSingle, setIsCreatingSingle] = useState(false);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);

  // Result Modal after Creation (Image 1 replica)
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [createdResultList, setCreatedResultList] = useState([]);
  const [copiedResultAll, setCopiedResultAll] = useState(false);

  // Mailbox Filter Modal (Image 4 & 5 replica)
  const [filterModal, setFilterModal] = useState({
    isOpen: false,
    mailboxIds: [],
    selectedFilter: "",
    title: "กำหนดตัวกรอง 1 บัญชี",
    subtitle: "ตัวกรองนี้จะทำให้ผู้ใช้ภายนอกเห็นเฉพาะอีเมลที่ตรงกับตัวกรองเท่านั้น"
  });

  // Connect Domain Modal
  const [isAddDomainModalOpen, setIsAddDomainModalOpen] = useState(false);
  const [newDomainName, setNewDomainName] = useState("");
  const [newDomainSource, setNewDomainSource] = useState("ผู้ใช้");
  const [isAddingDomain, setIsAddingDomain] = useState(false);

  // Mailbox multi-select & Drill-down search/pagination (Image 2 & 3)
  const [selectedMailboxIds, setSelectedMailboxIds] = useState([]);
  const [mailboxSearchQuery, setMailboxSearchQuery] = useState("");
  const [mailboxPage, setMailboxPage] = useState(1);
  const [mailboxPageSize, setMailboxPageSize] = useState(10);

  // Global inline toast
  const [toastMessage, setToastMessage] = useState(null);
  const showLocalToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Edit PIN Modal
  const [editingMailbox, setEditingMailbox] = useState(null);
  const [pinEditVal, setPinEditVal] = useState("");

  // Settings Password State
  const [newPwd, setNewPwd] = useState("");
  const [pwdMessage, setPwdMessage] = useState("");

  // Copied filter template toast
  const [copiedFilterId, setCopiedFilterId] = useState(null);

  // Filter templates (Image 3 replica)
  const systemFilterTemplates = [
    {
      id: "alibaba",
      title: "Alibaba Login OTP",
      desc: "แสดงเฉพาะรหัสยืนยันเข้าสู่ระบบ Alibaba",
      badge: "หัวข้อ • ใช้งาน 48 บัญชี"
    },
    {
      id: "chatgpt",
      title: "ChatGPT Login OTP",
      desc: "แสดงเฉพาะรหัสยืนยัน / login code ของ ChatGPT",
      badge: "หัวข้อ • ใช้งาน 198 บัญชี"
    },
    {
      id: "disney",
      title: "Disney+ Login OTP",
      desc: "แสดงเฉพาะรหัสยืนยันอีเมล / One-Time Passcode ของ Disney+ (ไม่รวม Hotstar)",
      badge: "หัวข้อ + เนื้อหา • ใช้งาน 3825 บัญชี"
    },
    {
      id: "google",
      title: "Google Login OTP",
      desc: "แสดงเฉพาะรหัสยืนยันเข้าสู่ระบบ Google (ไม่รวมคำเชิญ Family Group)",
      badge: "เนื้อหา • ใช้งาน 20 บัญชี"
    },
    {
      id: "monomax",
      title: "Monomax Login OTP",
      desc: "แสดงเฉพาะรหัสยืนยันลงทะเบียน / เข้าสู่ระบบ Monomax",
      badge: "หัวข้อ • ใช้งาน 34 บัญชี"
    },
    {
      id: "netflix",
      title: "Netflix Login OTP",
      desc: "แสดงเฉพาะรหัสเข้าสู่ระบบ Netflix (ไม่รวมอีเมลโปรโมชั่นหรือรีเซ็ตรหัสผ่าน)",
      badge: "หัวข้อ + เนื้อหา • ใช้งาน 258 บัญชี"
    },
    {
      id: "netflix-travel",
      title: "Netflix OTP (Login + Travel)",
      desc: "แสดงรหัสเข้าสู่ระบบ Netflix และรหัสเข้าใช้งานชั่วคราว (ไม่รวมโปรโมชั่น)",
      badge: "หัวข้อ • ใช้งาน 272 บัญชี"
    },
    {
      id: "netflix-temp",
      title: "Netflix Temporary Access OTP",
      desc: "แสดงเฉพาะอีเมลขอรหัสเข้าใช้งาน Netflix ชั่วคราว (นอกครัวเรือน / เดินทาง)",
      badge: "หัวข้อ + เนื้อหา • ใช้งาน 115 บัญชี"
    },
    {
      id: "roblox",
      title: "Roblox Login OTP",
      desc: "แสดงเฉพาะอีเมลยืนยัน / login request ของ Roblox (ไม่รวม reset password)",
      badge: "หัวข้อ • ใช้งาน 12 บัญชี"
    },
    {
      id: "spotify",
      title: "Spotify Login OTP",
      desc: "แสดงเฉพาะรหัสเข้าสู่ระบบ Spotify",
      badge: "หัวข้อ • ใช้งาน 88 บัญชี"
    }
  ];

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sRes, eRes, mRes, dRes] = await Promise.all([
        fetchAdminStats(),
        fetchAllEmails(searchQuery),
        fetchAllMailboxes(searchQuery),
        fetchDomains()
      ]);

      if (sRes.success) setStats(sRes);
      if (eRes.success) setEmails(eRes.emails);
      if (mRes.success) setMailboxes(mRes.mailboxes);
      if (dRes.success) setDomains(dRes.domains);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery]);

  // Handle Delete Single Email
  const handleDeleteEmail = async (id) => {
    if (!window.confirm("คุณต้องการลบอีเมลฉบับนี้ใช่หรือไม่?")) return;
    const res = await deleteEmail(id);
    if (res.success) {
      setEmails((prev) => prev.filter((e) => e.id !== id));
      setSelectedEmailIds((prev) => prev.filter((i) => i !== id));
      if (viewingMail && viewingMail.id === id) setViewingMail(null);
      fetchAdminStats().then((s) => s.success && setStats(s));
    } else {
      alert("ไม่สามารถลบอีเมลได้");
    }
  };

  // Handle Bulk Delete Emails
  const handleBulkDeleteEmails = async () => {
    if (selectedEmailIds.length === 0) return;
    if (!window.confirm(`คุณต้องการลบอีเมลที่เลือกทั้งหมดจำนวน ${selectedEmailIds.length} ฉบับใช่หรือไม่?`)) return;

    setIsLoading(true);
    const res = await deleteBatchEmails(selectedEmailIds);
    setIsLoading(false);

    if (res.success) {
      setEmails((prev) => prev.filter((e) => !selectedEmailIds.includes(e.id)));
      setSelectedEmailIds([]);
      fetchAdminStats().then((s) => s.success && setStats(s));
    } else {
      alert("ไม่สามารถลบอีเมลได้");
    }
  };

  // Handle Clear All Emails
  const handleClearAllEmails = async () => {
    if (emails.length === 0) return;
    if (!window.confirm(`คำเตือน: คุณต้องการล้างอีเมลทั้งหมด ${emails.length} ฉบับในกล่องจดหมายใช่หรือไม่?`)) return;

    setIsLoading(true);
    const res = await clearAllEmails();
    setIsLoading(false);

    if (res.success) {
      setEmails([]);
      setSelectedEmailIds([]);
      fetchAdminStats().then((s) => s.success && setStats(s));
    } else {
      alert("ไม่สามารถล้างอีเมลได้");
    }
  };

  // Toggle select email
  const toggleSelectEmail = (id) => {
    setSelectedEmailIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Toggle select all on current page
  const handleToggleSelectAll = () => {
    const pageIds = paginatedEmails.map((e) => e.id);
    const isAllSelected = pageIds.every((id) => selectedEmailIds.includes(id));
    if (isAllSelected) {
      setSelectedEmailIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedEmailIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  // Generate PIN based on mode
  const getPinForCreation = () => {
    if (pinMode === "none") return null;
    if (pinMode === "random") {
      return String(Math.floor(100000 + Math.random() * 900000));
    }
    if (pinMode === "custom") {
      return customPinVal.trim() || null;
    }
    return null;
  };

  // Handle Create Single Mailbox
  const handleCreateSingle = async (e) => {
    e.preventDefault();
    if (!singlePrefix.trim()) return;

    const domain = targetCreateDomain || "namenoname.store";
    const address = `${singlePrefix.trim().toLowerCase()}@${domain}`;
    const pin = getPinForCreation();

    setIsCreatingSingle(true);
    const res = await createMailbox(address, pin, useFilterCheckbox ? selectedCreateFilter : "");
    setIsCreatingSingle(false);

    if (res.success) {
      setIsCreateModalOpen(false);
      setSinglePrefix("");
      setCustomPinVal("");
      setCreatedResultList([address]);
      setIsResultModalOpen(true);
      showLocalToast("สร้างบัญชีเรียบร้อยแล้ว");
      loadData();
    } else {
      alert("เกิดข้อผิดพลาด: " + (res.error || "สร้างบัญชีไม่สำเร็จ"));
    }
  };

  // Handle Create Batch Mailboxes
  const handleCreateBatch = async () => {
    const count = Math.min(Math.max(Number(batchCount) || 1, 1), 100);
    const domain = targetCreateDomain || "namenoname.store";
    const addresses = [];

    for (let i = 0; i < count; i++) {
      const rand = Math.random().toString(36).substring(2, 8);
      addresses.push(`cinex-${rand}@${domain}`);
    }

    const pin = getPinForCreation();

    setIsCreatingBatch(true);
    const res = await createBatchMailboxes(addresses, pin, useFilterCheckbox ? selectedCreateFilter : "");
    setIsCreatingBatch(false);

    if (res.success) {
      setIsCreateModalOpen(false);
      setSinglePrefix("");
      setCustomPinVal("");
      setCreatedResultList(addresses);
      setIsResultModalOpen(true);
      showLocalToast("สร้างบัญชีเรียบร้อยแล้ว");
      loadData();
    } else {
      alert("เกิดข้อผิดพลาดในการสร้างหลายบัญชี");
    }
  };

  // Open filter modal for single mailbox (Images 4 & 5)
  const handleOpenFilterModalForSingle = (mb) => {
    setFilterModal({
      isOpen: true,
      mailboxIds: [mb.id],
      selectedFilter: mb.note || "",
      title: "กำหนดตัวกรอง 1 บัญชี",
      subtitle: "ตัวกรองนี้จะทำให้ผู้ใช้ภายนอกเห็นเฉพาะอีเมลที่ตรงกับตัวกรองเท่านั้น"
    });
  };

  // Open filter modal for batch mailboxes (Images 4 & 5)
  const handleOpenFilterModalForBatch = () => {
    if (selectedMailboxIds.length === 0) {
      alert("กรุณาเลือกบัญชีเมลที่ต้องการกำหนดตัวกรองด้วยการติ๊กถูกหน้าช่องก่อนครับ");
      return;
    }
    setFilterModal({
      isOpen: true,
      mailboxIds: [...selectedMailboxIds],
      selectedFilter: "",
      title: `กำหนดตัวกรอง ${selectedMailboxIds.length} บัญชี`,
      subtitle: "ตัวกรองนี้จะทำให้ผู้ใช้ภายนอกเห็นเฉพาะอีเมลที่ตรงกับตัวกรองเท่านั้น"
    });
  };

  // Save filter selection (Images 4 & 5)
  const handleSaveFilterModal = async () => {
    if (!filterModal.mailboxIds || filterModal.mailboxIds.length === 0) return;
    setIsLoading(true);
    const res = await updateBatchMailboxesFilter(filterModal.mailboxIds, filterModal.selectedFilter);
    setIsLoading(false);
    if (res.success) {
      setFilterModal((prev) => ({ ...prev, isOpen: false }));
      showLocalToast("บันทึกตัวกรองเรียบร้อยแล้ว");
      loadData();
    } else {
      alert("ไม่สามารถบันทึกตัวกรองได้: " + (res.error || ""));
    }
  };

  // Handle Connect Domain
  const handleConnectDomain = async (e) => {
    e.preventDefault();
    if (!newDomainName.trim()) return;
    setIsAddingDomain(true);
    const res = await createDomain(newDomainName, newDomainSource);
    setIsAddingDomain(false);
    if (res.success) {
      setIsAddDomainModalOpen(false);
      setNewDomainName("");
      showLocalToast("เชื่อมต่อโดเมนสำเร็จ พร้อมใช้งานทันที 100%");
      loadData();
    } else {
      alert("ไม่สามารถเชื่อมต่อโดเมนได้: " + (res.error || ""));
    }
  };

  // Handle Delete Domain
  const handleDeleteDomain = async (domainId, domainName) => {
    if (!window.confirm(`คุณต้องการลบโดเมน ${domainName} ออกจากระบบใช่หรือไม่?`)) return;
    setIsLoading(true);
    const res = await deleteDomain(domainId);
    setIsLoading(false);
    if (res.success) {
      showLocalToast(`ลบโดเมน ${domainName} เรียบร้อยแล้ว`);
      loadData();
    } else {
      alert("ไม่สามารถลบโดเมนได้: " + (res.error || ""));
    }
  };

  // Toggle selection for single mailbox
  const toggleSelectMailbox = (id) => {
    setSelectedMailboxIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Toggle select all visible mailboxes
  const handleToggleSelectAllMailboxes = (visibleIds) => {
    const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedMailboxIds.includes(id));
    if (isAllSelected) {
      setSelectedMailboxIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedMailboxIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Handle Bulk Delete Mailboxes
  const handleBulkDeleteMailboxes = async () => {
    if (selectedMailboxIds.length === 0) return;
    if (!window.confirm(`คุณต้องการลบกล่องข้อความที่เลือกทั้งหมดจำนวน ${selectedMailboxIds.length} บัญชีใช่หรือไม่? (อีเมลทั้งหมดในกล่องเหล่านี้จะถูกลบด้วย)`)) return;

    setIsLoading(true);
    const res = await deleteBatchMailboxes(selectedMailboxIds);
    setIsLoading(false);

    if (res.success) {
      setMailboxes((prev) => prev.filter((m) => !selectedMailboxIds.includes(m.id)));
      setSelectedMailboxIds([]);
      loadData();
      showLocalToast("ลบกล่องข้อความเรียบร้อยแล้ว");
    } else {
      alert("ไม่สามารถลบกล่องข้อความได้");
    }
  };

  // Copy Mailbox to Clipboard
  const handleCopyMailboxAddress = (address) => {
    navigator.clipboard.writeText(address);
    showLocalToast(`คัดลอก ${address} เรียบร้อยแล้ว`);
  };

  // Copy all created mailboxes in result modal
  const handleCopyAllCreated = () => {
    if (createdResultList.length === 0) return;
    navigator.clipboard.writeText(createdResultList.join("\n"));
    setCopiedResultAll(true);
    showLocalToast("คัดลอกบัญชีเมลทั้งหมดเรียบร้อยแล้ว");
    setTimeout(() => setCopiedResultAll(false), 2000);
  };

  // Handle Delete Single Mailbox
  const handleDeleteMailbox = async (id, address) => {
    if (!window.confirm(`คุณต้องการลบกล่องข้อความ ${address} ใช่หรือไม่? (อีเมลที่ผูกไว้ทั้งหมดจะถูกลบด้วย)`)) return;
    const res = await deleteMailbox(id);
    if (res.success) {
      setMailboxes((prev) => prev.filter((m) => m.id !== id));
      setSelectedMailboxIds((prev) => prev.filter((x) => x !== id));
      loadData();
      showLocalToast(`ลบ ${address} เรียบร้อยแล้ว`);
    } else {
      alert("ไม่สามารถลบกล่องข้อความได้");
    }
  };

  // Handle Save PIN
  const handleSavePin = async () => {
    if (!editingMailbox) return;
    const res = await updateMailboxPin(editingMailbox.id, pinEditVal);
    if (res.success) {
      setEditingMailbox(null);
      setPinEditVal("");
      loadData();
    } else {
      alert("ไม่สามารถอัปเดตรหัส PIN ได้");
    }
  };

  // Copy OTP
  const handleCopyOtp = (otp) => {
    if (!otp) return;
    navigator.clipboard.writeText(otp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  // Copy Filter Template
  const handleCopyFilter = (id) => {
    setCopiedFilterId(id);
    setTimeout(() => setCopiedFilterId(null), 2000);
  };

  // Date formatter
  const formatDate = (isoStr) => {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month} ${hours}:${mins}`;
  };

  // Master domains list from database (no mock domains)
  const masterDomains = (domains && domains.length > 0 ? domains : [{ name: "namenoname.store" }]).map((dom) => {
    const dName = dom.name || (typeof dom === "string" ? dom : "namenoname.store");
    const count = mailboxes.filter((m) => m.address && m.address.toLowerCase().endsWith(`@${dName.toLowerCase()}`)).length;
    return {
      id: dom.id,
      name: dName,
      source: dom.name?.includes("lico.moe") ? "ระบบ" : "ผู้ใช้",
      status: dom.is_active !== false ? "เปิดใช้งาน" : "ปิดใช้งาน",
      count: count
    };
  });

  // Filtered / Paged Emails
  const paginatedEmails = emails.slice((inboxPage - 1) * pageSize, inboxPage * pageSize);
  const totalPages = Math.ceil(emails.length / pageSize) || 1;

  // Filter mailboxes for drill-down view
  const drillDownMailboxes = selectedDomainDrillDown
    ? mailboxes.filter((m) => m.address.toLowerCase().endsWith(`@${selectedDomainDrillDown.toLowerCase()}`))
    : mailboxes;

  const filteredDrillDown = drillDownMailboxes.filter((m) =>
    !mailboxSearchQuery || m.address.toLowerCase().includes(mailboxSearchQuery.toLowerCase().trim())
  );
  const totalMailboxPages = Math.ceil(filteredDrillDown.length / mailboxPageSize) || 1;
  const paginatedMailboxes = filteredDrillDown.slice(
    (mailboxPage - 1) * mailboxPageSize,
    mailboxPage * mailboxPageSize
  );
  const visibleMailboxIds = paginatedMailboxes.map((m) => m.id);
  const isAllVisibleSelected = visibleMailboxIds.length > 0 && visibleMailboxIds.every((id) => selectedMailboxIds.includes(id));

  return (
    <div className="min-h-screen bg-[#F0F6FF] flex font-['Prompt'] text-slate-800 selection:bg-sky-200 selection:text-sky-900">
      
      {/* ===================== MOBILE BACKDROP OVERLAY ===================== */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ===================== SIDEBAR (Responsive Drawer) ===================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-sky-100 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:w-64 lg:shadow-xs lg:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Brand Logo & Mobile Close Button */}
          <div className="h-16 sm:h-18 flex items-center justify-between px-6 border-b border-sky-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black text-lg">
                <span>N</span>
              </div>
              <div>
                <span className="font-bold text-lg bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight block leading-tight">
                  NAME
                </span>
                <span className="text-[10px] text-sky-700 font-bold tracking-wider uppercase">
                  Admin Console
                </span>
              </div>
            </div>

            {/* Close button on mobile/tablet */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="ปิดเมนู"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Categories */}
          <div className="p-4 space-y-6">
            
            {/* หมวด: อีเมล */}
            <div>
              <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                อีเมล
              </span>
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab("overview");
                    setSelectedDomainDrillDown(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    activeTab === "overview"
                      ? "bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>หน้าหลัก</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("mailboxes");
                    setSelectedDomainDrillDown(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    activeTab === "mailboxes"
                      ? "bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>บัญชีเมล</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("inbox");
                    setSelectedDomainDrillDown(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    activeTab === "inbox"
                      ? "bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                >
                  <Inbox className="w-4 h-4" />
                  <span>กล่องจดหมาย</span>
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === "inbox" ? "bg-white/25 text-white" : "bg-sky-100 text-sky-800"
                  }`}>
                    {stats.totalEmails}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("filters");
                    setSelectedDomainDrillDown(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    activeTab === "filters"
                      ? "bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span>ตัวกรองอีเมล</span>
                </button>
              </nav>
            </div>

            {/* หมวด: จัดการ ID & สมัครสมาชิก */}
            <div>
              <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                จัดการ ID (thehof.gg)
              </span>
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab("idManager");
                    setSelectedDomainDrillDown(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    activeTab === "idManager"
                      ? "bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                >
                  <Gamepad2 className="w-4 h-4 text-indigo-500" />
                  <span className="font-bold">จัดการสถานะ ID</span>
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === "idManager" ? "bg-white/25 text-white" : "bg-indigo-100 text-indigo-800"
                  }`}>
                    247
                  </span>
                </button>
              </nav>
            </div>

            {/* หมวด: ผู้ใช้ */}
            <div>
              <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                ผู้ใช้
              </span>
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab("settings");
                    setSelectedDomainDrillDown(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    activeTab === "settings"
                      ? "bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>ตั้งค่าผู้ใช้</span>
                </button>
              </nav>
            </div>

          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-sky-100 space-y-2">
          <button
            onClick={() => {
              setIsMobileSidebarOpen(false);
              onExitToClient();
            }}
            className="w-full py-2 px-3 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>ไปหน้าเว็บลูกค้า</span>
          </button>

          <button
            onClick={() => {
              setIsMobileSidebarOpen(false);
              adminLogout();
              window.location.reload();
            }}
            className="w-full py-2.5 px-3 bg-slate-800 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* ===================== MAIN CONTENT AREA ===================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top bar with hamburger, search & refresh */}
        <header className="h-16 sm:h-18 bg-white border-b border-sky-100 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-lg">
            {/* Hamburger Button for Mobile / Tablet */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 transition-colors cursor-pointer shrink-0"
              title="เปิดเมนู"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา (ผู้ส่ง, ผู้รับ, หัวข้อ)..."
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 bg-sky-50/50 border border-sky-100 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-medium flex items-center gap-1.5 sm:gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>

            {activeTab === "mailboxes" && selectedDomainDrillDown && (
              <button
                onClick={() => {
                  setTargetCreateDomain(selectedDomainDrillDown);
                  setIsCreateModalOpen(true);
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">สร้างเมลใหม่</span>
              </button>
            )}
          </div>
        </header>

        <div className="p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex-1">

          {/* ================= VIEW 1: OVERVIEW ================= */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-sky-100 shadow-xs">
                  <span className="text-[11px] sm:text-xs font-medium text-slate-400 block mb-1">อีเมลทั้งหมดในระบบ</span>
                  <span className="text-xl sm:text-2xl font-bold text-slate-900">{stats.totalEmails}</span>
                  <span className="text-[10px] sm:text-[11px] text-emerald-600 font-medium block mt-1">วันนี้เข้า {stats.emailsToday} ฉบับ</span>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-sky-100 shadow-xs">
                  <span className="text-[11px] sm:text-xs font-medium text-slate-400 block mb-1">กล่องข้อความทั้งหมด</span>
                  <span className="text-xl sm:text-2xl font-bold text-slate-900">{stats.totalMailboxes}</span>
                  <span className="text-[10px] sm:text-[11px] text-sky-700 font-medium block mt-1">พร้อมใช้งาน 100%</span>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-sky-100 shadow-xs">
                  <span className="text-[11px] sm:text-xs font-medium text-slate-400 block mb-1">รหัส OTP ที่สกัดได้</span>
                  <span className="text-xl sm:text-2xl font-bold text-blue-600">{stats.totalOtps}</span>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 block mt-1">ตรวจจับตัวเลขอัตโนมัติ</span>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-sky-100 shadow-xs">
                  <span className="text-[11px] sm:text-xs font-medium text-slate-400 block mb-1">โดเมนที่เชื่อมต่อ</span>
                  <span className="text-xl sm:text-2xl font-bold text-slate-900">{masterDomains.length}</span>
                  <span className="text-[10px] sm:text-[11px] text-emerald-600 font-medium block mt-1">เปิดใช้งานแล้ว</span>
                </div>
              </div>

              {/* Usage Wave Chart */}
              <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-xs">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-bold text-slate-900">จำนวนการใช้งาน</h3>
                  <span className="text-xs text-slate-400">สถิติการรับอีเมล</span>
                </div>

                {/* Smooth Curve SVG */}
                <div className="w-full h-56 relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 700 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradPink" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284C7" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,180 C100,160 200,140 300,130 C400,120 450,20 520,30 C590,40 650,140 700,160 L700,200 L0,200 Z"
                      fill="url(#chartGradPink)"
                    />
                    <path
                      d="M0,180 C100,160 200,140 300,130 C400,120 450,20 520,30 C590,40 650,140 700,160"
                      fill="none"
                      stroke="#0284C7"
                      strokeWidth="3"
                    />
                  </svg>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-2">
                    <span>31/08</span>
                    <span>01/09</span>
                    <span>02/09</span>
                    <span>03/09</span>
                    <span>04/09</span>
                    <span>05/09</span>
                    <span>06/09</span>
                    <span>วันนี้</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ================= VIEW 2: GLOBAL INBOX (Bulk Delete & Theme) ================= */}
          {activeTab === "inbox" && (
            <div className="bg-white rounded-2xl border border-sky-100 shadow-xs overflow-hidden">
              
              {/* Header Info & Bulk Actions */}
              <div className="px-6 py-4 border-b border-sky-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">กล่องจดหมายรวม</h3>
                  <p className="text-xs text-slate-400 mt-0.5">รวมอีเมลขาเข้าทั้งหมด ({emails.length} ฉบับ)</p>
                </div>

                {/* Bulk delete controls */}
                <div className="flex items-center gap-2">
                  {selectedEmailIds.length > 0 && (
                    <button
                      onClick={handleBulkDeleteEmails}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs animate-in fade-in cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบที่เลือก ({selectedEmailIds.length} ฉบับ)</span>
                    </button>
                  )}

                  {emails.length > 0 && (
                    <button
                      onClick={handleClearAllEmails}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                    >
                      ล้างกล่องทั้งหมด
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="bg-[#2E3192] text-white font-semibold whitespace-nowrap">
                    <tr>
                      <th className="py-3.5 px-4 w-10 text-center">
                        <button
                          onClick={handleToggleSelectAll}
                          className="text-white/80 hover:text-white flex items-center justify-center cursor-pointer"
                        >
                          {paginatedEmails.length > 0 &&
                          paginatedEmails.every((e) => selectedEmailIds.includes(e.id)) ? (
                            <CheckSquare className="w-4 h-4 text-sky-300" />
                          ) : (
                            <Square className="w-4 h-4 text-white/50" />
                          )}
                        </button>
                      </th>
                      <th className="py-3.5 px-4">จาก</th>
                      <th className="py-3.5 px-4">ไปยัง</th>
                      <th className="py-3.5 px-4">หัวข้อ</th>
                      <th className="py-3.5 px-4">วันที่ได้รับ</th>
                      <th className="py-3.5 px-4 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                    {paginatedEmails.map((item) => {
                      const isSelected = selectedEmailIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isSelected ? "bg-sky-50/60" : "hover:bg-slate-50"
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => toggleSelectEmail(item.id)}
                              className="text-slate-400 hover:text-sky-600 flex items-center justify-center cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-sky-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* จาก */}
                          <td className="py-4 px-4 font-medium text-slate-800 truncate max-w-[180px]">
                            {item.sender}
                          </td>

                          {/* ไปยัง */}
                          <td className="py-4 px-4">
                            <span className="font-mono text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded-md">
                              {item.recipient}
                            </span>
                          </td>

                          {/* หัวข้อ + OTP Badge */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {item.otp_code && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono font-bold text-[11px] shrink-0">
                                  OTP: {item.otp_code}
                                </span>
                              )}
                              <span className="font-medium text-slate-900 truncate max-w-[280px]">
                                {item.subject || "(ไม่มีหัวข้อ)"}
                              </span>
                            </div>
                            {item.body_text && (
                              <p className="text-[11px] text-slate-400 truncate max-w-[340px] mt-0.5">
                                {item.body_text}
                              </p>
                            )}
                          </td>

                          {/* วันที่ได้รับ */}
                          <td className="py-4 px-4 text-slate-500 whitespace-nowrap">
                            {formatDate(item.received_at)}
                          </td>

                          {/* ปุ่มจัดการ (สีส้มดู / สีแดงลบ) */}
                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setViewingMail(item)}
                                className="w-8 h-8 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                                title="ดูรายละเอียดอีเมล"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteEmail(item.id)}
                                className="w-8 h-8 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
                                title="ลบอีเมล"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}

                    {paginatedEmails.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-400">
                          {searchQuery ? "ไม่พบอีเมลที่ค้นหา" : "ยังไม่มีอีเมลส่งเข้ามาในระบบ"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-sky-100 flex items-center justify-between text-xs text-slate-500">
                  <span>หน้า {inboxPage} จากทั้งหมด {totalPages} หน้า</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setInboxPage((p) => Math.max(1, p - 1))}
                      disabled={inboxPage <= 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      ก่อนหน้า
                    </button>
                    <button
                      onClick={() => setInboxPage((p) => Math.min(totalPages, p + 1))}
                      disabled={inboxPage >= totalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ================= VIEW 3: MAILBOXES (Exact Image 2 Replica + Drill-down) ================= */}
          {activeTab === "mailboxes" && (
            <div className="space-y-6">
              
              {/* If NOT drilled down: Show Domain Overview Table (Image 2) */}
              {!selectedDomainDrillDown ? (
                <div className="bg-white rounded-2xl border border-sky-100 shadow-xs overflow-hidden">
                  
                  {/* Domains Table Header & Actions */}
                  <div className="px-6 py-4 border-b border-sky-100 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">รายชื่อโดเมนทั้งหมด</h3>
                      <p className="text-xs text-slate-400 mt-0.5">จัดการและเชื่อมต่อโดเมนเพื่อเปิดใช้งานระบบรับ OTP อัตโนมัติ</p>
                    </div>
                    <button
                      onClick={() => setIsAddDomainModalOpen(true)}
                      className="px-4 py-2 bg-[#2E3192] hover:bg-indigo-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>เชื่อมต่อโดเมนใหม่ +</span>
                    </button>
                  </div>

                  {/* Table (Image 2) */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[580px] text-left text-xs">
                      <thead className="bg-[#2E3192] text-white font-semibold whitespace-nowrap">
                        <tr>
                          <th className="py-3.5 px-4 sm:px-6">โดเมน</th>
                          <th className="py-3.5 px-4 sm:px-6">ที่มา</th>
                          <th className="py-3.5 px-4 sm:px-6 text-center">สถานะ</th>
                          <th className="py-3.5 px-4 sm:px-6 text-center">จำนวน</th>
                          <th className="py-3.5 px-4 sm:px-6 text-center">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                        {masterDomains.map((dom) => (
                          <tr key={dom.name} className="hover:bg-slate-50 transition-colors">
                            
                            {/* โดเมน */}
                            <td className="py-4 px-4 sm:px-6 font-bold text-slate-900 text-sm whitespace-nowrap">
                              {dom.name}
                            </td>

                            {/* ที่มา */}
                            <td className="py-4 px-4 sm:px-6 text-slate-600 font-medium whitespace-nowrap">
                              {dom.source}
                            </td>

                            {/* สถานะ */}
                            <td className="py-4 px-4 sm:px-6 text-center whitespace-nowrap">
                              <span className="inline-block whitespace-nowrap px-3 py-1 rounded-md bg-emerald-600 text-white font-bold text-[11px] shadow-xs">
                                {dom.status}
                              </span>
                            </td>

                            {/* จำนวน */}
                            <td className="py-4 px-4 sm:px-6 text-center font-bold text-slate-800 text-sm whitespace-nowrap">
                              {dom.count}
                            </td>

                            {/* จัดการ (ส้ม บัญชีเมล / เขียวมิ้นท์ อีเมล / ถังขยะ ลบ) */}
                            <td className="py-4 px-4 sm:px-6 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                
                                {/* ปุ่ม บัญชีเมล (สีส้ม) */}
                                <button
                                  onClick={() => setSelectedDomainDrillDown(dom.name)}
                                  className="px-3 py-1.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>บัญชีเมล</span>
                                </button>

                                {/* ปุ่ม อีเมล (สีเขียวอมฟ้า) */}
                                <button
                                  onClick={() => {
                                    setSearchQuery(dom.name);
                                    setActiveTab("inbox");
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  <span>อีเมล</span>
                                </button>

                                {/* ปุ่ม ลบโดเมน */}
                                {dom.id && dom.name !== "namenoname.store" && (
                                  <button
                                    onClick={() => handleDeleteDomain(dom.id, dom.name)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title={`ลบโดเมน ${dom.name}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                              </div>
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>



                </div>
              ) : (
                /* Drill-down: Show mailboxes under the selected domain (Image 3 Replica) */
                <div className="bg-white rounded-2xl border border-sky-100 shadow-xs overflow-hidden">
                      
                      {/* Top Bar Header (Image 3) */}
                      <div className="px-4 sm:px-6 py-4 border-b border-sky-100 flex flex-wrap items-center justify-between gap-3">
                        {/* Left: Back Arrow + Domain + Search Box */}
                        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                          <button
                            onClick={() => {
                              setSelectedDomainDrillDown(null);
                              setSelectedMailboxIds([]);
                              setMailboxSearchQuery("");
                            }}
                            className="flex items-center gap-2 text-slate-800 hover:text-sky-600 font-bold text-base transition-colors cursor-pointer shrink-0"
                            title="กลับหน้ารวมโดเมน"
                          >
                            <ArrowLeft className="w-5 h-5" />
                            <span>{selectedDomainDrillDown}</span>
                          </button>

                          {/* Search Mailbox inside Domain */}
                          <div className="relative flex-1 max-w-xs">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                              <Search className="w-3.5 h-3.5" />
                            </div>
                            <input
                              type="text"
                              value={mailboxSearchQuery}
                              onChange={(e) => {
                                setMailboxSearchQuery(e.target.value);
                                setMailboxPage(1);
                              }}
                              placeholder="ค้นหา"
                              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                            />
                          </div>
                        </div>

                        {/* Right: Actions (Image 3) */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Bulk Delete Button when items selected */}
                          {selectedMailboxIds.length > 0 && (
                            <button
                              onClick={handleBulkDeleteMailboxes}
                              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs animate-in fade-in cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>ลบที่เลือก ({selectedMailboxIds.length} บัญชี)</span>
                            </button>
                          )}

                          {/* สร้างบัญชีเมลใหม่ + */}
                          <button
                            onClick={() => {
                              setTargetCreateDomain(selectedDomainDrillDown);
                              setIsCreateModalOpen(true);
                            }}
                            className="px-3.5 py-2 bg-[#2E3192] hover:bg-indigo-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <span>สร้างบัญชีเมลใหม่ +</span>
                          </button>

                          {/* จัดการตัวกรอง */}
                          <button
                            onClick={handleOpenFilterModalForBatch}
                            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <Filter className="w-3.5 h-3.5" />
                            <span>จัดการตัวกรอง</span>
                          </button>

                          {/* จัดการ PIN */}
                          <button
                            onClick={() => {
                              if (selectedMailboxIds.length === 0) {
                                alert("กรุณาเลือกบัญชีเมลที่ต้องการจัดการ PIN ด้วยการติ๊กถูกหน้าช่องก่อนครับ");
                              } else {
                                const newPin = prompt("กรุณากรอกรหัส PIN 6 หลักที่ต้องการตั้งให้กับบัญชีที่เลือก:");
                                if (newPin !== null) {
                                  Promise.all(selectedMailboxIds.map((id) => updateMailboxPin(id, newPin))).then(() => {
                                    loadData();
                                    showLocalToast("อัปเดตรหัส PIN บัญชีที่เลือกเรียบร้อยแล้ว");
                                  });
                                }
                              }
                            }}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                            <span>จัดการ PIN</span>
                          </button>
                        </div>
                      </div>

                      {/* Table (Image 3 replica) */}
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-left text-xs">
                          <thead className="bg-[#2E3192] text-white font-semibold whitespace-nowrap">
                            <tr>
                              {/* Select All Checkbox */}
                              <th className="py-3.5 px-4 w-12 text-center">
                                <button
                                  onClick={() => handleToggleSelectAllMailboxes(visibleMailboxIds)}
                                  className="text-white/80 hover:text-white flex items-center justify-center cursor-pointer"
                                  title="เลือกทั้งหมดในหน้านี้"
                                >
                                  {isAllVisibleSelected ? (
                                    <CheckSquare className="w-4 h-4 text-sky-300" />
                                  ) : (
                                    <Square className="w-4 h-4 text-white/50" />
                                  )}
                                </button>
                              </th>
                              <th className="py-3.5 px-4">บัญชีเมล</th>
                              <th className="py-3.5 px-6 text-right">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                            {paginatedMailboxes.map((mb) => {
                              const isSelected = selectedMailboxIds.includes(mb.id);
                              return (
                                <tr
                                  key={mb.id}
                                  className={`transition-colors ${
                                    isSelected ? "bg-sky-50/50" : "hover:bg-slate-50"
                                  }`}
                                >
                                  {/* Checkbox */}
                                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                    <button
                                      onClick={() => toggleSelectMailbox(mb.id)}
                                      className="text-slate-400 hover:text-sky-600 flex items-center justify-center cursor-pointer"
                                    >
                                      {isSelected ? (
                                        <CheckSquare className="w-4 h-4 text-sky-600" />
                                      ) : (
                                        <Square className="w-4 h-4" />
                                      )}
                                    </button>
                                  </td>

                                  {/* บัญชีเมล */}
                                  <td className="py-3.5 px-4 font-mono font-medium text-slate-800 text-xs whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <span>{mb.address}</span>
                                      {mb.note && (
                                        <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-sans font-semibold">
                                          {mb.note}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* จัดการ (Image 3 Buttons: PIN, คัดลอก, อีเมล, ตัวกรอง, ลบบัญชี) */}
                                  <td className="py-3.5 px-6 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-2">
                                      {/* ปุ่ม PIN */}
                                      {mb.pin_code ? (
                                        <button
                                          onClick={() => {
                                            setEditingMailbox(mb);
                                            setPinEditVal(mb.pin_code);
                                          }}
                                          className="px-2.5 py-1 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                          title={`รหัส PIN: ${mb.pin_code}`}
                                        >
                                          <Lock className="w-3 h-3" />
                                          <span>PIN: {mb.pin_code}</span>
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setEditingMailbox(mb);
                                            setPinEditVal("");
                                          }}
                                          className="px-2.5 py-1 rounded-lg bg-slate-400 hover:bg-slate-500 text-white font-medium text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                          title="ตั้งรหัส PIN"
                                        >
                                          <Unlock className="w-3 h-3" />
                                          <span>PIN</span>
                                        </button>
                                      )}

                                      {/* ปุ่ม คัดลอก */}
                                      <button
                                        onClick={() => handleCopyMailboxAddress(mb.address)}
                                        className="px-2.5 py-1 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                        title="คัดลอกที่อยู่อีเมล"
                                      >
                                        <Copy className="w-3 h-3" />
                                        <span>คัดลอก</span>
                                      </button>

                                      {/* ปุ่ม อีเมล */}
                                      <button
                                        onClick={() => {
                                          setSearchQuery(mb.address);
                                          setActiveTab("inbox");
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                        title="ดูอีเมลของบัญชีนี้ในกล่องจดหมาย"
                                      >
                                        <Mail className="w-3 h-3" />
                                        <span>อีเมล</span>
                                      </button>

                                      {/* ปุ่ม ตัวกรอง (Images 4 & 5 Modal) */}
                                      <button
                                        onClick={() => handleOpenFilterModalForSingle(mb)}
                                        className="px-2.5 py-1 rounded-lg bg-[#EAB308] hover:bg-[#CA8A04] text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                        title="กำหนดตัวกรองสำหรับบัญชีนี้"
                                      >
                                        <Filter className="w-3 h-3" />
                                        <span>ตัวกรอง</span>
                                      </button>

                                      {/* ปุ่ม ลบบัญชี */}
                                      <button
                                        onClick={() => handleDeleteMailbox(mb.id, mb.address)}
                                        className="px-2.5 py-1 rounded-lg bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                        title="ลบบัญชีนี้"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>ลบบัญชี</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}

                            {filteredDrillDown.length === 0 && (
                              <tr>
                                <td colSpan="3" className="py-12 text-center text-slate-400">
                                  {mailboxSearchQuery
                                    ? `ไม่พบบัญชีเมลที่ตรงกับ "${mailboxSearchQuery}"`
                                    : "ยังไม่มีกล่องข้อความในโดเมนนี้ (กดปุ่ม \"สร้างบัญชีเมลใหม่ +\" ด้านบนได้เลยครับ)"}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer / Pagination (Image 3) */}
                      <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-3">
                          <span>จำนวนต่อหน้า:</span>
                          <select
                            value={mailboxPageSize}
                            onChange={(e) => {
                              setMailboxPageSize(Number(e.target.value));
                              setMailboxPage(1);
                            }}
                            className="px-2.5 py-1 border border-slate-200 rounded-lg bg-white text-xs font-semibold text-slate-700 cursor-pointer"
                          >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                          </select>
                          <span className="text-slate-400">
                            ทั้งหมด {filteredDrillDown.length} บัญชี
                            {selectedMailboxIds.length > 0 && ` (เลือกอยู่ ${selectedMailboxIds.length})`}
                          </span>
                        </div>

                        {totalMailboxPages > 1 && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setMailboxPage((p) => Math.max(1, p - 1))}
                              disabled={mailboxPage <= 1}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                            >
                              ก่อนหน้า
                            </button>
                            <span className="px-2 text-slate-600 font-semibold">
                              {mailboxPage} / {totalMailboxPages}
                            </span>
                            <button
                              onClick={() => setMailboxPage((p) => Math.min(totalMailboxPages, p + 1))}
                              disabled={mailboxPage >= totalMailboxPages}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
                            >
                              ถัดไป
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  )}

            </div>
          )}

          {/* ================= VIEW 4: EMAIL FILTERS (Exact Image 3 Replica) ================= */}
          {activeTab === "filters" && (
            <div className="space-y-6">
              
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">ตัวกรองอีเมล</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    จัดการตัวกรองที่ใช้ควบคุมว่าผู้ใช้ภายนอกเห็นอีเมลใดในบัญชีสาธารณะ
                  </p>
                </div>

                <button
                  onClick={() => alert("ระบบรองรับเทมเพลตตัวกรองมาตรฐานอัตโนมัติแล้วครับ!")}
                  className="px-4 py-2 bg-[#2E3192] hover:bg-indigo-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>สร้างตัวกรองใหม่</span>
                </button>
              </div>

              {/* Sub-header */}
              <div>
                <h4 className="text-base font-bold text-slate-900">เทมเพลตระบบ</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  เทมเพลตระบบสามารถเลือกใช้กับบัญชีได้โดยตรง หรือคัดลอกเป็นตัวกรองของคุณเพื่อปรับแต่ง
                </p>
              </div>

              {/* Filter Cards Grid (Image 3) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {systemFilterTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white p-5 rounded-2xl border border-sky-100 hover:border-sky-300 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h5 className="font-bold text-sm text-slate-900">{t.title}</h5>
                        <button
                          onClick={() => handleCopyFilter(t.id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                        >
                          {copiedFilterId === t.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedFilterId === t.id ? "คัดลอกแล้ว" : "คัดลอก"}</span>
                        </button>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed mb-3">
                        {t.desc}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{t.badge}</span>
                      <span className="text-emerald-600 font-bold">พร้อมใช้งาน</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ================= VIEW 5: SETTINGS ================= */}
          {activeTab === "settings" && (
            <div className="bg-white rounded-2xl border border-sky-100 shadow-xs p-6 max-w-lg">
              <h3 className="text-base font-bold text-slate-900 mb-4">ตั้งค่ารหัสผ่านแอดมิน</h3>
              {pwdMessage && (
                <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl">
                  {pwdMessage}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสผ่านใหม่</label>
                  <input
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="กรอกรหัสผ่านใหม่ที่ต้องการ"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!newPwd.trim()) return;
                    updateAdminPassword(newPwd.trim());
                    setPwdMessage("เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว!");
                    setNewPwd("");
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  บันทึกรหัสผ่านใหม่
                </button>
              </div>
            </div>
          )}

          {/* ================= VIEW: ID MANAGER TAB ================= */}
          {activeTab === "idManager" && (
            <IdManagerTab />
          )}

        </div>
      </main>

      {/* ================= VIEW EMAIL MODAL ================= */}
      {viewingMail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900">รายละเอียดอีเมล</h4>
                  <span className="text-xs text-slate-400">{formatDate(viewingMail.received_at)}</span>
                </div>
              </div>
              <button
                onClick={() => setViewingMail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {viewingMail.otp_code && (
                <div className="p-5 bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-sky-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-sky-100 block">รหัสยืนยัน OTP</span>
                    <span className="text-3xl font-mono font-black tracking-widest block mt-0.5">
                      {viewingMail.otp_code}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyOtp(viewingMail.otp_code)}
                    className="px-4 py-2 rounded-xl bg-white text-sky-800 hover:bg-sky-50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    {copiedOtp ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedOtp ? "คัดลอกแล้ว!" : "คัดลอก OTP"}</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">ส่งจาก (From):</span>
                  <span className="font-medium text-slate-900 break-all">{viewingMail.sender}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">ผู้รับ (To):</span>
                  <span className="font-mono font-bold text-sky-700 break-all">{viewingMail.recipient}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl text-xs">
                <span className="text-slate-400 block mb-0.5">หัวข้อ (Subject):</span>
                <span className="font-bold text-slate-900">{fixThaiMojibake(viewingMail.subject)}</span>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-2">เนื้อหาอีเมล:</span>
                {viewingMail.body_html ? (
                  <div
                    className="p-4 bg-white border border-slate-200 rounded-xl text-xs overflow-x-auto leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: fixThaiMojibake(viewingMail.body_html) }}
                  />
                ) : (
                  <pre className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs whitespace-pre-wrap font-sans text-slate-800">
                    {fixThaiMojibake(viewingMail.body_text) || "(ไม่มีข้อความ)"}
                  </pre>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingMail(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= CREATE MAILBOX MODAL (Image 1 Exact Replica) ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-7 animate-in fade-in zoom-in-95 relative max-h-[90vh] overflow-y-auto">
            
            {/* Close button */}
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title: PIN */}
            <div className="mb-5">
              <h4 className="font-bold text-base text-slate-900 mb-3">PIN</h4>
              <div className="space-y-2.5 text-xs text-slate-700">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pinMode"
                    value="none"
                    checked={pinMode === "none"}
                    onChange={() => setPinMode("none")}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>ไม่ใช้ PIN</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pinMode"
                    value="random"
                    checked={pinMode === "random"}
                    onChange={() => setPinMode("random")}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>สุ่ม PIN</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="pinMode"
                    value="custom"
                    checked={pinMode === "custom"}
                    onChange={() => setPinMode("custom")}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>ตั้ง PIN เดียวกัน</span>
                </label>
              </div>

              {pinMode === "custom" && (
                <div className="mt-3">
                  <input
                    type="text"
                    maxLength="6"
                    value={customPinVal}
                    onChange={(e) => setCustomPinVal(e.target.value.replace(/\D/g, ""))}
                    placeholder="กรอก PIN 6 หลัก"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono tracking-widest text-center"
                  />
                </div>
              )}
            </div>

            {/* Title: ใช้ตัวกรองอีเมล (Image 3) */}
            <div className="mb-6">
              <h4 className="font-bold text-base text-slate-900 mb-2">ใช้ตัวกรองอีเมล</h4>
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useFilterCheckbox}
                  onChange={(e) => setUseFilterCheckbox(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-semibold">ใช้ตัวกรองกับบัญชีที่สร้าง</span>
              </label>

              {useFilterCheckbox && (
                <div className="mt-3 animate-in fade-in slide-in-from-top-1">
                  <p className="text-[11px] text-slate-400 mb-2">
                    ต้องการสร้างตัวกรองแบบกำหนดเอง?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateModalOpen(false);
                        setActiveTab("filters");
                      }}
                      className="text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
                    >
                      ไปที่หน้าตัวกรองอีเมล
                    </button>
                  </p>

                  <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 max-h-52 overflow-y-auto space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 block">เทมเพลตระบบ</span>
                    {systemFilterTemplates.map((tpl) => {
                      const isSel = selectedCreateFilter === tpl.title;
                      return (
                        <label
                          key={tpl.id}
                          onClick={() => setSelectedCreateFilter(tpl.title)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isSel
                              ? "bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-400"
                              : "bg-white border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name="createFilterTemplate"
                            checked={isSel}
                            onChange={() => setSelectedCreateFilter(tpl.title)}
                            className="w-3.5 h-3.5 mt-0.5 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-900 block leading-tight">{tpl.title}</span>
                            <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">{tpl.desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Section: สร้างบัญชีเดี่ยว (Image 1) */}
            <div className="mb-6">
              <h4 className="font-bold text-base text-slate-900 mb-2">สร้างบัญชีเดี่ยว</h4>
              
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={singlePrefix}
                  onChange={(e) => setSinglePrefix(e.target.value)}
                  placeholder="เช่น cinex-12345"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                  @{targetCreateDomain}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                ชื่อบัญชีอีเมลต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์เล็กหรือตัวเลข และใช้ . _ - คั่นกลางได้ (ห้ามขึ้นต้น ลงท้าย หรือติดกัน)
              </p>

              <button
                type="button"
                onClick={handleCreateSingle}
                disabled={isCreatingSingle || !singlePrefix.trim()}
                className="w-full py-2.5 px-4 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isCreatingSingle ? "กำลังสร้าง..." : "สร้าง"}
              </button>
            </div>

            <hr className="border-slate-100 my-6" />

            {/* Section: สร้างหลายบัญชี (Image 1) */}
            <div>
              <h4 className="font-bold text-base text-slate-900 mb-2">สร้างหลายบัญชี</h4>
              
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={batchCount}
                  onChange={(e) => setBatchCount(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-center font-bold text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setBatchCount((c) => Math.max(1, (Number(c) || 1) - 1))}
                  className="w-10 h-10 rounded-xl bg-[#2E3192] text-white flex items-center justify-center font-bold text-lg hover:bg-indigo-900 transition-colors cursor-pointer"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setBatchCount((c) => Math.min(100, (Number(c) || 1) + 1))}
                  className="w-10 h-10 rounded-xl bg-[#2E3192] text-white flex items-center justify-center font-bold text-lg hover:bg-indigo-900 transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleCreateBatch}
                disabled={isCreatingBatch}
                className="w-full py-3 px-4 bg-[#2E3192] hover:bg-indigo-900 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isCreatingBatch ? "กำลังสร้างชุดบัญชี..." : "ยืนยัน"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= EDIT PIN MODAL ================= */}
      {editingMailbox && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl p-6">
            <h4 className="font-bold text-base text-slate-900 mb-1">ตั้งค่ารหัส PIN</h4>
            <p className="text-xs text-sky-700 font-mono mb-4">{editingMailbox.address}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัส PIN 6 หลัก (ลบให้ว่างเพื่อปลดล็อค)
                </label>
                <input
                  type="text"
                  maxLength="6"
                  value={pinEditVal}
                  onChange={(e) => setPinEditVal(e.target.value.replace(/\D/g, ""))}
                  placeholder="เช่น 123456"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-mono tracking-widest"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingMailbox(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSavePin}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= RESULT MODAL AFTER CREATION (Image 1 Exact Replica) ================= */}
      {isResultModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl p-6 sm:p-7 animate-in fade-in zoom-in-95 relative">
            
            {/* Close button */}
            <button
              onClick={() => setIsResultModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="font-bold text-lg text-slate-900 mb-4">เสร็จสิ้น</h4>

            {/* Textarea showing generated emails */}
            <div className="mb-5">
              <textarea
                readOnly
                rows={Math.min(Math.max(createdResultList.length, 3), 10)}
                value={createdResultList.join("\n")}
                onClick={(e) => e.target.select()}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 selection:bg-indigo-100 selection:text-indigo-900 resize-none leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                สามารถไฮไลท์เพื่อคัดลอกรายชื่อ หรือกดปุ่มคัดลอกทั้งหมดด้านล่างได้ทันที
              </p>
            </div>

            {/* Copy All Button (Blue button matching Image 1) */}
            <button
              type="button"
              onClick={handleCopyAllCreated}
              className="w-full py-3 px-4 bg-[#2E3192] hover:bg-indigo-900 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {copiedResultAll ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>คัดลอกเรียบร้อยแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>คัดลอก</span>
                </>
              )}
            </button>

          </div>
        </div>
      )}

      {/* ================= FILTER SELECTION MODAL (Images 4 & 5 Exact Replica) ================= */}
      {filterModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-7 animate-in fade-in zoom-in-95 relative max-h-[90vh] flex flex-col">
            
            {/* Close button */}
            <button
              onClick={() => setFilterModal((prev) => ({ ...prev, isOpen: false }))}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title */}
            <h4 className="font-bold text-lg text-slate-900 mb-1">{filterModal.title}</h4>
            <p className="text-xs text-slate-500 mb-1">{filterModal.subtitle}</p>
            <p className="text-xs text-slate-400 mb-4">
              ต้องการสร้างตัวกรองแบบกำหนดเอง?{" "}
              <button
                type="button"
                onClick={() => {
                  setFilterModal((prev) => ({ ...prev, isOpen: false }));
                  setActiveTab("filters");
                }}
                className="text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
              >
                ไปที่หน้าตัวกรองอีเมล
              </button>
            </p>

            {/* Radio List Container (Scrollable) */}
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 mb-5">
              
              {/* Option: ไม่ใช้ตัวกรอง */}
              <label
                onClick={() => setFilterModal((prev) => ({ ...prev, selectedFilter: "" }))}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  !filterModal.selectedFilter
                    ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="filterSelectRadioModal"
                  checked={!filterModal.selectedFilter}
                  onChange={() => setFilterModal((prev) => ({ ...prev, selectedFilter: "" }))}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-800">ไม่ใช้ตัวกรอง</span>
              </label>

              {/* Section: เทมเพลตระบบ */}
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-700 block mb-2">เทมเพลตระบบ</span>
                <div className="space-y-2.5">
                  {systemFilterTemplates.map((tpl) => {
                    const isSelected = filterModal.selectedFilter === tpl.title;
                    return (
                      <label
                        key={tpl.id}
                        onClick={() => setFilterModal((prev) => ({ ...prev, selectedFilter: tpl.title }))}
                        className={`block p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="filterSelectRadioModal"
                            checked={isSelected}
                            onChange={() => setFilterModal((prev) => ({ ...prev, selectedFilter: tpl.title }))}
                            className="w-4 h-4 mt-0.5 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-bold text-slate-900">{tpl.title}</span>
                              <span className="px-1.5 py-0.2 text-[10px] font-medium rounded-md bg-slate-100 text-slate-600">ระบบ</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{tpl.desc}</p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer Button (Matching Images 4 & 5: Big blue button) */}
            <button
              type="button"
              onClick={handleSaveFilterModal}
              className="w-full py-3 px-4 bg-[#2E3192] hover:bg-indigo-900 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              บันทึก
            </button>

          </div>
        </div>
      )}

      {/* ================= CONNECT DOMAIN MODAL ================= */}
      {isAddDomainModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl p-6 sm:p-7 animate-in fade-in zoom-in-95 relative max-h-[90vh] overflow-y-auto">
            
            {/* Close button */}
            <button
              onClick={() => setIsAddDomainModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-slate-900">เชื่อมต่อโดเมนใหม่</h4>
                <p className="text-xs text-slate-500">เพิ่มโดเมนเพื่อเปิดใช้งานระบบรับอีเมลและรหัส OTP อัตโนมัติ</p>
              </div>
            </div>

            <form onSubmit={handleConnectDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่อโดเมน (Domain Name)
                </label>
                <input
                  type="text"
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="เช่น namenoname.store หรือ lico.moe"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ประเภท / ที่มา
                </label>
                <select
                  value={newDomainSource}
                  onChange={(e) => setNewDomainSource(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="ผู้ใช้">ผู้ใช้ (ลูกค้าภายนอกใช้งาน)</option>
                  <option value="ระบบ">ระบบ (แอดมินใช้งาน)</option>
                </select>
              </div>

              {/* Cloudflare Connection Instructions */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">การตั้งค่า Cloudflare ให้พร้อมรับอีเมล 100%:</span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-2">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-800 mb-1">1. ชี้ MX Records ใน Cloudflare DNS:</p>
                    <code className="block text-[10px] font-mono text-indigo-700">route1.mx.cloudflare.net (Priority 10)</code>
                    <code className="block text-[10px] font-mono text-indigo-700">route2.mx.cloudflare.net (Priority 20)</code>
                    <code className="block text-[10px] font-mono text-indigo-700">route3.mx.cloudflare.net (Priority 30)</code>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-800 mb-1">2. ตั้ง Email Routing Catch-all Rule:</p>
                    <p className="text-slate-600">เลือก Catch-all rule: <code className="text-indigo-700 font-mono">*@โดเมนของคุณ</code> &rarr; ส่งต่อไปยัง Worker: <code className="text-indigo-700 font-mono font-bold">ba-otp-email-worker</code></p>
                  </div>
                </div>
                <p className="text-[10px] text-emerald-700 font-medium">
                  ✓ เมื่อบันทึกที่นี่ ระบบจะเชื่อมโยงกับฐานข้อมูลทันที สามารถสร้างเมลและรับ OTP ได้ทันที
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDomainModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isAddingDomain || !newDomainName.trim()}
                  className="px-5 py-2.5 bg-[#2E3192] hover:bg-indigo-900 text-white rounded-xl text-xs font-bold shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isAddingDomain ? "กำลังเชื่อมต่อ..." : "ยืนยันการเชื่อมต่อโดเมน"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ================= INLINE BOTTOM TOAST (Matching Image 1) ================= */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
