import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { UserPlus, ArrowLeft } from 'lucide-react';

export default function Registro() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const { error: sbError } = await supabase
        .from('usuarios')
        .insert([{
          nombre: form.nombre.trim(),
          cedula: form.cedula.trim(),
          telefono: form.telefono.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          rol: 'cliente'
        }]);

      if (sbError) {
        if (sbError.code === '23505') {
          throw new Error('La cédula o el correo electrónico ya están registrados.');
        }
        throw sbError;
      }

      alert('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/logo-motopartsec.png"
            alt="Logo Motopartsec"
            className="h-40 w-auto object-contain mb-2 rounded-xl"
          />
          <p className="text-zinc-400 text-sm font-semibold">Registro de Nuevo Cliente</p>
        </div>

        {error && (
          <div className="bg-red-950/80 border border-red-600 text-red-200 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Nombre Completo</label>
            <input
              type="text"
              name="nombre"
              required
              placeholder="Ej: Juan Pérez"
              value={form.nombre}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-4 py-2.5 text-white outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Cédula</label>
              <input
                type="text"
                name="cedula"
                required
                maxLength={13}
                placeholder="1712345678"
                value={form.cedula}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-4 py-2.5 text-white outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Teléfono / WhatsApp</label>
              <input
                type="tel"
                name="telefono"
                required
                placeholder="0991234567"
                value={form.telefono}
                onChange={handleChange}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-4 py-2.5 text-white outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Correo Electrónico</label>
            <input
              type="email"
              name="email"
              required
              placeholder="cliente@correo.com"
              value={form.email}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-4 py-2.5 text-white outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">Contraseña</label>
            <input
              type="password"
              name="password"
              required
              minLength={4}
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-4 py-2.5 text-white outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition cursor-pointer mt-2"
          >
            <UserPlus className="w-5 h-5" />
            {cargando ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-zinc-400 hover:text-white inline-flex items-center gap-1 transition">
            <ArrowLeft className="w-4 h-4 text-red-600" />
            Ya tengo cuenta, volver al Login
          </Link>
        </div>
      </div>
    </div>
  );
}