-- PATCH V4: Fix Terminal Creation (Márgenes, Default ID, Missing Columns y RLS)

-- 1. Agregar columnas faltantes a la tabla terminals
ALTER TABLE public.terminals ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.terminals ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.terminals ADD COLUMN IF NOT EXISTS manager TEXT;
ALTER TABLE public.terminals ADD COLUMN IF NOT EXISTS type TEXT;

-- 2. Asegurar que el ID de la terminal se genere automáticamente si no se provee
ALTER TABLE public.terminals ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- 3. Habilitar inserción de terminales para usuarios aprobados
DROP POLICY IF EXISTS "Approved owners can insert terminals" ON public.terminals;
CREATE POLICY "Approved owners can insert terminals" ON public.terminals
FOR INSERT WITH CHECK (
  (auth.uid() = owner_id AND (SELECT is_approved FROM public.profiles WHERE id = auth.uid()) = TRUE)
  OR
  ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Super Admin')
);

-- 4. Habilitar actualización de terminales
DROP POLICY IF EXISTS "Owners can update own terminals" ON public.terminals;
CREATE POLICY "Owners can update own terminals" ON public.terminals
FOR UPDATE USING (
  auth.uid() = owner_id 
  OR 
  ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Super Admin')
);
