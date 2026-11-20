import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import LayoutAdmin from '../../components/LayoutAdmin';
import { Users, UserPlus, Search, Edit3, Trash2, Droplet, X, Save } from 'lucide-react';

export default function ClientesAdmin() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Estado formulario crear / editar cliente
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    email: '',
    password: '',
    cambios_aceite_acumulados: 0
  });
  const [guardando, setGuardando] = useState(false);

  const cargarClientes = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('rol', 'cliente')
      .order('created_at', { ascending: false });

    if (!error && data) setClientes(data);
    setCargando(false);
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const abrirModalNuevo = () => {
    setClienteEditando(null);
    setForm({
      nombre: '',
      cedula: '',
      telefono: '',
      email: '',
      password: '',
      cambios_aceite_acumulados: 0
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (cliente) => {
    setClienteEditando(cliente);
    setForm({
      nombre: cliente.nombre,
      cedula: cliente.cedula,
      telefono: cliente.telefono,
      email: cliente.email,
      password: cliente.password,
      cambios_aceite_acumulados: cliente.cambios_aceite_acumulados || 0
    });
    setModalAbierto(true);
  };

  const handleGuardarCliente = async (e) => {
    e.preventDefault();
    setGuardando(true);

    try {
      if (clienteEditando) {
        // Actualizar cliente existente
        const { error } = await supabase
          .from('usuarios')
          .update({
            nombre: form.nombre.trim(),
            cedula: form.cedula.trim(),
            telefono: form.telefono.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            cambios_aceite_acumulados: Math.min(6, Math.max(0, parseInt(form.cambios_aceite_acumulados, 10) || 0))
          })
          .eq('id', clienteEditando.id);

        if (error) throw error;
      } else {
        // Crear nuevo cliente
        const { error } = await supabase.from('usuarios').insert([
          {
            nombre: form.nombre.trim(),
            cedula: form.cedula.trim(),
            telefono: form.telefono.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            rol: 'cliente',
            cambios_aceite_acumulados: parseInt(form.cambios_aceite_acumulados, 10) || 0
          }
        ]);

        if (error) {
          if (error.code === '23505') throw new Error('Esa cédula o correo ya está registrado.');
          throw error;
        }
      }

      setModalAbierto(false);
      cargarClientes();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarCliente = async (id, nombre) => {
    if (!confirm(`¿Seguro que deseas eliminar al cliente "${nombre}" y todo su historial?`)) return;
    const { error } = await supabase.from('usuarios').delete().eq('id', id);
    if (!error) cargarClientes();
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.cedula.includes(busqueda) ||
      c.telefono.includes(busqueda)
  );

  return (
    <LayoutAdmin>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-red-600" />
              GESTIÓN DE CLIENTES ({clientes.length})
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Crea, actualiza, elimina clientes y controla sus sellos de cambio de aceite.
            </p>
          </div>

          <button
            onClick={abrirModalNuevo}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Cliente
          </button>
        </div>

        {/* Buscador */}
        <div className="relative mb-5">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Buscar cliente por nombre, cédula o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none"
          />
        </div>

        {/* Tabla de Clientes */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-400">
                <th className="py-3 px-3">Nombre</th>
                <th className="py-3 px-3">Cédula</th>
                <th className="py-3 px-3">Teléfono</th>
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3">Fidelidad Aceite</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {cargando ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-zinc-400">Cargando clientes...</td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-zinc-500">No se encontraron clientes.</td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-zinc-950/60 transition">
                    <td className="py-3 px-3 font-bold text-white">{cliente.nombre}</td>
                    <td className="py-3 px-3 text-zinc-300 font-mono">{cliente.cedula}</td>
                    <td className="py-3 px-3 text-zinc-300">{cliente.telefono}</td>
                    <td className="py-3 px-3 text-zinc-400">{cliente.email}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 bg-red-600/15 border border-red-600/40 text-red-400 text-xs font-extrabold px-2.5 py-1 rounded-full">
                        <Droplet className="w-3.5 h-3.5" />
                        {cliente.cambios_aceite_acumulados || 0} / 6
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => abrirModalEditar(cliente)}
                        title="Editar Cliente"
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEliminarCliente(cliente.id, cliente.nombre)}
                        title="Eliminar Cliente"
                        className="p-1.5 bg-red-950/60 hover:bg-red-600 text-red-400 hover:text-white rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR / EDITAR CLIENTE */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
              <h3 className="font-black text-lg text-white">
                {clienteEditando ? 'EDITAR CLIENTE' : 'REGISTRAR NUEVO CLIENTE'}
              </h3>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarCliente} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Cédula</label>
                  <input
                    type="text"
                    required
                    value={form.cedula}
                    onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    required
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Contraseña</label>
                  <input
                    type="text"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Sellos Aceite (0-6)</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={form.cambios_aceite_acumulados}
                    onChange={(e) => setForm({ ...form, cambios_aceite_acumulados: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer mt-2"
              >
                <Save className="w-4 h-4" />
                {guardando ? 'Guardando...' : 'Guardar Datos'}
              </button>
            </form>
          </div>
        </div>
      )}
    </LayoutAdmin>
  );
}