import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import LayoutAdmin from '../../components/LayoutAdmin';
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  Gift,
  Save,
  ArrowUp,
  ArrowDown,
  Layers,
  FileText,
  ExternalLink
} from 'lucide-react';

const SECCIONES_CATALOGO = [
  { id: 'general', label: 'General (Principal)' },
  { id: 'accesorios', label: 'Accesorios' },
  { id: 'repuestos', label: 'Repuestos' },
  { id: 'otros', label: 'Otros' }
];

export default function CatalogoAdmin() {
  const [imagenes, setImagenes] = useState([]);
  const [archivosSeleccionados, setArchivosSeleccionados] = useState([]);
  const [categoriaSubida, setCategoriaSubida] = useState('general');
  const [categoriaFiltro, setCategoriaFiltro] = useState('general');
  const [tituloOpcional, setTituloOpcional] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [cargando, setCargando] = useState(true);

  // Estado para el archivo descargable del catálogo completo
  const [archivoCatalogoActual, setArchivoCatalogoActual] = useState(null);
  const [nuevoArchivoDescargable, setNuevoArchivoDescargable] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  // Estado para editar el premio de fidelización
  const [premio, setPremio] = useState({
    titulo_premio: '',
    descripcion_premio: '',
    meta_cambios: 6
  });
  const [guardandoPremio, setGuardandoPremio] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    const [{ data: catData }, { data: fidData }, { data: archData }] = await Promise.all([
      supabase.from('catalogo_imagenes').select('*').order('orden', { ascending: true }),
      supabase.from('configuracion_fidelidad').select('*').eq('id', 1).single(),
      supabase.from('catalogo_archivo').select('*').eq('id', 1).maybeSingle()
    ]);

    if (catData) setImagenes(catData);
    if (fidData) setPremio(fidData);
    if (archData) setArchivoCatalogoActual(archData);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Subir o reemplazar el archivo completo del catálogo
  const handleSubirArchivoCompleto = async (e) => {
    e.preventDefault();
    if (!nuevoArchivoDescargable) {
      alert('Selecciona primero el archivo del catálogo.');
      return;
    }

    setSubiendoArchivo(true);
    try {
      const extension = nuevoArchivoDescargable.name.split('.').pop();
      const nombreUnico = `catalogo_completo_${Date.now()}.${extension}`;

      // 1. Subir al bucket 'catalogo_productos'
      const { error: uploadError } = await supabase.storage
        .from('catalogo_productos')
        .upload(nombreUnico, nuevoArchivoDescargable);

      if (uploadError) throw uploadError;

      // 2. Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('catalogo_productos')
        .getPublicUrl(nombreUnico);

      // 3. Guardar o actualizar el registro único (id = 1)
      const { error: dbError } = await supabase
        .from('catalogo_archivo')
        .upsert([
          {
            id: 1,
            nombre_archivo: nuevoArchivoDescargable.name,
            archivo_url: urlData.publicUrl,
            updated_at: new Date().toISOString()
          }
        ]);

      if (dbError) throw dbError;

      setNuevoArchivoDescargable(null);
      document.getElementById('input-archivo-completo').value = '';
      alert('¡Archivo descargable del catálogo actualizado con éxito!');
      cargarDatos();
    } catch (error) {
      alert('Error al subir el archivo: ' + error.message);
    } finally {
      setSubiendoArchivo(false);
    }
  };

  const imagenesSeccionActual = imagenes.filter(
    (img) => (img.categoria || 'general') === categoriaFiltro
  );

  // Subir imágenes al Storage y registrar con su categoría
  const handleSubirImagenes = async (e) => {
    e.preventDefault();
    if (!archivosSeleccionados || archivosSeleccionados.length === 0) {
      alert('Por favor selecciona al menos una imagen.');
      return;
    }

    setSubiendo(true);
    try {
      const imgsDeCategoria = imagenes.filter((i) => (i.categoria || 'general') === categoriaSubida);
      let ordenActual =
        imgsDeCategoria.length > 0 ? Math.max(...imgsDeCategoria.map((i) => i.orden || 0)) + 1 : 1;

      for (let i = 0; i < archivosSeleccionados.length; i++) {
        const archivo = archivosSeleccionados[i];
        const extension = archivo.name.split('.').pop();
        const nombreUnico = `catalogo_${categoriaSubida}_${Date.now()}_${i}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from('catalogo_productos')
          .upload(nombreUnico, archivo);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('catalogo_productos')
          .getPublicUrl(nombreUnico);

        const { error: dbError } = await supabase
          .from('catalogo_imagenes')
          .insert([{
            categoria: categoriaSubida,
            titulo: tituloOpcional.trim() || `Página ${ordenActual}`,
            imagen_url: urlData.publicUrl,
            orden: ordenActual
          }]);

        if (dbError) throw dbError;
        ordenActual++;
      }

      setArchivosSeleccionados([]);
      setTituloOpcional('');
      setCategoriaFiltro(categoriaSubida);
      document.getElementById('input-fotos-catalogo').value = '';
      alert('¡Imágenes subidas correctamente a la sección!');
      cargarDatos();
    } catch (error) {
      alert('Error al subir imágenes: ' + error.message);
    } finally {
      setSubiendo(false);
    }
  };

  const handleEliminarImagen = async (img) => {
    if (!confirm('¿Estás seguro de eliminar esta imagen del catálogo?')) return;

    try {
      const nombreArchivo = img.imagen_url.split('/').pop();
      await supabase.storage.from('catalogo_productos').remove([nombreArchivo]);

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

  const moverOrden = async (index, direccion) => {
    const nuevoIndice = index + direccion;
    if (nuevoIndice < 0 || nuevoIndice >= imagenesSeccionActual.length) return;

    const itemActual = imagenesSeccionActual[index];
    const itemDestino = imagenesSeccionActual[nuevoIndice];

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
        {/* COLUMNA IZQUIERDA */}
        <div className="space-y-6">
          {/* NUEVO: Subir Archivo Descargable del Catálogo */}
          <div className="bg-zinc-900 border-2 border-red-600/50 rounded-2xl p-6">
            <h2 className="text-lg font-black text-white flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-red-600" />
              ARCHIVO DESCARGABLE (PDF / DOC)
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              Sube aquí tu archivo completo ya armado para que los clientes puedan descargarlo con un clic.
            </p>

            {archivoCatalogoActual && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-4 flex items-center justify-between gap-2 text-xs">
                <div className="truncate">
                  <span className="text-zinc-500 block">Archivo publicado actual:</span>
                  <strong className="text-emerald-400">{archivoCatalogoActual.nombre_archivo}</strong>
                </div>
                <a
                  href={archivoCatalogoActual.archivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-zinc-800 hover:bg-red-600 text-white rounded-lg shrink-0 transition"
                  title="Ver archivo actual"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            <form onSubmit={handleSubirArchivoCompleto} className="space-y-3">
              <input
                id="input-archivo-completo"
                type="file"
                required
                onChange={(e) => setNuevoArchivoDescargable(e.target.files[0])}
                className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-700 file:cursor-pointer bg-zinc-950 border border-zinc-800 rounded-lg p-1.5"
              />
              <button
                type="submit"
                disabled={subiendoArchivo}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer text-sm"
              >
                <Upload className="w-4 h-4" />
                {subiendoArchivo ? 'Subiendo archivo...' : 'Subir Archivo Descargable'}
              </button>
            </form>
          </div>

          {/* Formulario Subida de Fotos por Sección */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-red-600" />
              SUBIR FOTOS AL VISOR
            </h2>

            <form onSubmit={handleSubirImagenes} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Sección del Catálogo *
                </label>
                <select
                  value={categoriaSubida}
                  onChange={(e) => setCategoriaSubida(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3.5 py-2.5 text-sm font-bold text-white outline-none"
                >
                  {SECCIONES_CATALOGO.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Título o Referencia (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Promoción del mes"
                  value={tituloOpcional}
                  onChange={(e) => setTituloOpcional(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                  Seleccionar Imágenes
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
              </div>

              <button
                type="submit"
                disabled={subiendo}
                className="w-full bg-zinc-800 hover:bg-red-600 disabled:bg-zinc-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {subiendo ? 'Subiendo imágenes...' : 'Publicar en Sección'}
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

        {/* COLUMNA DERECHA: Galería Actual del Catálogo por Sección */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-red-600" />
              GALERÍA POR SECCIÓN ({imagenesSeccionActual.length})
            </h2>
          </div>

          <div className="flex flex-wrap gap-2 mb-6 border-b border-zinc-800 pb-4">
            {SECCIONES_CATALOGO.map((sec) => {
              const totalEnSec = imagenes.filter((i) => (i.categoria || 'general') === sec.id).length;
              const activa = categoriaFiltro === sec.id;

              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setCategoriaFiltro(sec.id);
                    setCategoriaSubida(sec.id);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
                    activa
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  {sec.label}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      activa ? 'bg-black/30 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {totalEnSec}
                  </span>
                </button>
              );
            })}
          </div>

          {cargando ? (
            <p className="text-zinc-400 text-sm">Cargando galería...</p>
          ) : imagenesSeccionActual.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-800 border-dashed rounded-xl p-12 text-center">
              <ImageIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">
                No hay imágenes publicadas en esta sección todavía.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {imagenesSeccionActual.map((img, idx) => (
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
                        disabled={idx === imagenesSeccionActual.length - 1}
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