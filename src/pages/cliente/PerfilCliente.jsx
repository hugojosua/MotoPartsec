import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import LayoutCliente from '../../components/LayoutCliente';
import {
  Phone,
  Mail,
  CreditCard,
  Wrench,
  Calendar,
  Bike,
  FileText,
  Camera,
  CheckCircle2,
  Bell,
  Send,
  ThumbsUp
} from 'lucide-react';

const ESTADOS_ORDEN = [
  'Recibida',
  'En diagnóstico',
  'Esperando aprobación del cliente',
  'En reparación',
  'Esperando repuestos',
  'Terminada',
  'Entregada'
];

export default function PerfilCliente() {
  const { usuario } = useAuth();
  const [ordenes, setOrdenes] = useState([]);
  const [avances, setAvances] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargarDatosOrden = async () => {
    if (!usuario?.id) return;

    const { data: ordData } = await supabase
      .from('ordenes_trabajo')
      .select('*')
      .eq('cliente_id', usuario.id)
      .order('numero_orden', { ascending: false });

    if (ordData && ordData.length > 0) {
      setOrdenes(ordData);
      const activa = ordData.find((o) => o.estado !== 'Entregada') || ordData[0];

      const { data: avData } = await supabase
        .from('orden_avances')
        .select('*')
        .eq('orden_id', activa.numero_orden)
        .order('created_at', { ascending: true });

      if (avData) setAvances(avData);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarDatosOrden();

    // Escuchar actualizaciones del taller en tiempo real
    const canal = supabase
      .channel('cliente-avances-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orden_avances' },
        () => cargarDatosOrden()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ordenes_trabajo' },
        () => cargarDatosOrden()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuario]);

  const ordenActiva = ordenes.find((o) => o.estado !== 'Entregada') || ordenes[0];
  const indiceEstado = ordenActiva ? ESTADOS_ORDEN.indexOf(ordenActiva.estado) : 0;

  // Notificaciones del taller que el cliente aún no ha marcado como vistas
  const notificacionesSinLeer = avances.filter((a) => a.emisor_rol === 'admin' && !a.leido);

  const marcarNotificacionesLeidas = async () => {
    if (!ordenActiva) return;
    await supabase
      .from('orden_avances')
      .update({ leido: true })
      .eq('orden_id', ordenActiva.numero_orden)
      .eq('emisor_rol', 'admin');
    cargarDatosOrden();
  };

  // Enviar respuesta o aprobación al taller
  const enviarRespuestaTaller = async (textoPersonalizado = null) => {
    const texto = textoPersonalizado || nuevoMensaje.trim();
    if (!texto || !ordenActiva) return;

    setEnviandoMensaje(true);
    try {
      const { error } = await supabase.from('orden_avances').insert([
        {
          orden_id: ordenActiva.numero_orden,
          emisor_rol: 'cliente',
          emisor_nombre: usuario?.nombre || 'Cliente',
          mensaje: texto,
          leido: false
        }
      ]);

      if (error) throw error;

      if (!textoPersonalizado) setNuevoMensaje('');
      await marcarNotificacionesLeidas();
      cargarDatosOrden();
    } catch (err) {
      alert('Error al enviar mensaje: ' + err.message);
    } finally {
      setEnviandoMensaje(false);
    }
  };

  return (
    <LayoutCliente>
      {/* ALERTA DE NOTIFICACIONES NUEVAS DEL TALLER */}
      {notificacionesSinLeer.length > 0 && (
        <div className="bg-red-950/90 border-2 border-red-600 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-red-950/40">
          <div className="flex items-start sm:items-center gap-3">
            <div className="bg-red-600 p-2.5 rounded-xl shrink-0 animate-bounce">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm">
                ¡Tienes {notificacionesSinLeer.length} actualización(es) nueva(s) de tu motocicleta!
              </h3>
              <p className="text-xs text-red-200 mt-0.5">
                Último reporte: <strong>{notificacionesSinLeer[notificacionesSinLeer.length - 1].mensaje}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={marcarNotificacionesLeidas}
            className="bg-white hover:bg-zinc-200 text-black text-xs font-extrabold px-4 py-2 rounded-lg shrink-0 cursor-pointer"
          >
            Marcar como leído
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Datos del Cliente */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit">
          <div className="flex items-center gap-3 pb-5 border-b border-zinc-800">
            <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-2xl font-black text-white">
              {usuario?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">{usuario?.nombre}</h2>
              <span className="text-xs bg-zinc-800 text-red-500 font-bold px-2.5 py-0.5 rounded-full">
                Cliente Registrado
              </span>
            </div>
          </div>

          <div className="space-y-4 mt-5 text-sm">
            <div className="flex items-center gap-3 text-zinc-300">
              <CreditCard className="w-4 h-4 text-red-500 shrink-0" />
              <div>
                <p className="text-xs text-zinc-500">Cédula</p>
                <p className="font-semibold">{usuario?.cedula}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-zinc-300">
              <Phone className="w-4 h-4 text-red-500 shrink-0" />
              <div>
                <p className="text-xs text-zinc-500">Teléfono</p>
                <p className="font-semibold">{usuario?.telefono}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-zinc-300">
              <Mail className="w-4 h-4 text-red-500 shrink-0" />
              <div>
                <p className="text-xs text-zinc-500">Correo Electrónico</p>
                <p className="font-semibold break-all">{usuario?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Orden de Trabajo Activa y Avances */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-red-600" />
                AVANCE DE MI MOTOCICLETA
              </h2>
              {ordenActiva && (
                <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full">
                  ORDEN #{String(ordenActiva.numero_orden).padStart(4, '0')}
                </span>
              )}
            </div>

            {cargando ? (
              <p className="text-zinc-400 text-sm">Consultando estado de tu motocicleta...</p>
            ) : !ordenActiva ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 text-center">
                <Bike className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <h3 className="font-bold text-white">No tienes órdenes de trabajo activas</h3>
                <p className="text-zinc-400 text-sm mt-1">
                  Cuando ingreses tu motocicleta al taller, aquí podrás ver su progreso y notificaciones en tiempo real.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* LÍNEA DE TIEMPO PASO A PASO DEL AVANCE */}
                <div className="bg-zinc-950 border border-red-600/40 rounded-xl p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <span className="text-xs uppercase text-zinc-400 font-bold">Etapa Actual:</span>
                    <span className="text-sm font-black text-red-500 uppercase tracking-wide">
                      {ordenActiva.estado}
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden mb-4">
                    <div
                      className="bg-red-600 h-full transition-all duration-500"
                      style={{ width: `${((indiceEstado + 1) / ESTADOS_ORDEN.length) * 100}%` }}
                    />
                  </div>

                  {/* Pasos detallados */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {ESTADOS_ORDEN.map((etapa, idx) => {
                      const completada = idx < indiceEstado;
                      const actual = idx === indiceEstado;

                      return (
                        <div
                          key={etapa}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                            actual
                              ? 'bg-red-600/15 border-red-600 text-white font-bold'
                              : completada
                              ? 'bg-zinc-900/80 border-zinc-800 text-emerald-400'
                              : 'bg-zinc-950 border-zinc-900 text-zinc-600'
                          }`}
                        >
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 ${
                              actual
                                ? 'text-red-500 animate-pulse'
                                : completada
                                ? 'text-emerald-500'
                                : 'text-zinc-700'
                            }`}
                          />
                          <span>{etapa}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Botón rápido de aprobación si el taller espera confirmación */}
                  {ordenActiva.estado === 'Esperando aprobación del cliente' && (
                    <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs text-amber-300 font-semibold">
                        El taller está esperando tu confirmación para continuar con la reparación.
                      </p>
                      <button
                        onClick={() =>
                          enviarRespuestaTaller(
                            '✅ Apruebo el diagnóstico y autorizo continuar con la reparación de mi moto.'
                          )
                        }
                        disabled={enviandoMensaje}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Aprobar Reparación
                      </button>
                    </div>
                  )}
                </div>

                {/* BITÁCORA DE AVANCES Y MENSAJES CON EL TALLER */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                  <h4 className="text-xs font-black uppercase text-zinc-400 flex items-center gap-1.5 mb-3">
                    <Bell className="w-4 h-4 text-red-500" />
                    Notificaciones y Avances del Taller ({avances.length})
                  </h4>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1 mb-4">
                    {avances.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-4">
                        Tu orden está registrada. Aquí recibirás cada avance del mecánico.
                      </p>
                    ) : (
                      avances.map((av) => {
                        const esTaller = av.emisor_rol === 'admin';
                        return (
                          <div
                            key={av.id}
                            className={`p-3 rounded-xl text-xs border ${
                              esTaller
                                ? 'bg-zinc-900 border-zinc-800'
                                : 'bg-red-950/25 border-red-600/40 ml-4'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span
                                className={`font-black text-[10px] uppercase ${
                                  esTaller ? 'text-red-500' : 'text-emerald-400'
                                }`}
                              >
                                {esTaller ? 'Taller Motopartsec' : 'Tú'}
                              </span>
                              <span className="text-[10px] text-zinc-500">
                                {new Date(av.created_at).toLocaleString()}
                              </span>
                            </div>

                            {av.nuevo_estado && (
                              <span className="inline-block bg-zinc-800 text-zinc-200 text-[10px] font-bold px-2 py-0.5 rounded mb-1.5">
                                Estado: {av.nuevo_estado}
                              </span>
                            )}

                            <p className="text-zinc-200 whitespace-pre-line">{av.mensaje}</p>

                            {av.foto_url && (
                              <a
                                href={av.foto_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block"
                              >
                                <img
                                  src={av.foto_url}
                                  alt="Evidencia del avance"
                                  className="h-24 w-24 object-cover rounded-lg border border-zinc-700 hover:border-red-500 transition"
                                />
                              </a>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Caja para que el cliente responda o consulte al taller */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      enviarRespuestaTaller();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Escribe una consulta o respuesta al taller..."
                      value={nuevoMensaje}
                      onChange={(e) => setNuevoMensaje(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-red-600 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    />
                    <button
                      type="submit"
                      disabled={enviandoMensaje || !nuevoMensaje.trim()}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Enviar
                    </button>
                  </form>
                </div>

                {/* Ficha Técnica de la Moto */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                    <p className="text-xs text-zinc-500">Motocicleta</p>
                    <p className="font-bold text-white">{ordenActiva.marca} {ordenActiva.modelo}</p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                    <p className="text-xs text-zinc-500">Placa</p>
                    <p className="font-bold text-red-500 uppercase">{ordenActiva.placa}</p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                    <p className="text-xs text-zinc-500">Cilindraje / Año</p>
                    <p className="font-bold text-white">{ordenActiva.cilindraje_cc || '-'} cc • {ordenActiva.anio || '-'}</p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                    <p className="text-xs text-zinc-500">Kilometraje</p>
                    <p className="font-bold text-white">{ordenActiva.kilometraje_actual ? `${ordenActiva.kilometraje_actual} km` : '-'}</p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                    <p className="text-xs text-zinc-500">Fecha Ingreso</p>
                    <p className="font-bold text-white flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-red-500" />
                      {new Date(ordenActiva.fecha_ingreso).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                    <p className="text-xs text-zinc-500">Entrega Estimada</p>
                    <p className="font-bold text-white">
                      {ordenActiva.fecha_estimada_entrega
                        ? new Date(ordenActiva.fecha_estimada_entrega).toLocaleDateString()
                        : 'Por confirmar'}
                    </p>
                  </div>
                </div>

                {/* Observaciones Iniciales del Taller */}
                {ordenActiva.observaciones && (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                    <h4 className="text-xs font-bold uppercase text-zinc-400 flex items-center gap-1.5 mb-2">
                      <FileText className="w-4 h-4 text-red-500" /> Diagnóstico Inicial / Observaciones
                    </h4>
                    <p className="text-sm text-zinc-200 whitespace-pre-line">{ordenActiva.observaciones}</p>
                  </div>
                )}

                {/* Fotografías de la Moto */}
                {ordenActiva.fotos_urls && ordenActiva.fotos_urls.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-zinc-400 flex items-center gap-1.5 mb-3">
                      <Camera className="w-4 h-4 text-red-500" /> Fotografías del Ingreso y Avances
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {ordenActiva.fotos_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={url}
                            alt={`Moto evidencia ${i + 1}`}
                            className="w-full h-32 object-cover rounded-xl border border-zinc-800 hover:border-red-600 transition"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutCliente>
  );
}