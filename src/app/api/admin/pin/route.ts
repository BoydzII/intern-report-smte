import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const configFilePath = path.join(process.cwd(), 'data', 'config.json');
const GAS_URL = process.env.GAS_URL || process.env.NEXT_PUBLIC_GAS_URL;
const DEFAULT_PIN = "1234";

async function getConfig() {
  try {
    const data = await fs.readFile(configFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { adminPin: DEFAULT_PIN };
  }
}

async function saveConfig(data: any) {
  await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
  await fs.writeFile(configFilePath, JSON.stringify(data, null, 2), 'utf8');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, pin, currentPin, newPin } = body;

    // If GAS_URL is set, proxy to Google Apps Script
    if (GAS_URL) {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const result = await res.json();
      return NextResponse.json(result);
    }

    // Local file fallback
    const config = await getConfig();
    const storedPin = process.env.NEXT_PUBLIC_ADMIN_PIN || config.adminPin || DEFAULT_PIN;

    if (action === 'verify') {
      if (pin === storedPin) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }

    if (action === 'change') {
      if (currentPin !== storedPin) {
        return NextResponse.json({ success: false, error: 'รหัสผ่านเดิมไม่ถูกต้อง' }, { status: 400 });
      }
      if (!newPin || newPin.length < 4) {
        return NextResponse.json({ success: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร' }, { status: 400 });
      }

      config.adminPin = newPin;
      await saveConfig(config);
      return NextResponse.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
