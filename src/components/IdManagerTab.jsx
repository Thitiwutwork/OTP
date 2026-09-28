import React, { useState, useMemo } from "react";
import { 
  Search, 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  Plus, 
  RefreshCw, 
  Filter, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { 
  getIdList, 
  updateIdStatus, 
  addNewId, 
  deleteId, 
  resetToDefault, 
  exportToCsv,
  STATUS_OPTIONS 
} from "../services/idManagerService";

export default function IdManagerTab({ onShowToast }) {
  const [items, setItems] = useState(getIdList);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [copiedId, setCopiedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Add new modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newStatus, setNewStatus] = useState("ยังไม่ได้สมัคร");
  const [newNote, setNewNote] = useState("");
  const [newTr, setNewTr] = useState("");

  // Statistics
  const stats = useMemo(() => {
    const total = items.length;
    const notRegistered = items.filter((i) => i.status === "ยังไม่ได้สมัคร").length;
    const pendingSend = items.filter((i) => i.status === "ยังไม่ส่ง").length;
    const sent = items.filter((i) => i.status === "ส่งแล้ว").length;
    return { total, notRegistered, pendingSend, sent };
  }, [items]);

  // Filtered and searched items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchFilter = selectedFilter === "all" || item.status === selectedFilter;
      const q = search.trim().toLowerCase();
      const matchSearch = 
        !q ||
        (item.username || "").toLowerCase().includes(q) ||
        (item.note || "").toLowerCase().includes(q) ||
        (item.tr || "").toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [items, selectedFilter, search]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Handle status change
  const handleStatusChange = (id, newStatus) => {
    const updated = updateIdStatus(id, newStatus);
    setItems(updated);
    if (onShowToast) {
      onShowToast(`อัปเดตสถานะเป็น "${newStatus}" เรียบร้อย`, "✅");
    }
  };

  // Copy ID and Quick Open thehof.gg
  const handleCopyAndRegister = (username) => {
    navigator.clipboard.writeText(username);
    setCopiedId(username);
    setTimeout(() => setCopiedId(null), 2500);

    if (onShowToast) {
      onShowToast(`คัดลอก ID "${username}" แล้ว! กำลังเปิดหน้า thehof.gg`, "⚡");
    }

    window.open("https://member.thehof.gg/register", "_blank", "noopener,noreferrer");
  };

  // Just copy ID
  const handleCopyOnly = (username) => {
    navigator.clipboard.writeText(username);
    setCopiedId(username);
    setTimeout(() => setCopiedId(null), 2000);
    if (onShowToast) {
      onShowToast(`คัดลอก "${username}" สำเร็จ`, "📋");
    }
  };

  // Add new ID
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    const updated = addNewId(newUsername, newStatus, newNote, newTr);
    setItems(updated);
    setIsAddModalOpen(false);
    setNewUsername("");
    setNewNote("");
    setNewTr("");
    if (onShowToast) {
      onShowToast(`เพิ่ม ID "${newUsername}" สำเร็จ`, "✨");
    }
  };

  // Delete ID
  const handleDelete = (id, username) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ ID "${username}"?`)) {
      const updated = deleteId(id);
      setItems(updated);
      if (onShowToast) {
        onShowToast(`ลบ ID "${username}" เรียบร้อย`, "🗑️");
      }
    }
  };

  // Reset to default 247 items
  const handleReset = () => {
    if (window.confirm("คุณต้องการรีเซ็ตข้อมูลกลับเป็น 247 รายการเริ่มต้นจากไฟล์ Excel ใช่หรือไม่?")) {
      const def = resetToDefault();
      setItems(def);
      if (onShowToast) {
        onShowToast("รีเซ็ตข้อมูลกลับเป็น 247 รายการจาก Excel สำเร็จ", "🔄");
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Actions */}
      <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold text-sky-100 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ระบบจัดการ ID และตรวจสอบสถานะ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            จัดการข้อมูล ID พร้อมสถานะ
          </h2>
          <p className="text-sky-100 text-xs sm:text-sm mt-1 max-w-xl font-light">
            ข้อมูลนำเข้าจากไฟล์ Excel ทั้งหมด 247 บัญชี เชื่อมต่อหน้าสมัคร thehof.gg พร้อมปุ่มคัดลอกและเปิดเว็บในคลิกเดียว
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => window.open("https://member.thehof.gg/register", "_blank")}
            className="px-4 py-2.5 bg-white text-blue-700 hover:bg-sky-50 text-xs font-bold rounded-2xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer transform active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            <span>เปิดหน้า thehof.gg</span>
          </button>

          <button
            onClick={exportToCsv}
            className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-2xl backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer transform active:scale-95"
            title="ดาวน์โหลดไฟล์ Excel (.csv รองรับภาษาไทย 100%)"
          >
            <Download className="w-4 h-4" />
            <span>ส่งออก Excel</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-2xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่ม ID</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => { setSelectedFilter("all"); setCurrentPage(1); }}
          className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer ${
            selectedFilter === "all" 
              ? "bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20" 
              : "bg-white border-sky-100 hover:border-sky-200"
          }`}
        >
          <div className="text-xs text-gray-500 font-medium">ID ทั้งหมด</div>
          <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-gray-400 mt-1">รายการทั้งหมด</div>
        </div>

        <div 
          onClick={() => { setSelectedFilter("ยังไม่ได้สมัคร"); setCurrentPage(1); }}
          className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer ${
            selectedFilter === "ยังไม่ได้สมัคร" 
              ? "bg-rose-50/80 border-rose-500 shadow-md ring-2 ring-rose-500/20" 
              : "bg-white border-rose-100 hover:border-rose-200"
          }`}
        >
          <div className="text-xs text-rose-600 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            ยังไม่ได้สมัคร
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">{stats.notRegistered}</div>
          <div className="text-[11px] text-rose-500 mt-1">ต้องสมัครสมาชิก</div>
        </div>

        <div 
          onClick={() => { setSelectedFilter("ยังไม่ส่ง"); setCurrentPage(1); }}
          className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer ${
            selectedFilter === "ยังไม่ส่ง" 
              ? "bg-amber-50/80 border-amber-500 shadow-md ring-2 ring-amber-500/20" 
              : "bg-white border-amber-100 hover:border-amber-200"
          }`}
        >
          <div className="text-xs text-amber-600 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            ยังไม่ส่ง
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">{stats.pendingSend}</div>
          <div className="text-[11px] text-amber-500 mt-1">รอดำเนินการส่ง</div>
        </div>

        <div 
          onClick={() => { setSelectedFilter("ส่งแล้ว"); setCurrentPage(1); }}
          className={`p-4 sm:p-5 rounded-3xl border transition-all cursor-pointer ${
            selectedFilter === "ส่งแล้ว" 
              ? "bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20" 
              : "bg-white border-emerald-100 hover:border-emerald-200"
          }`}
        >
          <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ส่งแล้ว
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{stats.sent}</div>
          <div className="text-[11px] text-emerald-500 mt-1">ส่งมอบเรียบร้อย</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-sky-100 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="ค้นหา ID, ไอเทม, หรือหมายเหตุ..."
            className="w-full pl-10 pr-4 py-2.5 bg-sky-50/50 border border-sky-100 rounded-2xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter buttons & Reset */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => { setSelectedFilter("all"); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedFilter === "all" ? "bg-blue-600 text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ทั้งหมด ({items.length})
          </button>
          <button
            onClick={() => { setSelectedFilter("ยังไม่ได้สมัคร"); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedFilter === "ยังไม่ได้สมัคร" ? "bg-rose-600 text-white shadow-xs" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            ยังไม่ได้สมัคร ({stats.notRegistered})
          </button>
          <button
            onClick={() => { setSelectedFilter("ยังไม่ส่ง"); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedFilter === "ยังไม่ส่ง" ? "bg-amber-600 text-white shadow-xs" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            ยังไม่ส่ง ({stats.pendingSend})
          </button>
          <button
            onClick={() => { setSelectedFilter("ส่งแล้ว"); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedFilter === "ส่งแล้ว" ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            ส่งแล้ว ({stats.sent})
          </button>

          <button
            onClick={handleReset}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer ml-auto"
            title="รีเซ็ตกลับเป็นข้อมูล Excel เริ่มต้น"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-sky-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-sky-50/60 border-b border-sky-100 text-gray-600 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">ชื่อ ID</th>
                <th className="py-3.5 px-4">สถานะ (คลิกเพื่อเปลี่ยน)</th>
                <th className="py-3.5 px-4">ไอเทม / หมายเหตุ</th>
                <th className="py-3.5 px-4 w-24">TR</th>
                <th className="py-3.5 px-4 text-center w-48">เครื่องมือด่วน (Fast Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50 text-gray-700 font-['Prompt']">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <span>ไม่พบข้อมูล ID ที่ตรงกับเงื่อนไขการค้นหา</span>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => {
                  const globalIndex = (currentPage - 1) * pageSize + index + 1;
                  const isCopied = copiedId === item.username;

                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-sky-50/40 transition-colors"
                    >
                      {/* Index */}
                      <td className="py-3 px-4 text-center font-mono text-xs text-gray-400">
                        {globalIndex}
                      </td>

                      {/* ID Name */}
                      <td className="py-3 px-4 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold tracking-wide font-mono text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                            {item.username}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyOnly(item.username)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="คัดลอกชื่อ ID"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3 px-4">
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer focus:outline-hidden ${
                            item.status === "ยังไม่ได้สมัคร"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : item.status === "ยังไม่ส่ง"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          <option value="ยังไม่ได้สมัคร">🔴 ยังไม่ได้สมัคร</option>
                          <option value="ยังไม่ส่ง">🟡 ยังไม่ส่ง</option>
                          <option value="ส่งแล้ว">🟢 ส่งแล้ว</option>
                        </select>
                      </td>

                      {/* Note / Item */}
                      <td className="py-3 px-4">
                        {item.note ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 text-xs font-medium">
                            {item.note}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>

                      {/* TR */}
                      <td className="py-3 px-4">
                        {item.tr ? (
                          <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded-md">
                            {item.tr}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>

                      {/* Fast Action Buttons */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Copy & Open Register */}
                          <button
                            type="button"
                            onClick={() => handleCopyAndRegister(item.username)}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-[11px] font-semibold rounded-xl shadow-xs flex items-center gap-1 transition-all cursor-pointer transform active:scale-95 whitespace-nowrap"
                            title="คัดลอก ID แล้วเปิดหน้าสมัคร thehof.gg ทันที"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>สมัคร thehof</span>
                          </button>

                          {/* Quick Toggle to Sent */}
                          {item.status !== "ส่งแล้ว" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(item.id, "ส่งแล้ว")}
                              className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold rounded-xl border border-emerald-200 transition-colors cursor-pointer whitespace-nowrap"
                              title="เปลี่ยนเป็นส่งแล้วทันที"
                            >
                              ✓ ส่งแล้ว
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.username)}
                            className="p-1.5 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบ ID นี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            แสดง {filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} ถึง{" "}
            {Math.min(currentPage * pageSize, filteredItems.length)} จากทั้งหมด{" "}
            <span className="font-bold text-gray-700">{filteredItems.length}</span> รายการ
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 font-bold text-gray-700">
              หน้า {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add New ID Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-sky-100 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">เพิ่ม ID ใหม่ในระบบ</h3>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  ชื่อ ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="เช่น Sodapop248"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">สถานะ</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ยังไม่ได้สมัคร">ยังไม่ได้สมัคร</option>
                  <option value="ยังไม่ส่ง">ยังไม่ส่ง</option>
                  <option value="ส่งแล้ว">ส่งแล้ว</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ไอเทม / หมายเหตุ</label>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="เช่น ปีกเทพ, รับโค้ดแล้ว"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">TR</label>
                <input
                  type="text"
                  value={newTr}
                  onChange={(e) => setNewTr(e.target.value)}
                  placeholder="เช่น หมด หรือค่าอื่นๆ"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  บันทึก ID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
