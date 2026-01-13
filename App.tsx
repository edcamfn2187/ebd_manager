
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
        
        // 1. SEMPRE buscar primeiro no Profiles (definido no menu Acessos)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', authSession.user.id)
          .single();

        if (profileError || !profile) {
          // Se não houver perfil, assumimos Admin para o primeiro usuário ou erro de config
          console.warn("Perfil não encontrado para este usuário no menu Acessos.");
          setSession({
            email,
            role: 'ADMIN',
            name: authSession.user.user_metadata?.full_name || 'Usuário Sem Perfil'
          });
        } else {
          const userRole = profile.role as 'ADMIN' | 'TEACHER';
          let assignedClassId = undefined;
          let teacherId = undefined;

          // 2. Se for Professor, buscar qual classe ele gerencia (pelo e-mail)
          if (userRole === 'TEACHER') {
            const { data: teacherData } = await supabase
              .from('teachers')
              .select('id, name')
              .eq('email', email)
              .single();

            if (teacherData) {
              teacherId = teacherData.id;
              const { data: classData } = await supabase
                .from('classes')
                .select('id')
                .eq('teacher', teacherData.name)
                .single();
              
              if (classData) assignedClassId = classData.id;
            }
          }

          setSession({
            email,
            role: userRole,
            name: profile.full_name || 'Usuário',
            teacherId,
            assignedClassId
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

  const formatError = (error: any) => {
    if (!error) return "Erro desconhecido";
    if (typeof error === 'string') return error;
    if (error.message) return `${error.message}${error.details ? ` | ${error.details}` : ''}`;
    return JSON.stringify(error, null, 2);
  };

  const handleSaveClass = async (classData: Omit<Class, 'id'> & { id?: string }) => {
    try {
      const { error } = await supabase.from('classes').upsert(classData);
      if (error) throw error;
      await fetchData();
      setIsClassFormOpen(false);
      setEditingClass(null);
    } catch (error: any) { 
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
      if (studentData.id && studentData.id.length >= 30) payload.id = studentData.id;
      const { error } = await supabase.from('students').upsert(payload);
      if (error) throw error;
      await fetchData();
      setIsStudentFormOpen(false);
      setEditingStudent(null);
    } catch (error: any) { 
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
      if (record.id && record.id.length >= 30) payload.id = record.id;
      const { error } = await supabase.from('attendance_records').upsert(payload);
      if (error) throw error;
      await fetchData();
      setEditingRecord(null);
      setCurrentView(AppView.REPORTS);
    } catch (error: any) { 
      alert(`Erro ao salvar chamada: ${formatError(error)}`); 
    }
  };

  const deleteStudent = async (id: string) => {
    if (confirm('Deseja realmente remover este aluno?')) {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (!error) await fetchData();
    }
  };

  const deleteTeacher = async (id: string) => {
    if (confirm('Deseja remover este professor?')) {
      const { error } = await supabase.from('teachers').delete().eq('id', id);
      if (!error) await fetchData();
    }
  };

  const deleteClass = async (id: string) => {
    if (confirm('Excluir classe?')) {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (!error) await fetchData();
    }
  };

  const deleteCategory = async (id: string) => {
    if (confirm('Remover categoria?')) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (!error) await fetchData();
    }
  };

  const deleteRecord = async (id: string) => {
    if (confirm('Excluir este lançamento?')) {
      const { error } = await supabase.from('attendance_records').delete().eq('id', id);
      if (!error) await fetchData();
    }
  };

  const startEditing = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setCurrentView(AppView.ATTENDANCE);
  };

  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Validando Acesso...</p>
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
        return <AttendanceForm classes={filteredClasses} students={filteredStudents} onSave={handleSaveAttendance} editRecord={editingRecord} onCancel={() => navigateTo(AppView.DASHBOARD)} />;
      case AppView.CLASSES:
        return (
          <div className="space-y-6">
            {isClassFormOpen ? (
              <ClassForm teachers={teachers} categories={categories} onSave={handleSaveClass} onCancel={() => { setIsClassFormOpen(false); setEditingClass(null); }} editClass={editingClass} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClasses.map(c => (
                  <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group">
                    <div className="flex justify-between items-start mb-4">
                       <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase">{c.category}</span>
                       {session.role === 'ADMIN' && (
                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => { setEditingClass(c); setIsClassFormOpen(true); }} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                           <button onClick={() => deleteClass(c.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                         </div>
                       )}
                    </div>
                    <h3 className="text-xl font-black text-slate-800">{c.name}</h3>
                    <p className="text-slate-500 text-sm mt-1">Prof. {c.teacher}</p>
                    <button onClick={() => { setStudentFilter(c.id); navigateTo(AppView.STUDENTS); }} className="w-full mt-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-indigo-600 transition-all">GERENCIAR ALUNOS</button>
                  </div>
                ))}
                {session.role === 'ADMIN' && (
                  <button onClick={() => setIsClassFormOpen(true)} className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-all">
                    <span className="text-2xl font-bold mb-2">+</span>
                    <span className="font-black text-xs uppercase tracking-widest">Nova Classe</span>
                  </button>
                )}
              </div>
            )}
          </div>
        );
      case AppView.STUDENTS:
        let displayStudents = filteredStudents;
        if (studentFilter) displayStudents = displayStudents.filter(s => s.classId === studentFilter);
        if (studentSearch) displayStudents = displayStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()));
        return (
          <div className="space-y-6">
            {isStudentFormOpen ? (
              <StudentForm classes={filteredClasses} onSave={handleSaveStudent} onCancel={() => { setIsStudentFormOpen(false); setEditingStudent(null); }} editStudent={editingStudent} defaultClassId={studentFilter} />
            ) : (
              <>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                   <input type="text" placeholder="Pesquisar aluno..." className="flex-1 p-3 bg-slate-50 border rounded-2xl outline-none" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                   {session.role === 'ADMIN' && (
                     <select value={studentFilter || ''} onChange={e => setStudentFilter(e.target.value || null)} className="p-3 bg-slate-50 border rounded-2xl text-sm font-bold">
                       <option value="">Todas as Classes</option>
                       {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                   )}
                   <button onClick={() => setIsStudentFormOpen(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs"> + NOVO ALUNO </button>
                </div>
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                   <table className="w-full text-left">
                     <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <tr><th className="px-6 py-4">Nome</th><th className="px-6 py-4">Classe</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Ações</th></tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {displayStudents.map(s => (
                         <tr key={s.id} className="hover:bg-slate-50 group">
                           <td className="px-6 py-4 font-bold text-slate-700">{s.name}</td>
                           <td className="px-6 py-4 text-xs font-bold text-slate-400">{classes.find(c => c.id === s.classId)?.name || 'Sem Classe'}</td>
                           <td className="px-6 py-4"><span className={`text-[10px] font-black px-2 py-1 rounded ${s.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{s.active ? 'ATIVO' : 'INATIVO'}</span></td>
                           <td className="px-6 py-4 text-right">
                             <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                               <button onClick={() => { setEditingStudent(s); setIsStudentFormOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                               <button onClick={() => deleteStudent(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
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
        return (
          <div className="space-y-6">
            {isTeacherFormOpen ? (
              <TeacherForm onSave={handleSaveTeacher} onCancel={() => { setIsTeacherFormOpen(false); setEditingTeacher(null); }} editTeacher={editingTeacher} />
            ) : (
              <>
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <input type="text" placeholder="Pesquisar professor..." className="p-3 bg-slate-50 border rounded-2xl outline-none w-64" value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} />
                  <button onClick={() => setIsTeacherFormOpen(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs"> + NOVO PROFESSOR </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teachers.filter(t => t.name.toLowerCase().includes(teacherSearch.toLowerCase())).map(t => (
                    <div key={t.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all group">
                       <div className="flex justify-between items-start mb-4">
                         <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black">{t.name[0]}</div>
                         <span className={`text-[10px] font-black uppercase ${t.active ? 'text-emerald-500' : 'text-slate-300'}`}>{t.active ? 'Ativo' : 'Inativo'}</span>
                       </div>
                       <h4 className="text-lg font-black text-slate-800">{t.name}</h4>
                       <p className="text-slate-400 text-xs font-bold uppercase mt-1">{t.email || 'Sem e-mail'}</p>
                       <div className="flex gap-2 mt-6 opacity-0 group-hover:opacity-100">
                         <button onClick={() => { setEditingTeacher(t); setIsTeacherFormOpen(true); }} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black">EDITAR</button>
                         <button onClick={() => deleteTeacher(t.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                       </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      case AppView.CATEGORIES:
        if (session.role !== 'ADMIN') return null;
        return (
          <div className="space-y-6">
            {isCategoryFormOpen ? (
              <CategoryForm onSave={handleSaveCategory} onCancel={() => { setIsCategoryFormOpen(false); setEditingCategory(null); }} editCategory={editingCategory} />
            ) : (
              <>
                <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <input type="text" placeholder="Pesquisar categoria..." className="p-3 bg-slate-50 border rounded-2xl outline-none w-64" value={categorySearch} onChange={e => setCategorySearch(e.target.value)} />
                  <button onClick={() => setIsCategoryFormOpen(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs"> + NOVA CATEGORIA </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {categories.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase())).map(cat => (
                    <div key={cat.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm group relative">
                       <div className="w-8 h-8 rounded-lg mb-3 shadow-sm" style={{ backgroundColor: cat.color }}></div>
                       <h5 className="font-black text-slate-800 text-sm truncate">{cat.name}</h5>
                       <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1">
                         <button onClick={() => { setEditingCategory(cat); setIsCategoryFormOpen(true); }} className="p-1 hover:bg-indigo-50 text-indigo-600 rounded-md"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                         <button onClick={() => deleteCategory(cat.id)} className="p-1 hover:bg-red-50 text-red-600 rounded-md"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
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
    { id: AppView.ATTENDANCE, label: 'Chamada', icon: ICONS.Attendance, roles: ['ADMIN', 'TEACHER'] },
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
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"> <ICONS.Bible /> </div>
          <div><span className="text-xl font-black tracking-tighter block leading-none">EBD PRO</span><span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{session.role}</span></div>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => navigateTo(item.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${currentView === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
              <item.icon /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-6">
          <div className="bg-slate-800/50 rounded-2xl p-4 mb-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Logado como</p><p className="text-xs font-bold text-white truncate">{session.name}</p></div>
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm hover:bg-red-500/10 hover:text-red-400 transition-all text-slate-500"> Sair </button>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-12 overflow-y-auto w-full">
        <header className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div><h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">{currentView.replace('_', ' ')}</h1><p className="text-slate-500 mt-3 font-medium">Gestão EBD ADEC SSA</p></div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-4 bg-white rounded-2xl border border-slate-200 text-slate-600 font-black text-xs"> MENU </button>
        </header>
        <div className="pb-20">{renderContent()}</div>
      </main>
      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"></div>}
    </div>
  );
};

export default App;
