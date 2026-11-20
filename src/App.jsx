import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginCliente from './pages/auth/LoginCliente';
import LoginAdmin from './pages/auth/LoginAdmin';
import Registro from './pages/auth/Registro';
import HomeCliente from './pages/cliente/HomeCliente';
import CatalogoCliente from './pages/cliente/CatalogoCliente';
import PerfilCliente from './pages/cliente/PerfilCliente';
import DashboardAdmin from './pages/admin/DashboardAdmin';
import CobrosOrdenesAdmin from './pages/admin/CobrosOrdenesAdmin';
import InventarioAdmin from './pages/admin/InventarioAdmin';
import ClientesAdmin from './pages/admin/ClientesAdmin';
import CatalogoAdmin from './pages/admin/CatalogoAdmin';

const RutaProtegida = ({ children, rolRequerido }) => {
  const { usuario } = useAuth();
  if (!usuario) {
    return <Navigate to={rolRequerido === 'admin' ? '/admin/login' : '/'} replace />;
  }
  if (usuario.rol !== rolRequerido) {
    return <Navigate to={usuario.rol === 'admin' ? '/admin/dashboard' : '/cliente/home'} replace />;
  }
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<LoginCliente />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/admin/login" element={<LoginAdmin />} />

          {/* Rutas Cliente */}
          <Route
            path="/cliente/home"
            element={
              <RutaProtegida rolRequerido="cliente">
                <HomeCliente />
              </RutaProtegida>
            }
          />
          <Route
            path="/cliente/catalogo"
            element={
              <RutaProtegida rolRequerido="cliente">
                <CatalogoCliente />
              </RutaProtegida>
            }
          />
          <Route
            path="/cliente/perfil"
            element={
              <RutaProtegida rolRequerido="cliente">
                <PerfilCliente />
              </RutaProtegida>
            }
          />

          {/* Rutas Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <RutaProtegida rolRequerido="admin">
                <DashboardAdmin />
              </RutaProtegida>
            }
          />
          <Route
            path="/admin/cobros-ordenes"
            element={
              <RutaProtegida rolRequerido="admin">
                <CobrosOrdenesAdmin />
              </RutaProtegida>
            }
          />
          <Route
            path="/admin/inventario"
            element={
              <RutaProtegida rolRequerido="admin">
                <InventarioAdmin />
              </RutaProtegida>
            }
          />
          <Route
            path="/admin/clientes"
            element={
              <RutaProtegida rolRequerido="admin">
                <ClientesAdmin />
              </RutaProtegida>
            }
          />
          <Route
            path="/admin/catalogo"
            element={
              <RutaProtegida rolRequerido="admin">
                <CatalogoAdmin />
              </RutaProtegida>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}