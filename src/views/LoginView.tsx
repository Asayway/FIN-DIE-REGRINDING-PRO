import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { storageService } from '../services/storageService';
import { Shield, UserCheck, Lock, LogIn, ArrowRight } from 'lucide-react';
import { useLanguage } from '../i18n';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { language } = useLanguage();
  const users = storageService.getUsers();
  const [selectedUser, setSelectedUser] = useState<User>(users[0] || storageService.getCurrentUser());
  const [pinCode, setPinCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      storageService.setCurrentUser(selectedUser);
      onLoginSuccess(selectedUser);
    }
  };

  const handleQuickSelect = (user: User) => {
    setSelectedUser(user);
    storageService.setCurrentUser(user);
    onLoginSuccess(user);
  };

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl text-white font-sans animate-fadeIn">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-cyan-950 border border-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          <Shield className="w-7 h-7 text-cyan-400" />
        </div>
        <h2 className="text-xl font-black uppercase tracking-wider font-mono text-white">
          {language === 'TH' ? 'เข้าสู่ระบบ / สลับผู้ใช้งาน' : 'USER LOGIN & ACCESS SWITCH'}
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          FIN DIE TOOLING & LIFETIME SHOT MONITORING SYSTEM
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <label className="block text-xs font-bold text-slate-300 font-mono uppercase">
          {language === 'TH' ? 'เลือกบัญชีผู้ใช้งาน (Select Profile)' : 'Select User Profile'}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {users.map(u => {
            const isSelected = selectedUser.id === u.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickSelect(u)}
                className={`p-3.5 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'bg-[#0d1117] border-[#30363d] text-slate-300 hover:border-slate-500 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    u.role === 'ADMIN' || u.role === 'SYSTEM_ADMIN' ? 'bg-purple-900 text-purple-300 border border-purple-500' :
                    u.role === 'TOOLING_ADMIN' || u.role === 'ENGINEERING' ? 'bg-blue-900 text-blue-300 border border-blue-500' :
                    u.role === 'MAINTENANCE_TECH' || u.role === 'MAINTENANCE' ? 'bg-amber-900 text-amber-300 border border-amber-500' :
                    'bg-emerald-900 text-emerald-300 border border-emerald-500'
                  }`}>
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-sm leading-tight text-white">{u.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">{u.role}</div>
                  </div>
                </div>
                <ArrowRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600'}`} />
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-4 pt-4 border-t border-[#30363d]">
        {errorMsg && (
          <div className="p-3 bg-rose-950/80 border border-rose-500 rounded text-xs text-rose-300 font-mono">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono font-bold text-sm rounded-lg flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
        >
          <LogIn className="w-4 h-4" />
          <span>{language === 'TH' ? `เข้าสู่ระบบในชื่อ ${selectedUser.name}` : `Continue as ${selectedUser.name}`}</span>
        </button>
      </form>
    </div>
  );
};
