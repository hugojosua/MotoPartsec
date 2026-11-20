import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, LogIn, ArrowLeft } from 'lucide-react';

export default function LoginAdmin() {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLoginAdmin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const { data, error: sbError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('cedula', cedula.trim())
        .eq('password', password)
        .eq('rol', 'admin') // Solo permite administradores
        .single();

      if (sbError || !data) {
        throw new Error('Credenciales administrativas inválidas.');
      }

      iniciarSesion(data);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border-2 border-red-600/60 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-red-950/30">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-red-600/20 border border-red-600 p-3.5 rounded-full mb-3">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white">
            PANEL <span className="text-red-600">ADMINISTRATIVO</span>
          </h1>
          <p className="text-zinc-400 text-xs uppercase tracking-widest mt-1">
            Motopartsec • Acceso Restringido
          </p>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-600 text-red-200 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLoginAdmin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Cédula Administrador</label>
            <input
              type="text"
              required
              placeholder="0000000000"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-lg px-4 py-3 text-white outline-none transition"
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
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-lg px-4 py-3 text-white outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogIn className="w-5 h-5" />
            {cargando ? 'Verificando...' : 'Entrar al Sistema'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-zinc-400 hover:text-white inline-flex items-center gap-1 transition">
            <ArrowLeft className="w-3.5 h-3.5 text-red-600" />
            Volver al portal de clientes
          </Link>
        </div>
      </div>
    </div>
  );
}