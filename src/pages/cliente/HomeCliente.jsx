import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import LayoutCliente from '../../components/LayoutCliente';
import { Droplet, Gift, BookOpen, Wrench, CheckCircle2 } from 'lucide-react';

export default function HomeCliente() {
  const { usuario, iniciarSesion } = useAuth();
  const [premio, setPremio] = useState({
    titulo_premio: 'Cargando premio...',
    descripcion_premio: '',
    meta_cambios: 6
  });
  const [cambiosActuales, setCambiosActuales] = useState(usuario?.cambios_aceite_acumulados || 0);

  useEffect(() => {
    const cargarDatosFidelidad = async () => {
      // 1. Obtener premio actual configurado por el Admin
      const { data: configData } = await supabase
        .from('configuracion_fidelidad')
        .select('*')
        .eq('id', 1)
        .single();

      if (configData) setPremio(configData);

      // 2. Actualizar sellos reales del cliente desde la BD
      if (usuario?.id) {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', usuario.id)
          .single();

        if (userData) {
          setCambiosActuales(userData.cambios_aceite_acumulados || 0);
          iniciarSesion(userData);
        }
      }
    };

    cargarDatosFidelidad();
  }, []);

  const totalSellos = premio.meta_cambios || 6;
  const premioDesbloqueado = cambiosActuales >= totalSellos;

  return (
    <LayoutCliente>
      {/* Saludo */}
      <div className="mb-6">
        <p className="text-zinc-400 text-sm">Bienvenido de vuelta,</p>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          {usuario?.nombre}
        </h1>
      </div>

      {/* TARJETA DE FIDELIZACIÓN (6 CAMBIOS DE ACEITE) */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-red-950/40 border-2 border-red-600/70 rounded-2xl p-6 shadow-2xl shadow-red-950/20 mb-8 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2">
              <Gift className="w-3.5 h-3.5" /> Programa de Fidelidad
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {premio.titulo_premio}
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              {premio.descripcion_premio}
            </p>
          </div>

          <div className="bg-black/60 border border-zinc-800 px-4 py-3 rounded-xl text-center shrink-0">
            <span className="text-3xl font-black text-red-500">{cambiosActuales}</span>
            <span className="text-zinc-500 font-bold text-lg"> / {totalSellos}</span>
            <p className="text-[11px] uppercase tracking-wider text-zinc-400 mt-0.5">
              Cambios realizados
            </p>
          </div>
        </div>

        {/* Grilla de los 6 Sellos */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {Array.from({ length: totalSellos }).map((_, index) => {
            const numeroSello = index + 1;
            const completado = numeroSello <= cambiosActuales;
            const esUltimo = numeroSello === totalSellos;

            return (
              <div
                key={numeroSello}
                className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-2 transition-all ${
                  completado
                    ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-600/30 scale-[1.02]'
                    : 'bg-zinc-950/80 border-zinc-800 border-dashed text-zinc-600'
                }`}
              >
                {esUltimo ? (
                  <Gift className={`w-7 h-7 mb-1 ${completado ? 'text-white animate-bounce' : 'text-red-500/60'}`} />
                ) : completado ? (
                  <CheckCircle2 className="w-7 h-7 mb-1 text-white" />
                ) : (
                  <Droplet className="w-6 h-6 mb-1" />
                )}
                <span className="text-xs font-extrabold">
                  {esUltimo ? '¡PREMIO!' : `Cambio #${numeroSello}`}
                </span>
              </div>
            );
          })}
        </div>

        {premioDesbloqueado && (
          <div className="mt-5 bg-emerald-950/80 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-xl text-sm font-semibold text-center">
            🎉 ¡Felicidades! Has completado tus {totalSellos} cambios de aceite. Presenta esta tarjeta en Motopartsec para reclamar tu premio.
          </div>
        )}
      </div>

      {/* Accesos Rápidos */}
      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3">
        Accesos Directos
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/cliente/catalogo"
          className="bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-red-600/60 rounded-xl p-5 flex items-center gap-4 transition group"
        >
          <div className="bg-red-600/15 text-red-500 group-hover:bg-red-600 group-hover:text-white p-3.5 rounded-xl transition">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-white text-lg">Ver Catálogo de Productos</h4>
            <p className="text-zinc-400 text-sm">Explora repuestos, aceites y accesorios disponibles.</p>
          </div>
        </Link>

        <Link
          to="/cliente/perfil"
          className="bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 hover:border-red-600/60 rounded-xl p-5 flex items-center gap-4 transition group"
        >
          <div className="bg-red-600/15 text-red-500 group-hover:bg-red-600 group-hover:text-white p-3.5 rounded-xl transition">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-white text-lg">Estado de Mi Motocicleta</h4>
            <p className="text-zinc-400 text-sm">Revisa tu orden de trabajo activa y fotos del taller.</p>
          </div>
        </Link>
      </div>
    </LayoutCliente>
  );
}