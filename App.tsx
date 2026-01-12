
import React, { useState, useEffect } from 'react';
import { AppView, Class, Student, AttendanceRecord, Teacher, Category, UserSession } from './types';
import { ICONS } from './constants';
import { Dashboard } from './components/Dashboard_admin';
import { AttendanceForm } from './components/AttendanceForm';
import { ClassForm } from './components/ClassForm';
import { TeacherForm } from './components/TeacherForm';
import { StudentForm } from './components/StudentForm';
import { CategoryForm } from './components/CategoryForm';
import { ReportHistory } from './components/ReportHistory';
import { LoginForm } from './components/LoginForm';
import { UserManagement } from './components/UserManagement';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // States for Filter and Search
  const [studentFilter, setStudentFilter] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  // States for Editing
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [isClassFormOpen, setIsClassFormOpen] = useState(false);
  const [isTeacherFormOpen, setIsTeacherFormOpen] = useState(false);
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      await checkUserSession();
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUserSession();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserSession = async () => {
    setLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (authSession) {
        const email = authSession.user.email!;
        
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('*')
          .eq('email', email)
          .single();

        if (teacherData) {
          const { data: classData } = await supabase
            .from('classes')
            .select('id')
            .eq('teacher', teacherData.name)
            .single();

          setSession({
            email,
            role: 'TEACHER',
            name: teacherData.name,
            teacherId: teacherData.id,
            assignedClassId: classData?.id
          });
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', authSession.user.id)
            .single();

          setSession({
            email,
            role: (profile?.role as any) || 'ADMIN',
            name: profile?.full_name || authSession.user.user_metadata?.full_name || 'Administrador'
          });
        }
        await fetchData();
      } else {
        setSession(null);
      }
    } catch (err) {
      console.error("Erro na detecção de sessão:", err);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [
        { data: clData },
        { data: stData },
        { data: tcData },
        { data: reData },
        { data: caData }
      ] = await Promise.all([
        supabase.from('classes').select('*'),
        supabase.from('students').select('*'),
        supabase.from('teachers').select('*'),
        supabase.from('attendance_records').select('*'),
        supabase.from('categories').select('*')
      ]);

      if (clData) setClasses(clData);
      if (stData) setStudents(stData.map(s => ({
        id: s.id,
        name: s.name,
        classId: s.class_id || s.classId,
        birthDate: s.birth_date || s.birthDate,
        active: s.active
      })));
      if (tcData) setTeachers(tcData);
      if (reData) setRecords(reData.map(r => ({
        id: r.id,
        date: r.date,
        classId: r.class_id || r.classId,
        presentStudentIds: r.present_student_ids || r.presentStudentIds,
        bibleCount: r.bible_count || r.bibleCount,
        titheAmount: r.tithe_amount || r.titheAmount,
        visitorCount: r.visitor_count || r.visitorCount,
        lessonTheme: r.lesson_theme || r.lessonTheme
      })));
      if (caData) setCategories(caData);
    } catch (err) {
      console.error("Erro ao carregar dados do Supabase:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentView(AppView.DASHBOARD);
  };

  // Melhorado para nunca retornar [object Object]
  const formatError = (error: any) => {
    if (!error) return "Erro desconhecido";
    if (typeof error === 'string') return error;
    
    // Tratamento de Erro do Supabase
    if (error.message) {
      let msg = error.message;
      if (error.details) msg += ` | Detalhes: ${error.details}`;
      if (error.code) msg += ` [Código: ${error.code}]`;
      return msg;
    }

    // Tratamento de Objeto Error Nativo
    if (error instanceof Error) return error.message;

    // Fallback seguro
    try {
      return JSON.stringify(error, null, 2);
    } catch (e) {
      return "Erro complexo no servidor (consulte o console do navegador F12)";
    }
  };

  const handleSaveClass = async (classData: Omit<Class, 'id'> & { id?: string }) => {
    try {
      const { error } = await supabase.from('classes').upsert(classData);
      if (error) throw error;
      await fetchData();
      setIsClassFormOpen(false);
      setEditingClass(null);
    } catch (error: any) { 
      console.error("Erro Classe:", error);
      alert(`Erro ao salvar classe: ${formatError(error)}`); 
    }
  };

  const handleSaveTeacher = async (teacherData: Omit<Teacher, 'id'> & { id?: string }) => {
    try {
      const { error } = await supabase.from('teachers').upsert(teacherData);
      if (error) throw error;
      await fetchData();
      setIsTeacherFormOpen(false);
      setEditingTeacher(null);
    } catch (error: any) { 
      console.error("Erro Professor:", error);
      alert(`Erro ao salvar professor: ${formatError(error)}`); 
    }
  };

  const handleSaveStudent = async (studentData: Omit<Student, 'id'> & { id?: string }) => {
    try {
      const payload: any = { 
        name: studentData.name,
        class_id: studentData.classId,
        birth_date: studentData.birthDate,
        active: studentData.active
      };
      
      // Apenas envia ID se ele for um UUID válido (evita quebrar o banco com IDs temporários do frontend)
      if (studentData.id && studentData.id.length >= 30) {
        payload.id = studentData.id;
      }

      const { error } = await supabase.from('students').upsert(payload);
      if (error) throw error;
      
      await fetchData();
      setIsStudentFormOpen(false);
      setEditingStudent(null);
      alert('Aluno salvo com sucesso!');
    } catch (error: any) { 
      console.error("Erro Detalhado Aluno:", error);
      alert(`Erro ao salvar aluno: ${formatError(error)}`); 
    }
  };

  const handleSaveCategory = async (catData: Omit<Category, 'id'> & { id?: string }) => {
    try {
      const { error } = await supabase.from('categories').upsert(catData);
      if (error) throw error;
      await fetchData();
      setIsCategoryFormOpen(false);
      setEditingCategory(null);
    } catch (error: any) { 
      console.error("Erro Categoria:", error);
      alert(`Erro ao salvar categoria: ${formatError(error)}`); 
    }
  };

  const handleSaveAttendance = async (record: AttendanceRecord) => {
    try {
      const payload: any = {
        date: record.date,
        class_id: record.classId,
        present_student_ids: record.presentStudentIds,
        bible_count: record.bibleCount,
        tithe_amount: record.titheAmount,
        visitor_count: record.visitorCount,
        lesson_theme: record.lessonTheme
      };
      
      // IDs de UUID válidos do Supabase têm 36 caracteres.
      // IDs temporários aleatórios gerados no frontend geralmente são curtos.
      if (record.id && record.id.length >= 30) {
        payload.id = record.id;
      }

      const { error } = await supabase.from('attendance_records').upsert(payload);
      if (error) throw error;
      await fetchData();
      setEditingRecord(null);
      setCurrentView(AppView.REPORTS);
      alert('Relatório de chamada salvo!');
    } catch (error: any) { 
      console.error("Erro Chamada:", error);
      alert(`Erro ao salvar chamada: ${formatError(error)}`); 
    }
  };

  const deleteStudent = async (id: string) => {
    if (confirm('Deseja realmente remover este aluno?')) {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (!error) await fetchData();
      else alert('Erro ao excluir: ' + formatError(error));
    }
  };

  const deleteTeacher = async (id: string) => {
    const teacherName = teachers.find(t => t.id === id)?.name;
    if (classes.some(c => c.teacher === teacherName)) {
      alert(`Não é possível excluir este professor pois ele está vinculado às classes.`);
      return;
    }
    if (confirm('Tem certeza que deseja remover este professor?')) {
      const { error } = await supabase.from('teachers').delete().eq('id', id);
      if (!error) await fetchData();
      else alert('Erro ao excluir: ' + formatError(error));
    }
  };

  const deleteClass = async (id: string) => {
    if (confirm('Atenção: Excluir uma classe também afetará o histórico de chamadas. Continuar?')) {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (!error) await fetchData();
      else alert('Erro ao excluir: ' + formatError(error));
    }
  };

  const deleteCategory = async (id: string) => {
    const catName = categories.find(c => c.id === id)?.name;
    if (classes.some(c => c.category === catName)) {
      alert(`Existem classes usando esta categoria. Altere-as primeiro.`);
      return;
    }
    if (confirm('Tem certeza que deseja remover esta categoria?')) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (!error) await fetchData();
      else alert('Erro ao excluir: ' + formatError(error));
    }
  };

  const deleteRecord = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
      const { error } = await supabase.from('attendance_records').delete().eq('id', id);
      if (!error) await fetchData();
      else alert('Erro ao excluir: ' + formatError(error));
    }
  };

  const startEditing = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setCurrentView(AppView.ATTENDANCE);
  };

  const navigateTo = (view: AppView) => {
    if (view !== AppView.ATTENDANCE) setEditingRecord(null);
    if (view !== AppView.CLASSES) { setIsClassFormOpen(false); setEditingClass(null); }
    if (view !== AppView.STUDENTS) { setIsStudentFormOpen(false); setEditingStudent(null); }
    if (view !== AppView.CATEGORIES) { setIsCategoryFormOpen(false); setEditingCategory(null); }
    if (view !== AppView.TEACHERS) { setIsTeacherFormOpen(false); setEditingTeacher(null); }
    
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sincronizando com o Templo...</p>
      </div>
    );
  }

  if (!session) return <LoginForm onLoginSuccess={() => checkUserSession()} />;

  const filteredClasses = session.role === 'ADMIN' ? classes : classes.filter(c => c.id === session.assignedClassId);
  const filteredStudents = session.role === 'ADMIN' ? students : students.filter(s => s.classId === session.assignedClassId);
  const filteredRecords = session.role === 'ADMIN' ? records : records.filter(r => r.classId === session.assignedClassId);

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard records={filteredRecords} classes={filteredClasses} students={filteredStudents} />;
      
      case AppView.ATTENDANCE:
        return <AttendanceForm 
          classes={filteredClasses} 
          students={filteredStudents} 
          onSave={handleSaveAttendance}
          editRecord={editingRecord}
          onCancel={() => {
            setEditingRecord(null);
            setCurrentView(editingRecord ? AppView.REPORTS : AppView.DASHBOARD);
          }}
        />;

      case AppView.CLASSES:
        return (
          <div className="space-y-6">
            {isClassFormOpen ? (
              <div className="max-w-2xl mx-auto">
                <ClassForm teachers={teachers} categories={categories} onSave={handleSaveClass} onCancel={() => { setIsClassFormOpen(false); setEditingClass(null); }} editClass={editingClass} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClasses.map(c => {
                  const classStudents = students.filter(s => s.classId === c.id);
                  const classRecords = records.filter(r => r.classId === c.id);
                  const totalTithe = classRecords.reduce((acc, r) => acc + (Number(r.titheAmount) || 0), 0);
                  const catColor = categories.find(cat => cat.name === c.category)?.color || '#64748b';
                  
                  return (
                    <div key={c.id} className="group bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: catColor }}>
                            {c.category}
                          </span>
                          {session.role === 'ADMIN' && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingClass(c); setIsClassFormOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                              </button>
                              <button onClick={() => deleteClass(c.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                              </button>
                            </div>
                          )}
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-1">{c.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 text-sm mb-6">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                          Prof. {c.teacher}
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-slate-50 p-3 rounded-2xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Alunos</p>
                            <p className="text-lg font-black text-slate-700">{classStudents.length}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-2xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Dízimo Total</p>
                            <p className="text-lg font-black text-emerald-600">R$ {totalTithe.toFixed(0)}</p>
                          </div>
                        </div>
                        <button onClick={() => { setStudentFilter(c.id); setCurrentView(AppView.STUDENTS); }} className="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-2xl hover:bg-indigo-600 transition-all active:scale-[0.98]">
                          Gerenciar Alunos
                        </button>
                      </div>
                    </div>
                  );
                })}
                {session.role === 'ADMIN' && (
                  <button onClick={() => setIsClassFormOpen(true)} className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all min-h-[280px]">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-2xl font-bold mb-4 border border-slate-100">+</div>
                    <span className="font-black text-lg">Nova Classe</span>
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case AppView.CATEGORIES:
        if (session.role !== 'ADMIN') return null;
        const filteredCats = categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
        return (
          <div className="space-y-6">
            {isCategoryFormOpen ? (
              <div className="max-w-2xl mx-auto">
                <CategoryForm onSave={handleSaveCategory} onCancel={() => { setIsCategoryFormOpen(false); setEditingCategory(null); }} editCategory={editingCategory} />
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                   <div className="relative flex-1 w-full">
                     <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                     <input type="text" placeholder="Pesquisar categoria..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={categorySearch} onChange={e => setCategorySearch(e.target.value)} />
                   </div>
                   <button onClick={() => setIsCategoryFormOpen(true)} className="w-full md:w-auto bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95">
                     + Nova Categoria
                   </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-500">
                  {filteredCats.map(cat => (
                    <div key={cat.id} className="group bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl transition-all relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: cat.color }}></div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-sm" style={{ backgroundColor: cat.color }}>
                          {cat.name[0].toUpperCase()}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingCategory(cat); setIsCategoryFormOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          <button onClick={() => deleteCategory(cat.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      </div>
                      <h4 className="text-lg font-black text-slate-800">{cat.name}</h4>
                      <p className="text-xs font-bold text-slate-400 mt-1 uppercase">
                        {classes.filter(c => c.category === cat.name).length} Classes
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      case AppView.STUDENTS:
        let displayStudents = filteredStudents;
        if (studentFilter) displayStudents = displayStudents.filter(s => s.classId === studentFilter);
        if (studentSearch) displayStudents = displayStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()));
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {isStudentFormOpen ? (
              <div className="max-w-2xl mx-auto">
                <StudentForm classes={filteredClasses} onSave={handleSaveStudent} onCancel={() => { setIsStudentFormOpen(false); setEditingStudent(null); }} editStudent={editingStudent} defaultClassId={studentFilter} />
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                   <div className="relative flex-1 w-full">
                     <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                     <input type="text" placeholder="Pesquisar aluno..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                   </div>
                   <div className="flex gap-2 w-full md:w-auto">
                     {session.role === 'ADMIN' && (
                       <select value={studentFilter || ''} onChange={e => setStudentFilter(e.target.value || null)} className="flex-1 md:flex-none p-3 bg-slate-50 border rounded-2xl text-sm font-bold text-slate-600">
                         <option value="">Todas as Classes</option>
                         {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                     )}
                     <button onClick={() => setIsStudentFormOpen(true)} className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-black shadow-lg hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap"> + Novo Aluno </button>
                   </div>
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                          <th className="px-8 py-5">Nome</th>
                          <th className="px-8 py-5">Classe</th>
                          <th className="px-8 py-5">Status</th>
                          <th className="px-8 py-5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayStudents.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-5 font-bold text-slate-700">{s.name}</td>
                            <td className="px-8 py-5">
                              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg uppercase">
                                {classes.find(c => c.id === s.classId)?.name || 'Sem Classe'}
                              </span>
                            </td>
                            <td className="px-8 py-5">
                                <span className={`flex items-center gap-1.5 text-[10px] font-black ${s.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  <span className={`w-2 h-2 rounded-full ${s.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                  {s.active ? 'ATIVO' : 'INATIVO'}
                                </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditingStudent(s); setIsStudentFormOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                  </button>
                                  <button onClick={() => deleteStudent(s.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                  </button>
                                </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
              </>
            )}
          </div>
        );

      case AppView.TEACHERS:
        if (session.role !== 'ADMIN') return null;
        const filteredTeach = teachers.filter(t => t.name.toLowerCase().includes(teacherSearch.toLowerCase()));
        return (
          <div className="space-y-6">
            {isTeacherFormOpen ? (
              <div className="max-w-2xl mx-auto">
                <TeacherForm onSave={handleSaveTeacher} onCancel={() => { setIsTeacherFormOpen(false); setEditingTeacher(null); }} editTeacher={editingTeacher} />
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                   <div className="relative flex-1 w-full">
                     <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                     <input type="text" placeholder="Pesquisar professor..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border rounded-2xl outline-none" value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} />
                   </div>
                   <button onClick={() => setIsTeacherFormOpen(true)} className="w-full md:w-auto bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-black shadow-lg hover:bg-indigo-700 active:scale-95 whitespace-nowrap"> + Novo Professor </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                  {filteredTeach.map(t => (
                    <div key={t.id} className="group bg-white rounded-[32px] border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden">
                        <div className="p-8">
                          <div className="flex justify-between items-start mb-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${t.active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                              {t.name[0]}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${t.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}> {t.active ? 'ATIVO' : 'INATIVO'} </span>
                          </div>
                          <h3 className="text-xl font-black text-slate-900">{t.name}</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase mt-1 mb-6">{t.email || 'SEM E-MAIL'}</p>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingTeacher(t); setIsTeacherFormOpen(true); }} className="flex-1 py-3 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 text-xs font-black rounded-2xl transition-all"> EDITAR </button>
                            <button onClick={() => deleteTeacher(t.id)} className="px-4 py-3 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-2xl transition-all">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      case AppView.REPORTS:
        return <ReportHistory records={filteredRecords} classes={classes} onEdit={startEditing} onDelete={deleteRecord} />;

      case AppView.USERS:
        if (session.role !== 'ADMIN') return null;
        return <UserManagement />;

      default:
        return <Dashboard records={filteredRecords} classes={filteredClasses} students={filteredStudents} />;
    }
  };

  const menuItems = [
    { id: AppView.DASHBOARD, label: 'Início', icon: ICONS.Dashboard, roles: ['ADMIN', 'TEACHER'] },
    { id: AppView.ATTENDANCE, label: 'Fazer Chamada', icon: ICONS.Attendance, roles: ['ADMIN', 'TEACHER'] },
    { id: AppView.REPORTS, label: 'Histórico', icon: ICONS.Classes, roles: ['ADMIN', 'TEACHER'] },
    { id: AppView.STUDENTS, label: 'Alunos', icon: ICONS.Students, roles: ['ADMIN', 'TEACHER'] },
    { id: AppView.CLASSES, label: 'Classes', icon: ICONS.Bible, roles: ['ADMIN', 'TEACHER'] },
    { id: AppView.TEACHERS, label: 'Professores', icon: ICONS.Teachers, roles: ['ADMIN'] },
    { id: AppView.CATEGORIES, label: 'Categorias', icon: ICONS.Dashboard, roles: ['ADMIN'] },
    { id: AppView.USERS, label: 'Acessos', icon: ICONS.AI, roles: ['ADMIN'] },
  ].filter(item => item.roles.includes(session.role));

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-['Inter']">
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-slate-900 text-slate-400 flex flex-col z-50 transition-all ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-8 flex items-center gap-4 text-white">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30"> <ICONS.Bible /> </div>
          <div>
            <span className="text-xl font-black tracking-tighter block leading-none">EBD PRO</span>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{session.role}</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => navigateTo(item.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${currentView === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
              <item.icon /> {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6">
          <div className="bg-slate-800/50 rounded-2xl p-4 mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Usuário Logado</p>
            <p className="text-xs font-bold text-white truncate">{session.name || session.email}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm hover:bg-red-500/10 hover:text-red-400 transition-all text-slate-500"> Sair </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto w-full">
        <header className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">{currentView.replace('_', ' ')}</h1>
            <p className="text-slate-500 mt-3 font-medium">Controle de Escola Bíblica Dominical</p>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-4 bg-white rounded-2xl border border-slate-200 text-slate-600 font-black text-xs"> MENU </button>
        </header>

        <div className="pb-20">
          {renderContent()}
        </div>
      </main>

      {isMobileMenuOpen && (
        <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"></div>
      )}
    </div>
  );
};

export default App;
