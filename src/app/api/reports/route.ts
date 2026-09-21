export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'reports.json');
const GAS_URL = process.env.GAS_URL || process.env.NEXT_PUBLIC_GAS_URL;

async function getReportsData() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveReportsData(data: any) {
  await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // ป้องกัน Google Sheets แปลงระดับชั้น เช่น "4/2" เป็นวันที่ โดยแปลงให้มี "ม." นำหน้าเสมอ
    if (data.grade) {
      let g = String(data.grade).trim();
      if (g === "4/1" || g === "4.1" || g === "ม.4/1") g = "ม.4/1";
      else if (g === "4/2" || g === "4.2" || g === "ม.4/2") g = "ม.4/2";
      else if (g === "5/1" || g === "5.1" || g === "ม.5/1") g = "ม.5/1";
      else if (g === "5/2" || g === "5.2" || g === "ม.5/2") g = "ม.5/2";
      data.grade = g;
    }

    // If Google Apps Script is configured, send data there
    if (GAS_URL) {
      // --- DUPLICATE CHECK ---
      try {
        const checkRes = await fetch(`${GAS_URL}?action=getReports`, { cache: 'no-store', next: { revalidate: 0 } });
        const checkResult = await checkRes.json();
        
        if (checkResult.success && checkResult.reports) {
          const submitDate = String(data.date).split('T')[0];
          const isDuplicate = checkResult.reports.some((r: any) => {
            if (!r.date) return false;
            // Parse r.date in local time (handling Google Sheets UTC offset bug)
            const rDateObj = new Date(r.date);
            
            // submitDate is "YYYY-MM-DD", let's extract YYYY, MM, DD from rDateObj locally
            const rYear = rDateObj.getFullYear();
            const rMonth = String(rDateObj.getMonth() + 1).padStart(2, '0');
            const rDay = String(rDateObj.getDate()).padStart(2, '0');
            const rDateStr = `${rYear}-${rMonth}-${rDay}`;
            
            return String(r.intern.studentId) === String(data.studentId) && rDateStr === submitDate;
          });
          
          if (isDuplicate) {
            console.log(`Duplicate submission prevented for student ${data.studentId} on ${submitDate}`);
            return NextResponse.json({ success: true, message: "Already submitted today" });
          }
        }
      } catch (checkError) {
        console.error("Failed to check for duplicates, proceeding anyway", checkError);
      }
      // -----------------------

      data.action = 'addReport';
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return NextResponse.json(await res.json());
    }

    // Otherwise use Local JSON
    const { internName, studentId, grade, studentNumber, department, date, photoBase64 } = data;
    const reports = await getReportsData();
    const newReport = {
      id: Date.now().toString(),
      intern: {
        firstName: internName,
        studentId: studentId,
        grade: grade,
        studentNumber: studentNumber,
        department: department,
      },
      date: date,
      imageUrl: photoBase64,
      createdAt: new Date().toISOString()
    };
    reports.push(newReport);
    await saveReportsData(reports);
    return NextResponse.json({ success: true, report: newReport });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (GAS_URL) {
      const res = await fetch(`${GAS_URL}?action=getReports`, { cache: 'no-store', next: { revalidate: 0 } });
      const result = await res.json();
      result.reports.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return NextResponse.json(result);
    }

    const reports = await getReportsData();
    reports.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing report id' }, { status: 400 });

    if (GAS_URL) {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'deleteReport', id }),
      });
      const result = await res.json();
      return NextResponse.json(result);
    }

    const reports = await getReportsData();
    const filtered = reports.filter((r: any) => r.id !== id);
    await saveReportsData(filtered);
    return NextResponse.json({ success: true, reports: filtered });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
