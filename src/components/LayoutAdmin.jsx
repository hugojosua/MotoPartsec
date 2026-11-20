import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  Users,
  Wrench,
  Package,
  Image as ImageIcon,
  LogOut,
  ShieldAlert
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
    `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap ${
      isActive
        ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
    }`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header Superior Admin */}
      <header className="sticky top-0 z-40 bg-black border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-red-600 p-2 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-wider block leading-none">
                MOTOPARTS<span className="text-red-600">EC</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                Administración
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-zinc-400">
              Hola, <strong className="text-white">{usuario?.nombre}</strong>
            </span>
            <button
              onClick={handleSalir}
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-red-500 border border-zinc-800 hover:border-red-600 px-3 py-2 rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>

        {/* Barra de Navegación Admin (Horizontal con scroll en móvil) */}
        <div className="bg-zinc-950/90 border-t border-zinc-900 overflow-x-auto">
          <nav className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}