-- PATCH V3: Agregar Tokens de Autenticación a Terminales
ALTER TABLE public.terminals ADD COLUMN IF NOT EXISTS auth_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Asegurar que las terminales existentes tengan un token
UPDATE public.terminals SET auth_token = gen_random_uuid() WHERE auth_token IS NULL;

-- Modificar la política lateral si es necesario, pero por ahora RLS de terminals ya está en owner_id
