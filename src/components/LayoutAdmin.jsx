import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  Users,
  Wrench,
  Package,
  Image as ImageIcon,
  LogOut
} from 'lucide-react';

export default function LayoutAdmin({ children }) {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  const handleSalir = () => {
    cerrarSesion();
    navigate('/admin/login');
  };

  const navItems = [
    { to: '/admin/dashboard', label: 'Reportes y Ventas', icon: BarChart3 },
    { to: '/admin/cobros-ordenes', label: 'Cobros y Órdenes', icon: Wrench },
    { to: '/admin/inventario', label: 'Inventario', icon: Package },
    { to: '/admin/clientes', label: 'Clientes', icon: Users },
    { to: '/admin/catalogo', label: 'Catálogo y Premio', icon: ImageIcon },
  ];

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 whitespace-nowrap ${
      isActive
        ? 'bg-red-600 text-white shadow-sm shadow-red-600/25'
        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80'
    }`;

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col theme-admin-light">
      {/* Header Superior Blanco con Glassmorphism */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* LOGO DE MOTOPARTSEC + BADGE EJECUTIVO */}
          <div className="flex items-center gap-3">
            <div className="bg-zinc-950 px-2.5 py-1 rounded-xl shadow-xs flex items-center">
              <img
                src="/logo-motopartsec.png"
                alt="Logo Motopartsec"
                className="h-10 w-auto object-contain"
              />
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200/80 text-red-600 text-[11px] font-bold uppercase tracking-wider rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              Panel Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-slate-500">
              Hola, <strong className="text-slate-900 font-semibold">{usuario?.nombre}</strong>
            </span>
            <button
              onClick={handleSalir}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-3.5 py-2 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>

        {/* Barra de Navegación Limpia */}
        <div className="bg-white border-t border-slate-100 overflow-x-auto">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className={linkClass}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-7">
        {children}
      </main>
    </div>
  );
}