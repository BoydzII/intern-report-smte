"use client";

import { useState, useRef, useEffect } from "react";
import { saveDraftReport } from "@/lib/storage";
import { Camera, Save } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ReportPage() {
  const router = useRouter();
  
  const [internName, setInternName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [grade, setGrade] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [department, setDepartment] = useState("");
  
  const [date, setDate] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved user info on mount
  useEffect(() => {
    setDate(new Date().toISOString().split("T")[0]);
    
    const savedName = localStorage.getItem("intern_name");
    const savedId = localStorage.getItem("intern_student_id");
    const savedGrade = localStorage.getItem("intern_grade");
    const savedNum = localStorage.getItem("intern_num");
    const savedDept = localStorage.getItem("intern_dept");

    if (savedName) setInternName(savedName);
    if (savedId) setStudentId(savedId);
    if (savedGrade) setGrade(savedGrade);
    if (savedNum) setStudentNumber(savedNum);
    if (savedDept) setDepartment(savedDept);
  }, []);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internName || !studentId || !grade || !studentNumber || !department || !date || !photo) {
      alert("กรุณากรอกข้อมูลและถ่ายรูปให้ครบถ้วน");
      return;
    }

    // Save info for next time
    localStorage.setItem("intern_name", internName);
    localStorage.setItem("intern_student_id", studentId);
    localStorage.setItem("intern_grade", grade);
    localStorage.setItem("intern_num", studentNumber);
    localStorage.setItem("intern_dept", department);

    try {
      await saveDraftReport({
        internId: studentId,
        internName,
        studentId,
        grade,
        studentNumber,
        department,
        date,
        photoBase64: photo,
      });
      alert("บันทึกข้อมูลลงเครื่องสำเร็จ! อย่าลืมกดส่งข้อมูลในหน้ารายการรอส่งเมื่อมีอินเทอร์เน็ต");
      router.push("/sync");
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 mt-2">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-blue-800">บันทึกรูปถ่ายประจำวัน</h2>
        <p className="text-sm text-gray-500 mt-1">ระบบจะจดจำข้อมูลส่วนตัวของคุณอัตโนมัติ</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* ข้อมูลนักเรียน Section */}
        <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
          <h3 className="font-semibold text-gray-700 border-b pb-2">ข้อมูลส่วนตัวนักเรียน</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล</label>
            <input
              type="text"
              value={internName}
              onChange={(e) => setInternName(e.target.value)}
              className="w-full bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="เช่น นาย สมชาย ใจดี"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เลขประจำตัวนักเรียน</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="เช่น 12345"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่</label>
              <input
                type="text"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                className="w-full bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="เช่น 12"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ระดับชั้น</label>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="เช่น ม.4/1"
              required
            />
          </div>
        </div>

        {/* ข้อมูลการฝึกงาน Section */}
        <div className="bg-blue-50 p-4 rounded-xl space-y-4 border border-blue-100">
          <h3 className="font-semibold text-blue-800 border-b border-blue-200 pb-2">ข้อมูลการฝึกงาน</h3>
          
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">สถานที่ฝึกงาน / แผนก</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="เช่น โรงพยาบาลปากช่องนานา (แผนก IT)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">วันที่ฝึกงาน</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              required
            />
          </div>
        </div>

        {/* รูปถ่าย Section */}
        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">รูปถ่ายสถานที่ทำงาน (1 รูป)</label>
          
          {photo ? (
            <div className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Captured" className="w-full h-56 object-cover rounded-xl border-2 border-gray-200 shadow-sm" />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full py-1.5 px-4 text-sm font-medium shadow-md transition-all"
              >
                ลบ / ถ่ายใหม่
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-blue-300 rounded-xl p-10 flex flex-col items-center justify-center text-blue-600 hover:border-blue-500 hover:bg-blue-50 transition-all bg-gray-50/50"
            >
              <div className="bg-blue-100 p-4 rounded-full mb-3">
                <Camera size={36} />
              </div>
              <span className="font-semibold text-lg">แตะเพื่อถ่ายรูป / เลือกรูป</span>
              <span className="text-xs text-gray-500 mt-2">ถ่ายรูปหน้างาน 1 รูปต่อวัน</span>
            </button>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handlePhotoCapture}
            className="hidden"
          />
        </div>

        <button
          type="submit"
          className="w-full flex justify-center items-center gap-2 bg-blue-600 text-white py-3.5 rounded-xl font-semibold text-lg hover:bg-blue-700 active:bg-blue-800 shadow-md transition-all mt-8"
        >
          <Save size={20} />
          บันทึกลงเครื่อง (รอส่ง)
        </button>
      </form>
    </div>
  );
}
