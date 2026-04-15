import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Calendar, Play, CheckCircle, Plus, Trash2, DollarSign, Pill, Mail } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface AtencionForm {
  descripcion_servicio: string;
  medicamentos: { nombre: string; indicaciones: string }[];
  abono: string;
  proxima_cita: string;
  finalizar: boolean;
}

export default function Atencion() {
  const [citas, setCitas] = useState([]);
  const [selectedCita, setSelectedCita] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { token } = useAuthStore();
  const { register, handleSubmit, control, reset } = useForm<AtencionForm>({
    defaultValues: { 
      descripcion_servicio: '',
      medicamentos: [{ nombre: '', indicaciones: '' }],
      abono: '',
      proxima_cita: '',
      finalizar: false
    }
  });
  const { fields, append, remove } = useFieldArray({ control, name: "medicamentos" });

  const fetchCitas = async () => {
    const res = await fetch('/api/citas/pendientes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setCitas(await res.json());
  };

  useEffect(() => {
    fetchCitas();
  }, []);

  const onSubmit = async (data: any) => {
    const abonoFloat = parseFloat(data.abono || 0);
    const saldoPendiente = selectedCita.costo_total - selectedCita.total_pagado;

    if (abonoFloat > saldoPendiente + 0.01) {
      alert(`El abono no puede ser mayor al saldo pendiente (Bs. ${saldoPendiente.toFixed(2)})`);
      return;
    }

    setLoading(true);
    const payload = {
      cita_id: selectedCita.id,
      descripcion_servicio: data.descripcion_servicio,
      medicamentos: data.medicamentos,
      abono: abonoFloat,
      proxima_cita: data.proxima_cita || null,
      finalizar: data.finalizar
    };

    const res = await fetch('/api/atencion', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert('Atención registrada correctamente');
      setSelectedCita(null);
      reset();
      fetchCitas();
    } else {
      const err = await res.json();
      alert(err.error || 'Error al registrar atención');
    }
    setLoading(false);
  };

  if (selectedCita) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setSelectedCita(null)} className="p-2 hover:bg-gray-100 rounded-full">
            <Play className="rotate-180" size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-serif font-bold text-gray-900">Atención Odontológica</h2>
            <p className="text-gray-500">Paciente: {selectedCita.paciente_nombre} | Tratamiento: {selectedCita.tratamiento_nombre}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Servicio Realizado / Observaciones</label>
                  <textarea 
                    {...register('descripcion_servicio')} 
                    rows={4} 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                    placeholder="Describa el procedimiento realizado..."
                    required
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold flex items-center gap-2"><Pill size={18} /> Medicamentos Prescritos</h4>
                    <button type="button" onClick={() => append({ nombre: '', indicaciones: '' })} className="text-[#5A5A40] text-xs font-bold">
                      + Agregar
                    </button>
                  </div>
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-2 gap-2">
                      <input {...register(`medicamentos.${index}.nombre`)} placeholder="Medicamento" className="px-3 py-2 rounded-lg border border-gray-100 text-sm outline-none" />
                      <div className="flex gap-2">
                        <input {...register(`medicamentos.${index}.indicaciones`)} placeholder="Indicaciones" className="flex-1 px-3 py-2 rounded-lg border border-gray-100 text-sm outline-none" />
                        <button type="button" onClick={() => remove(index)} className="text-red-400"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <h4 className="text-sm font-bold flex items-center gap-2"><DollarSign size={18} /> Pago y Próxima Cita</h4>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Abono (Bs.)</label>
                  <input type="number" step="0.01" {...register('abono')} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" placeholder="0.00" />
                  <div className="flex justify-between text-[10px] font-medium">
                    <span className="text-gray-400">Costo Total: Bs. {selectedCita.costo_total}</span>
                    <span className="text-[#5A5A40]">Saldo Pendiente: Bs. {(selectedCita.costo_total - selectedCita.total_pagado).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Programar Próxima Cita</label>
                  <input type="datetime-local" {...register('proxima_cita')} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <input type="checkbox" {...register('finalizar')} id="finalizar" className="w-5 h-5 accent-[#5A5A40]" />
                  <label htmlFor="finalizar" className="text-sm font-bold text-gray-700">Finalizar Tratamiento Completo</label>
                </div>
              </div>
            </div>

            <div className="pt-6 flex gap-4">
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 bg-[#5A5A40] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#4a4a35] transition-all"
              >
                {loading ? 'Guardando...' : <><CheckCircle size={20} /> Registrar Atención</>}
              </button>
              <button 
                type="button"
                onClick={() => setSelectedCita(null)}
                className="px-8 py-4 rounded-xl border border-gray-200 font-bold text-gray-500 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-serif font-bold text-gray-900">Citas Programadas</h2>
        <p className="text-gray-500">Seleccione una cita para iniciar la atención odontológica.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {citas.map((cita: any) => (
          <div key={cita.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
                <Calendar size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {new Date(cita.fecha_programada).toLocaleDateString()}
              </span>
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-1">{cita.paciente_nombre}</h4>
            <p className="text-sm text-[#5A5A40] font-medium mb-4">{cita.tratamiento_nombre}</p>
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <span className="text-xs font-bold text-gray-400">
                {new Date(cita.fecha_programada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    const res = await fetch('/api/notificar-cita', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ cita_id: cita.id })
                    });
                    if (res.ok) alert('Recordatorio enviado');
                    else alert('Error al enviar recordatorio');
                  }}
                  className="p-2 text-gray-400 hover:text-[#5A5A40]"
                  title="Enviar Recordatorio Email"
                >
                  <Mail size={16} />
                </button>
                <button 
                  onClick={() => setSelectedCita(cita)}
                  className="bg-[#5A5A40] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-[#4a4a35]"
                >
                  <Play size={14} fill="currentColor" /> Iniciar
                </button>
              </div>
            </div>
          </div>
        ))}
        {citas.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400">No hay citas pendientes para hoy.</p>
          </div>
        )}
      </div>
    </div>
  );
}
