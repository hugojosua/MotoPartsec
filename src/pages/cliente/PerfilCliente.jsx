import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import LayoutCliente from '../../components/LayoutCliente';
import { User, Phone, Mail, CreditCard, Wrench, Calendar, Bike, FileText, Camera } from 'lucide-react';

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
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarOrdenes = async () => {
      if (!usuario?.id) return;
      const { data } = await supabase
        .from('ordenes_trabajo')
        .select('*')
        .eq('cliente_id', usuario.id)
        .order('numero_orden', { ascending: false });

      if (data) setOrdenes(data);
      setCargando(false);
    };
    cargarOrdenes();
  }, [usuario]);

  // Orden activa (la más reciente que no esté "Entregada", o la última registrada)
  const ordenActiva = ordenes.find((o) => o.estado !== 'Entregada') || ordenes[0];
  const indiceEstado = ordenActiva ? ESTADOS_ORDEN.indexOf(ordenActiva.estado) : 0;

  return (
    <LayoutCliente>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Datos del Cliente */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-fit">
          <div className="flex items-center gap-3 pb-5 border-b border-zinc-800">
            <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center text-2xl font-black">
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

        {/* Columna Derecha: Orden de Trabajo Activa */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-red-600" />
                ORDEN DE TRABAJO ACTIVA
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
                  Cuando ingreses tu motocicleta al taller, aquí podrás ver su progreso en tiempo real.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Estado Actual Destacado */}
                <div className="bg-zinc-950 border border-red-600/40 rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-xs uppercase text-zinc-400 font-bold">Estado Actual:</span>
                    <span className="text-sm font-black text-red-500 uppercase tracking-wide">
                      {ordenActiva.estado}
                    </span>
                  </div>
                  {/* Barra de progreso */}
                  <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-red-600 h-full transition-all duration-500"
                      style={{ width: `${((indiceEstado + 1) / ESTADOS_ORDEN.length) * 100}%` }}
                    />
                  </div>
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

                {/* Observaciones del Taller */}
                {ordenActiva.observaciones && (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                    <h4 className="text-xs font-bold uppercase text-zinc-400 flex items-center gap-1.5 mb-2">
                      <FileText className="w-4 h-4 text-red-500" /> Diagnóstico / Observaciones
                    </h4>
                    <p className="text-sm text-zinc-200 whitespace-pre-line">{ordenActiva.observaciones}</p>
                  </div>
                )}

                {/* Fotografías de la Moto */}
                {ordenActiva.fotos_urls && ordenActiva.fotos_urls.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-zinc-400 flex items-center gap-1.5 mb-3">
                      <Camera className="w-4 h-4 text-red-500" /> Fotografías del Ingreso / Reparación
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