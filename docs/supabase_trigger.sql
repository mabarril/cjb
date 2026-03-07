-- 8. Automação de Cadastro (Trigger)
-- Cria uma função que será executada com privilégios de administrador (SECURITY DEFINER)
-- para contornar o RLS e inserir o perfil assim que uma conta for criada no Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, voice_part, role, status)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    CAST(NEW.raw_user_meta_data->>'voice_part' AS public.voice_part_type),
    'corista',
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Associa a função acima nativamente no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
