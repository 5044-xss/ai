"use client";

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 检查当前路径是否匹配
  const isActive = (path: string) => pathname === path;
  
  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-[10vh] flex items-center">
      <div className="w-full max-w-screen-xl mx-auto px-4">
        <div className="flex justify-center space-x-8">
          {/* 首页按钮 */}
          <a 
            href="/" 
            className={`font-medium transition-colors duration-200 py-2 px-3 rounded-md ${
              isActive('/') 
                ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30' 
                : 'text-gray-700 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            }`}
          >
            首页
          </a>
          
          {/* Demo 下拉菜单 */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`font-medium transition-colors duration-200 flex items-center py-2 px-3 rounded-md ${
                ['/day1', '/day2'].some(path => isActive(path))
                  ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30' 
                  : 'text-gray-700 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              Demo
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-5 w-5 ml-1 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* 下拉菜单 */}
            {isDropdownOpen && (
              <div 
                className="absolute mt-2 bg-white dark:bg-gray-800 shadow-lg rounded-md py-2 z-20 min-w-[140px] left-1/2 transform -translate-x-1/2 border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700"
              >
                <a 
                  href="/day1" 
                  className={`block px-4 py-2 transition-colors duration-150 first:rounded-t-md last:rounded-b-md ${
                    isActive('/day1')
                      ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Day1
                </a>
                <a 
                  href="/day2" 
                  className={`block px-4 py-2 transition-colors duration-150 first:rounded-t-md last:rounded-b-md ${
                    isActive('/day2')
                      ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Day2
                </a>
              </div>
            )}
          </div>
          
          {/* 其他按钮 */}
          <a 
            href="/other" 
            className={`font-medium transition-colors duration-200 py-2 px-3 rounded-md ${
              isActive('/other') 
                ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30' 
                : 'text-gray-700 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            }`}
          >
            其他
          </a>
        </div>
      </div>
    </nav>
  );
}