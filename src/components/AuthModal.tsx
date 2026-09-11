import React, { useState } from 'react';
import { Mail, Lock, User, Building, Loader2, AlertCircle } from 'lucide-react';
import { GithubIcon } from './icons/GithubIcon';
import { attendanceService } from '../services/attendanceService';
import { isSupabaseConfigured } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('ช่างเทคนิคอาวุโส');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGitHubAuth = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await attendanceService.signInWithGitHub();
      if (error) {
        setErrorMessage(error.message);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการล็อกอินด้วย GitHub');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (tab === 'signin') {
        const { error } = await attendanceService.signInWithEmail(email, password);
        if (error) throw error;
        onSuccess();
        onClose();
      } else {
        const { error } = await attendanceService.signUpWithEmail(email, password, fullName, department);
        if (error) throw error;
        alert('สมัครสมาชิกสำเร็จเรียบร้อย! คุณสามารถเข้าสู่ระบบได้ทันที');
        setTab('signin');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              เข้าสู่ระบบ ProTech
            </h3>
            <p className="text-xs text-slate-500">
              รองรับทั้ง GitHub Account และ Email ประจำบริษัท
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* GitHub OAuth Button */}
        <div>
          <button
            type="button"
            onClick={handleGitHubAuth}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2.5 transition cursor-pointer"
          >
            <GithubIcon className="w-4 h-4 text-slate-900" />
            <span>เข้าสู่ระบบด้วย GitHub</span>
          </button>
          {!isSupabaseConfigured && (
            <p className="text-[11px] text-amber-700 text-center mt-1.5 font-medium">
              💡 ในโหมดทดสอบ (Demo Mode) สามารถสลับผู้ใช้ที่แถบด้านบน หรือพิมพ์อีเมลเข้าใช้งานได้ทันที
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 w-full"></div>
          <span className="bg-white px-3 text-[11px] text-slate-400 uppercase">
            หรือใช้อีเมล
          </span>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setTab('signin')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === 'signin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => setTab('signup')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              tab === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
            }`}
          >
            สร้างบัญชีใหม่
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          {tab === 'signup' && (
            <>
              <div>
                <label className="text-xs text-slate-600 font-medium block mb-1">ชื่อ-นามสกุล:</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="สมชาย ใจดี"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 font-medium block mb-1">ตำแหน่ง / ไซต์ประจำการ:</label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="ช่างเทคนิคอาวุโส • สถานี 04 พระราม 9"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-xs text-slate-600 font-medium block mb-1">อีเมล:</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="somchai@protech.co.th"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600 font-medium block mb-1">รหัสผ่าน:</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{tab === 'signin' ? 'เข้าสู่ระบบ' : 'ยืนยันสร้างบัญชี'}</span>
          </button>
        </form>

      </div>
    </div>
  );
};
