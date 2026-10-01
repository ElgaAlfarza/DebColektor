import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, FileText, Send,
  Shield, Menu, X, Bell, Settings, ChevronRight,
} from 'lucide-react';
import Dashboard        from './pages/Dashboard';
import NasabahManagement from './pages/NasabahManagement';
import TemplateManager  from './pages/TemplateManager';
import BlastControl     from './pages/BlastControl';

// ─── Navigation config ────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',          icon: LayoutDashboard, badge: null },
  { id: 'nasabah',   label: 'Data Nasabah',       icon: Users,           badge: null },
  { id: 'template',  label: 'Template & Spintax', icon: FileText,        badge: null },
  { id: 'blast',     label: 'Bulk Blast & Queue', icon: Send,            badge: null },
];

const PAGE_MAP = {
  dashboard: Dashboard,
  nasabah:   NasabahManagement,
  template:  TemplateManager,
  blast:     BlastControl,
};

// ─── Sidebar ──────────────────────────────────────────────────
function Sidebar({ active, setActive, collapsed, setCollapsed }) {
  return (
    <aside className={`flex flex-col bg-slate-900 border-r border-slate-700/60 transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/60">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center flex-shrink-0">
          <Shield size={16} className="text-white"/>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-white text-sm leading-tight">DebtColektor</p>
            <p className="text-xs text-teal-400 leading-tight">CRM & WA Gateway</p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => setActive(id)}
              title={collapsed ? label : ''}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group ${
                isActive
                  ? 'bg-teal-600/20 text-teal-400 border border-teal-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/60'
              }`}>
              <Icon size={18} className="flex-shrink-0"/>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">{label}</span>
                  {badge && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
                      badge === 'NEW' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' :
                      isActive ? 'bg-teal-600/40 text-teal-300' : 'bg-slate-700 text-slate-400'
                    }`}>{badge}</span>
                  )}
                </>
              )}
              {/* Collapsed badge dot */}
              {collapsed && badge && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-400 rounded-full"/>
              )}
              {/* Tooltip on collapsed */}
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-slate-100 text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-slate-700">
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-slate-700/60 space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Perlebar sidebar' : 'Sembunyikan sidebar'}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 text-sm font-medium transition-all">
          <ChevronRight size={18} className={`transition-transform ${collapsed ? '' : 'rotate-180'}`}/>
          {!collapsed && <span>Sembunyikan</span>}
        </button>
        <button
          title={collapsed ? 'Pengaturan' : ''}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 text-sm font-medium transition-all">
          <Settings size={18} className="flex-shrink-0"/>
          {!collapsed && <span>Pengaturan</span>}
        </button>
      </div>
    </aside>
  );
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [activePage, setActivePage]   = useState('dashboard');
  const [collapsed, setCollapsed]     = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [waOnline, setWaOnline]       = useState(false);

  // Poll WA status for top bar indicator
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('http://localhost:3001/api/status');
        const d = await r.json();
        setWaOnline(d.connected);
      } catch { setWaOnline(false); }
    };
    check();
    const t = setInterval(check, 10000);
    return () => clearInterval(t);
  }, []);

  const ActivePage = PAGE_MAP[activePage] || Dashboard;
  const activeNav  = NAV_ITEMS.find(n => n.id === activePage);

  const notifications = [
    { id: 1, text: 'Sistem siap digunakan', time: 'Baru saja', type: 'success' },
    { id: 2, text: 'Pastikan WA terhubung sebelum blast', time: '1 menit lalu', type: 'info' },
  ];

  const handleSetPage = (page) => {
    setActivePage(page);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">

      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar active={activePage} setActive={setActivePage} collapsed={collapsed} setCollapsed={setCollapsed}/>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}/>
          <div className="relative flex">
            <Sidebar active={activePage} setActive={handleSetPage} collapsed={false} setCollapsed={() => setMobileOpen(false)}/>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top Header */}
        <header className="bg-slate-900 border-b border-slate-700/60 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
            <Menu size={18}/>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            {activeNav && React.createElement(activeNav.icon, { size: 16, className: 'text-teal-400 flex-shrink-0' })}
            <h2 className="text-sm font-semibold text-slate-100 truncate">{activeNav?.label}</h2>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* WA Status badge */}
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              waOnline
                ? 'bg-teal-900/30 border-teal-700/40 text-teal-400'
                : 'bg-slate-800/60 border-slate-700 text-slate-500'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${waOnline ? 'bg-teal-400 animate-pulse' : 'bg-slate-500'}`}/>
              {waOnline ? 'WA Terhubung' : 'WA Terputus'}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotifOpen(v => !v)}
                className="relative p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                <Bell size={18}/>
                <span className="absolute top-1 right-1 w-2 h-2 bg-teal-500 rounded-full"/>
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-40 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                    <p className="font-semibold text-white text-sm">Notifikasi</p>
                    <button onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-white"><X size={14}/></button>
                  </div>
                  <div className="divide-y divide-slate-700/50">
                    {notifications.map(n => (
                      <div key={n.id} className="px-4 py-3 hover:bg-slate-700/40 cursor-pointer">
                        <div className="flex items-start gap-2.5">
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            n.type === 'success' ? 'bg-teal-400' : n.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
                          }`}/>
                          <div>
                            <p className="text-sm text-slate-200">{n.text}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white">A</div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-slate-200">Admin</p>
                <p className="text-xs text-slate-500">Supervisor</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <ActivePage key={activePage}/>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden bg-slate-900 border-t border-slate-700/60 flex items-center justify-around py-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon, badge }) => {
            const isActive = activePage === id;
            return (
              <button key={id} onClick={() => setActivePage(id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 relative ${isActive ? 'text-teal-400' : 'text-slate-500'}`}>
                <Icon size={19}/>
                <span className="text-[10px]">{label.split(' ')[0]}</span>
                {badge && <span className="absolute -top-0.5 right-0 w-1.5 h-1.5 bg-teal-400 rounded-full"/>}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
