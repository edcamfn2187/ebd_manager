# 📘 EBD MANAGER PRO

Sistema de gerenciamento de Escola Bíblica Dominical com controle de presença, classes, professores, alunos e níveis de acesso (ADMIN / PROFESSOR).

---

# 🚀 Tecnologias

* React + Vite + TypeScript
* TailwindCSS
* Supabase (Auth + Database)

---

# 📦 Instalação do Projeto

```bash
npm install
npm run dev
```

Configure o arquivo:

`src/services/supabase.ts`

```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)
```

Crie o `.env`:

```env
VITE_SUPABASE_URL=xxxx
VITE_SUPABASE_ANON_KEY=xxxx
```

---

# 🗄️ Estrutura do Banco de Dados (Supabase)

Acesse o painel do Supabase → SQL Editor → cole tudo abaixo.

---

## 👤 Perfis de Usuário (controle de acesso)

Tabela responsável pelo controle de acesso (ADMIN / PROFESSOR) e vínculo com o sistema de autenticação.

````sql
create table public.profiles (
  id uuid not null,
  email text null,
  full_name text null,
  role text check (role in ('admin','professor')) not null,
  created_at timestamp with time zone default timezone ('utc'::text, now()),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade
);

alter table profiles enable row level security;

create policy "Users can read own profile"
on profiles for select
using ( auth.uid() = id );

create policy "Users can update own profile"
on profiles for update
using ( auth.uid() = id );
```sql
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text check (role in ('admin', 'professor')) not null,
  created_at timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
on profiles for select
using ( auth.uid() = id );
````

---

## 🏫 Classes

```sql
create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher text,
  category text,
  created_at timestamp default now()
);
```

---

## 👨‍🏫 Professores

```sql
create table teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  active boolean default true,
  created_at timestamp default now()
);
```

---

## 👨‍🎓 Alunos

```sql
create table students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birthDate date,
  classId uuid references classes(id) on delete set null,
  active boolean default true,
  created_at timestamp default now()
);
```

---

## 📊 Categorias

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  created_at timestamp default now()
);
```

---

## 📝 Registros de Chamada

```sql
create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  classId uuid references classes(id) on delete cascade,
  presentStudents jsonb,
  absentStudents jsonb,
  titheAmount numeric,
  observations text,
  created_at timestamp default now()
);
```

---

# 🔐 Políticas de Segurança (RLS)

Ative o RLS em todas as tabelas:

```sql
alter table classes enable row level security;
alter table teachers enable row level security;
alter table students enable row level security;
alter table categories enable row level security;
alter table attendance_records enable row level security;
```

Política simples (admin e professor logados):

```sql
create policy "Allow all for authenticated"
on classes for all
using ( auth.role() = 'authenticated' );

create policy "Allow all for authenticated"
on teachers for all
using ( auth.role() = 'authenticated' );

create policy "Allow all for authenticated"
on students for all
using ( auth.role() = 'authenticated' );

create policy "Allow all for authenticated"
on categories for all
using ( auth.role() = 'authenticated' );

create policy "Allow all for authenticated"
on attendance_records for all
using ( auth.role() = 'authenticated' );
```

---

# 🧑‍💼 Criar um ADMIN

1. Crie o usuário em: Authentication → Users
2. Copie o `id`
3. Insira na tabela profiles:

```sql
insert into profiles (id, email, role)
values ('UUID_DO_USER', 'admin@email.com', 'admin');
```

Professores cadastrados pelo app entram como `professor` automaticamente.

---

# 🔄 Fluxo do Sistema

* Usuário faz login
* Sistema busca o perfil em `profiles`
* Se role = admin → acesso total
* Se role = professor → acesso limitado

---

# ✅ Funcionalidades

* Login seguro com Supabase
* Controle de acesso (ADMIN / PROFESSOR)
* Gerenciamento de Classes
* Gerenciamento de Professores
* Gerenciamento de Alunos
* Registro de chamadas
* Histórico e relatórios
* Controle de categorias
* Gestão de usuários (admin)

---

# 🛡️ Boas práticas recomendadas

* Criar políticas RLS avançadas por role
* Não usar service_role no front-end
* Usar Supabase Edge Functions se escalar

