import React, { useState } from 'react';
import { X, UserPlus, Trash2, Edit3, Check, Users } from 'lucide-react';
import type { UserProfile } from '../types/attendance';
import { attendanceService } from '../services/attendanceService';

interface EmployeeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: UserProfile[];
  onEmployeesUpdated: () => void;
}

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

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');

  if (!isOpen) return null;

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    attendanceService.addEmployee(newName.trim(), newDept.trim() || 'ฝ่ายปฏิบัติการ', newEmail.trim());
    setNewName('');
    setNewDept('');
    setNewEmail('');
    setShowAddForm(false);
    onEmployeesUpdated();
  };

  const handleStartEdit = (emp: UserProfile) => {
    setEditingId(emp.id);
    setEditName(emp.full_name);
    setEditDept(emp.department);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    attendanceService.updateEmployee(id, editName.trim(), editDept.trim() || 'ฝ่ายปฏิบัติการ');
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
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">จัดการรายชื่อพนักงาน</h3>
              <p className="text-xs text-slate-500">เพิ่ม ลบ หรือแก้ไขข้อมูลทีมงานสำหรับการลงเวลา</p>
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
          {/* Add Employee Form / Button */}
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 rounded-xl border border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ เพิ่มพนักงานใหม่เข้าระบบ</span>
            </button>
          ) : (
            <form onSubmit={handleAddEmployee} className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-950">ข้อมูลพนักงานใหม่</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  ยกเลิก
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">ชื่อ - นามสกุล *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น วรัญญา สุขเกษม"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">แผนก / ตำแหน่ง</label>
                  <input
                    type="text"
                    placeholder="เช่น ช่างไฟฟ้า, ฝ่ายบัญชี..."
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  บันทึกพนักงานใหม่
                </button>
              </div>
            </form>
          )}

          {/* Employee List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 block">รายชื่อทั้งหมด ({employees.length} คน)</span>
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
              {employees.map((emp) => {
                const isEditing = editingId === emp.id;

                return (
                  <div key={emp.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/60">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={emp.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.full_name}`}
                        alt={emp.full_name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 flex-shrink-0"
                      />
                      {isEditing ? (
                        <div className="flex flex-col sm:flex-row gap-2 flex-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-2 py-1 text-xs border rounded-lg flex-1"
                          />
                          <input
                            type="text"
                            value={editDept}
                            onChange={(e) => setEditDept(e.target.value)}
                            className="px-2 py-1 text-xs border rounded-lg flex-1"
                          />
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{emp.full_name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{emp.department}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
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
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
