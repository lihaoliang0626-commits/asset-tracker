import React, { useEffect, useState } from 'react';
import { useSettingsStore, useSnapshotStore, useExchangeRateStore, useAnalyticsStore } from '../../stores';
import { Card, Button, Select, Input, Modal } from '../../components/base';
import { Header } from '../../components/layout';
import { CURRENCIES, exportAllData } from '@asset-tracker/shared';

const USER_ID = 'default';

/**
 * 设置页
 */
export const SettingsPage: React.FC = () => {
  const {
    settings,
    preferences,
    isLoading,
    loadSettings,
    updateBaseCurrency,
    updateExchangeRateMode,
    updateTheme,
    updateLanguage,
    toggleAIAnalysis,
    toggleDataBackup,
    toggleAssetType,
  } = useSettingsStore();

  const { snapshots, deleteSnapshot, refreshSnapshots, getLatestSnapshot } = useSnapshotStore();
  const { rates, deleteOutdated } = useExchangeRateStore();
  const { analyze } = useAnalyticsStore();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showSnapshotsModal, setShowSnapshotsModal] = useState(false);

  // 加载设置
  useEffect(() => {
    loadSettings(USER_ID);
  }, []);

  // 导出数据
  const handleExport = async () => {
    try {
      const data = await exportAllData(USER_ID);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asset-tracker-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('导出失败，请重试');
    }
  };

  // 清理过期汇率
  const handleCleanupRates = async () => {
    try {
      await deleteOutdated();
      alert('清理完成');
    } catch (error) {
      console.error('Failed to cleanup rates:', error);
      alert('清理失败，请重试');
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    const confirmed = window.confirm('确认删除该快照？此操作不可恢复。');
    if (!confirmed) return;

    try {
      await deleteSnapshot(snapshotId);
      await refreshSnapshots(USER_ID);
      await getLatestSnapshot(USER_ID);
      await analyze(USER_ID, true);
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
      alert('删除失败，请重试');
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#1F3A8A] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[#6B7280]">加载设置中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <Header title="设置" subtitle="个性化配置" />

      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* 基本信息 */}
        <Card title="基本信息">
          <div className="space-y-4">
            <Select
              label="基准货币"
              value={settings.baseCurrency}
              onChange={(e) => updateBaseCurrency(USER_ID, e.target.value)}
              options={CURRENCIES.map(c => ({
                value: c.code,
                label: `${c.symbol} ${c.nameZh} (${c.code})`,
              }))}
            />

            <div>
              <label className="block text-sm font-medium text-[#1F2933] mb-2">
                汇率规则
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => updateExchangeRateMode(USER_ID, 'auto')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    settings.exchangeRateMode === 'auto'
                      ? 'border-[#1F3A8A] bg-[#1F3A8A]/5'
                      : 'border-[#E5E7EB] hover:border-[#1F3A8A]/30'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-semibold text-[#1F2933]">自动更新</p>
                    <p className="text-sm text-[#6B7280] mt-1">每天自动获取最新汇率</p>
                  </div>
                </button>
                <button
                  onClick={() => updateExchangeRateMode(USER_ID, 'manual')}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    settings.exchangeRateMode === 'manual'
                      ? 'border-[#1F3A8A] bg-[#1F3A8A]/5'
                      : 'border-[#E5E7EB] hover:border-[#1F3A8A]/30'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-semibold text-[#1F2933]">手动设置</p>
                    <p className="text-sm text-[#6B7280] mt-1">使用固定汇率</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* 外观设置 */}
        <Card title="外观设置">
          <div className="space-y-4">
            <Select
              label="主题"
              value={settings.theme}
              onChange={(e) => updateTheme(USER_ID, e.target.value as any)}
              options={[
                { value: 'light', label: '浅色' },
                { value: 'dark', label: '深色' },
                { value: 'system', label: '跟随系统' },
              ]}
            />

            <Select
              label="语言"
              value={settings.language}
              onChange={(e) => updateLanguage(USER_ID, e.target.value as any)}
              options={[
                { value: 'zh-CN', label: '简体中文' },
                { value: 'en-US', label: 'English' },
              ]}
            />
          </div>
        </Card>

        {/* 功能设置 */}
        <Card title="功能设置">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[#F6F7F9] rounded-lg">
              <div>
                <p className="font-medium text-[#1F2933]">AI 分析</p>
                <p className="text-sm text-[#6B7280] mt-1">使用 AI 生成资产变化分析</p>
              </div>
              <button
                onClick={() => toggleAIAnalysis(USER_ID, !settings.enableAIAnalysis)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.enableAIAnalysis ? 'bg-[#1F3A8A]' : 'bg-[#E5E7EB]'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.enableAIAnalysis ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F6F7F9] rounded-lg">
              <div>
                <p className="font-medium text-[#1F2933]">数据备份</p>
                <p className="text-sm text-[#6B7280] mt-1">启用云端加密备份</p>
              </div>
              <button
                onClick={() => toggleDataBackup(USER_ID, !settings.dataBackupEnabled)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.dataBackupEnabled ? 'bg-[#1F3A8A]' : 'bg-[#E5E7EB]'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.dataBackupEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* 资产分类管理 */}
        <Card title="资产分类管理">
          <div className="space-y-3">
            {[
              { type: 'cash', name: '现金', icon: '💵' },
              { type: 'bank', name: '银行账户', icon: '🏦' },
              { type: 'securities', name: '证券', icon: '📈' },
              { type: 'crypto', name: '加密资产', icon: '₿' },
              { type: 'payment', name: '支付账户', icon: '💳' },
            ].map(item => {
              const isEnabled = settings.enabledAssetTypes.includes(item.type as any);
              return (
                <div
                  key={item.type}
                  className="flex items-center justify-between p-3 bg-[#F6F7F9] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="font-medium text-[#1F2933]">{item.name}</span>
                  </div>
                  <button
                    onClick={() => toggleAssetType(USER_ID, item.type as any, !isEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      isEnabled ? 'bg-[#1F3A8A]' : 'bg-[#E5E7EB]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        isEnabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 数据管理 */}
        <Card title="数据管理">
          <div className="space-y-3">
            <button
              onClick={() => setShowSnapshotsModal(true)}
              className="w-full p-4 bg-[#F6F7F9] rounded-lg hover:bg-[#E5E7EB] transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#1F2933]">查看快照记录</p>
                  <p className="text-sm text-[#6B7280] mt-1">
                    查看并管理已有快照（{snapshots.length} 条）
                  </p>
                </div>
                <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="w-full p-4 bg-[#F6F7F9] rounded-lg hover:bg-[#E5E7EB] transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#1F2933]">导出数据</p>
                  <p className="text-sm text-[#6B7280] mt-1">
                    导出为 JSON 格式（{snapshots.length} 条快照）
                  </p>
                </div>
                <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            <button
              onClick={handleCleanupRates}
              className="w-full p-4 bg-[#F6F7F9] rounded-lg hover:bg-[#E5E7EB] transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#1F2933]">清理过期汇率</p>
                  <p className="text-sm text-[#6B7280] mt-1">
                    删除 30 天前的汇率数据（当前 {rates.length} 条）
                  </p>
                </div>
                <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </button>
          </div>
        </Card>

        {/* 关于 */}
        <Card title="关于">
          <button
            onClick={() => setShowAboutModal(true)}
            className="w-full p-4 bg-[#F6F7F9] rounded-lg hover:bg-[#E5E7EB] transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#1F2933]">产品信息</p>
                <p className="text-sm text-[#6B7280] mt-1">版本 1.0.0</p>
              </div>
              <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </button>
        </Card>
      </div>

      {/* 导出确认模态框 */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="导出数据"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowExportModal(false)}>
              取消
            </Button>
            <Button onClick={handleExport}>
              确认导出
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[#6B7280]">
            将导出以下数据：
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-[#6B7280]">
            <li>所有资产快照（{snapshots.length} 条）</li>
            <li>用户设置</li>
            <li>汇率数据（{rates.length} 条）</li>
          </ul>
          <div className="p-3 bg-[#FEF3C7] border border-[#FCD34D] rounded-lg">
            <p className="text-sm text-[#92400E]">
              ⚠️ 导出文件包含敏感数据，请妥善保管
            </p>
          </div>
        </div>
      </Modal>

      {/* 关于模态框 */}
      <Modal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        title="关于资产追踪"
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-[#1F2933] mb-2">产品理念</h4>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              低频、低负担、看清资产。我们相信，周期性的资产记录比每日流水记账更适合大多数人。
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-[#1F2933] mb-2">隐私保护</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-[#6B7280]">
              <li>数据完全存储在本地</li>
              <li>不上传任何敏感信息</li>
              <li>可选端到端加密备份</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-[#1F2933] mb-2">版本信息</h4>
            <p className="text-sm text-[#6B7280]">
              版本: 1.0.0<br />
              更新日期: 2026-01-23
            </p>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB]">
            <p className="text-xs text-[#9CA3AF] text-center">
              用心记录，清晰洞察 📊
            </p>
          </div>
        </div>
      </Modal>

      {/* 快照记录管理模态框 */}
      <Modal
        isOpen={showSnapshotsModal}
        onClose={() => setShowSnapshotsModal(false)}
        title="快照记录"
        size="xl"
      >
        {snapshots.length > 0 ? (
          <div className="space-y-3">
            {snapshots.map(snapshot => (
              <div
                key={snapshot.id}
                className="p-3 bg-[#F6F7F9] rounded-lg hover:bg-[#E5E7EB] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1F2933] mb-1">
                      🗓️ {snapshot.date || formatDate(snapshot.timestamp, 'short')}
                    </p>
                    {snapshot.note && (
                      <p className="text-sm text-[#6B7280]">{snapshot.note}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#1F2933] tabular-nums">
                      ¥{snapshot.totalAsset.toLocaleString()}
                    </p>
                    <button
                      onClick={() => handleDeleteSnapshot(snapshot.id)}
                      className="mt-2 text-xs text-[#9CA3AF] hover:text-red-500 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#6B7280]">
            <p>暂无快照记录</p>
          </div>
        )}
      </Modal>
    </div>
  );
};
