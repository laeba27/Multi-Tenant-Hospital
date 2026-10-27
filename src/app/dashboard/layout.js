'use client'

import { useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    // dvh, not vh: on phones 100vh includes the area under the browser's
    // address bar, which pushed the bottom of every page out of reach.
    <div className="h-dvh flex flex-col bg-gray-50">
      {/* Fixed Navbar */}
      <div className="flex-shrink-0">
        <Navbar onMenuToggle={() => setSidebarOpen((open) => !open)} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
