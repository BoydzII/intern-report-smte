import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'students.json');
const GAS_URL = process.env.GAS_URL || process.env.NEXT_PUBLIC_GAS_URL;

async function getStudentsData() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveStudentsData(data: any) {
  await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
}

export async function GET() {
  try {
    if (GAS_URL) {
      const res = await fetch(`${GAS_URL}?action=getStudents`);
      const result = await res.json();
      return NextResponse.json(result);
    }

    const students = await getStudentsData();
    return NextResponse.json({ success: true, students });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (GAS_URL) {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const result = await res.json();
      return NextResponse.json(result);
    }

    const students = await getStudentsData();
    
    // Local JSON Logic
    if (data.action === 'add') {
      const { name, studentId, grade, studentNumber } = data.student;
      students.push({ id: Date.now().toString(), name, studentId, grade, studentNumber });
      await saveStudentsData(students);
      return NextResponse.json({ success: true, students });
    }
    
    if (data.action === 'bulk_add') {
      const newStudents = data.students.map((s: any) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: s.name,
        studentId: s.studentId,
        grade: s.grade || '',
        studentNumber: s.studentNumber || ''
      }));
      const merged = [...students, ...newStudents];
      await saveStudentsData(merged);
      return NextResponse.json({ success: true, students: merged });
    }
    
    if (data.action === 'delete') {
      const updated = students.filter((s: any) => s.id !== data.id);
      await saveStudentsData(updated);
      return NextResponse.json({ success: true, students: updated });
    }

    if (data.action === 'clear_all' || data.action === 'delete_all') {
      await saveStudentsData([]);
      return NextResponse.json({ success: true, students: [] });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
