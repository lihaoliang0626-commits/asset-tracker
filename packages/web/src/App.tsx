import React, { useEffect, useState } from 'react';
import { BarChart3, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { OverviewPage } from './pages/overview';
import { AnalyticsPage } from './pages/analytics';
import { SettingsPage } from './pages/settings';
import { AuthPage } from './components/auth';
import {
  useAuthStore,
  useSnapshotStore,
  useAnalyticsStore,
  useGoalStore,
} from './stores';

type TabId = 'overview' | 'analytics' | 'settings';

const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: '总览', icon: LayoutDashboard },
  { id: 'analytics', label: '分析', icon: BarChart3 },
  { id: 'settings', label: '设置', icon: Settings },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { user, isLoading, init, signOut } = useAuthStore();
  const resetSnapshots = useSnapshotStore(state => state.reset);
  const resetAnalytics = useAnalyticsStore(state => state.reset);
  const resetGoals = useGoalStore(state => state.reset);

  useEffect(() => {
    init();
  }, [init]);

  const handleSignOut = async () => {
    await signOut();
    resetSnapshots();
    resetAnalytics();
    resetGoals();
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'overview':
      default:
        return <OverviewPage />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-[#D1D5DB] border-t-[#1F3A8A] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-[#111827]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-[#E5E7EB] bg-white px-4 py-5 lg:flex lg:flex-col">
        <div className="mb-8 px-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#6B7280]">Asset Tracker</p>
          <h1 className="mt-2 text-xl font-semibold text-[#111827]">资产工作台</h1>
        </div>

        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium ${
                  active
                    ? 'bg-[#1F3A8A] text-white'
                    : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#E5E7EB] pt-4">
          <p className="truncate px-2 text-xs text-[#6B7280]">{user.email}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[#4B5563] hover:bg-[#F3F4F6]"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E5E7EB] bg-white px-4 py-3 lg:hidden">
          <span className="font-semibold">资产工作台</span>
          <button type="button" onClick={handleSignOut} className="text-sm text-[#4B5563]">
            退出
          </button>
        </div>
        <div className="flex gap-1 border-b border-[#E5E7EB] bg-white px-2 py-2 lg:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-md px-3 py-2 text-sm ${
                activeTab === tab.id ? 'bg-[#1F3A8A] text-white' : 'text-[#4B5563]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <main>{renderPage()}</main>
      </div>
    </div>
  );
};

export default App;
