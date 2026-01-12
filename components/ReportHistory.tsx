
import React, { useState } from 'react';
import { AttendanceRecord, Class } from '../types';

interface ReportHistoryProps {
  records: AttendanceRecord[];
  classes: Class[];
  onEdit: (record: AttendanceRecord) => void;
  onDelete: (id: string) => void;
}

export const ReportHistory: React.FC<ReportHistoryProps> = ({ records, classes, onEdit, onDelete }) => {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // Função auxiliar para determinar a semana do mês
  const getWeekOfMonth = (date: Date) => {
    const day = date.getDate();
    return Math.ceil(day / 7);
  };

  // Agrupar registros por Ano -> Trimestre -> Mês -> Semana
  const groupedData = records.reduce((acc: any, record) => {
    const date = new Date(record.date);
    const year = date.getFullYear();
    const month = date.getMonth();
    const quarter = Math.floor(month / 3) + 1;
    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
    const week = getWeekOfMonth(date);
    const weekName = `${week}ª Semana`;

    if (!acc[year]) acc[year] = {};
    if (!acc[year][quarter]) acc[year][quarter] = {};
    if (!acc[year][quarter][monthName]) acc[year][quarter][monthName] = {};
    if (!acc[year][quarter][monthName][weekName]) acc[year][quarter][monthName][weekName] = [];

    acc[year][quarter][monthName][weekName].push(record);
    return acc;
  }, {});

  const years = Object.keys(groupedData).sort((a, b) => Number(b) - Number(a));

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-20 text-center border border-slate-200">
        <div className="text-slate-300 mb-4 italic font-medium">Nenhum lançamento histórico encontrado.</div>
        <p className="text-slate-400 text-sm">Os registros aparecerão aqui assim que as chamadas forem realizadas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {years.map(year => (
        <div key={year} className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-black text-slate-900 opacity-20">{year}</h2>
            <div className="h-px flex-1 bg-slate-200"></div>
          </div>

          {Object.keys(groupedData[year]).sort((a, b) => Number(b) - Number(a)).map(quarter => {
            const quarterId = `${year}-q${quarter}`;
            const isQuarterExpanded = expandedSections.includes(quarterId);
            const monthsInQuarter = groupedData[year][quarter];
            
            // Cálculos do Trimestre
            let qTithe = 0;
            Object.values(monthsInQuarter).forEach((months: any) => {
              Object.values(months).forEach((weeks: any) => {
                weeks.forEach((r: any) => {
                  qTithe += Number(r.titheAmount) || 0;
                });
              });
            });

            return (
              <div key={quarterId} className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <button 
                  onClick={() => toggleSection(quarterId)}
                  className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black">
                      {quarter}º
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Trimestre</p>
                      <h3 className="text-xl font-black text-slate-800">Período de Atividades</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Total Dízimos</p>
                      <p className="font-bold text-emerald-600">R$ {qTithe.toFixed(2)}</p>
                    </div>
                    <svg className={`w-6 h-6 text-slate-400 transition-transform ${isQuarterExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isQuarterExpanded && (
                  <div className="p-6 pt-0 space-y-4">
                    {Object.keys(monthsInQuarter).map(monthName => {
                      const monthId = `${quarterId}-${monthName}`;
                      const isMonthExpanded = expandedSections.includes(monthId);
                      const weeksInMonth = monthsInQuarter[monthName];

                      return (
                        <div key={monthId} className="border border-slate-100 rounded-2xl overflow-hidden">
                          <button 
                            onClick={() => toggleSection(monthId)}
                            className="w-full flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors border-b border-slate-100"
                          >
                            <span className="font-black text-slate-700 capitalize text-sm">{monthName}</span>
                            <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                              <span>{Object.values(weeksInMonth).flat().length} Aulas</span>
                              <svg className={`w-4 h-4 transition-transform ${isMonthExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>

                          {isMonthExpanded && (
                            <div className="p-4 bg-white space-y-4">
                              {Object.keys(weeksInMonth).sort().map(weekName => {
                                const weekId = `${monthId}-${weekName}`;
                                const isWeekExpanded = expandedSections.includes(weekId);
                                const weekRecords = weeksInMonth[weekName].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                
                                let weekTithe = weekRecords.reduce((acc: number, r: any) => acc + (Number(r.titheAmount) || 0), 0);
                                let weekPresence = weekRecords.reduce((acc: number, r: any) => acc + (r.presentStudentIds?.length || 0), 0);

                                return (
                                  <div key={weekId} className="bg-slate-50/30 rounded-xl border border-slate-100 overflow-hidden">
                                    <button 
                                      onClick={() => toggleSection(weekId)}
                                      className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-all"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">
                                          {weekName[0]}
                                        </div>
                                        <span className="font-bold text-slate-600 text-xs">{weekName}</span>
                                      </div>
                                      <div className="flex items-center gap-6">
                                         <div className="flex items-center gap-4 text-[10px] font-bold">
                                           <span className="text-blue-500">{weekPresence} Presentes</span>
                                           <span className="text-emerald-500">R$ {weekTithe.toFixed(2)}</span>
                                         </div>
                                         <svg className={`w-3 h-3 text-slate-300 transition-transform ${isWeekExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </div>
                                    </button>

                                    {isWeekExpanded && (
                                      <div className="overflow-x-auto bg-white border-t border-slate-100">
                                        <table className="w-full text-left text-xs">
                                          <thead>
                                            <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                                              <th className="px-6 py-3">Dia</th>
                                              <th className="px-6 py-3">Classe</th>
                                              <th className="px-6 py-3">Tema</th>
                                              <th className="px-6 py-3">Presença</th>
                                              <th className="px-6 py-3">Finanças</th>
                                              <th className="px-6 py-3 text-center">Ações</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-50">
                                            {weekRecords.map((r: AttendanceRecord) => (
                                              <tr key={r.id} className="hover:bg-slate-50/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                  <div className="font-bold text-slate-900">{new Date(r.date).toLocaleDateString('pt-BR')}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                  <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded uppercase tracking-tighter">
                                                    {classes.find(c => c.id === r.classId)?.name || 'Removida'}
                                                  </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                  <div className="text-slate-600 font-medium truncate max-w-[120px]">{r.lessonTheme}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="text-blue-600 font-black">{r.presentStudentIds.length}</span>
                                                    {r.visitorCount > 0 && <span className="text-purple-400 font-bold text-[10px]">+{r.visitorCount}V</span>}
                                                  </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-emerald-600">
                                                  R$ {r.titheAmount.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4">
                                                  <div className="flex justify-center gap-1">
                                                    <button onClick={() => onEdit(r)} className="p-2 text-slate-400 hover:text-amber-500 transition-colors">
                                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                    </button>
                                                    <button onClick={() => onDelete(r.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    </button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
