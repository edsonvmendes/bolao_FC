-- Rode manualmente depois que o usuario criar conta pelo app.
-- Troque o e-mail abaixo pelo e-mail do administrador.

update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'admin@example.com'
);
