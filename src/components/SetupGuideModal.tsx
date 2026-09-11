import React, { useState } from 'react';
import { 
  BookOpen, 
  Database, 
  Cloud, 
  Bell, 
  CheckCircle2, 
  Copy 
} from 'lucide-react';
import { GithubIcon } from './icons/GithubIcon';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeStep, setActiveStep] = useState<'supabase' | 'github' | 'cloudflare' | 'webhook'>('supabase');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl animate-in zoom-in-95">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                คู่มือการเชื่อมต่อระบบ ProTech (GitHub + Supabase + Cloudflare)
              </h3>
              <p className="text-xs text-slate-500">
                ขั้นตอนการผูกระบบเพื่อใช้งานจริงในระดับองค์กร
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg p-1.5 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/60 px-5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveStep('supabase')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeStep === 'supabase'
                ? 'border-blue-700 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-600" />
            <span>1. Supabase (ฐานข้อมูล & Realtime)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('github')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeStep === 'github'
                ? 'border-blue-700 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GithubIcon className="w-4 h-4" />
            <span>2. GitHub OAuth (ล็อกอินช่างเทคนิค)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('cloudflare')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeStep === 'cloudflare'
                ? 'border-blue-700 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-4 h-4 text-amber-500" />
            <span>3. Cloudflare Pages & Workers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('webhook')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeStep === 'webhook'
                ? 'border-blue-700 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bell className="w-4 h-4 text-blue-700" />
            <span>4. Webhook แจ้งเตือนหัวหน้างาน</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {activeStep === 'supabase' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                การตั้งค่า Supabase Database & Realtime
              </h4>
              <p>1. ไปที่ <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-700 underline font-semibold">supabase.com</a> แล้วสร้าง Project ใหม่</p>
              <p>2. ไปที่ <b>SQL Editor</b> แล้วนำโค้ดจากไฟล์ <code className="text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">supabase/schema.sql</code> มาวางแล้วกด <b>Run</b></p>
              <p>3. ไปที่ <b>Project Settings &gt; API</b> แล้วคัดลอก Project URL และ anon key มาใส่ในไฟล์ <code className="text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">.env</code>:</p>
              <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] relative">
                <pre>{`VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`}</pre>
                <button
                  type="button"
                  onClick={() => copyToClipboard(`VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-key`, 'env')}
                  className="absolute right-3 top-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
                >
                  {copied === 'env' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied === 'env' ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
              </div>
            </div>
          )}

          {activeStep === 'github' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GithubIcon className="w-4 h-4" />
                การผูก GitHub OAuth กับ Supabase
              </h4>
              <p>1. ไปที่ GitHub: <b>Settings &gt; Developer settings &gt; OAuth Apps &gt; New OAuth App</b></p>
              <p>2. ตั้งค่า Authorization callback URL เป็น: <code className="text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">https://&lt;PROJECT-ID&gt;.supabase.co/auth/v1/callback</code></p>
              <p>3. คัดลอก Client ID และ Client Secret ไปวางใน Supabase: <b>Authentication &gt; Providers &gt; GitHub</b></p>
            </div>
          )}

          {activeStep === 'cloudflare' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-amber-500" />
                การ Deploy ขึ้น Cloudflare Pages แบบถาวร
              </h4>
              <p>1. Push โค้ดนี้ขึ้น GitHub Repository ของคุณ</p>
              <p>2. ไปที่ Cloudflare Dashboard &gt; <b>Workers &amp; Pages &gt; Create application &gt; Pages &gt; Connect to Git</b></p>
              <p>3. ตั้งค่า Build: <code className="text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">bun run build</code> และ output: <code className="text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">dist</code></p>
              <p>4. ระบุตัวแปร <code className="text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">VITE_SUPABASE_URL</code> และ <code className="text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">VITE_SUPABASE_ANON_KEY</code></p>
            </div>
          )}

          {activeStep === 'webhook' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-700" />
                การแจ้งเตือนหัวหน้างานผ่าน Webhook
              </h4>
              <p>1. ในห้อง Discord ของหัวหน้างาน: คลิกขวาที่ชื่อห้อง &gt; <b>Edit Channel &gt; Integrations &gt; Webhooks &gt; New Webhook</b></p>
              <p>2. นำ URL มากรอกในเมนู <b>"ตั้งค่า Webhook"</b> ของระบบ</p>
              <p>3. กดปุ่ม <b>"ทดสอบส่งข้อความแจ้งเตือน"</b> เพื่อยืนยันว่าข้อความส่งเข้าห้องแชทได้สำเร็จ</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition cursor-pointer"
          >
            เข้าใจแล้ว ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
