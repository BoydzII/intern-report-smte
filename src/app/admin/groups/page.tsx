
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Trash2, Plus, Edit } from "lucide-react";

type Student = {
  id: string;
  name: string;
  studentId: string;
  grade: string;
  groupName?: string;
};

export default function ManageGroupsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  
  // For assigning students to a group
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningGroup, setAssigningGroup] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [filterGrade, setFilterGrade] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/students", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setStudents(data.students || []);
        // Extract unique groups
        const uniqueGroups = Array.from(new Set((data.students || []).map((s: any) => s.groupName).filter(Boolean))) as string[];
        setGroups(uniqueGroups);
      } else {
        alert("เซิร์ฟเวอร์แจ้งข้อผิดพลาด: " + (data.error || "ดึงข้อมูลไม่ได้"));
      }
    } catch (error: any) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return alert("กรุณาใส่ชื่อกลุ่ม");
    if (groups.includes(newGroupName.trim())) return alert("ชื่อกลุ่มนี้มีอยู่แล้ว");
    setGroups([...groups, newGroupName.trim()]);
    setNewGroupName("");
    setShowAddModal(false);
  };

  const handleDeleteGroup = async (group: string) => {
    if (!confirm(`คุณต้องการลบกลุ่ม "${group}" ใช่หรือไม่? (นักเรียนในกลุ่มจะถูกถอดออกจากกลุ่มแต่ไม่ถูกลบออกจากระบบ)`)) return;
    
    // Find all students in this group
    const studentsInGroup = students.filter(s => s.groupName === group).map(s => s.id);
    
    if (studentsInGroup.length > 0) {
      try {
        setLoading(true);
        // Call API to remove them from group (update_group)
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_group", ids: studentsInGroup, groupName: "" })
        });
        const data = await res.json();
        if (!data.success) {
          alert("เกิดข้อผิดพลาดในการลบกลุ่ม: " + data.error);
          setLoading(false);
          return;
        }
      } catch (e: any) {
        alert("Error: " + e.message);
        setLoading(false);
        return;
      }
    }
    
    setGroups(groups.filter(g => g !== group));
    fetchStudents();
  };

  const handleOpenAssignModal = (group: string) => {
    setAssigningGroup(group);
    setSelectedStudentIds(students.filter(s => s.groupName === group).map(s => s.id));
    setShowAssignModal(true);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSaveGroupAssignment = async () => {
    try {
      setLoading(true);
      // 1. Remove group from students who were unchecked
      const originallyInGroup = students.filter(s => s.groupName === assigningGroup).map(s => s.id);
      const removedIds = originallyInGroup.filter(id => !selectedStudentIds.includes(id));
      
      if (removedIds.length > 0) {
        await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_group", ids: removedIds, groupName: "" })
        });
      }

      // 2. Add group to students who are checked
      if (selectedStudentIds.length > 0) {
        await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_group", ids: selectedStudentIds, groupName: assigningGroup })
        });
      }

      alert("บันทึกสมาชิกกลุ่มเรียบร้อยแล้ว");
      setShowAssignModal(false);
      fetchStudents();
    } catch (e: any) {
      alert("Error: " + e.message);
      setLoading(false);
    }
  };

  const filteredStudents = filterGrade === "" ? students : students.filter(s => s.grade === filterGrade);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-700 text-white p-4 sm:p-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/students" className="p-2 hover:bg-indigo-600 rounded-full transition">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Users size={28} />
              จัดการกลุ่มสถานที่ฝึกงาน
            </h1>
          </div>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-white text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-50 shadow-sm">
            <Plus size={18} />
            สร้างกลุ่มใหม่
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 mt-4">
        {loading ? (
          <div className="text-center py-20 text-gray-500 font-bold animate-pulse">กำลังโหลดข้อมูล...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-bold">ยังไม่มีกลุ่มฝึกงาน</p>
                <button onClick={() => setShowAddModal(true)} className="mt-4 text-indigo-600 font-bold hover:underline">สร้างกลุ่มแรกเลย</button>
              </div>
            ) : (
              groups.map((group, idx) => {
                const groupStudents = students.filter(s => s.groupName === group);
                return (
                  <div key={idx} className="bg-white rounded-2xl shadow-md border-2 border-indigo-100 p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-gray-800">{group}</h3>
                      <button onClick={() => handleDeleteGroup(group)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
                    </div>
                    <div className="text-sm text-gray-500 mb-6 font-medium">
                      มีนักเรียนในกลุ่ม: <span className="text-indigo-600 font-bold text-lg">{groupStudents.length}</span> คน
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-gray-100 flex gap-2">
                      <button onClick={() => handleOpenAssignModal(group)} className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-xl font-bold transition">
                        <Edit size={16} /> แก้ไขรายชื่อ
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Add Group Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <h3 className="font-bold text-xl text-gray-800">สร้างกลุ่มฝึกงานใหม่</h3>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อกลุ่ม / สถานที่ฝึกงาน</label>
                <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="เช่น โรงพยาบาลปากช่อง" />
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">ยกเลิก</button>
              <button onClick={handleCreateGroup} className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium shadow-sm">สร้างกลุ่ม</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Students Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-xl text-gray-800">จัดการรายชื่อกลุ่ม: <span className="text-indigo-600">{assigningGroup}</span></h3>
                <p className="text-sm text-gray-500 mt-1">เลือกนักเรียนที่ต้องการให้อยู่ในกลุ่มนี้ (คนเดียวก็สร้างได้)</p>
              </div>
            </div>
            
            <div className="p-4 border-b border-gray-100 flex gap-4 bg-white">
              <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="border-2 border-gray-200 rounded-lg px-4 py-2 font-medium text-sm outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">ทุกระดับชั้น</option>
                <option value="ม.4/1">ม.4/1</option>
                <option value="ม.4/2">ม.4/2</option>
                <option value="ม.5/1">ม.5/1</option>
                <option value="ม.5/2">ม.5/2</option>
              </select>
              <div className="flex items-center text-sm font-bold text-gray-600">
                เลือกแล้ว: <span className="ml-2 text-indigo-600">{selectedStudentIds.length}</span> คน
              </div>
            </div>

            <div className="overflow-y-auto p-4 flex-1 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredStudents.map(s => (
                  <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${selectedStudentIds.includes(s.id) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-indigo-200'}`}>
                    <input 
                      type="checkbox" 
                      checked={selectedStudentIds.includes(s.id)} 
                      onChange={() => handleToggleSelect(s.id)}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-gray-800">{s.name}</div>
                      <div className="text-xs text-gray-500">รหัส: {s.studentId} | ชั้น: {s.grade}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 rounded-b-2xl shrink-0">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">ยกเลิก</button>
              <button onClick={handleSaveGroupAssignment} className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium shadow-sm">บันทึกรายชื่อ</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
