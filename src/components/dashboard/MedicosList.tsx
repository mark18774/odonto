import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, UserPlus, Trash2, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function MedicosList() {
  const [medicos, setMedicos] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();
  const { register, handleSubmit, reset } = useForm();

  const fetchMedicos = async () => {
    const res = await fetch('/api/medicos', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setMedicos(await res.json());
  };

  const fetchEspecialidades = async () => {
    const res = await fetch('/api/especialidades');
    setEspecialidades(await res.json());
  };

  const onSubmit = async (data: any) => {
    const res = await fetch('/api/medicos', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setShowForm(false);
      reset();
      fetchMedicos();
    } else {
      const err = await res.json();
      setError(err.error || 'Error al registrar médico');
    }
  };

  const deleteMedico = async (id: number) => {
    const res = await fetch(`/api/medicos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
      setDeletingId(null);
      fetchMedicos();
    } else {
      const err = await res.json();
      setError(err.error || 'Error al eliminar médico');
    }
  };

  useEffect(() => {
    fetchEspecialidades();
    fetchMedicos();
  }, []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold text-gray-900">Gestión de Médicos</h2>
          <p className="text-gray-500">Administre el personal odontológico del consultorio.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-[#5A5A40] text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-[#4a4a35] transition-all shadow-lg shadow-[#5A5A40]/20"
        >
          <UserPlus size={20} /> Nuevo Médico
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif font-bold">Registro de Médico</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">Cerrar</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Carné de Identidad</label>
                <input {...register('ci')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Nombre Completo</label>
                <input {...register('nombre_completo')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Celular</label>
                <input {...register('celular')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Correo Electrónico</label>
                <input type="email" {...register('correo')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Especialidad</label>
                <select {...register('especialidad_id')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" required>
                  <option value="">Seleccione...</option>
                  {especialidades.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Usuario</label>
                <input {...register('usuario')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Contraseña</label>
                <input type="password" {...register('password')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" required />
              </div>
              <div className="md:col-span-2 pt-4">
                <button type="submit" className="w-full bg-[#5A5A40] text-white py-3 rounded-xl font-bold hover:bg-[#4a4a35]">Guardar Médico</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">CI</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Nombre</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Especialidad</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Contacto</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {medicos.map((m: any) => (
              <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm">{m.ci}</td>
                <td className="px-6 py-4 font-medium">
                  {m.nombre_completo}
                  {m.es_admin === 1 && <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded-full font-bold">ADMIN</span>}
                </td>
                <td className="px-6 py-4 text-sm">{m.especialidad_nombre}</td>
                <td className="px-6 py-4 text-sm">{m.celular} | {m.correo}</td>
                <td className="px-6 py-4">
                  {m.es_admin !== 1 && (
                    <button 
                      onClick={() => setDeletingId(m.id)}
                      className="text-red-400 hover:text-red-600 p-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {medicos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">No hay médicos registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-2xl font-serif font-bold mb-2">¿Confirmar eliminación?</h3>
            <p className="text-gray-500 mb-8">
              Si el médico tiene pacientes, se realizará una baja lógica. Si no tiene actividad, se eliminará permanentemente.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeletingId(null)}
                className="flex-1 px-6 py-3 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => deleteMedico(deletingId)}
                className="flex-1 bg-red-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <X size={32} />
            </div>
            <h3 className="text-2xl font-serif font-bold mb-2">Error</h3>
            <p className="text-gray-500 mb-8">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="w-full bg-[#5A5A40] text-white py-3 rounded-xl font-bold hover:bg-[#4a4a35] transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
