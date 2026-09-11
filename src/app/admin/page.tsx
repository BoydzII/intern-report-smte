"use client";

import { useEffect, useState, useMemo } from "react";
import { Download, Printer, Users, Trash2 } from "lucide-react";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import Link from "next/link";

type ReportData = {
  id: string;
  intern: {
    firstName: string;
    studentId: string;
    grade: string;
    studentNumber: string;
    department: string;
  };
  date: string;
  imageUrl: string;
  createdAt: string;
};

type Student = {
  id: string;
  name: string;
  studentId: string;
  grade: string;
  studentNumber: string;
};

export default function AdminDashboard() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterType, setFilterType] = useState<"all" | "daily" | "weekly">("all");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);

  // Document metadata state
  const [term, setTerm] = useState("1");
  const [academicYear, setAcademicYear] = useState((new Date().getFullYear() + 543).toString());
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reportsRes, studentsRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/students")
      ]);
      const reportsData = await reportsRes.json();
      const studentsData = await studentsRes.json();
      
      if (reportsData.success) setReports(reportsData.reports);
      if (studentsData.success) setStudents(studentsData.students);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    if (filterType === "all") return reports;
    
    return reports.filter(report => {
      const reportDate = new Date(report.date);
      const selectedDate = new Date(filterDate);
      
      if (filterType === "daily") {
        return reportDate.toISOString().split("T")[0] === selectedDate.toISOString().split("T")[0];
      }
      
      if (filterType === "weekly") {
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
        const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
        return isWithinInterval(reportDate, { start, end });
      }
      return true;
    });
  }, [reports, filterType, filterDate]);

  // Compute Missing Students
  const missingStudents = useMemo(() => {
    if (filterType !== "daily" || students.length === 0) return [];
    
    // Get array of studentIds who submitted report on this day
    const submittedIds = filteredReports.map(r => r.intern.studentId);
    
    // Find students who are NOT in submittedIds
    return students.filter(s => !submittedIds.includes(s.studentId));
  }, [filteredReports, students, filterType]);

  const handleDeleteReport = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบข้อมูลรายงานของ "${name}" ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/reports?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setReports(prev => prev.filter(r => r.id !== id));
      } else {
        alert("ลบไม่สำเร็จ: " + (data.error || "เกิดข้อผิดพลาด"));
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการลบข้อมูล");
    }
  };

  const exportCSV = () => {
    if (filteredReports.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "วันที่ฝึกงาน,เลขประจำตัว,ชื่อ-นามสกุล,ชั้น,เลขที่,สถานที่ฝึกงาน,วันที่ส่งรายงาน\n";

    filteredReports.forEach((row) => {
      const date = new Date(row.date).toLocaleDateString("th-TH");
      const studentId = row.intern.studentId || "";
      const name = row.intern.firstName;
      const grade = row.intern.grade || "";
      const num = row.intern.studentNumber || "";
      const dept = row.intern.department;
      const createdAt = new Date(row.createdAt).toLocaleString("th-TH");
      
      const rowString = `"${date}","${studentId}","${name}","${grade}","${num}","${dept}","${createdAt}"\n`;
      csvContent += rowString;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `intern_reports_${filterType}_${filterDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto mt-4 print:mt-0 print:p-0">
      
      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block text-center mb-6">
        <div className="flex justify-center items-center gap-8 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/school-logo.jpg" alt="โรงเรียนปากช่อง" className="h-28 object-contain mix-blend-multiply" />
          
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/msp-logo.jpg" alt="โครงการห้องเรียนพิเศษวิทยาศาสตร์สุขภาพและการแพทย์ (MSP)" className="h-24 object-contain mix-blend-multiply" />
        </div>
        <div className="text-center mt-3 mb-5 px-10">
          <p className="text-2xl font-extrabold text-gray-900 tracking-wide leading-relaxed">
            โครงการห้องเรียนพิเศษวิทยาศาสตร์สุขภาพและการแพทย์
          </p>
          <p className="text-xl font-bold text-gray-900 mt-1">ระดับมัธยมศึกษาตอนปลาย</p>
        </div>
        <h1 className="text-xl font-bold underline mt-4">
          สรุปรายงานการฝึกงาน {filterType === 'daily' ? `ประจำวันที่ ${new Date(filterDate).toLocaleDateString("th-TH")}` : filterType === 'weekly' ? 'รายสัปดาห์' : 'ตลอดช่วงเวลา'}
        </h1>
        <p className="text-lg mt-2 font-medium">ภาคเรียนที่ {term} ปีการศึกษา {academicYear}</p>
      </div>

      <div className="print:hidden flex justify-between items-end mb-4">
        <h2 className="text-2xl font-bold text-gray-800">สรุปรายงานฝึกงาน</h2>
        <Link href="/admin/students" className="flex items-center gap-2 bg-white border border-blue-200 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 font-medium transition shadow-sm">
          <Users size={18} />
          จัดการฐานข้อมูลนักเรียน ({students.length})
        </Link>
      </div>

      <div className="print:hidden bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-wrap items-end gap-4 border border-gray-100">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">รูปแบบรายงาน</label>
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value as any)}
            className="border border-gray-300 bg-white text-gray-900 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none w-full"
          >
            <option value="all">ตลอดช่วงเวลาฝึก (ทั้งหมด)</option>
            <option value="daily">รายวัน</option>
            <option value="weekly">รายสัปดาห์</option>
          </select>
        </div>

        {filterType !== "all" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">เลือกวันที่</label>
            <input 
              type="date" 
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="border border-gray-300 bg-white text-gray-900 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none w-full"
            />
          </div>
        )}

        <div className="w-full border-b my-2 md:hidden"></div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ภาคเรียนที่</label>
          <input 
            type="text" 
            value={term}
            onChange={e => setTerm(e.target.value)}
            className="border border-gray-300 bg-white text-gray-900 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none w-20 text-center"
            placeholder="1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ปีการศึกษา</label>
          <input 
            type="text" 
            value={academicYear}
            onChange={e => setAcademicYear(e.target.value)}
            className="border border-gray-300 bg-white text-gray-900 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none w-28 text-center"
            placeholder="2569"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">ลงชื่อครูผู้ดูแล (พิมพ์สำหรับใบรายงาน)</label>
          <input 
            type="text" 
            value={teacherName}
            onChange={e => setTeacherName(e.target.value)}
            className="border border-gray-300 bg-white text-gray-900 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none w-full"
            placeholder="เช่น นายคุณครู ใจดี"
          />
        </div>

        <div className="w-full mt-2 flex justify-end gap-3">
          <button
            onClick={exportCSV}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 shadow-sm font-medium"
          >
            <Download size={20} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition flex items-center gap-2 shadow-sm font-medium"
          >
            <Printer size={20} />
            <span>พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-12 text-gray-500 print:hidden">กำลังโหลดข้อมูล...</div>
      ) : (
        <>
          {filterType === "daily" && students.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm mb-6 print:mb-8">
              <h3 className="font-bold text-lg text-gray-800 mb-3 border-b pb-2">สรุปการเข้าฝึกงาน</h3>
              <div className="flex flex-wrap gap-6 mb-4">
                <div className="bg-blue-50 px-4 py-3 rounded-lg border border-blue-100 flex-1 min-w-[150px]">
                  <p className="text-sm text-blue-700 font-semibold mb-1">นักเรียนทั้งหมด</p>
                  <p className="text-2xl font-extrabold text-blue-900">{students.length} <span className="text-lg font-medium">คน</span></p>
                </div>
                <div className="bg-green-50 px-4 py-3 rounded-lg border border-green-100 flex-1 min-w-[150px]">
                  <p className="text-sm text-green-700 font-semibold mb-1">ส่งรายงานแล้ว</p>
                  <p className="text-2xl font-extrabold text-green-900">{filteredReports.length} <span className="text-lg font-medium">คน</span></p>
                </div>
                <div className="bg-red-50 px-4 py-3 rounded-lg border border-red-100 flex-1 min-w-[150px]">
                  <p className="text-sm text-red-700 font-semibold mb-1">ยังไม่ส่งรายงาน / ขาด</p>
                  <p className="text-2xl font-extrabold text-red-900">{missingStudents.length} <span className="text-lg font-medium">คน</span></p>
                </div>
              </div>

              {missingStudents.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold text-red-700 mb-2">รายชื่อนักเรียนที่ขาด / ยังไม่รายงาน:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {missingStudents.map(ms => (
                      <div key={ms.id} className="text-sm bg-red-50/50 border border-red-100 px-3 py-2 rounded-md text-red-900 flex justify-between">
                        <span>{ms.name}</span>
                        <span className="text-red-700/70 text-xs">ม.{ms.grade} ลข.{ms.studentNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {filteredReports.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl border border-dashed text-gray-500 print:hidden shadow-sm">
              ไม่มีข้อมูลรายงานในช่วงเวลานี้
            </div>
          ) : (
            <>
              <h3 className="font-bold text-lg text-gray-800 mb-4 print:hidden">รูปถ่ายและรายงานที่ส่งแล้ว</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
                {filteredReports.map((report) => (
                  <div key={report.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col print:shadow-none print:border-gray-400 print:mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={report.imageUrl} 
                      alt="Report photo" 
                      className="w-full h-48 object-cover bg-gray-100 print:h-40"
                    />
                    <div className="p-5 flex-1 print:p-3">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-lg text-gray-800 print:text-base">{report.intern.firstName}</h3>
                        <button
                          onClick={() => handleDeleteReport(report.id, report.intern.firstName)}
                          className="print:hidden text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded-lg transition flex items-center gap-1 text-xs border border-red-200 shadow-sm"
                          title="ลบรายงานนี้"
                        >
                          <Trash2 size={14} />
                          <span>ลบข้อมูล</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600 mb-2 mt-1 print:text-xs">
                        <span>เลขประจำตัวนักเรียน: <span className="font-medium">{report.intern.studentId || '-'}</span></span>
                        <span>ชั้น: <span className="font-medium">{report.intern.grade || '-'}</span></span>
                        <span>เลขที่: <span className="font-medium">{report.intern.studentNumber || '-'}</span></span>
                      </div>
                      <p className="text-gray-700 text-sm mb-4 print:text-xs print:mb-2">สถานที่ฝึก: <span className="font-semibold">{report.intern.department}</span></p>
                      <div className="bg-blue-50 text-blue-800 text-xs px-3 py-1.5 rounded-full inline-block font-medium print:bg-transparent print:border print:border-gray-300 print:rounded-none">
                        ฝึกงานวันที่: {new Date(report.date).toLocaleDateString("th-TH")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Print Signature Footer */}
          <div className="hidden print:flex justify-end mt-16 pb-8">
            <div className="text-center">
              <p className="mb-2">ลงชื่อ.........................................................................</p>
              <p className="mb-1">( {teacherName || "............................................................."} )</p>
              <p>ครูผู้ดูแลการฝึกงาน</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
