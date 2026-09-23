"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, Trash2, Users, FileUp, Download, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

type Student = {
  id: string;
  name: string;
  studentId: string;
  grade: string;
  studentNumber: string;
  isInterning?: boolean;
  startDate?: string;
  endDate?: string;
};

export default function ManageStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [grade, setGrade] = useState("");
  const [studentNumber, setStudentNumber] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/students", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
      } else {
        alert("เซิร์ฟเวอร์แจ้งข้อผิดพลาด: " + (data.error || "ดึงข้อมูลไม่ได้"));
      }
    } catch (error: any) {
      console.error(error);
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  
  const handleToggleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map(s => s.id));
    }
  };
  
  const handleSetPeriod = async () => {
    if (selectedIds.length === 0) return alert("กรุณาเลือกนักเรียนอย่างน้อย 1 คน");
    if (!periodStart || !periodEnd) return alert("กรุณาระบุวันที่เริ่มและสิ้นสุด");
    
    try {
      setLoading(true);
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_period", ids: selectedIds, startDate: periodStart, endDate: periodEnd })
      });
      const data = await res.json();
      if (data.success) {
        alert("ตั้งช่วงเวลาฝึกงานเรียบร้อยแล้ว");
        setShowPeriodModal(false);
        setSelectedIds([]);
        fetchStudents();
      } else {
        alert("เกิดข้อผิดพลาด: " + (data.error || "Unknown"));
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !studentId) return;

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          student: { name, studentId, grade, studentNumber }
        })
      });
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
        setName("");
        setStudentId("");
        setGrade("");
        setStudentNumber("");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Map Excel columns to our format
        const newStudents = data.map((row: any) => {
          let g = String(row["ชั้น"] || row["Grade"] || "").trim();
          if (g === "4/1" || g === "4.1" || g === "ม.4/1") g = "ม.4/1";
          else if (g === "4/2" || g === "4.2" || g === "ม.4/2") g = "ม.4/2";
          else if (g === "5/1" || g === "5.1" || g === "ม.5/1") g = "ม.5/1";
          else if (g === "5/2" || g === "5.2" || g === "ม.5/2") g = "ม.5/2";
          return {
            studentId: String(row["เลขประจำตัว"] || row["Student ID"] || row["รหัส"] || "").trim(),
            name: String(row["ชื่อ-นามสกุล"] || row["ชื่อ"] || row["Name"] || "").trim(),
            grade: g,
            studentNumber: String(row["เลขที่"] || row["Number"] || "").trim()
          };
        }).filter(s => s.name && s.studentId);

        if (newStudents.length === 0) {
          alert("ไม่พบข้อมูลนักเรียน หรือหัวคอลัมน์ไม่ถูกต้อง (ต้องมี 'เลขประจำตัว', 'ชื่อ-นามสกุล')");
          return;
        }

        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "bulk_add", students: newStudents })
        });
        const apiData = await res.json();
        if (apiData.success) {
          setStudents(apiData.students);
          alert(`นำเข้าข้อมูลสำเร็จ ${newStudents.length} รายการ`);
        }
      } catch (error) {
        console.error(error);
        alert("เกิดข้อผิดพลาดในการอ่านไฟล์");
      }
      
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const templateData = [
      { "เลขประจำตัว": "35001", "ชื่อ-นามสกุล": "นายสมชาย ใจดี", "ชั้น": "ม.4/1", "เลขที่": "1" },
      { "เลขประจำตัว": "35002", "ชื่อ-นามสกุล": "นางสาวสมหญิง รักเรียน", "ชั้น": "ม.4/1", "เลขที่": "2" },
      { "เลขประจำตัว": "35003", "ชื่อ-นามสกุล": "นายวิทยา ก้าวหน้า", "ชั้น": "ม.4/1", "เลขที่": "3" },
      { "เลขประจำตัว": "35004", "ชื่อ-นามสกุล": "นางสาวนภาพร สดใส", "ชั้น": "ม.4/1", "เลขที่": "4" },
      { "เลขประจำตัว": "35005", "ชื่อ-นามสกุล": "นายธนกฤต มั่นคง", "ชั้น": "ม.4/1", "เลขที่": "5" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายชื่อนักเรียน");
    XLSX.writeFile(wb, "ตัวอย่างไฟล์นำเข้ารายชื่อนักเรียน.xlsx");
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setStudents(prev => prev.map(s => s.id === id ? { ...s, isInterning: newStatus } : s));
    
    try {
      await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", id, isInterning: newStatus })
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("คุณต้องการลบรายชื่อนี้ใช่หรือไม่?")) return;
    
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id })
      });
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteAll = async () => {
    if (students.length === 0) return;
    if (!confirm(`⚠️ ยืนยันการลบรายชื่อนักเรียนทั้งหมด (${students.length} คน) หรือไม่?\n\nข้อมูลที่ลบไปแล้วจะไม่สามารถกู้คืนได้`)) return;

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_all" }),
      });
      const data = await res.json();
      if (data.success) {
        setStudents([]);
        alert("ลบรายชื่อนักเรียนทั้งหมดเรียบร้อยแล้ว");
      } else {
        alert("เกิดข้อผิดพลาด: " + (data.error || "ลบไม่สำเร็จ"));
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 hover:bg-gray-200 rounded-full transition bg-white border shadow-sm">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">จัดการรายชื่อนักเรียนที่ฝึกงาน</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-fit">
            <h2 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
              <UserPlus size={20} /> เพิ่มนักเรียนทีละคน
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัวนักเรียน</label>
                <input type="text" value={studentId} onChange={e => setStudentId(e.target.value)} className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชั้น</label>
                  <select
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="">-- เลือกระดับชั้น --</option>
                    <option value="ม.4/1">ม.4/1</option>
                    <option value="ม.4/2">ม.4/2</option>
                    <option value="ม.5/1">ม.5/1</option>
                    <option value="ม.5/2">ม.5/2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่</label>
                  <input type="text" value={studentNumber} onChange={e => setStudentNumber(e.target.value)} className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium transition">
                บันทึกรายชื่อ
              </button>
            </form>
          </div>

          <div className="bg-green-50 p-6 rounded-xl border border-green-100 shadow-sm h-fit">
            <h2 className="text-lg font-bold text-green-800 mb-2 flex items-center gap-2">
              <FileUp size={20} /> นำเข้าด้วยไฟล์ Excel
            </h2>
            <p className="text-sm text-green-700 mb-4">
              ใช้ไฟล์ .xlsx หรือ .csv โดยต้องมีหัวคอลัมน์แถวแรกชื่อ <b>เลขประจำตัว</b> และ <b>ชื่อ-นามสกุล</b> (สามารถมี <b>ชั้น</b>, <b>เลขที่</b> ด้วยได้)
            </p>

            <div className="bg-white/80 p-3 rounded-lg border border-green-200 text-xs text-green-900 mb-4">
              <p className="font-bold mb-1.5 text-green-800">โครงสร้างหัวตาราง (แถวที่ 1):</p>
              <div className="grid grid-cols-4 gap-1 text-center font-medium bg-green-100/70 p-1.5 rounded border border-green-200">
                <span>เลขประจำตัว</span>
                <span>ชื่อ-นามสกุล</span>
                <span>ชั้น</span>
                <span>เลขที่</span>
              </div>
            </div>

            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden" 
            />

            <div className="space-y-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium transition flex items-center justify-center gap-2 shadow-sm"
              >
                <FileUp size={18} /> เลือกไฟล์ Excel เพื่อนำเข้า
              </button>

              <button 
                type="button"
                onClick={downloadTemplate}
                className="w-full bg-white text-green-700 border border-green-300 py-2 rounded-lg hover:bg-green-100/50 font-medium transition flex items-center justify-center gap-2 text-sm shadow-xs"
              >
                <Download size={16} /> ดาวน์โหลดไฟล์ตัวอย่าง (.xlsx)
              </button>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">รายชื่อทั้งหมด ({students.length} คน)</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => selectedIds.length > 0 ? setShowPeriodModal(true) : alert('กรุณาติ๊กเลือกนักเรียนในตารางก่อนครับ')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 font-medium shadow-xs ${selectedIds.length > 0 ? 'text-white bg-indigo-600 hover:bg-indigo-700 border-indigo-700' : 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'}`}
              >
                <Users size={14} />
                <span>ตั้งเวลาฝึกงาน {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  fetchStudents();
                }}
                className="text-xs text-blue-600 hover:text-white hover:bg-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-600 transition flex items-center gap-1.5 font-medium shadow-xs"
                title="ดึงข้อมูลรายชื่อล่าสุดจากฐานข้อมูล"
              >
                <RefreshCw size={14} />
                <span>ดึงข้อมูลล่าสุด</span>
              </button>
              {students.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAll}
                  className="text-xs text-red-600 hover:text-white hover:bg-red-600 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-600 transition flex items-center gap-1.5 font-medium shadow-xs"
                  title="ลบรายชื่อนักเรียนทั้งหมดในระบบ"
                >
                  <Trash2 size={14} />
                  <span>ลบรายชื่อทั้งหมด</span>
                </button>
              )}
            </div>
          </div>
          
          {loading ? (
            <p className="text-gray-500 text-center py-8">กำลังโหลดข้อมูล...</p>
          ) : students.length === 0 ? (
            <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg border border-dashed">ยังไม่มีรายชื่อนักเรียนในระบบ</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700 text-sm">
                    <th className="p-3 rounded-tl-lg w-10">
                      <input type="checkbox" checked={students.length > 0 && selectedIds.length === students.length} onChange={handleToggleSelectAll} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </th>
                    <th className="p-3">เลขประจำตัว</th>
                    <th className="p-3">ชื่อ-นามสกุล</th>
                    <th className="p-3">ชั้น</th>
                    <th className="p-3">เลขที่</th>
                    <th className="p-3">ช่วงเวลาฝึกงาน</th>
                    <th className="p-3">สถานะ</th>
                    <th className="p-3 rounded-tr-lg"></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-3">
                        <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => handleToggleSelect(s.id)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      </td>
                      <td className="p-3 font-medium text-blue-700">{s.studentId}</td>
                      <td className="p-3 text-gray-800">{s.name}</td>
                      <td className="p-3 text-gray-600">{s.grade}</td>
                      <td className="p-3 text-gray-600">{s.studentNumber}</td>
                      <td className="p-3 text-xs text-gray-600">
                        {s.startDate && s.endDate ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-green-700 font-medium">เริ่ม: {new Date(s.startDate).toLocaleDateString('th-TH')}</span>
                            <span className="text-orange-700 font-medium">สิ้นสุด: {new Date(s.endDate).toLocaleDateString('th-TH')}</span>
                          </div>
                        ) : <span className="text-gray-400">ยังไม่กำหนด</span>}
                      </td>
                      <td className="p-3">
                        <button 
                          onClick={() => handleToggleStatus(s.id, s.isInterning !== false)}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${s.isInterning !== false ? 'bg-green-100 text-green-800 border border-green-200 hover:bg-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'}`}
                        >
                          {s.isInterning !== false ? 'ฝึกงาน' : 'ไม่ฝึก'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showPeriodModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">กำหนดช่วงเวลาฝึกงาน</h3>
              <p className="text-sm text-gray-500">สำหรับนักเรียน {selectedIds.length} คนที่เลือก</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เริ่มฝึกงาน</label>
                <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่สิ้นสุด</label>
                <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              <button onClick={() => setShowPeriodModal(false)} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">ยกเลิก</button>
              <button onClick={handleSetPeriod} className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
