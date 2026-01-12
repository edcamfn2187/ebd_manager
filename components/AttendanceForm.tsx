
import React, { useState, useEffect } from 'react';
import { Class, Student, AttendanceRecord } from '../types';

interface AttendanceFormProps {
  classes: Class[];
  students: Student[];
  onSave: (record: AttendanceRecord) => void;
  editRecord?: AttendanceRecord | null;
  onCancel?: () => void;
}

export const AttendanceForm: React.FC<AttendanceFormProps> = ({ 
  classes, 
  students, 
  onSave, 
  editRecord,
  onCancel 
}) => {
  const [selectedClassId, setSelectedClassId] = useState(editRecord?.classId || classes[0]?.id || '');
  const [date, setDate] = useState(editRecord?.date || new Date().toISOString().split('T')[0]);
  const [presentIds, setPresentIds] = useState<string[]>(editRecord?.presentStudentIds || []);
  const [bibleCount, setBibleCount] = useState(editRecord?.bibleCount || 0);
  const [tithe, setTithe] = useState(editRecord?.titheAmount || 0);
  const [visitors, setVisitors] = useState(editRecord?.visitorCount || 0);
  const [theme, setTheme] = useState(editRecord?.lessonTheme || '');

  // Atualizar campos se o registro de edição mudar
  useEffect(() => {
    if (editRecord) {
      setSelectedClassId(editRecord.classId);
      setDate(editRecord.date);
      setPresentIds(editRecord.presentStudentIds);
      setBibleCount(editRecord.bibleCount);
      setTithe(editRecord.titheAmount);
      setVisitors(editRecord.visitorCount);
      setTheme(editRecord.lessonTheme);
    }
  }, [editRecord]);

  const classStudents = students.filter(s => s.classId === selectedClassId);

  const toggleStudent = (id: string) => {
    setPresentIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSave = () => {
    if (!theme) {
      alert('Por favor, insira o tema da lição.');
      return;
    }

    onSave({
      id: editRecord?.id || '', // Deixa vazio para novas chamadas (gerado pelo DB)
      classId: selectedClassId,
      date,
      presentStudentIds: presentIds,
      bibleCount,
      titheAmount: tithe,
      visitorCount: visitors,
      lessonTheme: theme
    });

    if (!editRecord) {
      // Limpar apenas se for novo registro
      setPresentIds([]);
      setBibleCount(0);
      setTithe(0);
      setVisitors(0);
      setTheme('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`${editRecord ? 'bg-amber-600' : 'bg-indigo-600'} p-6 text-white transition-colors`}>
        <h2 className="text-2xl font-bold">
          {editRecord ? 'Editar Lançamento' : 'Lançar Chamada e Relatório'}
        </h2>
        <p className="opacity-80">
          {editRecord ? `Corrigindo dados do dia ${date}` : 'Preencha os dados da lição dominical'}
        </p>
      </div>

      <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Data da Aula</label>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Selecione a Classe</label>
            <select 
              value={selectedClassId} 
              onChange={e => {
                setSelectedClassId(e.target.value);
                setPresentIds([]);
              }}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              disabled={!!editRecord} // Classe geralmente não muda na edição para evitar bagunça na lista de alunos
            >
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Tema da Lição</label>
            <input 
              type="text" 
              placeholder="Ex: A Parábola do Semeador"
              value={theme}
              onChange={e => setTheme(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Bíblias</label>
              <input type="number" value={bibleCount} onChange={e => setBibleCount(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Dízimo (R$)</label>
              <input type="number" value={tithe} onChange={e => setTithe(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Visitantes</label>
              <input type="number" value={visitors} onChange={e => setVisitors(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-4 flex justify-between items-center">
            <span>Lista de Alunos</span>
            <span className="text-xs font-normal text-slate-400">{presentIds.length} presentes</span>
          </label>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {classStudents.map(student => (
              <label 
                key={student.id} 
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                  presentIds.includes(student.id) 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                    : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="font-medium text-sm">{student.name}</span>
                <input 
                  type="checkbox" 
                  checked={presentIds.includes(student.id)} 
                  onChange={() => toggleStudent(student.id)}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition-transform active:scale-90"
                />
              </label>
            ))}
            {classStudents.length === 0 && (
              <div className="text-center py-10">
                <p className="text-sm text-slate-400 italic">Nenhum aluno cadastrado nesta classe.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 bg-slate-50 flex justify-end gap-4 border-t border-slate-200">
        <button 
          onClick={onCancel}
          className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
        >
          {editRecord ? 'Voltar' : 'Limpar'}
        </button>
        <button 
          onClick={handleSave}
          className={`px-8 py-3 ${editRecord ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold rounded-xl shadow-lg transition-all active:scale-95`}
        >
          {editRecord ? 'Atualizar Lançamento' : 'Salvar Relatório'}
        </button>
      </div>
    </div>
  );
};
