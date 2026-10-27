import {
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
  useRouterState,
  Navigate
} from '@tanstack/react-router';
import { Sidebar } from './views/components/Sidebar';
import { Header } from './views/components/Header';
import { DashboardView } from './views/pages/DashboardView';
import { ProjectsView } from './views/pages/ProjectsView';
import { ProjectWorkflowView } from './views/pages/ProjectWorkflowView';
import { InventoryView } from './views/pages/InventoryView';
import { PurchasingView } from './views/pages/PurchasingView';
import { PurchaseOrderDetailView } from './views/pages/PurchaseOrderDetailView';
import { SalesView } from './views/pages/SalesView';
import { SaleDetailView } from './views/pages/SaleDetailView';
import { useState, useEffect } from 'react';

// Root Layout Component
function RootLayout() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const titles: Record<string, string> = {
      '/dashboard': 'Dashboard • ConstructPro',
      '/projects': 'Projects Management • ConstructPro',
      '/sale': 'Sales & Projects • ConstructPro',
      '/sales': 'Sales & Projects • ConstructPro',
      '/warehouse': 'Warehouse • ConstructPro',
      '/inventory': 'Warehouse • ConstructPro',
      '/materials': 'Warehouse • ConstructPro',
      '/purchasing': 'Suppliers & Purchasing • ConstructPro',
    };
    if (currentPath.startsWith('/projects/')) {
      document.title = 'Project Workspace • ConstructPro';
    } else if (currentPath.startsWith('/sale/')) {
      document.title = 'Sales Project Details • ConstructPro';
    } else if (currentPath.startsWith('/purchasing/')) {
      document.title = 'Purchase Order Details • ConstructPro';
    } else {
      document.title = titles[currentPath] || 'ConstructPro - Project & Stock Management';
    }
  }, [currentPath]);

  const handleRefresh = () => {
    setRefreshTick(prev => prev + 1);
  };

  return (
    <div className="erp-layout">
      {/* ERPNet Navigation Sidebar with TanStack routing */}
      <Sidebar currentPath={currentPath} />

      {/* Main Workspace Canvas */}
      <div className="erp-main">
        <Header
          currentPath={currentPath}
          onRefresh={handleRefresh}
        />

        {/* Dynamic Routed View */}
        <main
          key={`${currentPath}-${refreshTick}`}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// 1. Root Route
const rootRoute = createRootRoute({
  component: RootLayout,
});

// 2. The 5 Core Application Routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to="/dashboard" replace />,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardView,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  component: ProjectsView,
});

const projectWorkflowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId',
  component: ProjectWorkflowView,
});

const warehouseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/warehouse',
  component: InventoryView,
});

const inventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inventory',
  component: () => <Navigate to="/warehouse" replace />,
});

const materialsRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/materials',
  component: () => <Navigate to="/warehouse" replace />,
});

const purchasingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/purchasing',
  component: PurchasingView,
});

const purchaseOrderDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/purchasing/$poId',
  component: PurchaseOrderDetailView,
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: () => <Navigate to="/dashboard" replace />,
});

const saleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sale',
  component: SalesView,
});

const saleDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sale/$projectId',
  component: SaleDetailView,
});

const salesRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sales',
  component: () => <Navigate to="/sale" replace />,
});

// Route Tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  projectsRoute,
  projectWorkflowRoute,
  saleRoute,
  saleDetailRoute,
  salesRedirectRoute,
  warehouseRoute,
  inventoryRoute,
  materialsRedirectRoute,
  purchasingRoute,
  purchaseOrderDetailRoute,
  reportsRoute,
]);

// TanStack Router Instance
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Register router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
