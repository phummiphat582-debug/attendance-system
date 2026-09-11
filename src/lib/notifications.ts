import type { AttendanceRecord, SystemSettings, UserProfile } from '../types/attendance';

export async function sendCheckInNotification(
  record: AttendanceRecord,
  profile: UserProfile,
  settings: SystemSettings
): Promise<{ success: boolean; message?: string }> {
  if (!settings.notify_on_checkin || !settings.notify_webhook_url) {
    return { success: true, message: 'Notification disabled or no webhook URL set' };
  }

  const workTypeLabels: Record<string, string> = {
    office: '🏢 ทำงานที่ออฟฟิศ (Office)',
    wfh: '🏠 ทำงานที่บ้าน (Work From Home)',
    onsite: '🚗 ทำงานนอกสถานที่ (On-site / Client)',
  };

  const statusLabel = record.status === 'on_time' ? '✅ ตรงเวลา' : '⚠️ เข้างานสาย';
  const workType = workTypeLabels[record.work_type] || record.work_type;

  // Format payload according to provider
  const payload = {
    provider: settings.notify_provider || 'discord',
    webhookUrl: settings.notify_webhook_url,
    event: 'check_in',
    data: {
      userName: profile.full_name,
      userEmail: profile.email,
      department: profile.department,
      githubUsername: profile.github_username,
      avatarUrl: profile.avatar_url,
      time: new Date(record.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: record.date,
      status: statusLabel,
      isLate: record.status === 'late',
      workType,
      note: record.check_in_note || '-',
      location: record.location || 'ไม่ได้ระบุพิกัด',
    }
  };

  try {
    // 1. Try sending via Cloudflare Pages Function endpoint
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return { success: true };
    }

    // 2. If running standalone in dev or client-only and discord webhook
    if (settings.notify_provider === 'discord' && settings.notify_webhook_url.startsWith('https://discord.com/api/webhooks')) {
      const discordPayload = {
        username: 'TimeAttendance Bot',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/2972/2972531.png',
        embeds: [
          {
            title: record.status === 'on_time' ? '🟢 ทีมงานลงเวลาเข้างานแล้ว' : '🟠 แจ้งเตือน: พนักงานเข้างานสาย',
            description: `**${profile.full_name}** ได้บันทึกเวลาเข้างานประจำวัน`,
            color: record.status === 'on_time' ? 0x22c55e : 0xf59e0b,
            thumbnail: profile.avatar_url ? { url: profile.avatar_url } : undefined,
            fields: [
              { name: '👤 ทีมงาน', value: `${profile.full_name}\n(@${profile.github_username || 'no-github'})`, inline: true },
              { name: '🏢 แผนก', value: profile.department || 'ทั่วไป', inline: true },
              { name: '⏰ เวลา', value: new Date(record.check_in_time).toLocaleTimeString('th-TH'), inline: true },
              { name: '📌 สถานะ', value: statusLabel, inline: true },
              { name: '📍 รูปแบบงาน', value: workType, inline: true },
              { name: '🗺️ ตำแหน่ง', value: record.location || 'ไม่ได้ระบุ', inline: true },
              { name: '📝 บันทึกงานวันนี้', value: record.check_in_note || 'ไม่มีบันทึกรายละเอียด', inline: false },
            ],
            footer: { text: 'ระบบลงเวลางาน Cloudflare + Supabase + GitHub' },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const directRes = await fetch(settings.notify_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload),
      });

      if (directRes.ok) {
        return { success: true };
      }
    }

    return { success: false, message: 'Failed to deliver webhook notification' };
  } catch (err: unknown) {
    console.error('Notification dispatch error:', err);
    return { success: false, message: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function sendCheckOutNotification(
  record: AttendanceRecord,
  profile: UserProfile,
  settings: SystemSettings
): Promise<{ success: boolean; message?: string }> {
  if (!settings.notify_on_checkout || !settings.notify_webhook_url) {
    return { success: true };
  }

  const payload = {
    provider: settings.notify_provider || 'discord',
    webhookUrl: settings.notify_webhook_url,
    event: 'check_out',
    data: {
      userName: profile.full_name,
      userEmail: profile.email,
      department: profile.department,
      avatarUrl: profile.avatar_url,
      time: record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('th-TH') : '',
      date: record.date,
      note: record.check_out_note || 'เลิกงานเรียบร้อย',
    }
  };

  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { success: response.ok };
  } catch (err) {
    console.error(err);
    return { success: false };
  }
}

export async function testWebhookNotification(
  settings: SystemSettings
): Promise<{ success: boolean; message: string }> {
  if (!settings.notify_webhook_url) {
    return { success: false, message: 'กรุณากรอก Webhook URL ก่อนทดสอบ' };
  }

  try {
    const dummyProfile: UserProfile = {
      id: 'test-user',
      email: 'employee@company.com',
      full_name: 'สมชาย ใจดี (ทดสอบระบบ)',
      role: 'employee',
      department: 'Engineering',
      github_username: 'octocat',
      avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
    };

    const dummyRecord: AttendanceRecord = {
      id: 'test-rec',
      user_id: 'test-user',
      date: new Date().toISOString().split('T')[0],
      check_in_time: new Date().toISOString(),
      work_type: 'office',
      status: 'on_time',
      check_in_note: 'ทดสอบส่งการแจ้งเตือนจากระบบบันทึกเวลาเข้างาน',
      location: 'Bangkok, Thailand',
    };

    const result = await sendCheckInNotification(dummyRecord, dummyProfile, settings);
    if (result.success) {
      return { success: true, message: 'ส่งข้อความทดสอบสำเร็จ! โปรดตรวจสอบที่ช่องทางของคุณ' };
    } else {
      return { success: false, message: result.message || 'ส่งข้อความทดสอบไม่สำเร็จ โปรดตรวจ Webhook URL' };
    }
  } catch (e: unknown) {
    return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ' };
  }
}
