import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Calculator, Calendar, Plus, Trash2, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface CotizacionForm {
  paciente_id: string;
  tipo_tratamiento_id: string;
  costo_total: string;
  citas: { fecha: string }[];
}

export default function Cotizaciones() {
  const [pacientes, setPacientes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token } = useAuthStore();
  const { register, handleSubmit, control, reset } = useForm<CotizacionForm>({
    defaultValues: { 
      paciente_id: '',
      tipo_tratamiento_id: '',
      costo_total: '',
      citas: [{ fecha: '' }] 
    }
  });
  const { fields, append, remove } = useFieldArray({ control, name: "citas" });

  const fetchData = async () => {
    const [pRes, tRes, trRes] = await Promise.all([
      fetch('/api/pacientes', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/tipos-tratamiento'),
      fetch('/api/tratamientos', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    setPacientes(await pRes.json());
    setTipos(await tRes.json());
    setTratamientos(await trRes.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data: any) => {
    setLoading(true);
    const payload = {
      paciente_id: parseInt(data.paciente_id),
      tipo_tratamiento_id: parseInt(data.tipo_tratamiento_id),
      costo_total: parseFloat(data.costo_total),
      citas: data.citas.map((c: any) => c.fecha)
    };

    const res = await fetch('/api/tratamientos', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert('Cotización y cronograma registrados con éxito');
      reset();
      fetchData();
    }
    setLoading(false);
  };

  const deleteTratamiento = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta cotización pendiente? Se eliminarán también todas sus citas programadas.')) return;
    
    const res = await fetch(`/api/tratamientos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      fetchData();
    } else {
      const err = await res.json();
      alert(err.error || 'Error al eliminar');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-gray-900">Cotización y Cronograma</h2>
        <p className="text-gray-500">Planifique el tratamiento y las fechas de atención para sus pacientes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-xl font-serif font-bold mb-6">Nueva Cotización</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Paciente</label>
                <select {...register('paciente_id')} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" required>
                  <option value="">Seleccione Paciente...</option>
                  {pacientes.map((p: any) => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Tipo de Tratamiento</label>
                <select {...register('tipo_tratamiento_id')} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" required>
                  <option value="">Seleccione Tratamiento...</option>
                  {tipos.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase text-gray-500">Costo Total (Bs.)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">Bs.</span>
                  <input type="number" step="0.01" {...register('costo_total')} className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" required />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-50 pt-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2"><Calendar size={20} /> Cronograma de Citas</h3>
                <button 
                  type="button" 
                  onClick={() => append({ fecha: '' })}
                  className="text-[#5A5A40] text-sm font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus size={16} /> Agregar Cita
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-xs font-bold text-gray-400 w-6">#{index + 1}</span>
                    <input 
                      type="datetime-local" 
                      {...register(`citas.${index}.fecha` as const)} 
                      className="flex-1 bg-transparent outline-none text-sm"
                      required
                    />
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#5A5A40] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#4a4a35] transition-all shadow-lg shadow-[#5A5A40]/20"
              >
                {loading ? 'Procesando...' : <><CheckCircle size={20} /> Registrar Tratamiento</>}
              </button>
            </div>
          </form>
        </div>

        {/* Listado de Cotizaciones Pendientes */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-xl font-serif font-bold mb-6">Cotizaciones Pendientes</h3>
          <div className="space-y-4">
            {tratamientos.filter((t: any) => t.estado === 'PENDIENTE').map((t: any) => (
              <div key={t.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{t.paciente_nombre}</p>
                    <p className="text-xs text-[#5A5A40] font-medium">{t.tratamiento_nombre}</p>
                  </div>
                  <button 
                    onClick={() => deleteTratamiento(t.id)}
                    className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Costo:</span>
                  <span className="font-bold text-gray-900">Bs. {t.costo_total}</span>
                </div>
                <div className="mt-2 text-[10px] text-gray-400">
                  Registrado: {new Date(t.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {tratamientos.filter((t: any) => t.estado === 'PENDIENTE').length === 0 && (
              <p className="text-gray-400 italic text-sm text-center py-8">No hay cotizaciones pendientes.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
