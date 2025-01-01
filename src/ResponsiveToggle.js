import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

const ResponsiveToggle = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Main Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md hover:bg-gray-100 transition-colors duration-200 lg:hidden"
        aria-label="Toggle Menu"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-gray-600" />
        ) : (
          <Menu className="w-6 h-6 text-gray-600" />
        )}
      </button>

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:h-screen
      `}>
        {/* Sidebar Content */}
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Menu</h2>
          <nav>
            <ul className="space-y-2">
              <li>
                <a href="#" className="block p-2 hover:bg-gray-100 rounded-lg">Home</a>
              </li>
              <li>
                <a href="#" className="block p-2 hover:bg-gray-100 rounded-lg">About</a>
              </li>
              <li>
                <a href="#" className="block p-2 hover:bg-gray-100 rounded-lg">Services</a>
              </li>
              <li>
                <a href="#" className="block p-2 hover:bg-gray-100 rounded-lg">Contact</a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ResponsiveToggle;