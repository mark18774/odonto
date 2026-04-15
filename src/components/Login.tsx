import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import { LogIn, RefreshCw, ArrowLeft, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Especialidad {
  id: number;
  nombre: string;
}

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [medicoCount, setMedicoCount] = useState(0);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [captcha, setCaptcha] = useState({ q: '', a: 0 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const { register, handleSubmit, reset } = useForm();

  const fetchEspecialidades = async (): Promise<Especialidad[]> => {
    const res = await fetch('/api/especialidades');
    if (!res.ok) {
      throw new Error('Error al obtener especialidades');
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Formato inválido de especialidades');
    }
    return data;
  };

  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 10);
    const n2 = Math.floor(Math.random() * 10);
    setCaptcha({ q: `${n1} + ${n2}`, a: n1 + n2 });
  };

  const fetchMedicoCount = () => {
    fetch('/api/medicos/count')
      .then(res => res.json())
      .then(data => setMedicoCount(data.count))
      .catch(() => setMedicoCount(0));
  };

  useEffect(() => {
  generateCaptcha();
  fetchMedicoCount();

  fetchEspecialidades()
    .then(setEspecialidades)
    .catch((err) => {
      console.error(err);
      setEspecialidades([]);
    });
}, []);

  const onLogin = async (data: any) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          captcha: parseInt(data.captcha),
          expectedCaptcha: captcha.a
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setAuth(result.token, result.user);
      } else {
        setError(result.error || 'Error al iniciar sesión');
        generateCaptcha();
        reset({ captcha: '' });
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (data: any) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/medicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        setSuccess('Médico registrado exitosamente. Ahora puede iniciar sesión.');
        setIsRegistering(false);
        fetchMedicoCount();
        reset();
      } else {
        setError(result.error || 'Error al registrar médico');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f2ed] p-4">
      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white p-8 rounded-3xl shadow-xl w-full border border-black/5 transition-all duration-300 ${isRegistering ? 'max-w-2xl' : 'max-w-md'}`}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-2">Virgen de Copacabana</h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest">Consultorio Dental</p>
          <h2 className="mt-4 text-xl font-bold text-[#5A5A40]">{isRegistering ? 'Registro de Médico' : 'Iniciar Sesión'}</h2>
        </div>

        <AnimatePresence mode="wait">
          {!isRegistering ? (
            <motion.form 
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSubmit(onLogin)} 
              className="space-y-6"
            >
              {success && <p className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-sm text-center font-medium">{success}</p>}
              
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Usuario</label>
                <input
                  {...register('usuario', { required: true })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all outline-none"
                  placeholder="Ingrese su usuario"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Contraseña</label>
                <input
                  type="password"
                  {...register('password', { required: true })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] focus:border-transparent transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Captcha: {captcha.q} = ?</label>
                  <button type="button" onClick={generateCaptcha} className="text-[#5A5A40] hover:rotate-180 transition-transform duration-500">
                    <RefreshCw size={16} />
                  </button>
                </div>
                <input
                  {...register('captcha', { required: true })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                  placeholder="Resultado"
                />
              </div>

              {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#5A5A40] text-white py-4 rounded-xl font-semibold hover:bg-[#4a4a35] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#5A5A40]/20"
              >
                {loading ? 'Cargando...' : <><LogIn size={20} /> Iniciar Sesión</>}
              </button>

              {medicoCount === 0 && (
                <div className="text-center">
                  <button 
                    type="button"
                    onClick={() => { setIsRegistering(true); setError(''); setSuccess(''); reset(); }}
                    className="text-[#5A5A40] text-sm font-bold hover:underline"
                  >
                    ¿Es nuevo médico? Regístrese aquí
                  </button>
                </div>
              )}
            </motion.form>
          ) : (
            <motion.form 
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSubmit(onRegister)} 
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
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
                  <option value="">{especialidades.length > 0 ? 'Seleccione...' : 'Cargando especialidades...'}</option>
                  {especialidades.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
                {especialidades.length === 0 && !loading && (
                  <p className="text-[10px] text-amber-600 font-medium">
                    ⚠️ No se pudieron cargar las especialidades. Verifique la conexión a la base de datos.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Usuario</label>
                <input {...register('usuario')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-gray-500">Contraseña</label>
                <input type="password" {...register('password')} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-[#5A5A40]" required />
              </div>
              
              <div className="md:col-span-2">
                {error && <p className="text-red-500 text-sm text-center font-medium mb-4">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#5A5A40] text-white py-4 rounded-xl font-semibold hover:bg-[#4a4a35] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#5A5A40]/20"
                >
                  {loading ? 'Registrando...' : <><UserPlus size={20} /> Registrarse como Médico</>}
                </button>
                <button 
                  type="button"
                  onClick={() => { setIsRegistering(false); setError(''); reset(); }}
                  className="w-full mt-4 text-gray-400 hover:text-gray-600 text-sm font-bold"
                >
                  Ya tengo cuenta, volver al Login
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <button 
            onClick={() => window.location.href = '/'}
            className="text-gray-400 hover:text-gray-600 text-sm flex items-center justify-center gap-1 mx-auto"
          >
            <ArrowLeft size={14} /> Volver al Inicio
          </button>
        </div>
      </motion.div>
    </div>
  );
}
