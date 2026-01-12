
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area
} from 'recharts';
import { AttendanceRecord, Class, Student } from '../types';

interface DashboardProps {
  records: AttendanceRecord[];
  classes: Class[];
  students: Student[];
  isTeacherView?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ records, classes, students, isTeacherView }) => {
  const isSingleClass = classes.length === 1;
  const targetClass = isSingleClass ? classes[0] : null;

  const totalTithes = records.reduce((acc, r) => acc + (Number(r.titheAmount) || 0), 0);
  const totalPresence = records.reduce((acc, r) => acc + (r.presentStudentIds?.length || 0), 0);
  const totalVisitors = records.reduce((acc, r) => acc + (Number(r.visitorCount) || 0), 0);
  
  // Dados para modo Professor (Evolução Temporal)
  const timelineData = isSingleClass ? 
    records
      .filter(r => r.classId === targetClass?.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10) // Últimas 10 aulas
      .map(r => ({
        date: new Date(r.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        presence: r.presentStudentIds.length,
        tithes: r.titheAmount,
        visitors: r.visitorCount
      })) : [];

  // Dados para modo Admin (Comparativo entre Classes)
  const comparisonData = !isSingleClass ? classes.map(c => {
    const classRecords = records.filter(r => r.classId === c.id);
    const presence = classRecords.reduce((acc, r) => acc + r.presentStudentIds.length, 0);
    const tithes = classRecords.reduce((acc, r) => acc + r.titheAmount, 0);
    return { name: c.name, presence, tithes };
  }) : [];

  const stats = [
    { label: isSingleClass ? 'Dízimos da Classe' : 'Total de Dízimos', value: `R$ ${totalTithes.toFixed(2)}`, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { label: isSingleClass ? 'Média de Presença' : 'Total de Presença', value: isSingleClass ? (records.length ? (totalPresence / records.length).toFixed(1) : 0) : totalPresence, color: 'bg-blue-50 text-blue-700 border-blue-100' },
    { label: 'Visitantes', value: totalVisitors, color: 'bg-purple-50 text-purple-700 border-purple-100' },
    { label: 'Alunos Ativos', value: students.filter(s => s.active).length, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Contextual */}
      {isSingleClass && (
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="px-4 py-1 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">Sua Classe</span>
            <h2 className="text-4xl font-black text-slate-900 mt-2 tracking-tighter uppercase">{targetClass?.name}</h2>
            <p className="text-slate-500 font-medium mt-1">Categoria: <span className="text-indigo-500">{targetClass?.category}</span></p>
          </div>
          <div className="flex gap-4">
             <div className="text-center px-6 py-3 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase">Aulas Dadas</p>
                <p className="text-2xl font-black text-slate-800">{records.length}</p>
             </div>
          </div>
        </div>
      )}

      {/* Grid de Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`p-6 rounded-[32px] border ${stat.color} shadow-sm transition-all hover:scale-[1.02]`}>
            <p className="text-[10px] font-black uppercase tracking-wider opacity-60 mb-1">{stat.label}</p>
            <p className="text-2xl font-black">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico Principal */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-tighter">
            {isSingleClass ? 'Evolução de Presença (Últimas Aulas)' : 'Presença por Classe'}
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {isSingleClass ? (
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorPres" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="presence" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorPres)" />
                </AreaChart>
              ) : (
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none'}} />
                  <Bar dataKey="presence" fill="#6366f1" radius={[10, 10, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar de Alunos ou Infos */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tighter">
            {isSingleClass ? 'Meus Alunos' : 'Visão Geral'}
          </h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
            {isSingleClass ? (
              students.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-indigo-50 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">{s.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{s.birthDate ? new Date(s.birthDate).toLocaleDateString() : 'Sem data'}</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${s.active ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-slate-400 text-sm italic">Selecione uma classe para ver detalhes específicos.</p>
              </div>
            )}
            {isSingleClass && students.length === 0 && (
              <p className="text-center text-slate-400 py-10 italic">Nenhum aluno nesta classe.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
