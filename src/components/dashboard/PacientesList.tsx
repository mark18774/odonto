import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { UserPlus, Search, Trash2, Mail, Phone, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function PacientesList({ onViewHistory }: { onViewHistory: (id: number) => void }) {
  const [pacientes, setPacientes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();
  const { register, handleSubmit, reset } = useForm();

  const fetchPacientes = async () => {
    try {
      const res = await fetch('/api/pacientes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setPacientes(data);
      } else {
        console.error("Invalid patients data:", data);
        setPacientes([]);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      setPacientes([]);
    }
  };

  const onSubmit = async (data: any) => {
    const res = await fetch('/api/pacientes', {
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
      fetchPacientes();
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    
    console.log("Attempting to delete patient with ID:", deletingId);
    try {
      const res = await fetch(`/api/pacientes/${deletingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log("Delete response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("Delete successful:", data);
        setDeletingId(null);
        fetchPacientes();
      } else {
        const err = await res.json();
        console.error("Delete failed:", err);
        setDeletingId(null); // Clear confirmation modal
        setError(err.error || 'Error al eliminar paciente');
      }
    } catch (error) {
      console.error("Error deleting patient:", error);
      setDeletingId(null); // Clear confirmation modal
      setError('Error de conexión al intentar eliminar el paciente');
    }
  };

  useEffect(() => {
    fetchPacientes();
  }, []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-serif font-bold text-gray-900">Mis Pacientes</h2>
          <p className="text-gray-500">Gestione la base de datos de sus pacientes personales.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-[#5A5A40] text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-[#4a4a35] transition-all shadow-lg shadow-[#5A5A40]/20"
        >
          <UserPlus size={20} /> Nuevo Paciente
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-xl shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif font-bold">Registro de Paciente</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">Cerrar</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500">Carné de Identidad</label>
                  <input {...register('ci')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500">Nombre Completo</label>
                  <input {...register('nombre_completo')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500">Celular</label>
                  <input {...register('celular')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500">Correo Electrónico</label>
                  <input type="email" {...register('correo')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#5A5A40] text-white py-3 rounded-xl font-bold hover:bg-[#4a4a35] mt-4">Registrar Paciente</button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pacientes.map((p: any) => (
          <div key={p.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[#5A5A40]">
                <UserPlus size={24} />
              </div>
              <span className="text-xs font-bold text-gray-400">CI: {p.ci}</span>
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-4">{p.nombre_completo}</h4>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2"><Phone size={14} /> {p.celular || 'N/A'}</div>
              <div className="flex items-center gap-2"><Mail size={14} /> {p.correo || 'N/A'}</div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between">
              <button 
                onClick={() => onViewHistory(p.id)}
                className="text-[#5A5A40] text-xs font-bold uppercase tracking-wider hover:underline"
              >
                Ver Historia
              </button>
              <button 
                onClick={() => setDeletingId(p.id)}
                className="text-red-400 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {pacientes.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400">No tiene pacientes registrados aún.</p>
          </div>
        )}
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
              Si el paciente tiene historial, se realizará una baja lógica. Si no tiene actividad, se eliminará permanentemente.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeletingId(null)}
                className="flex-1 px-6 py-3 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
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
