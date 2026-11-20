import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import LayoutAdmin from '../../components/LayoutAdmin';
import { Upload, Trash2, Image as ImageIcon, Gift, Save, ArrowUp, ArrowDown } from 'lucide-react';

export default function CatalogoAdmin() {
  const [imagenes, setImagenes] = useState([]);
  const [archivosSeleccionados, setArchivosSeleccionados] = useState([]);
  const [tituloOpcional, setTituloOpcional] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Estado para editar el premio de fidelización
  const [premio, setPremio] = useState({
    titulo_premio: '',
    descripcion_premio: '',
    meta_cambios: 6
  });
  const [guardandoPremio, setGuardandoPremio] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    // 1. Cargar imágenes del catálogo
    const { data: catData } = await supabase
      .from('catalogo_imagenes')
      .select('*')
      .order('orden', { ascending: true });

    if (catData) setImagenes(catData);

    // 2. Cargar configuración de fidelización
    const { data: fidData } = await supabase
      .from('configuracion_fidelidad')
      .select('*')
      .eq('id', 1)
      .single();

    if (fidData) setPremio(fidData);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Subir imágenes al Storage de Supabase y registrar en la tabla catalogo_imagenes
  const handleSubirImagenes = async (e) => {
    e.preventDefault();
    if (!archivosSeleccionados || archivosSeleccionados.length === 0) {
      alert('Por favor selecciona al menos una imagen.');
      return;
    }

    setSubiendo(true);
    try {
      let ordenActual = imagenes.length > 0 ? Math.max(...imagenes.map((i) => i.orden || 0)) + 1 : 1;

      for (let i = 0; i < archivosSeleccionados.length; i++) {
        const archivo = archivosSeleccionados[i];
        const extension = archivo.name.split('.').pop();
        const nombreUnico = `catalogo_${Date.now()}_${i}.${extension}`;

        // 1. Subir archivo al bucket 'catalogo_productos'
        const { error: uploadError } = await supabase.storage
          .from('catalogo_productos')
          .upload(nombreUnico, archivo);

        if (uploadError) throw uploadError;

        // 2. Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('catalogo_productos')
          .getPublicUrl(nombreUnico);

        // 3. Guardar registro en la base de datos
        const { error: dbError } = await supabase
          .from('catalogo_imagenes')
          .insert([{
            titulo: tituloOpcional.trim() || `Página ${ordenActual}`,
            imagen_url: urlData.publicUrl,
            orden: ordenActual
          }]);

        if (dbError) throw dbError;
        ordenActual++;
      }

      setArchivosSeleccionados([]);
      setTituloOpcional('');
      document.getElementById('input-fotos-catalogo').value = '';
      alert('¡Imágenes del catálogo subidas correctamente!');
      cargarDatos();
    } catch (error) {
      alert('Error al subir imágenes: ' + error.message);
    } finally {
      setSubiendo(false);
    }
  };

  // Eliminar imagen del catálogo
  const handleEliminarImagen = async (img) => {
    if (!confirm('¿Estás seguro de eliminar esta imagen del catálogo?')) return;

    try {
      // Extraer nombre del archivo de la URL para borrarlo también del Storage
      const nombreArchivo = img.imagen_url.split('/').pop();
      await supabase.storage.from('catalogo_productos').remove([nombreArchivo]);

      // Borrar registro de la tabla
      const { error } = await supabase
        .from('catalogo_imagenes')
        .delete()
        .eq('id', img.id);

      if (error) throw error;
      cargarDatos();
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  // Cambiar orden de visualización
  const moverOrden = async (index, direccion) => {
    const nuevoIndice = index + direccion;
    if (nuevoIndice < 0 || nuevoIndice >= imagenes.length) return;

    const itemActual = imagenes[index];
    const itemDestino = imagenes[nuevoIndice];

    await supabase
      .from('catalogo_imagenes')
      .update({ orden: itemDestino.orden })
      .eq('id', itemActual.id);

    await supabase
      .from('catalogo_imagenes')
      .update({ orden: itemActual.orden })
      .eq('id', itemDestino.id);

    cargarDatos();
  };

  // Guardar cambios en el premio de fidelización
  const handleGuardarPremio = async (e) => {
    e.preventDefault();
    setGuardandoPremio(true);
    try {
      const { error } = await supabase
        .from('configuracion_fidelidad')
        .update({
          titulo_premio: premio.titulo_premio,
          descripcion_premio: premio.descripcion_premio,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      if (error) throw error;
      alert('¡Premio de fidelización actualizado!');
    } catch (error) {
      alert('Error al actualizar premio: ' + error.message);
    } finally {
      setGuardandoPremio(false);
    }
  };

  return (
    <LayoutAdmin>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA: Subir Catálogo + Configurar Premio */}
        <div className="space-y-6">
          {/* Formulario Subida de Fotos */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-red-600" />
              SUBIR FOTOS AL CATÁLOGO
            </h2>

            <form onSubmit={handleSubirImagenes} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Título o Sección (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Aceites y Lubricantes"
                  value={tituloOpcional}
                  onChange={(e) => setTituloOpcional(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Seleccionar Imágenes (Puedes elegir varias)
                </label>
                <input
                  id="input-fotos-catalogo"
                  type="file"
                  accept="image/*"
                  multiple
                  required
                  onChange={(e) => setArchivosSeleccionados(Array.from(e.target.files))}
                  className="w-full text-sm text-zinc-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-700 file:cursor-pointer bg-zinc-950 border border-zinc-800 rounded-lg p-1.5"
                />
                {archivosSeleccionados.length > 0 && (
                  <p className="text-xs text-emerald-400 mt-1.5 font-semibold">
                    {archivosSeleccionados.length} imagen(es) lista(s) para subir.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={subiendo}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {subiendo ? 'Subiendo imágenes...' : 'Publicar en Catálogo'}
              </button>
            </form>
          </div>

          {/* Formulario Editar Premio de Fidelización */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
              <Gift className="w-5 h-5 text-red-600" />
              PREMIO FIDELIZACIÓN (6 SELLOS)
            </h2>

            <form onSubmit={handleGuardarPremio} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Nombre del Regalo
                </label>
                <input
                  type="text"
                  required
                  value={premio.titulo_premio}
                  onChange={(e) => setPremio({ ...premio, titulo_premio: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Descripción / Condiciones
                </label>
                <textarea
                  rows={3}
                  value={premio.descripcion_premio}
                  onChange={(e) => setPremio({ ...premio, descripcion_premio: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={guardandoPremio}
                className="w-full bg-white hover:bg-zinc-200 text-black font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {guardandoPremio ? 'Guardando...' : 'Actualizar Regalo'}
              </button>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: Galería Actual del Catálogo */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-red-600" />
              PÁGINAS DEL CATÁLOGO PUBLICADAS ({imagenes.length})
            </h2>
          </div>

          {cargando ? (
            <p className="text-zinc-400 text-sm">Cargando galería...</p>
          ) : imagenes.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-800 border-dashed rounded-xl p-12 text-center">
              <ImageIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">
                Aún no has subido imágenes al catálogo. Usa el formulario de la izquierda para cargarlas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {imagenes.map((img, idx) => (
                <div
                  key={img.id}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-between group"
                >
                  <div className="relative aspect-[3/4] bg-black overflow-hidden">
                    <img
                      src={img.imagen_url}
                      alt={img.titulo}
                      className="w-full h-full object-contain"
                    />
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="p-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-zinc-300 truncate">
                      {img.titulo}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moverOrden(idx, -1)}
                        disabled={idx === 0}
                        title="Mover antes"
                        className="p-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 rounded-lg text-zinc-300 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moverOrden(idx, 1)}
                        disabled={idx === imagenes.length - 1}
                        title="Mover después"
                        className="p-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 rounded-lg text-zinc-300 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEliminarImagen(img)}
                        title="Eliminar imagen"
                        className="p-1.5 bg-red-950/60 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </LayoutAdmin>
  );
}