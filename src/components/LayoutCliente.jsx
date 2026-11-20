import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, BookOpen, User, LogOut, Wrench } from 'lucide-react';
import BurbujasSociales from './BurbujasSociales';

export default function LayoutCliente({ children }) {
  const { cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const handleSalir = () => {
    cerrarSesion();
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition ${
      isActive
        ? 'bg-red-600 text-white'
        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `flex flex-col items-center justify-center py-2 text-xs font-semibold transition ${
      isActive ? 'text-red-500' : 'text-zinc-400 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20 md:pb-8">
      {/* Header Superior */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-red-600 p-2 rounded-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-wider">
              MOTOPARTS<span className="text-red-600">EC</span>
            </span>
          </div>

          {/* Menú Escritorio */}
          <nav className="hidden md:flex items-center gap-2">
            <NavLink to="/cliente/home" className={linkClass}>
              <Home className="w-4 h-4" /> Inicio
            </NavLink>
            <NavLink to="/cliente/catalogo" className={linkClass}>
              <BookOpen className="w-4 h-4" /> Catálogo
            </NavLink>
            <NavLink to="/cliente/perfil" className={linkClass}>
              <User className="w-4 h-4" /> Mi Perfil y Moto
            </NavLink>
          </nav>

          <button
            onClick={handleSalir}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-red-500 border border-zinc-800 hover:border-red-600/50 px-3 py-2 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-5xl mx-auto px-4 pt-6">
        {children}
      </main>

      {/* Burbujas Flotantes (WhatsApp e Instagram) */}
      <BurbujasSociales />

      {/* Navegación Inferior Móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-black border-t border-zinc-800 grid grid-cols-3">
        <NavLink to="/cliente/home" className={mobileLinkClass}>
          <Home className="w-5 h-5 mb-1" />
          Inicio
        </NavLink>
        <NavLink to="/cliente/catalogo" className={mobileLinkClass}>
          <BookOpen className="w-5 h-5 mb-1" />
          Catálogo
        </NavLink>
        <NavLink to="/cliente/perfil" className={mobileLinkClass}>
          <User className="w-5 h-5 mb-1" />
          Mi Perfil
        </NavLink>
      </nav>
    </div>
  );
}