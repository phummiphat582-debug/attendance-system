import React, { useState, useRef } from 'react';
import { X, UserPlus, Trash2, Edit3, Check, Users, Camera, Upload } from 'lucide-react';
import type { UserProfile } from '../types/attendance';
import { attendanceService } from '../services/attendanceService';

interface EmployeeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: UserProfile[];
  onEmployeesUpdated: () => void;
}

// Preset Avatars for quick 1-click selection
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
];

// Helper to compress image via canvas
const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 300;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const EmployeeManagerModal: React.FC<EmployeeManagerModalProps> = ({
  isOpen,
  onClose,
  employees,
  onEmployeesUpdated,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAvatar, setNewAvatar] = useState<string>(PRESET_AVATARS[0]);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  // File input refs
  const addFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleUploadNewAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      setNewAvatar(dataUrl);
    } catch (err) {
      console.error('Failed to process image:', err);
    }
  };

  const handleUploadEditAvatar = async (e: React.ChangeEvent<HTMLInputElement>, empId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      setEditAvatar(dataUrl);
      attendanceService.updateEmployeePhoto(empId, dataUrl);
      onEmployeesUpdated();
    } catch (err) {
      console.error('Failed to process image:', err);
    }
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    attendanceService.addEmployee(newName.trim(), newDept.trim() || 'ฝ่ายปฏิบัติการ', newEmail.trim(), newAvatar);
    setNewName('');
    setNewDept('');
    setNewEmail('');
    setNewAvatar(PRESET_AVATARS[0]);
    setShowAddForm(false);
    onEmployeesUpdated();
  };

  const handleStartEdit = (emp: UserProfile) => {
    setEditingId(emp.id);
    setEditName(emp.full_name);
    setEditDept(emp.department);
    setEditAvatar(emp.avatar_url || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    attendanceService.updateEmployee(id, editName.trim(), editDept.trim() || 'ฝ่ายปฏิบัติการ', editAvatar || undefined);
    setEditingId(null);
    onEmployeesUpdated();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบพนักงาน "${name}" ออกจากระบบ?`)) {
      attendanceService.deleteEmployee(id);
      onEmployeesUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">จัดการรายชื่อ & รูปถ่ายพนักงาน</h3>
              <p className="text-xs text-slate-500">อัปโหลดรูปภาพ ปรับเปลี่ยนข้อมูลทีมงานสำหรับการลงเวลา</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Add Employee Button / Expandable Form */}
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full py-3.5 rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ เพิ่มพนักงานใหม่พร้อมรูปถ่าย</span>
            </button>
          ) : (
            <form onSubmit={handleAddEmployee} className="bg-gradient-to-b from-blue-50/60 to-slate-50 border border-blue-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
                <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                  <span>เพิ่มพนักงานใหม่</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕ ยกเลิก
                </button>
              </div>

              {/* Photo Upload Section */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">รูปถ่ายพนักงาน</label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Photo Preview Frame */}
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-blue-400 bg-white p-0.5 shadow-md flex-shrink-0">
                      <img
                        src={newAvatar}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => addFileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-bold transition cursor-pointer"
                    >
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span>เปลี่ยนรูป</span>
                    </button>
                  </div>

                  {/* Upload Controls & Presets */}
                  <div className="space-y-2 flex-1 w-full">
                    <input
                      ref={addFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadNewAvatar}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>เลือกรูปจากอุปกรณ์ (มือถือ/PC)</span>
                      </button>
                    </div>

                    {/* Quick Avatar Presets */}
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">หรือเลือกจากรูปตัวอย่าง:</span>
                      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                        {PRESET_AVATARS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setNewAvatar(preset)}
                            className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition flex-shrink-0 cursor-pointer ${
                              newAvatar === preset ? 'border-blue-600 ring-2 ring-blue-400' : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <img src={preset} alt="preset" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">ชื่อ - นามสกุล *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น วรัญญา สุขเกษม"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">แผนก / หน้าที่</label>
                  <input
                    type="text"
                    placeholder="เช่น ช่างไฟฟ้า, ฝ่ายบัญชี..."
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer transition"
                >
                  ✓ บันทึกพนักงานใหม่
                </button>
              </div>
            </form>
          )}

          {/* Employee List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 block">
              รายชื่อพนักงานทั้งหมด ({employees.length} คน)
            </span>
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
              {employees.map((emp) => {
                const isEditing = editingId === emp.id;

                return (
                  <div key={emp.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Photo with Change Photo Trigger */}
                      <div className="relative group flex-shrink-0">
                        <img
                          src={isEditing && editAvatar ? editAvatar : emp.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.full_name}`}
                          alt={emp.full_name}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-xs"
                        />
                        <label
                          htmlFor={`file-upload-${emp.id}`}
                          className="absolute inset-0 bg-black/40 text-white rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition cursor-pointer"
                          title="เปลี่ยนรูปภาพพนักงาน"
                        >
                          <Camera className="w-4 h-4" />
                        </label>
                        <input
                          id={`file-upload-${emp.id}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleUploadEditAvatar(e, emp.id)}
                          className="hidden"
                        />
                      </div>

                      {isEditing ? (
                        <div className="flex flex-col sm:flex-row gap-2 flex-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-2.5 py-1.5 text-xs border rounded-lg flex-1 font-semibold"
                            placeholder="ชื่อ-นามสกุล"
                          />
                          <input
                            type="text"
                            value={editDept}
                            onChange={(e) => setEditDept(e.target.value)}
                            className="px-2.5 py-1.5 text-xs border rounded-lg flex-1"
                            placeholder="แผนก"
                          />
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{emp.full_name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{emp.department}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(emp.id)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                            title="บันทึก"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                            title="ยกเลิก"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Change Photo label */}
                          <label
                            htmlFor={`file-upload-${emp.id}`}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                            title="เปลี่ยนรูปภาพ"
                          >
                            <Camera className="w-3 h-3" />
                            <span className="hidden sm:inline">เปลี่ยนรูป</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {employees.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDelete(emp.id, emp.full_name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="ลบพนักงาน"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
