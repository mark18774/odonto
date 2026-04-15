import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Wallet, Clock, Calendar, Download, Users, Filter } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function Reportes() {
  const [ingresos, setIngresos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [selectedMedicos, setSelectedMedicos] = useState<number[]>([]);
  const [fechas, setFechas] = useState({ inicio: '', fin: '' });
  const { token, user } = useAuthStore();

  const fetchMedicos = async () => {
    if (!user?.es_admin) return;
    try {
      const res = await fetch('/api/medicos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setMedicos(await res.json());
    } catch (error) {
      console.error("Error fetching medicos:", error);
    }
  };

  const fetchIngresos = async () => {
    try {
      const params = new URLSearchParams(fechas);
      if (selectedMedicos.length > 0) {
        params.append('medicos', selectedMedicos.join(','));
      }
      const res = await fetch(`/api/reportes/ingresos?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setIngresos(data);
      } else {
        setIngresos([]);
      }
    } catch (error) {
      console.error("Error fetching ingresos:", error);
      setIngresos([]);
    }
  };

  const fetchCuentas = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedMedicos.length > 0) {
        params.append('medicos', selectedMedicos.join(','));
      }
      const res = await fetch(`/api/reportes/cuentas-cobrar?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setCuentas(data);
      } else {
        setCuentas([]);
      }
    } catch (error) {
      console.error("Error fetching cuentas:", error);
      setCuentas([]);
    }
  };

  useEffect(() => {
    fetchMedicos();
    fetchIngresos();
    fetchCuentas();
  }, [selectedMedicos]);

  const toggleMedico = (id: number) => {
    setSelectedMedicos(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const totalIngresos = Array.isArray(ingresos) ? ingresos.reduce((sum, i: any) => sum + (parseFloat(i.monto) || 0), 0) : 0;
  const totalCuentas = Array.isArray(cuentas) ? cuentas.reduce((sum, c: any) => sum + (parseFloat(c.saldo) || 0), 0) : 0;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold text-gray-900">Reportes Financieros</h2>
          <p className="text-gray-500">Análisis de ingresos y cuentas pendientes.</p>
        </div>
        <div className="flex gap-4">
          {user?.es_admin && (
            <div className="relative group">
              <button className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50">
                <Users size={16} /> Médicos ({selectedMedicos.length || 'Todos'})
              </button>
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl p-4 hidden group-hover:block z-50">
                <h5 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                  <Filter size={12} /> Filtrar por Médico
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {medicos.map((m: any) => (
                    <label key={m.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        checked={selectedMedicos.includes(m.id)}
                        onChange={() => toggleMedico(m.id)}
                      />
                      <span className="text-sm text-gray-700">{m.nombre_completo}</span>
                    </label>
                  ))}
                </div>
                {selectedMedicos.length > 0 && (
                  <button 
                    onClick={() => setSelectedMedicos([])}
                    className="w-full mt-4 text-xs text-red-500 font-bold hover:underline"
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>
            </div>
          )}
          <button className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50">
            <Download size={16} /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-emerald-600 p-8 rounded-[2rem] text-white shadow-xl shadow-emerald-600/20">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-2xl"><TrendingUp size={24} /></div>
            <span className="text-xs font-bold uppercase tracking-widest opacity-60">Total Ingresos</span>
          </div>
          <h3 className="text-4xl font-bold mb-2">Bs. {totalIngresos.toFixed(2)}</h3>
          <p className="text-sm opacity-80">En el periodo seleccionado</p>
        </div>

        <div className="bg-amber-500 p-8 rounded-[2rem] text-white shadow-xl shadow-amber-500/20">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-2xl"><Wallet size={24} /></div>
            <span className="text-xs font-bold uppercase tracking-widest opacity-60">Cuentas por Cobrar</span>
          </div>
          <h3 className="text-4xl font-bold mb-2">Bs. {totalCuentas.toFixed(2)}</h3>
          <p className="text-sm opacity-80">Tratamientos en curso</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ingresos Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h4 className="font-bold text-gray-900 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /> Detalle de Ingresos</h4>
            <div className="flex gap-2">
              <input 
                type="date" 
                className="text-xs border border-gray-200 rounded-lg p-1"
                onChange={(e) => setFechas({ ...fechas, inicio: e.target.value })}
              />
              <button onClick={fetchIngresos} className="bg-gray-100 p-1 rounded-lg"><Calendar size={14} /></button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
                <tr>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Paciente</th>
                  {user?.es_admin && <th className="px-6 py-3">Médico</th>}
                  <th className="px-6 py-3">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ingresos.map((i: any, idx) => (
                  <tr key={idx} className="text-sm">
                    <td className="px-6 py-4 text-gray-500">
                      {i.fecha_pago ? new Date(i.fecha_pago).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-medium">{i.paciente || 'N/A'}</td>
                    {user?.es_admin && <td className="px-6 py-4 text-gray-500">{i.medico || 'N/A'}</td>}
                    <td className="px-6 py-4 text-emerald-600 font-bold">Bs. {parseFloat(i.monto || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cuentas por Cobrar */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h4 className="font-bold text-gray-900 flex items-center gap-2"><Clock size={18} className="text-amber-500" /> Cuentas Pendientes</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
                <tr>
                  <th className="px-6 py-3">Paciente</th>
                  <th className="px-6 py-3">Tratamiento</th>
                  {user?.es_admin && <th className="px-6 py-3">Médico</th>}
                  <th className="px-6 py-3">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cuentas.map((c: any) => (
                  <tr key={c.id} className="text-sm">
                    <td className="px-6 py-4 font-medium">{c.paciente || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-500">{c.tratamiento || 'N/A'}</td>
                    {user?.es_admin && <td className="px-6 py-4 text-gray-500">{c.medico || 'N/A'}</td>}
                    <td className="px-6 py-4 text-amber-600 font-bold">Bs. {parseFloat(c.saldo || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
