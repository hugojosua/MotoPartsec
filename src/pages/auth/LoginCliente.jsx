import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { LogIn, ShieldCheck } from 'lucide-react';

export default function LoginCliente() {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const { data, error: sbError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('cedula', cedula.trim())
        .eq('password', password)
        .eq('rol', 'cliente')
        .single();

      if (sbError || !data) {
        throw new Error('Cédula o contraseña incorrecta, o no tienes cuenta de cliente.');
      }

      iniciarSesion(data);
      navigate('/cliente/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-between p-4">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <img
              src="/logo-motopartsec.png"
              alt="Logo Motopartsec"
              className="h-40 w-auto object-contain mb-3 rounded-xl"
            />
            <span className="px-3 py-0.5 bg-zinc-800 text-red-500 text-xs font-bold uppercase tracking-widest rounded-full">
              Portal de Clientes
            </span>
          </div>

          {error && (
            <div className="bg-red-950/80 border border-red-600 text-red-200 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Número de Cédula</label>
              <input
                type="text"
                required
                placeholder="Ingresa tu cédula"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-4 py-3 text-white outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Contraseña</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-4 py-3 text-white outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              {cargando ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800 text-center space-y-3">
            <p className="text-sm text-zinc-400">
              ¿Aún no tienes cuenta?{' '}
              <Link to="/registro" className="text-red-500 hover:text-red-400 font-bold">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Acceso separado para Administración */}
      <div className="text-center py-4">
        <Link
          to="/admin/login"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-500 transition"
        >
          <ShieldCheck className="w-4 h-4" />
          Acceso Administrativo / Taller
        </Link>
      </div>
    </div>
  );
}