'use client'

import { useState } from 'react'
import { BarChart3, Eye, Menu, X, Users, MessageSquare, Settings, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'

interface AdminSidebarProps {
  activeSection: 'analytics' | 'moderation'
  onSectionChange: (section: 'analytics' | 'moderation') => void
  userEmail?: string
}

export default function AdminSidebar({ activeSection, onSectionChange, userEmail }: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    {
      id: 'analytics' as const,
      label: 'Analytics Dashboard',
      icon: BarChart3,
      description: 'View platform metrics and insights'
    },
    {
      id: 'moderation' as const,
      label: 'Content Moderation',
      icon: Eye,
      description: 'Review and manage user submissions'
    }
  ]

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white p-2 rounded-md shadow-lg border border-gray-200 hover:bg-gray-50"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12">
                <img 
                  src="/amanmaplogo.png" 
                  alt="AmanMap Logo" 
                  width={48}
                  height={48}
                  loading="lazy"
                  className="h-full w-auto object-contain transition-transform duration-300 hover:scale-105"
                />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            </div>
            <div className="lg:hidden">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionChange(item.id)
                    setIsOpen(false) // Close mobile menu
                  }}
                  className={`
                    w-full flex items-start gap-3 p-4 rounded-lg text-left transition-colors
                    ${isActive 
                      ? 'bg-blue-50 border border-blue-200 text-blue-700' 
                      : 'hover:bg-gray-50 text-gray-700 border border-transparent'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`} />
                  <div>
                    <div className={`font-medium ${
                      isActive ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {item.label}
                    </div>
                    <div className={`text-sm mt-1 ${
                      isActive ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {item.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>

          {/* User info and logout */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userEmail || 'Admin User'}
                </p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-white bg-red-700 hover:bg-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
