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

    // If Google Apps Script is configured, send data there
    if (GAS_URL) {
      data.action = 'addReport';
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const result = await res.json();
      return NextResponse.json(result);
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
      const res = await fetch(`${GAS_URL}?action=getReports`);
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
