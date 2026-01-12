
import React, { useState, useEffect } from 'react';
import { Class, Teacher, Category } from '../types';

interface ClassFormProps {
  teachers: Teacher[];
  categories: Category[];
  onSave: (classData: Omit<Class, 'id'> & { id?: string }) => void;
  onCancel: () => void;
  editClass?: Class | null;
}

export const ClassForm: React.FC<ClassFormProps> = ({ teachers, categories, onSave, onCancel, editClass }) => {
  const [name, setName] = useState(editClass?.name || '');
  const [teacherName, setTeacherName] = useState(editClass?.teacher || '');
  const [category, setCategory] = useState<string>(editClass?.category || categories[0]?.name || '');

  useEffect(() => {
    if (editClass) {
      setName(editClass.name);
      setTeacherName(editClass.teacher);
      setCategory(editClass.category);
    }
  }, [editClass]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !teacherName || !category) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }
    onSave({
      id: editClass?.id,
      name,
      teacher: teacherName,
      category
    });
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg animate-in zoom-in-95 duration-200">
      <h3 className="text-xl font-bold text-slate-800 mb-6">
        {editClass ? 'Editar Classe' : 'Nova Classe'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Classe *</label>
          <input 
            type="text" 
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Soldados de Cristo"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Professor Responsável *</label>
          <select 
            value={teacherName}
            onChange={e => setTeacherName(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Selecione um professor</option>
            {teachers.map(t => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
            {!teachers.length && <option disabled>Nenhum professor cadastrado</option>}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Categoria *</label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.name)}
                className={`p-2 text-sm rounded-lg border transition-all ${
                  category === cat.name 
                    ? 'bg-indigo-600 border-indigo-600 text-white font-bold' 
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
            {categories.length === 0 && (
              <p className="col-span-2 text-xs text-red-500 font-medium italic">
                Nenhuma categoria cadastrada no banco de dados.
              </p>
            )}
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button 
            type="button" 
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all"
          >
            {editClass ? 'Salvar' : 'Criar Classe'}
          </button>
        </div>
      </form>
    </div>
  );
};
