import React, { useState, useEffect } from 'react';
import { Layout, BottomNav } from './components/layout';
import { OverviewPage } from './pages/overview';
import { AnalyticsPage } from './pages/analytics';
import { SettingsPage } from './pages/settings';
import { initStorage } from '@asset-tracker/shared';
import { useSettingsStore } from './stores';

const USER_ID = 'default';

/**
 * 主应用组件 - 简约大气设计
 */
export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isInitialized, setIsInitialized] = useState(false);
  const { settings, loadSettings } = useSettingsStore();

  // 初始化存储
  useEffect(() => {
    const init = async () => {
      try {
        // 检查 IndexedDB 是否可用
        if (!window.indexedDB) {
          throw new Error('浏览器不支持 IndexedDB，请使用现代浏览器（Chrome、Firefox、Safari 等）');
        }

        // 添加 10 秒超时
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('初始化超时，可能是浏览器存储权限被阻止')), 10000);
        });

        await Promise.race([initStorage(), timeoutPromise]);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize storage:', error);
        const message = error instanceof Error ? error.message : '未知错误';
        alert(`初始化失败：${message}\n\n请尝试：\n1. 检查浏览器是否允许存储\n2. 退出隐私/无痕模式\n3. 清除浏览器缓存后重试`);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      loadSettings(USER_ID);
    }
  }, [isInitialized, loadSettings]);

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    const applyTheme = (theme: 'light' | 'dark') => {
      root.classList.toggle('dark', theme === 'dark');
    };
    let mediaQuery: MediaQueryList | null = null;
    let listener: ((event: MediaQueryListEvent) => void) | null = null;

    if (settings.theme === 'system') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches ? 'dark' : 'light');
      listener = (event) => {
        applyTheme(event.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', listener);
    } else {
      applyTheme(settings.theme);
    }

    return () => {
      if (mediaQuery && listener) {
        mediaQuery.removeEventListener('change', listener);
      }
    };
  }, [settings?.theme]);

  useEffect(() => {
    if (settings?.language) {
      document.documentElement.lang = settings.language;
    }
  }, [settings?.language]);

  // 底部导航配置
  const tabs = [
    {
      id: 'overview',
      label: '总览',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'analytics',
      label: '分析',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: '我的',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  // 渲染当前页面
  const renderPage = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage />;
    }
  };

  // 加载中状态
  if (!isInitialized) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-light-2 border-t-accent-primary rounded-full animate-spin mb-4" />
          <p className="text-lg font-semibold text-text-primary">初始化中...</p>
          <p className="text-sm text-text-tertiary mt-2">首次使用需要设置数据库</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* 页面内容 */}
      <main className="min-h-screen bg-light-0">
        {renderPage()}
      </main>

      {/* 底部导航 */}
      <BottomNav
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />
    </Layout>
  );
};

export default App;
