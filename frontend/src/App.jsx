import React from 'react';
import { createBrowserRouter, RouterProvider, NavLink, Outlet, Navigate } from 'react-router-dom';
import AuctionList from '@/pages/AuctionList';
import AuctionDetails from '@/pages/AuctionDetails';
import CreateRFQ from '@/pages/CreateRFQ';

function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b px-6 py-3 flex items-center justify-between bg-card sticky top-0 z-50">
        <NavLink to="/auctions" className="font-bold text-lg tracking-tight hover:text-primary transition-colors">
          British Auction Platform
        </NavLink>
        <div className="flex items-center gap-2">
          <NavLink
            to="/auctions"
            end
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`
            }
          >
            All Auctions
          </NavLink>
          <NavLink
            to="/auctions/create"
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`
            }
          >
            Create RFQ
          </NavLink>
        </div>
      </nav>
      <main className="py-6">
        <Outlet />
      </main>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/auctions" replace /> },
      { path: 'auctions', element: <AuctionList /> },
      { path: 'auctions/create', element: <CreateRFQ /> },
      { path: 'auctions/:id', element: <AuctionDetails /> },
    ]
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}