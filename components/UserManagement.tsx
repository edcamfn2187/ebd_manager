
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Profile, UserRole } from '../types';

export const UserManagement: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Create User States
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('TEACHER');
  
  // Edit User States
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('TEACHER');
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        if (error.code === '42P01') {
           throw new Error("A tabela 'profiles' não foi encontrada no Supabase.");
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
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: newEmail,
            full_name: newName,
            role: newRole,
            created_at: new Date().toISOString()
          });

        if (profileError && profileError.code !== '23505') {
          console.warn('Erro ao inserir perfil manual:', profileError);
        }
      }

      alert('Usuário convidado com sucesso!');
      setIsAddingUser(false);
      resetCreateForm();
      await fetchProfiles();
    } catch (err: any) {
      alert(`Erro ao cadastrar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editName,
          role: editRole
        })
        .eq('id', editingProfile.id);

      if (error) throw error;

      alert('Acesso atualizado com sucesso!');
      setEditingProfile(null);
      await fetchProfiles();
    } catch (err: any) {
      alert(`Erro ao atualizar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('TEACHER');
  };

  const startEditing = (profile: Profile) => {
    setEditingProfile(profile);
    setEditName(profile.full_name || '');
    setEditRole(profile.role);
  };

  const deleteAccess = async (profile: Profile) => {
    if (!confirm(`Deseja remover o registro de acesso de ${profile.full_name}?`)) return;
    
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
      <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sincronizando Acessos...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800">Controle de Acessos</h2>
            <p className="text-sm text-slate-500">Gerencie quem pode acessar o painel administrativo.</p>
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
                      profile.role === 'ADMIN' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {profile.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-xs text-slate-400">
                    {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => startEditing(profile)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Editar Acesso"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      </button>
                      <button 
                        onClick={() => deleteAccess(profile)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Remover Acesso"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr><td colSpan={4} className="p-20 text-center text-slate-400 italic">Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CRIAR USUÁRIO */}
      {isAddingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-indigo-600 p-8 text-white">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Convidar Usuário</h3>
              <p className="text-indigo-100 text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Crie um novo login de acesso</p>
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
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white p-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">{saving ? 'PROCESSANDO...' : 'CRIAR LOGIN'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PERMISSÃO */}
      {editingProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-amber-500 p-8 text-white">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Editar Permissões</h3>
              <p className="text-amber-100 text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Atualizando acesso de {editingProfile.email}</p>
            </div>
            <form onSubmit={handleUpdateUser} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input type="text" required className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-amber-500" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo / Nível de Acesso</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditRole('TEACHER')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${editRole === 'TEACHER' ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>PROFESSOR</button>
                  <button type="button" onClick={() => setEditRole('ADMIN')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${editRole === 'ADMIN' ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>ADMIN</button>
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button type="button" onClick={() => setEditingProfile(null)} className="flex-1 font-bold text-slate-400 text-sm">CANCELAR</button>
                <button type="submit" disabled={saving} className="flex-1 bg-amber-500 text-white p-4 rounded-2xl font-black shadow-xl hover:bg-amber-600 transition-all">{saving ? 'SALVANDO...' : 'ATUALIZAR ACESSO'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
