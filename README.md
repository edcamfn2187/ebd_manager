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
```

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

# 🏁 Pronto

Seu sistema está preparado para uso em produção com controle de usuários e banco organizado.

---


