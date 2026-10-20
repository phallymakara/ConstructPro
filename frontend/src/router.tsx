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
import { ReportsView } from './views/pages/ReportsView';
import { useState } from 'react';

// Root Layout Component
function RootLayout() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const [refreshTick, setRefreshTick] = useState(0);

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

const inventoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inventory',
  component: InventoryView,
});

const materialsRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/materials',
  component: () => <Navigate to="/inventory" replace />,
});

const purchasingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/purchasing',
  component: PurchasingView,
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: ReportsView,
});

// Route Tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  projectsRoute,
  projectWorkflowRoute,
  inventoryRoute,
  materialsRedirectRoute,
  purchasingRoute,
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
