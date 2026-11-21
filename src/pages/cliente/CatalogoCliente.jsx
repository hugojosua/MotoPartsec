import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import LayoutCliente from '../../components/LayoutCliente';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Image as ImageIcon,
  LayoutGrid,
  Shield,
  Wrench,
  Layers,
  Download
} from 'lucide-react';

const SECCIONES = [
  { id: 'general', label: 'General', icon: LayoutGrid },
  { id: 'accesorios', label: 'Accesorios', icon: Shield },
  { id: 'repuestos', label: 'Repuestos', icon: Wrench },
  { id: 'otros', label: 'Otros', icon: Layers }
];

export default function CatalogoCliente() {
  const [todasImagenes, setTodasImagenes] = useState([]);
  const [archivoDescargable, setArchivoDescargable] = useState(null);
  const [seccionActiva, setSeccionActiva] = useState('general');
  const [indiceActual, setIndiceActual] = useState(0);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarCatalogo = async () => {
      const [{ data: imgsData }, { data: archData }] = await Promise.all([
        supabase.from('catalogo_imagenes').select('*').order('orden', { ascending: true }),
        supabase.from('catalogo_archivo').select('*').eq('id', 1).maybeSingle()
      ]);

      if (imgsData) setTodasImagenes(imgsData);
      if (archData) setArchivoDescargable(archData);
      setCargando(false);
    };
    cargarCatalogo();
  }, []);

  const imagenesFiltradas = todasImagenes.filter(
    (img) => (img.categoria || 'general') === seccionActiva
  );

  const seleccionarSeccion = (idSeccion) => {
    setSeccionActiva(idSeccion);
    setIndiceActual(0);
  };

  const anterior = () => {
    setIndiceActual((prev) => (prev === 0 ? imagenesFiltradas.length - 1 : prev - 1));
  };

  const siguiente = () => {
    setIndiceActual((prev) => (prev === imagenesFiltradas.length - 1 ? 0 : prev + 1));
  };

  const imagenActiva = imagenesFiltradas[indiceActual];
  const infoSeccion = SECCIONES.find((s) => s.id === seccionActiva);

  return (
    <LayoutCliente>
      {/* Cabecera con Botón de Descarga Directa del Archivo Subido */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-black text-white">
            CATÁLOGO <span className="text-red-600">MOTOPARTSEC</span>
          </h1>
          <p className="text-zinc-400 text-sm">
            Selecciona una categoría para explorar nuestros productos disponibles.
          </p>
        </div>

        {archivoDescargable && (
          <a
            href={`${archivoDescargable.archivo_url}?download=${encodeURIComponent(
              archivoDescargable.nombre_archivo
            )}`}
            download={archivoDescargable.nombre_archivo}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition shrink-0"
          >
            <Download className="w-4 h-4" />
            Descargar Catálogo Completo
          </a>
        )}
      </div>

      {/* BOTONES DE SECCIONES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
        {SECCIONES.map((sec) => {
          const Icon = sec.icon;
          const activa = seccionActiva === sec.id;
          const cantidad = todasImagenes.filter((i) => (i.categoria || 'general') === sec.id).length;

          return (
            <button
              key={sec.id}
              onClick={() => seleccionarSeccion(sec.id)}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold text-sm border transition cursor-pointer ${
                activa
                  ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/25'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-red-600/50 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{sec.label}</span>
              {cantidad > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activa ? 'bg-black/30 text-white' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {cantidad}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {cargando ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl h-96 flex items-center justify-center text-zinc-400">
          Cargando catálogo...
        </div>
      ) : imagenesFiltradas.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <ImageIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">
            Sección {infoSeccion?.label} en actualización
          </h3>
          <p className="text-zinc-400 text-sm mt-1">
            Pronto subiremos las fotografías de esta categoría. También puedes descargar el catálogo completo arriba o escribirnos por WhatsApp.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Visor Principal Interactivo */}
          <div className="relative bg-black border border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center group">
            <img
              src={imagenActiva.imagen_url}
              alt={imagenActiva.titulo || `${infoSeccion?.label} página ${indiceActual + 1}`}
              onClick={() => setPantallaCompleta(true)}
              className="max-h-[70vh] w-auto object-contain cursor-zoom-in transition-all duration-300"
            />

            {imagenesFiltradas.length > 1 && (
              <>
                <button
                  onClick={anterior}
                  className="absolute left-3 bg-black/80 hover:bg-red-600 text-white p-3 rounded-full border border-zinc-700 transition cursor-pointer"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={siguiente}
                  className="absolute right-3 bg-black/80 hover:bg-red-600 text-white p-3 rounded-full border border-zinc-700 transition cursor-pointer"
                  aria-label="Siguiente imagen"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <span className="bg-black/80 border border-zinc-800 px-3 py-1 rounded-full text-xs font-bold text-white">
                {infoSeccion?.label} • {imagenActiva.titulo ? `${imagenActiva.titulo} • ` : ''}
                {indiceActual + 1} de {imagenesFiltradas.length}
              </span>
              <button
                onClick={() => setPantallaCompleta(true)}
                className="pointer-events-auto bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Ampliar
              </button>
            </div>
          </div>

          {imagenesFiltradas.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {imagenesFiltradas.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setIndiceActual(idx)}
                  className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                    idx === indiceActual
                      ? 'border-red-600 scale-105 shadow-md shadow-red-600/30'
                      : 'border-zinc-800 opacity-50 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.imagen_url}
                    alt={`Miniatura ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {pantallaCompleta && imagenActiva && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setPantallaCompleta(false)}
            className="absolute top-4 right-4 bg-red-600 text-white p-2.5 rounded-full cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={imagenActiva.imagen_url}
            alt="Vista ampliada"
            className="max-w-full max-h-[90vh] object-contain"
          />
        </div>
      )}
    </LayoutCliente>
  );
}