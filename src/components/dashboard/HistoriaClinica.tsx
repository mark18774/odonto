import React, { useState, useEffect } from 'react';
import { Search, History, User, FileText, Pill, CreditCard, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function HistoriaClinica({ initialPacienteId, onClearSelection }: { initialPacienteId?: number | null, onClearSelection?: () => void }) {
  const [pacientes, setPacientes] = useState([]);
  const [selectedPaciente, setSelectedPaciente] = useState<any>(null);
  const [historia, setHistoria] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { token } = useAuthStore();

  useEffect(() => {
    const fetchPacientes = async () => {
      const res = await fetch('/api/pacientes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPacientes(await res.json());
    };
    fetchPacientes();
    
    if (initialPacienteId) {
      fetchHistoria(initialPacienteId);
    }
  }, [initialPacienteId]);

  const fetchHistoria = async (pacienteId: number) => {
    const res = await fetch(`/api/historia/${pacienteId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setSelectedPaciente(data.paciente);
    setHistoria(data.history);
  };

  const filteredPacientes = pacientes.filter((p: any) => 
    p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ci.includes(searchTerm)
  );

  if (selectedPaciente && historia) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => {
              setSelectedPaciente(null);
              if (onClearSelection) onClearSelection();
            }} 
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="rotate-180" size={20} />
          </button>
          <h2 className="text-3xl font-serif font-bold text-gray-900">Historia Clínica</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Patient Info Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
              <div className="w-20 h-20 rounded-full bg-[#5A5A40] text-white flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                {selectedPaciente.nombre_completo[0]}
              </div>
              <h3 className="text-xl font-bold text-gray-900">{selectedPaciente.nombre_completo}</h3>
              <p className="text-sm text-gray-500 mb-6">CI: {selectedPaciente.ci}</p>
              <div className="space-y-3 text-left border-t border-gray-50 pt-6">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <User size={16} className="text-gray-400" /> {selectedPaciente.celular}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <FileText size={16} className="text-gray-400" /> {selectedPaciente.correo}
                </div>
              </div>
            </div>
          </div>

          {/* History Timeline */}
          <div className="lg:col-span-3 space-y-8">
            {historia.map((trat: any) => (
              <div key={trat.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50 p-6 flex justify-between items-center border-b border-gray-100">
                  <div>
                    <h4 className="text-lg font-bold text-[#5A5A40]">{trat.tipo_nombre}</h4>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Estado: {trat.estado}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">Total: Bs. {trat.costo_total}</p>
                    <p className="text-xs text-emerald-600 font-bold">Saldo: Bs. {trat.saldo}</p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {trat.citas.filter((c: any) => c.estado === 'REALIZADA').map((cita: any) => (
                    <div key={cita.id} className="relative pl-8 border-l-2 border-gray-100 pb-6 last:pb-0">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-[#5A5A40]" />
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm font-bold text-gray-900">{new Date(cita.fecha_atencion).toLocaleDateString()}</p>
                        <span className="text-[10px] bg-gray-100 px-2 py-1 rounded-full font-bold text-gray-500 uppercase">Atención Realizada</span>
                      </div>
                      <div className="bg-gray-50/50 p-4 rounded-2xl space-y-3">
                        <p className="text-sm text-gray-700 italic">"{cita.observaciones}"</p>
                        {cita.medicamentos && (
                          <div className="flex items-start gap-2 text-xs text-gray-500">
                            <Pill size={14} className="mt-0.5" />
                            <span>{cita.medicamentos}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {trat.citas.filter((c: any) => c.estado === 'REALIZADA').length === 0 && (
                    <p className="text-center text-gray-400 py-4 italic">No hay atenciones registradas aún.</p>
                  )}
                </div>

                <div className="bg-gray-50/30 p-6 border-t border-gray-100">
                  <h5 className="text-xs font-bold uppercase text-gray-400 mb-4 flex items-center gap-2">
                    <CreditCard size={14} /> Historial de Pagos
                  </h5>
                  <div className="space-y-2">
                    {trat.pagos.map((p: any) => (
                      <div key={p.id} className="flex justify-between text-sm">
                        <span className="text-gray-500">{new Date(p.fecha_pago).toLocaleDateString()}</span>
                        <span className="font-bold text-emerald-600">Bs. {p.monto}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-100 flex justify-between font-bold text-gray-900">
                      <span>Total Pagado</span>
                      <span>Bs. {trat.totalPagado}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {historia.length === 0 && (
              <div className="bg-white p-20 rounded-3xl border border-dashed border-gray-200 text-center">
                <History size={48} className="mx-auto text-gray-200 mb-4" />
                <p className="text-gray-400">Este paciente no tiene tratamientos registrados.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-gray-900">Historia Clínica</h2>
        <p className="text-gray-500">Busque un paciente para visualizar su historial completo.</p>
      </div>

      <div className="max-w-2xl mb-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nombre o CI..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40] shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPacientes.map((p: any) => (
          <button 
            key={p.id}
            onClick={() => fetchHistoria(p.id)}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-[#5A5A40] transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#5A5A40]/10 group-hover:text-[#5A5A40]">
                <User size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{p.nombre_completo}</h4>
                <p className="text-xs text-gray-500">CI: {p.ci}</p>
              </div>
              <ChevronRight className="ml-auto text-gray-300 group-hover:text-[#5A5A40]" size={20} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
