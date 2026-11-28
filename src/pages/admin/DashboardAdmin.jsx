import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import LayoutAdmin from '../../components/LayoutAdmin';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Calendar,
  Filter,
  Wrench,
  Package,
  RefreshCw,
  Layers,
  Download
} from 'lucide-react';

const MESES_NOMBRES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

export default function DashboardAdmin() {
  const [ventas, setVentas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos'); // 'todos' | 'mano_obra' | 'inventario'
  const [periodo, setPeriodo] = useState('mes'); // 'dia' | 'semana' | 'mes' | 'todo'
  const [cargando, setCargando] = useState(true);
  const [anioReporte, setAnioReporte] = useState('todos'); // 'todos' o año numérico como string
  const [mesReporte, setMesReporte] = useState(String(new Date().getMonth())); // '0' a '11'

  useEffect(() => {
    const cargarReportes = async () => {
      setCargando(true);
      const [{ data: ventasData }, { data: clientesData }] = await Promise.all([
        supabase
          .from('ventas')
          .select('*, usuarios(nombre, cedula), venta_detalles(*)')
          .order('fecha_venta', { ascending: false }),
        supabase.from('usuarios').select('id, nombre, cedula').eq('rol', 'cliente').order('nombre')
      ]);

      if (ventasData) setVentas(ventasData);
      if (clientesData) setClientes(clientesData);
      setCargando(false);
    };

    cargarReportes();
  }, []);

  // Identifica si un detalle de venta pertenece a inventario o a mano de obra
  const esItemInventario = (detalle) => {
    if (detalle.producto_id || detalle.inventario_id) return true;
    const tipo = String(detalle.tipo || detalle.categoria || '').toLowerCase();
    if (tipo.includes('inventario') || tipo.includes('producto') || tipo.includes('repuesto')) return true;
    if (tipo.includes('mano') || tipo.includes('servicio') || tipo.includes('taller')) return false;

    // Respaldo: si el margen de ganancia es menor al 99% del subtotal, tiene costo de producto asociado
    const sub = Number(detalle.subtotal || 0);
    const gan = Number(detalle.ganancia_item || 0);
    return sub > 0 && sub - gan > 0.009;
  };

  // Calcula los valores desglosados de una venta según el filtro activo ('todos' | 'mano_obra' | 'inventario')
  const analizarVenta = (venta) => {
    const detalles = venta.venta_detalles || [];

    if (detalles.length === 0) {
      const total = Number(venta.total_venta || 0);
      const ganancia = Number(venta.total_ganancia || 0);
      const costoReposicion = Math.max(total - ganancia, 0);
      const coincide =
        tipoFiltro === 'todos' ||
        (tipoFiltro === 'inventario' && costoReposicion > 0) ||
        (tipoFiltro === 'mano_obra' && costoReposicion === 0);

      return {
        totalFiltrado: coincide ? total : 0,
        gananciaFiltrada: coincide ? ganancia : 0,
        costoReposicion: tipoFiltro === 'mano_obra' ? 0 : costoReposicion,
        totalManoObra: costoReposicion === 0 ? total : 0,
        totalInventarioPvp: costoReposicion > 0 ? total : 0,
        detallesFiltrados: coincide ? detalles : [],
        tieneCoincidencia: coincide
      };
    }

    let totalManoObra = 0;
    let totalInventarioPvp = 0;
    let costoReposicion = 0;
    let gananciaManoObra = 0;
    let gananciaInventario = 0;
    const detallesFiltrados = [];

    detalles.forEach((d) => {
      const sub = Number(d.subtotal || 0);
      const gan = Number(d.ganancia_item ?? sub);
      const esInv = esItemInventario(d);

      if (esInv) {
        const costoItem = Math.max(sub - gan, 0);
        totalInventarioPvp += sub;
        costoReposicion += costoItem;
        gananciaInventario += gan;
        if (tipoFiltro === 'todos' || tipoFiltro === 'inventario') {
          detallesFiltrados.push({ ...d, _esInventario: true, _costoReposicion: costoItem });
        }
      } else {
        totalManoObra += sub;
        gananciaManoObra += gan;
        if (tipoFiltro === 'todos' || tipoFiltro === 'mano_obra') {
          detallesFiltrados.push({ ...d, _esInventario: false, _costoReposicion: 0 });
        }
      }
    });

    if (tipoFiltro === 'mano_obra') {
      return {
        totalFiltrado: totalManoObra,
        gananciaFiltrada: gananciaManoObra,
        costoReposicion: 0,
        totalManoObra,
        totalInventarioPvp,
        detallesFiltrados,
        tieneCoincidencia: detallesFiltrados.length > 0
      };
    }

    if (tipoFiltro === 'inventario') {
      return {
        totalFiltrado: totalInventarioPvp,
        gananciaFiltrada: gananciaInventario,
        costoReposicion,
        totalManoObra,
        totalInventarioPvp,
        detallesFiltrados,
        tieneCoincidencia: detallesFiltrados.length > 0
      };
    }

    return {
      totalFiltrado: totalManoObra + totalInventarioPvp,
      gananciaFiltrada: gananciaManoObra + gananciaInventario,
      costoReposicion,
      totalManoObra,
      totalInventarioPvp,
      detallesFiltrados,
      tieneCoincidencia: true
    };
  };

  // Funciones auxiliares de fecha
  const ahora = new Date();
  const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const inicioSemana = new Date(ahora);
  inicioSemana.setDate(ahora.getDate() - 7);
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  // Filtrar ventas por cliente y enriquecer con el análisis de Mano de Obra vs Inventario
  const ventasProcesadas = (clienteFiltro
    ? ventas.filter((v) => v.cliente_id === clienteFiltro)
    : ventas
  )
    .map((v) => ({
      ...v,
      _analisis: analizarVenta(v)
    }))
    .filter((v) => v._analisis.tieneCoincidencia);

  // Métricas por Día, Semana y Mes
  const ventasDia = ventasProcesadas.filter((v) => new Date(v.fecha_venta) >= inicioDia);
  const ventasSemana = ventasProcesadas.filter((v) => new Date(v.fecha_venta) >= inicioSemana);
  const ventasMes = ventasProcesadas.filter((v) => new Date(v.fecha_venta) >= inicioMes);

  const sumarVentas = (lista) => lista.reduce((acc, v) => acc + v._analisis.totalFiltrado, 0);
  const sumarGanancias = (lista) => lista.reduce((acc, v) => acc + v._analisis.gananciaFiltrada, 0);

  // Lista activa según pestaña seleccionada
  const ventasMostradas =
    periodo === 'dia'
      ? ventasDia
      : periodo === 'semana'
      ? ventasSemana
      : periodo === 'mes'
      ? ventasMes
      : ventasProcesadas;

  // Totales desglosados del periodo activo para reposición y control de taller
  const resumenPeriodo = ventasMostradas.reduce(
    (acc, v) => {
      acc.manoObra += v._analisis.totalManoObra;
      acc.inventarioPvp += v._analisis.totalInventarioPvp;
      acc.reposicion += v._analisis.costoReposicion;
      acc.ganancia += v._analisis.gananciaFiltrada;
      return acc;
    },
    { manoObra: 0, inventarioPvp: 0, reposicion: 0, ganancia: 0 }
  );

  // Datos para el Gráfico de Barras de los últimos 7 días
  const ultimos7Dias = Array.from({ length: 7 }).map((_, i) => {
    const fecha = new Date();
    fecha.setDate(ahora.getDate() - (6 - i));
    const fechaStr = fecha.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric' });
    const ventasDelDia = ventasProcesadas.filter((v) => {
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

  const etiquetaPeriodo =
    periodo === 'dia'
      ? 'Hoy'
      : periodo === 'semana'
      ? 'Últimos 7 Días'
      : periodo === 'mes'
      ? 'Este Mes'
      : 'Historial Completo';

  // 1. Obtener lista dinámica de años disponibles en las ventas (incluyendo el año actual)
  const aniosDisponibles = Array.from(
    new Set([
      new Date().getFullYear(),
      ...ventasProcesadas.map((v) => new Date(v.fecha_venta).getFullYear())
    ])
  ).sort((a, b) => b - a);

  // 2. REPORTE MENSUAL (Por mes de todos los años o del año elegido)
  const ventasPorAnioReporte =
    anioReporte === 'todos'
      ? ventasProcesadas
      : ventasProcesadas.filter((v) => String(new Date(v.fecha_venta).getFullYear()) === anioReporte);

  const reporteMensual = MESES_NOMBRES.map((nombreMes, idxMes) => {
    const delMes = ventasPorAnioReporte.filter((v) => new Date(v.fecha_venta).getMonth() === idxMes);
    return delMes.reduce(
      (acc, v) => {
        acc.cobros += 1;
        acc.total += v._analisis.totalFiltrado;
        acc.manoObra += v._analisis.totalManoObra;
        acc.inventarioPvp += v._analisis.totalInventarioPvp;
        acc.reposicion += v._analisis.costoReposicion;
        acc.ganancia += v._analisis.gananciaFiltrada;
        return acc;
      },
      {
        mesIndex: idxMes,
        mesNombre: nombreMes,
        cobros: 0,
        total: 0,
        manoObra: 0,
        inventarioPvp: 0,
        reposicion: 0,
        ganancia: 0
      }
    );
  });

  // 3. REPORTE SEMANAL DEL MES SELECCIONADO (Semanas 1 a 5 del mes)
  const anioParaSemanas = anioReporte === 'todos' ? new Date().getFullYear() : Number(anioReporte);
  const mesParaSemanas = Number(mesReporte);
  const ultimoDiaMes = new Date(anioParaSemanas, mesParaSemanas + 1, 0).getDate();
  const rangosSemanas = [
    { semana: 'Semana 1', inicio: 1, fin: 7 },
    { semana: 'Semana 2', inicio: 8, fin: 14 },
    { semana: 'Semana 3', inicio: 15, fin: 21 },
    { semana: 'Semana 4', inicio: 22, fin: 28 },
    ...(ultimoDiaMes > 28 ? [{ semana: 'Semana 5', inicio: 29, fin: ultimoDiaMes }] : [])
  ];

  const reporteSemanalMes = rangosSemanas.map((rango) => {
    const deLaSemana = ventasProcesadas.filter((v) => {
      const fv = new Date(v.fecha_venta);
      const coincideAnio = anioReporte === 'todos' ? true : fv.getFullYear() === anioParaSemanas;
      return (
        coincideAnio &&
        fv.getMonth() === mesParaSemanas &&
        fv.getDate() >= rango.inicio &&
        fv.getDate() <= rango.fin
      );
    });

    return deLaSemana.reduce(
      (acc, v) => {
        acc.cobros += 1;
        acc.total += v._analisis.totalFiltrado;
        acc.manoObra += v._analisis.totalManoObra;
        acc.inventarioPvp += v._analisis.totalInventarioPvp;
        acc.reposicion += v._analisis.costoReposicion;
        acc.ganancia += v._analisis.gananciaFiltrada;
        return acc;
      },
      {
        etiqueta: `${rango.semana} (Días ${rango.inicio} al ${rango.fin})`,
        cobros: 0,
        total: 0,
        manoObra: 0,
        inventarioPvp: 0,
        reposicion: 0,
        ganancia: 0
      }
    );
  });

  // Función genérica para exportar cualquiera de los dos reportes a Excel (CSV)
  const exportarReporteCSV = (nombreArchivo, filasDatos, etiquetaColumna) => {
    const encabezados = [
      etiquetaColumna,
      'Cobros',
      'Mano de Obra ($)',
      'Inventario PVP ($)',
      'Total Vendido ($)',
      'Reposicion Inv. ($)',
      'Ganancia Neta ($)'
    ];

    const filas = filasDatos.map((r) => [
      `"${r.nombre}"`,
      r.cobros,
      r.manoObra.toFixed(2),
      r.inventarioPvp.toFixed(2),
      r.total.toFixed(2),
      r.reposicion.toFixed(2),
      r.ganancia.toFixed(2)
    ]);

    const csv =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [encabezados.join(';'), ...filas.map((f) => f.join(';'))].join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `${nombreArchivo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <LayoutAdmin>
      <div className="space-y-6">
        {/* Cabecera + Filtros (Cliente y Categoría) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <BarChart3 className="w-7 h-7 text-red-600" />
                REPORTE DE VENTAS Y GANANCIAS
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Control financiero por mano de obra, inventario vendido y capital de reposición.
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

          {/* Filtro rápido por Tipo de Ingreso */}
          <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Filtrar por rubro:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setTipoFiltro('todos')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  tipoFiltro === 'todos'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-zinc-800 text-zinc-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Todo (General)
              </button>

              <button
                onClick={() => setTipoFiltro('mano_obra')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  tipoFiltro === 'mano_obra'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-zinc-800 text-zinc-300 hover:text-white'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Solo Mano de Obra
              </button>

              <button
                onClick={() => setTipoFiltro('inventario')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  tipoFiltro === 'inventario'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-zinc-800 text-zinc-300 hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Solo Inventario / Repuestos
              </button>
            </div>
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

        {/* DESGLOSE DE REPOSICIÓN DE INVENTARIO Y MANO DE OBRA DEL PERIODO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-400">
              <span>Mano de Obra ({etiquetaPeriodo})</span>
              <Wrench className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-black text-white mt-1.5">
              ${resumenPeriodo.manoObra.toFixed(2)}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">Servicios y mano de obra cobrada</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-400">
              <span>Inventario Vendido (PVP)</span>
              <Package className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-black text-white mt-1.5">
              ${resumenPeriodo.inventarioPvp.toFixed(2)}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">Total facturado en repuestos/productos</p>
          </div>

          <div className="bg-zinc-900 border border-red-600/40 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-red-400">
              <span>Gasto Reposición Inv.</span>
              <RefreshCw className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-black text-red-400 mt-1.5">
              ${resumenPeriodo.reposicion.toFixed(2)}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">
              Capital a separar para reponer stock
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-zinc-400">
              <span>Ganancia Neta ({etiquetaPeriodo})</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-1.5">
              +${resumenPeriodo.ganancia.toFixed(2)}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">Utilidad libre descontando reposición</p>
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

        {/* ================================================================= */}
        {/* REPORTES CONSOLIDADOS: MENSUAL (TODOS LOS AÑOS) Y SEMANAL POR MES */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* 1. REPORTE MENSUAL DE TODOS LOS AÑOS */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-black text-white uppercase">
                  Reporte Mensual ({anioReporte === 'todos' ? 'Todos los Años' : `Año ${anioReporte}`})
                </h3>
                <p className="text-xs text-zinc-400">
                  Acumulado de enero a diciembre{anioReporte === 'todos' ? ' sumando todos los años' : ''}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={anioReporte}
                  onChange={(e) => setAnioReporte(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none"
                >
                  <option value="todos">Todos los años</option>
                  {aniosDisponibles.map((anio) => (
                    <option key={anio} value={String(anio)}>
                      Año {anio}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    exportarReporteCSV(
                      `Reporte_Mensual_${anioReporte}`,
                      reporteMensual.map((m) => ({ ...m, nombre: m.mesNombre })),
                      'Mes'
                    )
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 uppercase text-zinc-400">
                    <th className="py-2.5 px-2">Mes</th>
                    <th className="py-2.5 px-2 text-center">Cobros</th>
                    <th className="py-2.5 px-2">Total Venta</th>
                    <th className="py-2.5 px-2">Reposición</th>
                    <th className="py-2.5 px-2">Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {reporteMensual.map((m) => (
                    <tr
                      key={m.mesIndex}
                      onClick={() => setMesReporte(String(m.mesIndex))}
                      className={`cursor-pointer hover:bg-zinc-950/60 transition ${
                        Number(mesReporte) === m.mesIndex ? 'bg-red-950/20 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-2 font-bold text-white">{m.mesNombre}</td>
                      <td className="py-2.5 px-2 text-center text-zinc-400">{m.cobros}</td>
                      <td className="py-2.5 px-2 font-bold text-white">${m.total.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-red-400">${m.reposicion.toFixed(2)}</td>
                      <td className="py-2.5 px-2 font-bold text-emerald-400">+${m.ganancia.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. REPORTE SEMANAL DE CADA MES */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-black text-white uppercase">
                  Reporte Semanal — {MESES_NOMBRES[mesParaSemanas]}
                </h3>
                <p className="text-xs text-zinc-400">
                  Desglose por semanas del mes ({anioReporte === 'todos' ? 'Todos los años' : anioReporte}).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={mesReporte}
                  onChange={(e) => setMesReporte(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none"
                >
                  {MESES_NOMBRES.map((nombre, idx) => (
                    <option key={idx} value={String(idx)}>
                      {nombre}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    exportarReporteCSV(
                      `Reporte_Semanal_${MESES_NOMBRES[mesParaSemanas]}_${anioReporte}`,
                      reporteSemanalMes.map((s) => ({ ...s, nombre: s.etiqueta })),
                      'Semana'
                    )
                  }
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 uppercase text-zinc-400">
                    <th className="py-2.5 px-2">Semana del Mes</th>
                    <th className="py-2.5 px-2 text-center">Cobros</th>
                    <th className="py-2.5 px-2">Total Venta</th>
                    <th className="py-2.5 px-2">Reposición</th>
                    <th className="py-2.5 px-2">Ganancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {reporteSemanalMes.map((sem, idx) => (
                    <tr key={idx} className="hover:bg-zinc-950/60">
                      <td className="py-3 px-2 font-bold text-white">{sem.etiqueta}</td>
                      <td className="py-3 px-2 text-center text-zinc-400">{sem.cobros}</td>
                      <td className="py-3 px-2 font-bold text-white">${sem.total.toFixed(2)}</td>
                      <td className="py-3 px-2 text-red-400">${sem.reposicion.toFixed(2)}</td>
                      <td className="py-3 px-2 font-bold text-emerald-400">+${sem.ganancia.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* DETALLE DE TRANSACCIONES FILTRADAS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-black text-white uppercase">
              Historial de Cobros ({etiquetaPeriodo})
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
                  <th className="py-3 px-3">Total Cobrado</th>
                  <th className="py-3 px-3">Reposición Inv.</th>
                  <th className="py-3 px-3">Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {cargando ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-zinc-400">
                      Cargando reportes...
                    </td>
                  </tr>
                ) : ventasMostradas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-zinc-500">
                      No hay registros con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  ventasMostradas.map((v) => {
                    const {
                      totalFiltrado,
                      costoReposicion,
                      gananciaFiltrada,
                      detallesFiltrados
                    } = v._analisis;

                    return (
                      <tr key={v.id} className="hover:bg-zinc-950/60">
                        <td className="py-3 px-3 text-xs text-zinc-400 whitespace-nowrap">
                          {new Date(v.fecha_venta).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">
                          {v.usuarios?.nombre || 'Consumidor Final'}
                        </td>
                        <td className="py-3 px-3 text-xs text-zinc-300">
                          {detallesFiltrados.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {detallesFiltrados.map((d, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded-md text-[11px]"
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      d._esInventario ? 'bg-red-500' : 'bg-emerald-500'
                                    }`}
                                  />
                                  {d.cantidad}x {d.descripcion} (${Number(d.subtotal || 0).toFixed(2)})
                                </span>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 px-3 font-black text-white">
                          ${totalFiltrado.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-bold text-red-400">
                          ${costoReposicion.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-400">
                          +${gananciaFiltrada.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </LayoutAdmin>
  );
}