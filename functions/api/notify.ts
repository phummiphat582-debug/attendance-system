// Cloudflare Pages Function: /api/notify
// Handles webhook notification dispatch to Discord, LINE, Telegram from the edge

interface Env {
  // Can store secrets here if needed in Cloudflare Dashboard
  LINE_CHANNEL_ACCESS_TOKEN?: string;
  TELEGRAM_BOT_TOKEN?: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await context.request.json() as any;
    const { provider, webhookUrl, event, data } = body;

    if (!webhookUrl && provider !== 'telegram_bot' && provider !== 'line_bot') {
      return new Response(JSON.stringify({ error: 'Missing webhookUrl' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (provider === 'discord') {
      const isCheckIn = event === 'check_in';
      const isLate = data.isLate;

      const discordBody = {
        username: 'TimeAttendance Cloudflare Bot',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/2972/2972531.png',
        embeds: [
          {
            title: isCheckIn 
              ? (isLate ? '🟠 แจ้งเตือน: สมาชิกเข้างานสาย' : '🟢 สมาชิกทีมงานลงเวลาเข้างานแล้ว')
              : '🔵 สมาชิกทีมงานลงเวลาออกงาน',
            description: `**${data.userName}** ได้ทำการลงเวลาเรียบร้อยแล้ว`,
            color: isCheckIn ? (isLate ? 0xf59e0b : 0x10b981) : 0x3b82f6,
            thumbnail: data.avatarUrl ? { url: data.avatarUrl } : undefined,
            fields: [
              { name: '👤 ชื่อพนักงาน', value: `${data.userName} (${data.department || 'ทั่วไป'})`, inline: true },
              { name: '⏰ เวลาบันทึก', value: data.time || '-', inline: true },
              { name: '📅 วันที่', value: data.date || '-', inline: true },
              ...(isCheckIn ? [
                { name: '📌 สถานะ', value: data.status || '-', inline: true },
                { name: '📍 รูปแบบการทำงาน', value: data.workType || '-', inline: true },
                { name: '🗺️ ตำแหน่ง/พิกัด', value: data.location || '-', inline: true },
                { name: '📝 บันทึกงานวันนี้', value: data.note || 'ไม่มีบันทึก', inline: false }
              ] : [
                { name: '📝 สรุปงานประจำวัน', value: data.note || 'ไม่มีบันทึก', inline: false }
              ])
            ],
            footer: {
              text: 'Cloudflare Pages + Supabase Attendance',
            },
            timestamp: new Date().toISOString(),
          }
        ]
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordBody),
      });

      return new Response(JSON.stringify({ success: res.ok, status: res.status }), {
        status: res.ok ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (provider === 'telegram') {
      // Telegram format: Expects webhookUrl to be https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>
      // Or a direct webhook
      const text = [
        `🔔 <b>[ระบบลงเวลางาน] ${event === 'check_in' ? 'เข้างานแล้ว' : 'ออกงานแล้ว'}</b>`,
        `👤 <b>พนักงาน:</b> ${data.userName} (${data.department || 'ทั่วไป'})`,
        `⏰ <b>เวลา:</b> ${data.time}`,
        `📌 <b>สถานะ:</b> ${data.status || 'ปกติ'}`,
        `📍 <b>รูปแบบ:</b> ${data.workType || '-'}`,
        `📝 <b>บันทึก:</b> ${data.note || '-'}`,
      ].join('\n');

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          parse_mode: 'HTML',
        }),
      });

      return new Response(JSON.stringify({ success: res.ok }), {
        status: res.ok ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (provider === 'line') {
      // LINE Notify format or Webhook
      const message = `\n[ลงเวลางาน]\n👤 ${data.userName}\n⏰ ${data.time}\n📌 ${data.status}\n📍 ${data.workType}\n📝 ${data.note || '-'}`;
      
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ message }),
      });

      return new Response(JSON.stringify({ success: res.ok }), {
        status: res.ok ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default generic POST
    const genericRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data, timestamp: new Date().toISOString() }),
    });

    return new Response(JSON.stringify({ success: genericRes.ok }), {
      status: genericRes.ok ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
