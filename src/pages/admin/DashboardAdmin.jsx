import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import LayoutAdmin from '../../components/LayoutAdmin';
import { BarChart3, DollarSign, TrendingUp, Calendar, Filter } from 'lucide-react';

export default function DashboardAdmin() {
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [periodo, setPeriodo] = useState('mes'); // 'dia' | 'semana' | 'mes' | 'todo'
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarReportes = async () => {
      setCargando(true);
      const [{ data: ventasData }, { data: clientesData }] = await Promise.all([
        supabase
          .from('ventas')
          .select('*, usuarios(nombre, cedula), venta_detalles(descripcion, cantidad, subtotal, ganancia_item)')
          .order('fecha_venta', { ascending: false }),
        supabase.from('usuarios').select('id, nombre, cedula').eq('rol', 'cliente').order('nombre')
      ]);

      if (ventasData) setVentas(ventasData);
      if (clientesData) setClientes(clientesData);
      setCargando(false);
    };

    cargarReportes();
  }, []);

  // Funciones auxiliares de fecha
  const ahora = new Date();
  const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const inicioSemana = new Date(ahora);
  inicioSemana.setDate(ahora.getDate() - 7);
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  // Filtrar ventas por cliente seleccionado
  const ventasPorCliente = clienteFiltro
    ? ventas.filter((v) => v.cliente_id === clienteFiltro)
    : ventas;

  // Métricas por Día, Semana y Mes
  const ventasDia = ventasPorCliente.filter((v) => new Date(v.fecha_venta) >= inicioDia);
  const ventasSemana = ventasPorCliente.filter((v) => new Date(v.fecha_venta) >= inicioSemana);
  const ventasMes = ventasPorCliente.filter((v) => new Date(v.fecha_venta) >= inicioMes);

  const sumarVentas = (lista) => lista.reduce((acc, v) => acc + Number(v.total_venta || 0), 0);
  const sumarGanancias = (lista) => lista.reduce((acc, v) => acc + Number(v.total_ganancia || 0), 0);

  // Lista activa según pestaña seleccionada
  const ventasMostradas =
    periodo === 'dia'
      ? ventasDia
      : periodo === 'semana'
      ? ventasSemana
      : periodo === 'mes'
      ? ventasMes
      : ventasPorCliente;

  // Datos para el Gráfico de Barras de los últimos 7 días
  const ultimos7Dias = Array.from({ length: 7 }).map((_, i) => {
    const fecha = new Date();
    fecha.setDate(ahora.getDate() - (6 - i));
    const fechaStr = fecha.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric' });
    const ventasDelDia = ventasPorCliente.filter((v) => {
      const fv = new Date(v.fecha_venta);
      return (
        fv.getDate() === fecha.getDate() &&
        fv.getMonth() === fecha.getMonth() &&
        fv.getFullYear() === fecha.getFullYear()
      );
    });

    return {
      etiqueta: fechaStr,
      total: sumarVentas(ventasDelDia),
      ganancia: sumarGanancias(ventasDelDia)
    };
  });

  const maxValorGrafico = Math.max(...ultimos7Dias.map((d) => d.total), 10);

  return (
    <LayoutAdmin>
      <div className="space-y-6">
        {/* Cabecera + Filtro por Cliente */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-red-600" />
              REPORTE DE VENTAS Y GANANCIAS
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Control financiero diario, semanal y mensual de Motopartsec.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-80">
            <Filter className="w-4 h-4 text-red-500 shrink-0" />
            <select
              value={clienteFiltro}
              onChange={(e) => setClienteFiltro(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
            >
              <option value="">Todos los Clientes (General)</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.cedula})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TARJETAS ESTADÍSTICAS: DÍA, SEMANA Y MES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* HOY */}
          <div
            onClick={() => setPeriodo('dia')}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition ${
              periodo === 'dia'
                ? 'bg-zinc-900 border-red-600 shadow-lg shadow-red-950/30'
                : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
                Ventas de Hoy
              </span>
              <Calendar className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-3xl font-black text-white">${sumarVentas(ventasDia).toFixed(2)}</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-400">{ventasDia.length} cobro(s)</span>
              <span className="text-emerald-400 font-bold">
                Ganancia: +${sumarGanancias(ventasDia).toFixed(2)}
              </span>
            </div>
          </div>

          {/* ÚLTIMOS 7 DÍAS */}
          <div
            onClick={() => setPeriodo('semana')}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition ${
              periodo === 'semana'
                ? 'bg-zinc-900 border-red-600 shadow-lg shadow-red-950/30'
                : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
                Últimos 7 Días (Semana)
              </span>
              <TrendingUp className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-3xl font-black text-white">${sumarVentas(ventasSemana).toFixed(2)}</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-400">{ventasSemana.length} cobro(s)</span>
              <span className="text-emerald-400 font-bold">
                Ganancia: +${sumarGanancias(ventasSemana).toFixed(2)}
              </span>
            </div>
          </div>

          {/* ESTE MES */}
          <div
            onClick={() => setPeriodo('mes')}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition ${
              periodo === 'mes'
                ? 'bg-zinc-900 border-red-600 shadow-lg shadow-red-950/30'
                : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
                Acumulado del Mes
              </span>
              <DollarSign className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-3xl font-black text-white">${sumarVentas(ventasMes).toFixed(2)}</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-zinc-400">{ventasMes.length} cobro(s)</span>
              <span className="text-emerald-400 font-bold">
                Ganancia: +${sumarGanancias(ventasMes).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* CUADRO ESTADÍSTICO DE BARRAS (INGRESOS VS GANANCIAS - ÚLTIMOS 7 DÍAS) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <h2 className="text-base font-black text-white uppercase">
              Rendimiento Últimos 7 Días
            </h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-3 h-3 rounded-sm bg-red-600 inline-block" /> Venta Total
              </span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Ganancia Neta
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-48 pt-6 border-b border-zinc-800 pb-2">
            {ultimos7Dias.map((dia, idx) => {
              const alturaTotal = Math.round((dia.total / maxValorGrafico) * 100);
              const alturaGanancia = Math.round((dia.ganancia / maxValorGrafico) * 100);

              return (
                <div key={idx} className="flex flex-col items-center h-full justify-end group">
                  <span className="text-[10px] font-bold text-zinc-400 mb-1">
                    ${dia.total.toFixed(0)}
                  </span>
                  <div className="w-full max-w-[44px] flex items-end justify-center gap-1 h-32">
                    <div
                      style={{ height: `${Math.max(alturaTotal, 4)}%` }}
                      title={`Venta: $${dia.total.toFixed(2)}`}
                      className="w-1/2 bg-red-600 rounded-t-md transition-all duration-500"
                    />
                    <div
                      style={{ height: `${Math.max(alturaGanancia, 4)}%` }}
                      title={`Ganancia: $${dia.ganancia.toFixed(2)}`}
                      className="w-1/2 bg-emerald-500 rounded-t-md transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-4 pt-2 text-center">
            {ultimos7Dias.map((dia, idx) => (
              <span key={idx} className="text-[11px] font-semibold text-zinc-400 capitalize">
                {dia.etiqueta}
              </span>
            ))}
          </div>
        </div>

        {/* DETALLE DE TRANSACCIONES FILTRADAS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-black text-white uppercase">
              Historial de Cobros ({periodo === 'dia' ? 'Hoy' : periodo === 'semana' ? 'Semana' : periodo === 'mes' ? 'Mes' : 'Todos'})
            </h3>
            <button
              onClick={() => setPeriodo('todo')}
              className="text-xs text-red-500 hover:underline font-bold cursor-pointer"
            >
              Ver historial completo
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-400">
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Detalle Cobrado</th>
                  <th className="py-3 px-3">Total Venta</th>
                  <th className="py-3 px-3">Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {cargando ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-zinc-400">Cargando reportes...</td>
                  </tr>
                ) : ventasMostradas.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-zinc-500">
                      No hay ventas registradas en este periodo.
                    </td>
                  </tr>
                ) : (
                  ventasMostradas.map((v) => (
                    <tr key={v.id} className="hover:bg-zinc-950/60">
                      <td className="py-3 px-3 text-xs text-zinc-400 whitespace-nowrap">
                        {new Date(v.fecha_venta).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        {v.usuarios?.nombre || 'Consumidor Final'}
                      </td>
                      <td className="py-3 px-3 text-xs text-zinc-300">
                        {v.venta_detalles?.map((d) => `${d.cantidad}x ${d.descripcion}`).join(', ') || '-'}
                      </td>
                      <td className="py-3 px-3 font-black text-white">
                        ${Number(v.total_venta).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        +${Number(v.total_ganancia).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </LayoutAdmin>
  );
}