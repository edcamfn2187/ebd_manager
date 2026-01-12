
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { ICONS } from '../constants';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: name,
              phone: phone
            }
          }
        });
        if (error) throw error;
        alert('Cadastro realizado com sucesso! Você já pode entrar.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Erro na autenticação. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl overflow-hidden">
        <div className="bg-indigo-600 p-10 text-white text-center relative overflow-hidden">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4">
             <ICONS.Bible />
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">EBD MANAGER</h1>
          <p className="text-indigo-100 text-sm mt-2 opacity-80 font-bold">
            {isSignUp ? 'Criar Nova Conta' : 'Acesso ao Painel'}
          </p>
        </div>

        <div className="p-10">
          <form onSubmit={handleAuth} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 text-center">
                {error}
              </div>
            )}
            
            {isSignUp && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="exemplo@ebd.com"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? 'CARREGANDO...' : isSignUp ? 'CADASTRAR' : 'ENTRAR'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
            >
              {isSignUp ? 'Já tem conta? Login' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
