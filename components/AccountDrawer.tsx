'use client'

import { useState, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import { X, User, LogOut, Settings, HelpCircle, MapPin, ChevronLeft } from 'lucide-react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic';

// Dynamically import UserContributions to avoid SSR issues
const UserContributions = dynamic(
  () => import('@/components/UserContributions'),
  { ssr: false }
);

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountDrawer({ isOpen, onClose }: AccountDrawerProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('account');
  const [showContributions, setShowContributions] = useState(false);
  
  const handleBack = useCallback(() => {
    setShowContributions(false);
  }, []);
  
  const handleContributionsClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowContributions(true);
  }, []);

  if (!isOpen || !session?.user) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="relative w-screen max-w-md">
          <div className="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
            <div className="flex-1 py-6 overflow-y-auto px-4 sm:px-6">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-medium text-gray-900">Account</h2>
                <div className="ml-3 h-7 flex items-center">
                  <button
                    type="button"
                    className="-m-2 p-2 text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-8">
                {showContributions ? (
                  <div className="flex items-center space-x-4 pb-6 border-b border-gray-200">
                    <button
                      onClick={handleBack}
                      className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <h2 className="text-lg font-medium text-gray-900">My Contributions</h2>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4 pb-6 border-b border-gray-200">
                    <div className="flex-shrink-0">
                      <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600">
                        <User className="h-6 w-6" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{session.user.name || 'User'}</h3>
                      <p className="text-sm text-gray-500">{session.user.email}</p>
                    </div>
                  </div>
                )}

                <nav className="mt-6">
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                      <button
                        onClick={() => setActiveTab('account')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'account' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                      >
                        My Account
                      </button>
                      <button
                        onClick={() => setActiveTab('settings')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'settings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                      >
                        Settings
                      </button>
                    </nav>
                  </div>

                  <div className="mt-6">
                    {showContributions ? (
                      <div className="py-2">
                        <UserContributions userId={session.user.id} />
                      </div>
                    ) : (
                      <>
                        {activeTab === 'account' && (
                          <div className="space-y-1">
                            <button
                              onClick={handleContributionsClick}
                              className="w-full text-left group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
                            >
                              <MapPin className="text-gray-400 mr-3 h-5 w-5" />
                              My Contributions
                            </button>
                          </div>
                        )}

                    {activeTab === 'settings' && (
                      <div className="space-y-1">
                        <a
                          href="#"
                          className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
                        >
                          <Settings className="text-gray-400 mr-3 h-5 w-5" />
                          Account Settings
                        </a>
                        <a
                          href="#"
                          className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
                        >
                          <HelpCircle className="text-gray-400 mr-3 h-5 w-5" />
                          Help & Support
                        </a>
                      </div>
                    )}

                        {!showContributions && (
                          <div className="mt-8 pt-8 border-t border-gray-200">
                            <button
                              onClick={() => signOut()}
                              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <LogOut className="-ml-1 mr-2 h-5 w-5" />
                              Sign out
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
