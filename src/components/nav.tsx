"use client";

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle'; // 你自己的主题切换按钮

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
  
  // 定义导航项数组
  const demoItems = [
    { path: '/day1', label: 'Day1' },
    { path: '/day2', label: 'Day2' },
    { path: '/day3', label: 'Day3' },
    { path: '/day4', label: 'Day4' },
    { path: '/day5', label: 'Day5' },
    { path: '/day6', label: 'Day6' },
    { path: '/day7', label: 'Day7' },
  ];
  
  // 检查是否是demo页面
  const isDemoActive = demoItems.some(item => isActive(item.path));
  
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
                isDemoActive
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
                {demoItems.map((item, index) => (
                  <a 
                    key={item.path}
                    href={item.path}
                    className={`block px-4 py-2 transition-colors duration-150 ${
                      index === 0 ? 'first:rounded-t-md' : ''
                    } ${index === demoItems.length - 1 ? 'last:rounded-b-md' : ''} ${
                      isActive(item.path)
                        ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
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
          <ThemeToggle /> 
        </div>
      
      </div>
    </nav>
  );
}