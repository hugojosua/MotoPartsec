import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import LayoutAdmin from '../../components/LayoutAdmin';
import {
  Package,
  Plus,
  AlertTriangle,
  Download,
  Edit3,
  Trash2,
  Search,
  Check,
  X
} from 'lucide-react';

export default function InventarioAdmin() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Formulario nuevo producto
  const [form, setForm] = useState({
    detalle: '',
    cantidad: '',
    stock_minimo: 3,
    costo_proveedor: '',
    precio_venta: ''
  });
  const [guardando, setGuardando] = useState(false);

  // Edición en línea
  const [editandoId, setEditandoId] = useState(null);
  const [formEdit, setFormEdit] = useState({});

  const cargarInventario = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('inventario')
      .select('*')
      .order('detalle', { ascending: true });

    if (!error && data) setProductos(data);
    setCargando(false);
  };

  useEffect(() => {
    cargarInventario();
  }, []);

  // Crear producto
  const handleAgregar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const { error } = await supabase.from('inventario').insert([
        {
          detalle: form.detalle.trim(),
          cantidad: parseInt(form.cantidad, 10) || 0,
          stock_minimo: parseInt(form.stock_minimo, 10) || 3,
          costo_proveedor: parseFloat(form.costo_proveedor) || 0,
          precio_venta: parseFloat(form.precio_venta) || 0
        }
      ]);

      if (error) throw error;
      setForm({ detalle: '', cantidad: '', stock_minimo: 3, costo_proveedor: '', precio_venta: '' });
      cargarInventario();
    } catch (err) {
      alert('Error al guardar producto: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  // Iniciar edición
  const iniciarEdicion = (prod) => {
    setEditandoId(prod.id);
    setFormEdit({
      detalle: prod.detalle,
      cantidad: prod.cantidad,
      stock_minimo: prod.stock_minimo,
      costo_proveedor: prod.costo_proveedor,
      precio_venta: prod.precio_venta
    });
  };

  // Guardar edición
  const guardarEdicion = async (id) => {
    try {
      const { error } = await supabase
        .from('inventario')
        .update({
          detalle: formEdit.detalle.trim(),
          cantidad: parseInt(formEdit.cantidad, 10) || 0,
          stock_minimo: parseInt(formEdit.stock_minimo, 10) || 3,
          costo_proveedor: parseFloat(formEdit.costo_proveedor) || 0,
          precio_venta: parseFloat(formEdit.precio_venta) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      setEditandoId(null);
      cargarInventario();
    } catch (err) {
      alert('Error al actualizar: ' + err.message);
    }
  };

  // Eliminar producto
  const eliminarProducto = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}" del inventario?`)) return;
    const { error } = await supabase.from('inventario').delete().eq('id', id);
    if (!error) cargarInventario();
  };

  // Exportar Reporte a Excel (CSV compatible con Excel)
  const exportarReporteCSV = () => {
    const encabezados = [
      'Detalle del Producto',
      'Cantidad Actual',
      'Stock Minimo',
      'Costo Proveedor ($)',
      'Precio Venta Publico ($)',
      'Total Costo Inventario ($)',
      'Total Venta Proyectada ($)',
      'Ganancia Unitaria ($)'
    ];

    const filas = productos.map((p) => [
      `"${p.detalle.replace(/"/g, '""')}"`,
      p.cantidad,
      p.stock_minimo,
      Number(p.costo_proveedor).toFixed(2),
      Number(p.precio_venta).toFixed(2),
      Number(p.total_costo).toFixed(2),
      Number(p.total_venta).toFixed(2),
      Number(p.ganancia_unitaria).toFixed(2)
    ]);

    const contenidoCSV =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [encabezados.join(';'), ...filas.map((f) => f.join(';'))].join('\n');

    const enlace = document.createElement('a');
    enlace.setAttribute('href', encodeURI(contenidoCSV));
    enlace.setAttribute('download', `Reporte_Inventario_Motopartsec_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  };

  // Cálculos de Totales Globales
  const productosStockBajo = productos.filter((p) => p.cantidad <= p.stock_minimo);
  const totalUnidades = productos.reduce((acc, p) => acc + Number(p.cantidad), 0);
  const inversionTotal = productos.reduce((acc, p) => acc + Number(p.total_costo || 0), 0);
  const ventaTotalProyectada = productos.reduce((acc, p) => acc + Number(p.total_venta || 0), 0);
  const gananciaProyectada = ventaTotalProyectada - inversionTotal;

  // Filtrado
  const productosFiltrados = productos.filter((p) => {
    const coincideTexto = p.detalle.toLowerCase().includes(busqueda.toLowerCase());
    const coincideAlerta = soloStockBajo ? p.cantidad <= p.stock_minimo : true;
    return coincideTexto && coincideAlerta;
  });

  return (
    <LayoutAdmin>
      {/* NOTIFICACIÓN DE STOCK BAJO */}
      {productosStockBajo.length > 0 && (
        <div className="bg-red-950/90 border-2 border-red-600 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-red-950/40">
          <div className="flex items-start sm:items-center gap-3">
            <div className="bg-red-600 p-2.5 rounded-xl shrink-0 animate-pulse">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-white text-sm sm:text-base">
                ALERTA DE INVENTARIO BAJO ({productosStockBajo.length} producto{productosStockBajo.length > 1 ? 's' : ''})
              </h3>
              <p className="text-xs text-red-200 mt-0.5">
                Reabastecer pronto:{' '}
                <strong>{productosStockBajo.map((p) => `${p.detalle} (${p.cantidad} und)`).join(', ')}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setSoloStockBajo(!soloStockBajo)}
            className="bg-white text-black hover:bg-zinc-200 text-xs font-extrabold px-4 py-2 rounded-lg shrink-0 cursor-pointer"
          >
            {soloStockBajo ? 'Ver Todos' : 'Filtrar Críticos'}
          </button>
        </div>
      )}

      {/* TARJETAS DE TOTALES DE INVENTARIO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs text-zinc-400 uppercase font-bold">Total Unidades</p>
          <p className="text-2xl font-black text-white mt-1">{totalUnidades}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs text-zinc-400 uppercase font-bold">Costo Total Invertido</p>
          <p className="text-2xl font-black text-zinc-200 mt-1">${inversionTotal.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs text-zinc-400 uppercase font-bold">Total Valor Venta (PVP)</p>
          <p className="text-2xl font-black text-white mt-1">${ventaTotalProyectada.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 border border-red-600/50 rounded-2xl p-4">
          <p className="text-xs text-red-400 uppercase font-bold">Ganancia Proyectada</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">+${gananciaProyectada.toFixed(2)}</p>
        </div>
      </div>

      {/* FORMULARIO REGISTRO DE PRODUCTO */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-red-600" />
            REGISTRAR NUEVO PRODUCTO EN INVENTARIO
          </h2>
          <button
            onClick={exportarReporteCSV}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Descargar Reporte Excel (CSV)
          </button>
        </div>

        <form onSubmit={handleAgregar} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Detalle del Producto</label>
            <input
              type="text"
              required
              placeholder="Ej: Aceite Motul 5100 15W50 1L"
              value={form.detalle}
              onChange={(e) => setForm({ ...form, detalle: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Cantidad</label>
            <input
              type="number"
              min="0"
              required
              placeholder="10"
              value={form.cantidad}
              onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Alerta Stock Mín.</label>
            <input
              type="number"
              min="1"
              required
              value={form.stock_minimo}
              onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Costo Proveedor ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="8.50"
              value={form.costo_proveedor}
              onChange={(e) => setForm({ ...form, costo_proveedor: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Precio Público ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="13.00"
              value={form.precio_venta}
              onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-6 flex justify-end mt-1">
            <button
              type="submit"
              disabled={guardando}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Package className="w-4 h-4" />
              {guardando ? 'Guardando...' : 'Agregar al Inventario'}
            </button>
          </div>
        </form>
      </div>

      {/* TABLA DE INVENTARIO COMPLETO */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-black text-white">LISTADO DE INVENTARIO ({productosFiltrados.length})</h2>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar repuesto o aceite..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-xl pl-9 pr-4 py-2 text-sm text-white outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-400">
                <th className="py-3 px-3">Cant.</th>
                <th className="py-3 px-3">Detalle del Producto</th>
                <th className="py-3 px-3">Costo Prov.</th>
                <th className="py-3 px-3">PVP</th>
                <th className="py-3 px-3">Total Costo</th>
                <th className="py-3 px-3">Total PVP</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {cargando ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-zinc-400">Cargando inventario...</td>
                </tr>
              ) : productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-zinc-500">No hay productos registrados.</td>
                </tr>
              ) : (
                productosFiltrados.map((prod) => {
                  const esBajo = prod.cantidad <= prod.stock_minimo;
                  const enEdicion = editandoId === prod.id;

                  return (
                    <tr
                      key={prod.id}
                      className={`hover:bg-zinc-950/60 transition ${esBajo ? 'bg-red-950/20' : ''}`}
                    >
                      {enEdicion ? (
                        <>
                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              value={formEdit.cantidad}
                              onChange={(e) => setFormEdit({ ...formEdit, cantidad: e.target.value })}
                              className="w-16 bg-zinc-950 border border-red-600 rounded px-2 py-1 text-white"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="text"
                              value={formEdit.detalle}
                              onChange={(e) => setFormEdit({ ...formEdit, detalle: e.target.value })}
                              className="w-full bg-zinc-950 border border-red-600 rounded px-2 py-1 text-white"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              step="0.01"
                              value={formEdit.costo_proveedor}
                              onChange={(e) => setFormEdit({ ...formEdit, costo_proveedor: e.target.value })}
                              className="w-20 bg-zinc-950 border border-red-600 rounded px-2 py-1 text-white"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              step="0.01"
                              value={formEdit.precio_venta}
                              onChange={(e) => setFormEdit({ ...formEdit, precio_venta: e.target.value })}
                              className="w-20 bg-zinc-950 border border-red-600 rounded px-2 py-1 text-white"
                            />
                          </td>
                          <td colSpan="2" className="py-2.5 px-2 text-xs text-zinc-400">
                            Se recalculará al guardar
                          </td>
                          <td className="py-2.5 px-2 text-right space-x-1">
                            <button
                              onClick={() => guardarEdicion(prod.id)}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditandoId(null)}
                              className="p-1.5 bg-zinc-700 text-white rounded-lg cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-3 font-black">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs ${
                                esBajo
                                  ? 'bg-red-600 text-white'
                                  : 'bg-zinc-800 text-zinc-200'
                              }`}
                            >
                              {prod.cantidad}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-white">
                            {prod.detalle}
                            {esBajo && (
                              <span className="ml-2 text-[10px] uppercase bg-red-600/20 text-red-400 border border-red-600/40 px-2 py-0.5 rounded-full">
                                Stock Bajo
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-zinc-400">${Number(prod.costo_proveedor).toFixed(2)}</td>
                          <td className="py-3 px-3 font-bold text-white">${Number(prod.precio_venta).toFixed(2)}</td>
                          <td className="py-3 px-3 text-zinc-400">${Number(prod.total_costo).toFixed(2)}</td>
                          <td className="py-3 px-3 font-bold text-emerald-400">${Number(prod.total_venta).toFixed(2)}</td>
                          <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => iniciarEdicion(prod)}
                              title="Editar"
                              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => eliminarProducto(prod.id, prod.detalle)}
                              title="Eliminar"
                              className="p-1.5 bg-red-950/60 hover:bg-red-600 text-red-400 hover:text-white rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </LayoutAdmin>
  );
}