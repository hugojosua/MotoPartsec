import { Fragment, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import LayoutAdmin from '../../components/LayoutAdmin';
import {
  DollarSign,
  Plus,
  Trash2,
  Wrench,
  Camera,
  CheckCircle2,
  Droplet,
  ShoppingBag,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Bike,
  Calendar,
  Send,
  Bell
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

export default function CobrosOrdenesAdmin() {
  const { usuario } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [avancesPorOrden, setAvancesPorOrden] = useState({});

  // Estado para desplegar detalles, fotos y envío de actualizaciones de una orden
  const [ordenExpandida, setOrdenExpandida] = useState(null);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);

  // Estados para enviar una actualización / notificación al cliente desde la orden abierta
  const [estadoActualizacion, setEstadoActualizacion] = useState('');
  const [mensajeActualizacion, setMensajeActualizacion] = useState('');
  const [fotoAvance, setFotoAvance] = useState(null);
  const [enviandoAvance, setEnviandoAvance] = useState(false);

  // ==========================================
  // ESTADOS PARA REGISTRO DE COBROS
  // ==========================================
  const [clienteCobroId, setClienteCobroId] = useState('');
  const [ordenCobroId, setOrdenCobroId] = useState('');
  const [esCambioAceite, setEsCambioAceite] = useState(false);
  const [itemsCobro, setItemsCobro] = useState([]);

  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('');
  const [cantidadProducto, setCantidadProducto] = useState(1);

  const [servicioDesc, setServicioDesc] = useState('');
  const [servicioPrecio, setServicioPrecio] = useState('');
  const [guardandoCobro, setGuardandoCobro] = useState(false);

  // ==========================================
  // ESTADOS PARA ORDEN DE TRABAJO
  // ==========================================
  const [formOrden, setFormOrden] = useState({
    cliente_id: '',
    fecha_estimada_entrega: '',
    fecha_real_entrega: '',
    estado: 'Recibida',
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    cilindraje_cc: '',
    color: '',
    placa: '',
    numero_chasis_vin: '',
    numero_motor: '',
    kilometraje_actual: '',
    tipo_motocicleta: 'Naked',
    observaciones: ''
  });
  const [fotosMoto, setFotosMoto] = useState([]);
  const [guardandoOrden, setGuardandoOrden] = useState(false);

  const cargarDatosBase = async () => {
    const [{ data: cliData }, { data: invData }, { data: ordData }, { data: avData }] =
      await Promise.all([
        supabase.from('usuarios').select('*').eq('rol', 'cliente').order('nombre'),
        supabase.from('inventario').select('*').gt('cantidad', 0).order('detalle'),
        supabase
          .from('ordenes_trabajo')
          .select('*, usuarios(nombre, cedula, telefono)')
          .order('numero_orden', { ascending: false })
          .limit(30),
        supabase.from('orden_avances').select('*').order('created_at', { ascending: true })
      ]);

    if (cliData) setClientes(cliData);
    if (invData) setInventario(invData);
    if (ordData) setOrdenes(ordData);

    if (avData) {
      const agrupados = {};
      avData.forEach((av) => {
        if (!agrupados[av.orden_id]) agrupados[av.orden_id] = [];
        agrupados[av.orden_id].push(av);
      });
      setAvancesPorOrden(agrupados);
    }
  };

  useEffect(() => {
    cargarDatosBase();

    // Escuchar respuestas o notificaciones nuevas de clientes en tiempo real
    const canal = supabase
      .channel('admin-avances-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orden_avances' },
        () => {
          cargarDatosBase();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // Agregar producto desde inventario al carrito de cobro
  const agregarProductoACobro = () => {
    if (!productoSeleccionadoId) return;
    const prod = inventario.find((p) => p.id === productoSeleccionadoId);
    if (!prod) return;

    const cant = parseInt(cantidadProducto, 10) || 1;
    if (cant > prod.cantidad) {
      alert(`Stock insuficiente. Solo hay ${prod.cantidad} unidades disponibles.`);
      return;
    }

    setItemsCobro([
      ...itemsCobro,
      {
        tipo_item: 'producto',
        inventario_id: prod.id,
        descripcion: prod.detalle,
        cantidad: cant,
        precio_unitario: Number(prod.precio_venta),
        costo_unitario: Number(prod.costo_proveedor)
      }
    ]);
    setProductoSeleccionadoId('');
    setCantidadProducto(1);
  };

  // Agregar servicio manual al carrito de cobro
  const agregarServicioACobro = () => {
    if (!servicioDesc.trim() || !servicioPrecio) return;
    setItemsCobro([
      ...itemsCobro,
      {
        tipo_item: 'servicio',
        inventario_id: null,
        descripcion: servicioDesc.trim(),
        cantidad: 1,
        precio_unitario: parseFloat(servicioPrecio) || 0,
        costo_unitario: 0
      }
    ]);
    setServicioDesc('');
    setServicioPrecio('');
  };

  const eliminarItemCobro = (index) => {
    setItemsCobro(itemsCobro.filter((_, idx) => idx !== index));
  };

  const totalCobro = itemsCobro.reduce((acc, item) => acc + item.precio_unitario * item.cantidad, 0);
  const gananciaCobro = itemsCobro.reduce(
    (acc, item) => acc + (item.precio_unitario - item.costo_unitario) * item.cantidad,
    0
  );

  // Guardar Venta / Cobro en Supabase
  const registrarCobro = async (e) => {
    e.preventDefault();
    if (itemsCobro.length === 0) {
      alert('Agrega al menos un producto o servicio para registrar el cobro.');
      return;
    }

    setGuardandoCobro(true);
    try {
      const { data: ventaCreada, error: ventaError } = await supabase
        .from('ventas')
        .insert([
          {
            cliente_id: clienteCobroId || null,
            orden_trabajo_id: ordenCobroId ? parseInt(ordenCobroId, 10) : null,
            total_venta: totalCobro,
            total_ganancia: gananciaCobro,
            es_cambio_aceite: esCambioAceite
          }
        ])
        .select()
        .single();

      if (ventaError) throw ventaError;

      const detallesInsert = itemsCobro.map((item) => ({
        venta_id: ventaCreada.id,
        tipo_item: item.tipo_item,
        inventario_id: item.inventario_id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        costo_unitario: item.costo_unitario
      }));

      const { error: detError } = await supabase.from('venta_detalles').insert(detallesInsert);
      if (detError) throw detError;

      alert(
        `¡Cobro registrado con éxito por $${totalCobro.toFixed(2)}!${
          esCambioAceite && clienteCobroId ? ' Se sumó +1 sello de aceite al cliente.' : ''
        }`
      );

      setItemsCobro([]);
      setClienteCobroId('');
      setOrdenCobroId('');
      setEsCambioAceite(false);
      cargarDatosBase();
    } catch (err) {
      alert('Error al registrar cobro: ' + err.message);
    } finally {
      setGuardandoCobro(false);
    }
  };

  // Registrar Nueva Orden de Trabajo con Fotos
  const registrarOrdenTrabajo = async (e) => {
    e.preventDefault();
    if (!formOrden.cliente_id) {
      alert('Debes seleccionar un cliente para asociar la orden de trabajo.');
      return;
    }

    setGuardandoOrden(true);
    try {
      const urlsSubidas = [];

      if (fotosMoto.length > 0) {
        for (let i = 0; i < fotosMoto.length; i++) {
          const archivo = fotosMoto[i];
          const ext = archivo.name.split('.').pop();
          const nombreArchivo = `moto_${Date.now()}_${i}.${ext}`;

          const { error: upErr } = await supabase.storage
            .from('motos_ordenes')
            .upload(nombreArchivo, archivo);

          if (upErr) throw upErr;

          const { data: urlData } = supabase.storage
            .from('motos_ordenes')
            .getPublicUrl(nombreArchivo);

          urlsSubidas.push(urlData.publicUrl);
        }
      }

      const { data: nuevaOrden, error: ordError } = await supabase
        .from('ordenes_trabajo')
        .insert([
          {
            cliente_id: formOrden.cliente_id,
            fecha_estimada_entrega: formOrden.fecha_estimada_entrega || null,
            fecha_real_entrega: formOrden.fecha_real_entrega || null,
            estado: formOrden.estado,
            marca: formOrden.marca.trim(),
            modelo: formOrden.modelo.trim(),
            anio: parseInt(formOrden.anio, 10) || null,
            cilindraje_cc: formOrden.cilindraje_cc.trim(),
            color: formOrden.color.trim(),
            placa: formOrden.placa.trim().toUpperCase(),
            numero_chasis_vin: formOrden.numero_chasis_vin.trim().toUpperCase(),
            numero_motor: formOrden.numero_motor.trim().toUpperCase(),
            kilometraje_actual: parseInt(formOrden.kilometraje_actual, 10) || null,
            tipo_motocicleta: formOrden.tipo_motocicleta,
            fotos_urls: urlsSubidas,
            observaciones: formOrden.observaciones.trim()
          }
        ])
        .select()
        .single();

      if (ordError) throw ordError;

      // Crear el primer evento automático en la bitácora de avances del cliente
      await supabase.from('orden_avances').insert([
        {
          orden_id: nuevaOrden.numero_orden,
          emisor_rol: 'admin',
          emisor_nombre: usuario?.nombre || 'Taller Motopartsec',
          nuevo_estado: formOrden.estado,
          mensaje:
            formOrden.observaciones.trim() ||
            `Motocicleta ${formOrden.marca} ${formOrden.modelo} (${formOrden.placa}) ingresada al taller.`,
          foto_url: urlsSubidas[0] || null,
          leido: false
        }
      ]);

      alert(`¡Orden de Trabajo #${String(nuevaOrden.numero_orden).padStart(4, '0')} creada y notificada al cliente!`);

      setFormOrden({
        cliente_id: '',
        fecha_estimada_entrega: '',
        fecha_real_entrega: '',
        estado: 'Recibida',
        marca: '',
        modelo: '',
        anio: new Date().getFullYear(),
        cilindraje_cc: '',
        color: '',
        placa: '',
        numero_chasis_vin: '',
        numero_motor: '',
        kilometraje_actual: '',
        tipo_motocicleta: 'Naked',
        observaciones: ''
      });
      setFotosMoto([]);
      if (document.getElementById('input-fotos-moto')) {
        document.getElementById('input-fotos-moto').value = '';
      }
      cargarDatosBase();
    } catch (err) {
      alert('Error al crear orden de trabajo: ' + err.message);
    } finally {
      setGuardandoOrden(false);
    }
  };

  // Actualizar estado rápido desde el selector de la tabla y notificar al cliente
  const cambiarEstadoOrden = async (orden, nuevoEstado) => {
    const actualizacion = { estado: nuevoEstado };
    if (nuevoEstado === 'Entregada') {
      actualizacion.fecha_real_entrega = new Date().toISOString();
    }

    const { error } = await supabase
      .from('ordenes_trabajo')
      .update(actualizacion)
      .eq('numero_orden', orden.numero_orden);

    if (!error) {
      await supabase.from('orden_avances').insert([
        {
          orden_id: orden.numero_orden,
          emisor_rol: 'admin',
          emisor_nombre: usuario?.nombre || 'Taller Motopartsec',
          nuevo_estado: nuevoEstado,
          mensaje: `El estado de tu motocicleta cambió a: ${nuevoEstado}.`,
          leido: false
        }
      ]);
      cargarDatosBase();
    }
  };

  // Enviar actualización detallada (estado + nota + foto opcional) al cliente
  const handleEnviarActualizacion = async (e, orden) => {
    e.preventDefault();
    const estadoFinal = estadoActualizacion || orden.estado;
    if (!mensajeActualizacion.trim() && estadoFinal === orden.estado && !fotoAvance) {
      alert('Escribe un mensaje, cambia el estado o adjunta una foto para enviar la actualización.');
      return;
    }

    setEnviandoAvance(true);
    try {
      let urlFotoNueva = null;

      if (fotoAvance) {
        const ext = fotoAvance.name.split('.').pop();
        const nombreArchivo = `avance_${orden.numero_orden}_${Date.now()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from('motos_ordenes')
          .upload(nombreArchivo, fotoAvance);

        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage
          .from('motos_ordenes')
          .getPublicUrl(nombreArchivo);

        urlFotoNueva = urlData.publicUrl;
      }

      const camposOrden = { estado: estadoFinal };
      if (estadoFinal === 'Entregada' && !orden.fecha_real_entrega) {
        camposOrden.fecha_real_entrega = new Date().toISOString();
      }
      if (urlFotoNueva) {
        camposOrden.fotos_urls = [...(orden.fotos_urls || []), urlFotoNueva];
      }

      const { error: ordUpdErr } = await supabase
        .from('ordenes_trabajo')
        .update(camposOrden)
        .eq('numero_orden', orden.numero_orden);

      if (ordUpdErr) throw ordUpdErr;

      const { error: avErr } = await supabase.from('orden_avances').insert([
        {
          orden_id: orden.numero_orden,
          emisor_rol: 'admin',
          emisor_nombre: usuario?.nombre || 'Taller Motopartsec',
          nuevo_estado: estadoFinal,
          mensaje:
            mensajeActualizacion.trim() ||
            `Actualización de estado: ${estadoFinal}`,
          foto_url: urlFotoNueva,
          leido: false
        }
      ]);

      if (avErr) throw avErr;

      setMensajeActualizacion('');
      setFotoAvance(null);
      if (document.getElementById(`foto-avance-${orden.numero_orden}`)) {
        document.getElementById(`foto-avance-${orden.numero_orden}`).value = '';
      }
      cargarDatosBase();
    } catch (err) {
      alert('Error al enviar actualización: ' + err.message);
    } finally {
      setEnviandoAvance(false);
    }
  };

  // Desplegar orden y marcar mensajes del cliente como leídos
  const toggleExpandirOrden = async (orden) => {
    const abriendo = ordenExpandida !== orden.numero_orden;
    setOrdenExpandida(abriendo ? orden.numero_orden : null);

    if (abriendo) {
      setEstadoActualizacion(orden.estado);
      setMensajeActualizacion('');
      setFotoAvance(null);

      const noLeidosCliente = (avancesPorOrden[orden.numero_orden] || []).filter(
        (a) => a.emisor_rol === 'cliente' && !a.leido
      );
      if (noLeidosCliente.length > 0) {
        await supabase
          .from('orden_avances')
          .update({ leido: true })
          .eq('orden_id', orden.numero_orden)
          .eq('emisor_rol', 'cliente');
        cargarDatosBase();
      }
    }
  };

  return (
    <LayoutAdmin>
      <div className="space-y-8">
        {/* ============================================================ */}
        {/* BLOQUE 1: REGISTRO DE COBROS (INVENTARIO + SERVICIOS)        */}
        {/* ============================================================ */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-5">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-red-600" />
                REGISTRO DE COBROS Y VENTAS
              </h2>
              <p className="text-xs text-zinc-400">
                Descuenta productos del inventario automáticamente y suma puntos de cambio de aceite.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                    Cliente (Opcional / Recomendado)
                  </label>
                  <select
                    value={clienteCobroId}
                    onChange={(e) => setClienteCobroId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="">-- Consumidor Final --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({c.cedula})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                    Asociar a Orden de Trabajo (Opcional)
                  </label>
                  <select
                    value={ordenCobroId}
                    onChange={(e) => setOrdenCobroId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="">-- Venta directa sin orden --</option>
                    {ordenes.map((o) => (
                      <option key={o.numero_orden} value={o.numero_orden}>
                        Orden #{String(o.numero_orden).padStart(4, '0')} - {o.placa} ({o.marca})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <label className="block text-xs font-bold uppercase text-red-500 mb-2 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" /> Agregar Producto del Inventario
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={productoSeleccionadoId}
                    onChange={(e) => setProductoSeleccionadoId(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="">Selecciona producto en stock...</option>
                    {inventario.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.detalle} — ${Number(p.precio_venta).toFixed(2)} (Disp: {p.cantidad})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={cantidadProducto}
                    onChange={(e) => setCantidadProducto(e.target.value)}
                    className="w-full sm:w-20 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={agregarProductoACobro}
                    className="bg-zinc-800 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Añadir
                  </button>
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                <label className="block text-xs font-bold uppercase text-red-500 mb-2 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" /> Agregar Servicio / Mano de Obra
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Ej: Mano de obra cambio de aceite y revisión"
                    value={servicioDesc}
                    onChange={(e) => setServicioDesc(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Valor ($)"
                    value={servicioPrecio}
                    onChange={(e) => setServicioPrecio(e.target.value)}
                    className="w-full sm:w-28 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={agregarServicioACobro}
                    className="bg-zinc-800 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Añadir
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-3 bg-red-950/30 border border-red-600/40 rounded-xl p-3.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={esCambioAceite}
                  onChange={(e) => setEsCambioAceite(e.target.checked)}
                  className="w-5 h-5 accent-red-600"
                />
                <div className="flex items-center gap-2 text-sm">
                  <Droplet className="w-4 h-4 text-red-500 shrink-0" />
                  <span>
                    <strong>Este cobro incluye Cambio de Aceite</strong> (Suma +1 sello a la tarjeta del cliente seleccionado)
                  </span>
                </div>
              </label>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2 mb-3">
                  Detalle del Cobro Actual
                </h3>

                {itemsCobro.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-8 text-center">
                    No has agregado productos ni servicios todavía.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {itemsCobro.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-2 bg-zinc-900 px-3 py-2 rounded-lg text-xs"
                      >
                        <div>
                          <p className="font-bold text-white">
                            {item.cantidad}x {item.descripcion}
                          </p>
                          <span className="text-[10px] uppercase text-zinc-400">
                            {item.tipo_item} • ${(item.precio_unitario * item.cantidad).toFixed(2)}
                          </span>
                        </div>
                        <button
                          onClick={() => eliminarItemCobro(idx)}
                          className="text-red-500 hover:text-red-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-zinc-800 pt-4 mt-4 space-y-3">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Ganancia Neta Estimada:</span>
                  <span className="text-emerald-400 font-bold">+${gananciaCobro.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-white">TOTAL A COBRAR:</span>
                  <span className="text-2xl font-black text-red-500">${totalCobro.toFixed(2)}</span>
                </div>

                <button
                  onClick={registrarCobro}
                  disabled={guardandoCobro || itemsCobro.length === 0}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {guardandoCobro ? 'Procesando...' : 'Registrar Cobro'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* BLOQUE 2: CREAR ORDEN DE TRABAJO (DATOS MOTO + FOTOS)        */}
        {/* ============================================================ */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="border-b border-zinc-800 pb-4 mb-5">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-red-600" />
              NUEVA ORDEN DE TRABAJO (INGRESO DE MOTOCICLETA)
            </h2>
            <p className="text-xs text-zinc-400">
              El número de orden y la fecha/hora de ingreso se generan automáticamente al guardar.
            </p>
          </div>

          <form onSubmit={registrarOrdenTrabajo} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Cliente *</label>
                <select
                  required
                  value={formOrden.cliente_id}
                  onChange={(e) => setFormOrden({ ...formOrden, cliente_id: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                >
                  <option value="">Selecciona el propietario...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} - {c.cedula}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Estado de la Orden</label>
                <select
                  value={formOrden.estado}
                  onChange={(e) => setFormOrden({ ...formOrden, estado: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                >
                  {ESTADOS_ORDEN.map((est) => (
                    <option key={est} value={est}>
                      {est}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Fecha Estimada Entrega
                </label>
                <input
                  type="datetime-local"
                  value={formOrden.fecha_estimada_entrega}
                  onChange={(e) => setFormOrden({ ...formOrden, fecha_estimada_entrega: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Fecha Real Entrega (Opcional)
                </label>
                <input
                  type="datetime-local"
                  value={formOrden.fecha_real_entrega}
                  onChange={(e) => setFormOrden({ ...formOrden, fecha_real_entrega: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Marca *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Yamaha"
                  value={formOrden.marca}
                  onChange={(e) => setFormOrden({ ...formOrden, marca: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Modelo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: MT-03"
                  value={formOrden.modelo}
                  onChange={(e) => setFormOrden({ ...formOrden, modelo: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Año</label>
                <input
                  type="number"
                  placeholder="2023"
                  value={formOrden.anio}
                  onChange={(e) => setFormOrden({ ...formOrden, anio: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Cilindraje (CC)</label>
                <input
                  type="text"
                  placeholder="321"
                  value={formOrden.cilindraje_cc}
                  onChange={(e) => setFormOrden({ ...formOrden, cilindraje_cc: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Color</label>
                <input
                  type="text"
                  placeholder="Negro / Rojo"
                  value={formOrden.color}
                  onChange={(e) => setFormOrden({ ...formOrden, color: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Placa *</label>
                <input
                  type="text"
                  required
                  placeholder="JA123B"
                  value={formOrden.placa}
                  onChange={(e) => setFormOrden({ ...formOrden, placa: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2 text-sm text-white uppercase outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Número Chasis (VIN)</label>
                <input
                  type="text"
                  placeholder="9FK..."
                  value={formOrden.numero_chasis_vin}
                  onChange={(e) => setFormOrden({ ...formOrden, numero_chasis_vin: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2 text-sm text-white uppercase outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Número de Motor</label>
                <input
                  type="text"
                  placeholder="G3E..."
                  value={formOrden.numero_motor}
                  onChange={(e) => setFormOrden({ ...formOrden, numero_motor: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2 text-sm text-white uppercase outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Kilometraje Actual</label>
                <input
                  type="number"
                  placeholder="14500"
                  value={formOrden.kilometraje_actual}
                  onChange={(e) => setFormOrden({ ...formOrden, kilometraje_actual: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Tipo Motocicleta</label>
                <select
                  value={formOrden.tipo_motocicleta}
                  onChange={(e) => setFormOrden({ ...formOrden, tipo_motocicleta: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="Naked">Naked</option>
                  <option value="Deportiva">Deportiva</option>
                  <option value="Enduro / Cross">Enduro / Cross</option>
                  <option value="Scooter / Automática">Scooter / Automática</option>
                  <option value="Trabajo / Utilitaria">Trabajo / Utilitaria</option>
                  <option value="Touring / Doble Propósito">Touring / Doble Propósito</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-red-500" /> Fotografías de la Moto (Recepción / Daños)
                </label>
                <input
                  id="input-fotos-moto"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFotosMoto(Array.from(e.target.files))}
                  className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-700 bg-zinc-950 border border-zinc-800 rounded-lg p-1.5"
                />
                {fotosMoto.length > 0 && (
                  <p className="text-xs text-emerald-400 mt-1">{fotosMoto.length} foto(s) seleccionada(s).</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Descripción / Observaciones del Trabajo
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe los trabajos a realizar, estado en que ingresa la moto, novedades..."
                  value={formOrden.observaciones}
                  onChange={(e) => setFormOrden({ ...formOrden, observaciones: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3.5 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={guardandoOrden}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Wrench className="w-5 h-5" />
                {guardandoOrden ? 'Creando Orden...' : 'Generar Orden de Trabajo'}
              </button>
            </div>
          </form>
        </section>

        {/* ============================================================ */}
        {/* BLOQUE 3: ÓRDENES RECIENTES (DESPLEGABLES + ACTUALIZACIONES)  */}
        {/* ============================================================ */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="text-lg font-black text-white">ÓRDENES DE TRABAJO RECIENTES</h3>
            <p className="text-xs text-zinc-400">
              Haz clic en cualquier orden para ver los datos, fotos, enviar actualizaciones de avance al cliente y leer sus respuestas.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-400">
                  <th className="py-3 px-3 w-10"></th>
                  <th className="py-3 px-3"># Orden</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Motocicleta / Placa</th>
                  <th className="py-3 px-3">Mensajes</th>
                  <th className="py-3 px-3">Fotos</th>
                  <th className="py-3 px-3">Actualizar Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {ordenes.map((ord) => {
                  const estaAbierta = ordenExpandida === ord.numero_orden;
                  const cantidadFotos = ord.fotos_urls?.length || 0;
                  const listaAvances = avancesPorOrden[ord.numero_orden] || [];
                  const sinLeerCliente = listaAvances.filter(
                    (a) => a.emisor_rol === 'cliente' && !a.leido
                  ).length;

                  return (
                    <Fragment key={ord.numero_orden}>
                      <tr
                        onClick={() => toggleExpandirOrden(ord)}
                        className={`cursor-pointer transition ${
                          estaAbierta ? 'bg-zinc-950' : 'hover:bg-zinc-950/60'
                        }`}
                      >
                        <td className="py-3 px-3 text-zinc-400">
                          {estaAbierta ? (
                            <ChevronUp className="w-4 h-4 text-red-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </td>
                        <td className="py-3 px-3 font-black text-red-500">
                          #{String(ord.numero_orden).padStart(4, '0')}
                        </td>
                        <td className="py-3 px-3 font-semibold text-white">
                          {ord.usuarios?.nombre || 'Cliente'}
                        </td>
                        <td className="py-3 px-3 text-zinc-300">
                          {ord.marca} {ord.modelo} • <span className="font-bold text-white">{ord.placa}</span>
                        </td>
                        <td className="py-3 px-3">
                          {sinLeerCliente > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full animate-pulse">
                              <Bell className="w-3 h-3" /> {sinLeerCliente} nuevo(s)
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500">{listaAvances.length} notif.</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                              cantidadFotos > 0
                                ? 'bg-zinc-800 text-zinc-200'
                                : 'bg-zinc-900 text-zinc-500'
                            }`}
                          >
                            <Camera className="w-3 h-3" /> {cantidadFotos}
                          </span>
                        </td>
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={ord.estado}
                            onChange={(e) => cambiarEstadoOrden(ord, e.target.value)}
                            className="bg-zinc-950 border border-zinc-700 focus:border-red-600 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none"
                          >
                            {ESTADOS_ORDEN.map((est) => (
                              <option key={est} value={est}>
                                {est}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>

                      {/* PANEL DESPLEGABLE CON DATOS, FOTOS Y BITÁCORA DE ACTUALIZACIONES */}
                      {estaAbierta && (
                        <tr className="bg-zinc-950/90">
                          <td colSpan="7" className="p-4 sm:p-6 border-b border-red-600/30">
                            <div className="space-y-6">
                              {/* Datos del cliente y fechas */}
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3 text-xs">
                                <div className="flex items-center gap-2 text-zinc-300">
                                  <Bike className="w-4 h-4 text-red-500" />
                                  <span>
                                    Propietario: <strong className="text-white">{ord.usuarios?.nombre}</strong> •
                                    Cédula: <strong className="text-white">{ord.usuarios?.cedula}</strong> •
                                    Tel: <strong className="text-white">{ord.usuarios?.telefono || '-'}</strong>
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-4 text-zinc-400">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-red-500" />
                                    Ingreso: <strong className="text-white">{new Date(ord.fecha_ingreso).toLocaleString()}</strong>
                                  </span>
                                  <span>
                                    Est. Entrega:{' '}
                                    <strong className="text-white">
                                      {ord.fecha_estimada_entrega
                                        ? new Date(ord.fecha_estimada_entrega).toLocaleString()
                                        : 'No definida'}
                                    </strong>
                                  </span>
                                </div>
                              </div>

                              {/* Ficha Técnica Completa */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                                <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg">
                                  <span className="text-zinc-500 block">Año</span>
                                  <strong className="text-white">{ord.anio || '-'}</strong>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg">
                                  <span className="text-zinc-500 block">Cilindraje</span>
                                  <strong className="text-white">{ord.cilindraje_cc ? `${ord.cilindraje_cc} cc` : '-'}</strong>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg">
                                  <span className="text-zinc-500 block">Color</span>
                                  <strong className="text-white">{ord.color || '-'}</strong>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg">
                                  <span className="text-zinc-500 block">Tipo</span>
                                  <strong className="text-white">{ord.tipo_motocicleta || '-'}</strong>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg">
                                  <span className="text-zinc-500 block">Kilometraje</span>
                                  <strong className="text-white">
                                    {ord.kilometraje_actual ? `${ord.kilometraje_actual} km` : '-'}
                                  </strong>
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg">
                                  <span className="text-zinc-500 block">Chasis (VIN) / Motor</span>
                                  <strong className="text-white break-all">
                                    {ord.numero_chasis_vin || '-'} / {ord.numero_motor || '-'}
                                  </strong>
                                </div>
                              </div>

                              {/* PANEL DE COMUNICACIÓN Y ACTUALIZACIÓN DE AVANCES AL CLIENTE */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                {/* Formulario para enviar novedad / avance al cliente */}
                                <form
                                  onSubmit={(e) => handleEnviarActualizacion(e, ord)}
                                  className="space-y-3"
                                >
                                  <h4 className="text-xs font-black uppercase text-red-500 flex items-center gap-1.5">
                                    <Send className="w-3.5 h-3.5" />
                                    Enviar Avance / Notificación al Cliente
                                  </h4>

                                  <div>
                                    <label className="block text-[11px] text-zinc-400 mb-1">
                                      Nuevo Estado de la Orden
                                    </label>
                                    <select
                                      value={estadoActualizacion || ord.estado}
                                      onChange={(e) => setEstadoActualizacion(e.target.value)}
                                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none"
                                    >
                                      {ESTADOS_ORDEN.map((est) => (
                                        <option key={est} value={est}>
                                          {est}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[11px] text-zinc-400 mb-1">
                                      Mensaje / Detalle del avance para el cliente
                                    </label>
                                    <textarea
                                      rows={2}
                                      placeholder="Ej: Ya desmontamos el motor, necesitamos tu aprobación para cambiar el kit de arrastre..."
                                      value={mensajeActualizacion}
                                      onChange={(e) => setMensajeActualizacion(e.target.value)}
                                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3 py-2 text-xs text-white outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] text-zinc-400 mb-1">
                                      Adjuntar Foto del Avance (Opcional)
                                    </label>
                                    <input
                                      id={`foto-avance-${ord.numero_orden}`}
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => setFotoAvance(e.target.files[0])}
                                      className="w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-zinc-800 file:text-white hover:file:bg-red-600 bg-zinc-950 border border-zinc-800 rounded-lg p-1"
                                    />
                                  </div>

                                  <button
                                    type="submit"
                                    disabled={enviandoAvance}
                                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    {enviandoAvance ? 'Enviando...' : 'Publicar Avance y Notificar'}
                                  </button>
                                </form>

                                {/* Historial de Avances y Respuestas del Cliente */}
                                <div className="flex flex-col">
                                  <h4 className="text-xs font-black uppercase text-zinc-400 mb-2">
                                    Historial de Avances y Mensajes ({listaAvances.length})
                                  </h4>
                                  <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-3 max-h-64 overflow-y-auto space-y-2.5">
                                    {listaAvances.length === 0 ? (
                                      <p className="text-xs text-zinc-500 text-center py-6">
                                        Aún no hay actualizaciones enviadas en esta orden.
                                      </p>
                                    ) : (
                                      listaAvances.map((av) => {
                                        const esAdmin = av.emisor_rol === 'admin';
                                        return (
                                          <div
                                            key={av.id}
                                            className={`p-2.5 rounded-lg text-xs border ${
                                              esAdmin
                                                ? 'bg-zinc-900 border-zinc-800'
                                                : 'bg-red-950/30 border-red-600/40'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                              <span
                                                className={`font-black text-[10px] uppercase ${
                                                  esAdmin ? 'text-red-500' : 'text-emerald-400'
                                                }`}
                                              >
                                                {esAdmin ? 'Taller Motopartsec' : `Cliente (${av.emisor_nombre})`}
                                              </span>
                                              <span className="text-[10px] text-zinc-500">
                                                {new Date(av.created_at).toLocaleString()}
                                              </span>
                                            </div>
                                            {av.nuevo_estado && (
                                              <span className="inline-block bg-zinc-800 text-zinc-200 text-[10px] font-bold px-2 py-0.5 rounded mb-1">
                                                Estado: {av.nuevo_estado}
                                              </span>
                                            )}
                                            <p className="text-zinc-200">{av.mensaje}</p>
                                            {av.foto_url && (
                                              <button
                                                type="button"
                                                onClick={() => setFotoAmpliada(av.foto_url)}
                                                className="mt-2 inline-block"
                                              >
                                                <img
                                                  src={av.foto_url}
                                                  alt="Foto avance"
                                                  className="h-16 w-16 object-cover rounded border border-zinc-700 hover:border-red-500"
                                                />
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Galería de Fotografías de la Orden */}
                              <div>
                                <span className="text-xs font-bold uppercase text-zinc-400 flex items-center gap-1.5 mb-2.5">
                                  <Camera className="w-4 h-4 text-red-500" />
                                  Todas las Fotografías de la Moto ({cantidadFotos})
                                </span>

                                {cantidadFotos === 0 ? (
                                  <p className="text-xs text-zinc-500 italic">
                                    No se adjuntaron fotografías en esta orden de trabajo.
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                    {ord.fotos_urls.map((url, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setFotoAmpliada(url)}
                                        className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-800 hover:border-red-600 transition cursor-zoom-in"
                                      >
                                        <img
                                          src={url}
                                          alt={`Orden #${ord.numero_orden} foto ${idx + 1}`}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                          Ver
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* VISOR DE FOTO EN PANTALLA COMPLETA */}
      {fotoAmpliada && (
        <div
          onClick={() => setFotoAmpliada(null)}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setFotoAmpliada(null)}
            className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-full cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={fotoAmpliada}
            alt="Evidencia motocicleta ampliada"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[90vh] object-contain rounded-xl border border-zinc-800"
          />
        </div>
      )}
    </LayoutAdmin>
  );
}