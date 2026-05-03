import React, { useState } from 'react';
import { Button, Input, Card } from '../base';
import { useAuthStore } from '../../stores';

export const AuthPage: React.FC = () => {
  const { signIn, signUp, isLoading, error, isConfigured } = useAuthStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === 'signin') {
      await signIn(email, password);
    } else {
      await signUp(email, password);
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center px-6">
        <Card className="max-w-lg w-full">
          <h1 className="text-2xl font-semibold text-[#111827] mb-3">需要配置 Supabase</h1>
          <p className="text-sm text-[#6B7280]">
            请在部署环境或本地 `.env` 中设置 `VITE_SUPABASE_URL` 和
            `VITE_SUPABASE_ANON_KEY` 后重新启动应用。
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center px-6">
      <Card className="max-w-md w-full">
        <div className="mb-6">
          <p className="text-sm text-[#6B7280] mb-1">Asset Tracker</p>
          <h1 className="text-2xl font-semibold text-[#111827]">
            {mode === 'signin' ? '登录资产工作台' : '创建云端账号'}
          </h1>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="邮箱"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            label="密码"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && (
            <div className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-sm text-[#991B1B]">
              {error}
            </div>
          )}

          <Button className="w-full justify-center" type="submit" isLoading={isLoading}>
            {mode === 'signin' ? '登录' : '注册'}
          </Button>
        </form>

        <button
          type="button"
          className="mt-4 text-sm text-[#1F3A8A] hover:text-[#172B66]"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? '没有账号？创建一个' : '已有账号？返回登录'}
        </button>
      </Card>
    </div>
  );
};
