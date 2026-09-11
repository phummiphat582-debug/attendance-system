import React, { useState } from 'react';
import { 
  Settings, 
  Bell, 
  Clock, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import type { SystemSettings } from '../types/attendance';
import { testWebhookNotification } from '../lib/notifications';
import { attendanceService } from '../services/attendanceService';

interface SettingsModalProps {
  settings: SystemSettings;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newSettings: SystemSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [formData, setFormData] = useState<SystemSettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestWebhook = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testWebhookNotification(formData);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'เกิดข้อผิดพลาดในการทดสอบ' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await attendanceService.updateSettings(formData);
      if (res.success) {
        onSaved(formData);
        onClose();
      } else {
        alert(res.error || 'บันทึกการตั้งค่าไม่สำเร็จ');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-100">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ตั้งค่ากะงานและ Webhook แจ้งเตือนหัวหน้างาน
              </h3>
              <p className="text-xs text-slate-500">
                กำหนดเวลากะเข้างาน และช่องทาง Webhook (Discord / LINE / Telegram)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Work Hours Settings */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-700" />
              <span>เกณฑ์เวลากะเข้างานมาตรฐาน</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-600 font-medium block mb-1">
                  เวลาเริ่มกะงาน:
                </label>
                <input
                  type="time"
                  value={formData.work_start_time}
                  onChange={(e) => setFormData({ ...formData, work_start_time: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  ตัวอย่าง 08:30 น. (กะเช้า)
                </span>
              </div>

              <div>
                <label className="text-xs text-slate-600 font-medium block mb-1">
                  ระยะเวลาผ่อนปรน (นาที):
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={formData.late_threshold_minutes}
                  onChange={(e) => setFormData({ ...formData, late_threshold_minutes: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  เกินเวลา + นาทีนี้ จะนับเป็น "เข้างานสาย"
                </span>
              </div>
            </div>
          </div>

          {/* Webhook Notification Settings */}
          <div className="space-y-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-700" />
                <span>การแจ้งเตือนหัวหน้างาน (Supervisor Alerts)</span>
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                Cloudflare Worker / Edge
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1.5">
                เลือกช่องทางการแจ้งเตือน:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['discord', 'telegram', 'line'] as const).map((prov) => (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => setFormData({ ...formData, notify_provider: prov })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      formData.notify_provider === prov
                        ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {prov === 'discord' && '🎮 Discord'}
                    {prov === 'telegram' && '✈️ Telegram'}
                    {prov === 'line' && '💬 LINE'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-600 font-medium block mb-1">
                Webhook URL:
              </label>
              <input
                type="url"
                value={formData.notify_webhook_url}
                onChange={(e) => setFormData({ ...formData, notify_webhook_url: e.target.value })}
                placeholder={
                  formData.notify_provider === 'discord'
                    ? 'https://discord.com/api/webhooks/...'
                    : formData.notify_provider === 'telegram'
                    ? 'https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>'
                    : 'https://notify-api.line.me/api/notify หรือ Webhook'
                }
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 font-mono focus:outline-none focus:border-blue-600"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                {formData.notify_provider === 'discord'
                  ? 'นำมาจาก Discord Channel Settings > Integrations > Webhooks'
                  : formData.notify_provider === 'telegram'
                  ? 'สร้างบอทผ่าน @BotFather และระบุ Chat ID'
                  : 'ระบุ Webhook URL สำหรับรับข้อความแจ้งเตือน'}
              </span>
            </div>

            {/* Notification triggers */}
            <div className="pt-2 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notify_on_checkin}
                  onChange={(e) => setFormData({ ...formData, notify_on_checkin: e.target.checked })}
                  className="rounded border-slate-300 text-blue-700 focus:ring-0"
                />
                <span className="text-xs text-slate-700">
                  แจ้งเตือนทันทีเมื่อทีมช่าง <span className="text-emerald-600 font-bold">ลงเวลาเข้ากะ (Clock In)</span>
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notify_on_checkout}
                  onChange={(e) => setFormData({ ...formData, notify_on_checkout: e.target.checked })}
                  className="rounded border-slate-300 text-blue-700 focus:ring-0"
                />
                <span className="text-xs text-slate-700">
                  แจ้งเตือนเมื่อทีมช่าง <span className="text-blue-600 font-bold">ลงเวลาออกกะ (Clock Out)</span>
                </span>
              </label>
            </div>

            {/* Test Webhook Button & Status */}
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={testing || !formData.notify_webhook_url}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-2 transition disabled:opacity-40 cursor-pointer shadow-2xs"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-blue-700" />}
                <span>ทดสอบส่งข้อความแจ้งเตือน</span>
              </button>

              {testResult && (
                <div
                  className={`text-xs flex items-center gap-1.5 font-medium ${
                    testResult.success ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