---

# 📕 Manual do Administrador

## Acesso

* Criar usuários no Supabase ou liberar cadastros.
* Definir cargo (admin/professor) na tabela `profiles`.

## Funções do ADMIN

* Criar, editar e excluir **Classes**
* Gerenciar **Professores**
* Gerenciar **Categorias**
* Gerenciar **Usuários/Acessos**
* Visualizar todos os relatórios

## Fluxo recomendado

1. Criar categorias
2. Cadastrar professores
3. Criar classes
4. Acompanhar chamadas e relatórios

---

# 📗 Manual do Professor

## Funções do PROFESSOR

* Fazer chamadas
* Visualizar relatórios
* Gerenciar alunos

## Restrições

* Não acessa gerenciamento de usuários
* Não gerencia professores
* Não cria categorias

---

# 🗺️ Diagrama do Banco de Dados (modelo lógico)

```
auth.users
   │
   │ 1–1
   ▼
profiles (id, email, role)

classes (id, name, teacher, category)
   │
   │ 1–N
   ▼
students (id, name, birthDate, classId, active)

classes (id)
   │
   │ 1–N
   ▼
attendance_records (id, date, classId, presentStudents, absentStudents, titheAmount)

categories (id, name, color)
   ▲
   │
   └──── classes.category
```

---

# 🧠 Regras do Sistema

* Todo usuário autenticado deve ter um registro em `profiles`
* `admin` → acesso total
* `professor` → acesso limitado
* Um professor pode ter várias classes
* Uma classe pode ter vários alunos
* Uma classe pode ter vários registros de chamada

---

# 🐘 Usando o app com PostgreSQL (fora do Supabase)

O sistema foi criado sobre Supabase, que internamente **já é PostgreSQL**. Porém, você pode usar este app com um **PostgreSQL próprio** (Railway, Neon, Render, AWS, servidor local etc.).

⚠️ Importante: nesse modo você **não terá Supabase Auth**, então precisará implementar autenticação via backend (Node/Nest/Laravel).

---

## 🏗️ Arquitetura recomendada

```
React (este app)
   ↓
API (Node.js / NestJS / Laravel)
   ↓
PostgreSQL
```

O front-end nunca acessa o banco direto. Tudo passa por uma API.

---

## 🗄️ Script completo PostgreSQL (compatível)

```sql
-- USUÁRIOS DO SISTEMA
create table users (
  id uuid primary key,
  email text unique not null,
  password text not null,
  role text check (role in ('admin','professor')) not null,
  created_at timestamp default now()
);

-- CATEGORIAS
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  created_at timestamp default now()
);

-- PROFESSORES
create table teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  active boolean default true,
  created_at timestamp default now()
);

-- CLASSES
create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher text,
  category text,
  created_at timestamp default now()
);

-- ALUNOS
create table students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birthDate date,
  classId uuid references classes(id) on delete set null,
  active boolean default true,
  created_at timestamp default now()
);

-- CHAMADAS
create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  classId uuid references classes(id) on delete cascade,
  presentStudents jsonb,
  absentStudents jsonb,
  titheAmount numeric,
  observations text,
  created_at timestamp default now()
);
```

---

## 🔐 Autenticação sugerida

Você pode usar:

* JWT + bcrypt (Node)
* Laravel Breeze / Sanctum
* NestJS Auth

Fluxo:

1. Usuário faz login
2. API valida senha
3. API retorna token JWT
4. React guarda token
5. Todas requisições usam o token

---

## 🔄 O que muda no front-end

Você deverá trocar:

```ts
supabase.from('students').select('*')
```

por:

```ts
api.get('/students')
```

E criar serviços tipo:

* /auth/login
* /classes
* /students
* /teachers
* /attendance

---

## 🚀 Vantagens do modo PostgreSQL + API

* Controle total do backend
* Pode virar SaaS
* Pode criar app mobile
* Mais segurança
* Integração com outros sistemas

---

# 🏁 Pronto

Seu sistema está preparado para uso em produção com controle de usuários e banco organizado.

---

Se quiser, posso gerar também:

* Script de backup
* Modelo ER (diagrama)
* Manual do administrador
* Documentação para professores
