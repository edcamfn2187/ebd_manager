
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Profile, UserRole } from '../types';

export const UserManagement: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('TEACHER');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // Buscamos os perfis da tabela que espelha o Auth
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        if (error.code === '42P01') {
           throw new Error("A tabela 'profiles' não foi encontrada. No Supabase, crie uma tabela chamada 'profiles' com as colunas: id (uuid), email (text), full_name (text), role (text).");
        }
        throw error;
      }
      setProfiles(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar perfis:', err);
      setErrorMessage(err.message || "Erro ao carregar lista de acessos.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    try {
      // 1. Criar no Authentication
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: {
            full_name: newName,
            role: newRole
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Tentar inserir manualmente na tabela profiles para garantir que apareça na lista
        // (Isso ajuda caso não haja uma trigger SQL configurada no Supabase)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: newEmail,
            full_name: newName,
            role: newRole,
            created_at: new Date().toISOString()
          });

        if (profileError && profileError.code !== '23505') { // Ignora se já existir (duplicata por trigger)
          console.warn('Erro ao inserir perfil manual, mas usuário foi criado no Auth:', profileError);
        }
      }

      alert('Usuário criado com sucesso no Authentication! \n\nNota: Se a confirmação por e-mail estiver ativa nas configurações do seu Supabase, o usuário precisará confirmar o e-mail antes de realizar o primeiro login.');
      
      setIsAddingUser(false);
      resetForm();
      await fetchProfiles(); // Recarregar a lista
    } catch (err: any) {
      alert(`Erro ao cadastrar: ${err.message || "Verifique os dados."}`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('TEACHER');
  };

  const deleteAccess = async (profile: Profile) => {
    if (!confirm(`Deseja remover o acesso de ${profile.full_name}? Isso removerá apenas o registro da tabela de visualização. Para remover o login definitivamente, use a aba Authentication do Supabase.`)) return;
    
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
      if (error) throw error;
      setProfiles(profiles.filter(p => p.id !== profile.id));
    } catch (err: any) {
      alert('Erro ao remover registro: ' + err.message);
    }
  };

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Consultando Banco de Dados...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {errorMessage && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl text-amber-700">
          <p className="font-black text-xs uppercase tracking-widest mb-1">Configuração Necessária</p>
          <p className="font-medium text-sm">{errorMessage}</p>
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800">Usuários com Acesso</h2>
            <p className="text-sm text-slate-500">Lista de pessoas autorizadas a entrar no sistema.</p>
          </div>
          <button 
            onClick={() => setIsAddingUser(true)} 
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg hover:bg-indigo-700 transition-all"
          >
            + CONVIDAR NOVO
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                <th className="px-8 py-5">Nome / E-mail</th>
                <th className="px-8 py-5">Cargo</th>
                <th className="px-8 py-5">Cadastro em</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map(profile => (
                <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div>
                      <p className="font-bold text-slate-700">{profile.full_name || 'Sem Nome'}</p>
                      <p className="text-xs text-slate-400">{profile.email}</p>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                      profile.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {profile.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-xs text-slate-400">
                    {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => deleteAccess(profile)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && !errorMessage && (
                <tr>
                  <td colSpan={4} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-slate-400 italic">Nenhum usuário encontrado na tabela 'profiles'.</p>
                      <p className="text-[10px] text-slate-300 uppercase font-bold max-w-xs">
                        Verifique se você criou a tabela 'profiles' no seu banco de dados Supabase para que os usuários do Authentication apareçam aqui.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-indigo-600 p-8 text-white">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Novo Cadastro</h3>
              <p className="text-indigo-100 text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Vincular novo login ao sistema</p>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input type="text" required placeholder="Ex: José da Silva" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                <input type="email" required placeholder="email@exemplo.com" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Inicial</label>
                <input type="password" required placeholder="No mínimo 6 caracteres" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setNewRole('TEACHER')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${newRole === 'TEACHER' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>PROFESSOR</button>
                <button type="button" onClick={() => setNewRole('ADMIN')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${newRole === 'ADMIN' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>ADMIN</button>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAddingUser(false)} className="flex-1 font-bold text-slate-400 text-sm">CANCELAR</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white p-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">{saving ? 'CADASTRANDO...' : 'CRIAR LOGIN'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
