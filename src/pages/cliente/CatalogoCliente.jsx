import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import LayoutCliente from '../../components/LayoutCliente';
import { ChevronLeft, ChevronRight, Maximize2, X, Image as ImageIcon } from 'lucide-react';

export default function CatalogoCliente() {
  const [imagenes, setImagenes] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarCatalogo = async () => {
      const { data } = await supabase
        .from('catalogo_imagenes')
        .select('*')
        .order('orden', { ascending: true });

      if (data) setImagenes(data);
      setCargando(false);
    };
    cargarCatalogo();
  }, []);

  const anterior = () => {
    setIndiceActual((prev) => (prev === 0 ? imagenes.length - 1 : prev - 1));
  };

  const siguiente = () => {
    setIndiceActual((prev) => (prev === imagenes.length - 1 ? 0 : prev + 1));
  };

  const imagenActiva = imagenes[indiceActual];

  return (
    <LayoutCliente>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">
          CATÁLOGO <span className="text-red-600">MOTOPARTSEC</span>
        </h1>
        <p className="text-zinc-400 text-sm">
          Desliza o selecciona las páginas para ver nuestros productos y promociones.
        </p>
      </div>

      {cargando ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl h-96 flex items-center justify-center text-zinc-400">
          Cargando catálogo...
        </div>
      ) : imagenes.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <ImageIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">Catálogo en actualización</h3>
          <p className="text-zinc-400 text-sm mt-1">
            Pronto subiremos las nuevas imágenes de nuestros productos. Escríbenos por WhatsApp para cotizar cualquier repuesto.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Visor Principal Interactivo */}
          <div className="relative bg-black border border-zinc-800 rounded-2xl overflow-hidden flex items-center justify-center group">
            <img
              src={imagenActiva.imagen_url}
              alt={imagenActiva.titulo || `Catálogo página ${indiceActual + 1}`}
              onClick={() => setPantallaCompleta(true)}
              className="max-h-[70vh] w-auto object-contain cursor-zoom-in transition-all duration-300"
            />

            {/* Controles Anterior / Siguiente */}
            {imagenes.length > 1 && (
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

            {/* Indicador y Botón Zoom */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <span className="bg-black/80 border border-zinc-800 px-3 py-1 rounded-full text-xs font-bold text-white">
                {imagenActiva.titulo ? `${imagenActiva.titulo} • ` : ''}
                Página {indiceActual + 1} de {imagenes.length}
              </span>
              <button
                onClick={() => setPantallaCompleta(true)}
                className="pointer-events-auto bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Ampliar
              </button>
            </div>
          </div>

          {/* Miniaturas para cambio rápido de imagen */}
          {imagenes.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {imagenes.map((img, idx) => (
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

      {/* Modal Pantalla Completa */}
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