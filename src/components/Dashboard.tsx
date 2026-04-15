import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  Users, UserPlus, ClipboardList, Stethoscope, 
  History, BarChart3, LogOut, Menu, X, 
  ChevronRight, Calendar, CreditCard, Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MedicosList from './dashboard/MedicosList';
import PacientesList from './dashboard/PacientesList';
import Cotizaciones from './dashboard/Cotizaciones';
import Atencion from './dashboard/Atencion';
import HistoriaClinica from './dashboard/HistoriaClinica';
import Reportes from './dashboard/Reportes';

export default function Dashboard() {
  const { user, token, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'home' && token) {
      fetchStats();
    }
  }, [activeTab, token]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    ...(user?.es_admin ? [{ id: 'medicos', label: 'Médicos', icon: Stethoscope }] : []),
    { id: 'pacientes', label: 'Pacientes', icon: Users },
    { id: 'cotizaciones', label: 'Cotizaciones', icon: UserPlus },
    { id: 'atencion', label: 'Atención', icon: Calendar },
    { id: 'historia', label: 'Historia Clínica', icon: History },
    { id: 'reportes', label: 'Reportes', icon: BarChart3 },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'medicos': return <MedicosList />;
      case 'pacientes': return (
        <PacientesList 
          onViewHistory={(id) => {
            setSelectedPatientId(id);
            setActiveTab('historia');
          }} 
        />
      );
      case 'cotizaciones': return <Cotizaciones />;
      case 'atencion': return <Atencion />;
      case 'historia': return (
        <HistoriaClinica 
          initialPacienteId={selectedPatientId} 
          onClearSelection={() => setSelectedPatientId(null)} 
        />
      );
      case 'reportes': return <Reportes />;
      default: return (
        <div className="p-8">
          <h2 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-8">Bienvenido, Dr. {user?.nombre}</h2>
          
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5A5A40]"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  title="Mis Pacientes" 
                  value={stats?.pacientes || 0} 
                  icon={Users} 
                  color="bg-blue-50 text-blue-600" 
                />
                <StatCard 
                  title="Citas Pendientes" 
                  value={stats?.citasPendientes || 0} 
                  icon={Calendar} 
                  color="bg-amber-50 text-amber-600" 
                />
                <StatCard 
                  title="Ingresos del Mes" 
                  value={`Bs. ${parseFloat(stats?.ingresosMes || 0).toLocaleString()}`} 
                  icon={CreditCard} 
                  color="bg-emerald-50 text-emerald-600" 
                />
              </div>

              <div className="mt-12 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-serif font-bold mb-6">Próximas Citas</h3>
                {stats?.proximasCitas && stats.proximasCitas.length > 0 ? (
                  <div className="space-y-4">
                    {stats.proximasCitas.map((cita: any) => (
                      <div key={cita.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-3 rounded-xl shadow-sm">
                            <Calendar className="text-[#5A5A40]" size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{cita.paciente_nombre}</p>
                            <p className="text-sm text-gray-500">{cita.tratamiento_nombre}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#5A5A40]">
                            {new Date(cita.fecha_programada).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(cita.fecha_programada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No hay citas programadas para las próximas horas.</p>
                )}
              </div>
            </>
          )}
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-[#1a1a1a] text-white flex flex-col fixed h-full z-50"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-serif font-bold text-xl">
              COPABANA
            </motion.div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 mt-4 px-3 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-[#5A5A40] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={22} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
              {isSidebarOpen && activeTab === item.id && (
                <motion.div layoutId="active-pill" className="ml-auto"><ChevronRight size={16} /></motion.div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={22} />
            {isSidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-[280px]' : 'ml-[80px]'}`}>
        <header className="bg-white border-b border-gray-100 p-6 flex justify-between items-center sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-serif font-bold text-gray-800">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900">{user?.nombre}</p>
              <p className="text-xs text-gray-500 uppercase tracking-tighter">Médico Odontólogo</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#5A5A40] flex items-center justify-center text-white font-bold">
              {user?.nombre[0]}
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-6">
      <div className={`p-4 rounded-2xl ${color}`}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
