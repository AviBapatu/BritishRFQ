import React from 'react';
import { createBrowserRouter, RouterProvider, NavLink, Outlet, Navigate } from 'react-router-dom';
import AuctionList from '@/pages/AuctionList';
import AuctionDetails from '@/pages/AuctionDetails';
import CreateRFQ from '@/pages/CreateRFQ';

function Layout() {
  return (
    <div>
      <nav className="border-b px-6 py-3 flex items-center gap-6">
        <span className="font-semibold">BritishRFQ</span>
        <NavLink to="/auctions" end className={({ isActive }) => isActive ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
          Auctions
        </NavLink>
        <NavLink to="/auctions/create" className={({ isActive }) => isActive ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
          Create RFQ
        </NavLink>
      </nav>
      <main className="p-6 max-w-6xl mx-auto">
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