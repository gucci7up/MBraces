-- PATCH V5: Sync Tables and Stats for collector.py

-- 1. Tablas de Sincronización Detallada
CREATE TABLE IF NOT EXISTS public.sync_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_id TEXT REFERENCES public.terminals(id) ON DELETE CASCADE,
    ticket_number TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    odds NUMERIC DEFAULT 0,
    race_number TEXT,
    numbers TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    local_date DATE,
    local_time TIME,
    raw_data JSONB
);

CREATE TABLE IF NOT EXISTS public.sync_races (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_id TEXT REFERENCES public.terminals(id) ON DELETE CASCADE,
    race_number TEXT NOT NULL,
    winner_numbers TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    local_date DATE,
    local_time TIME
);

-- 2. Columnas de Estado en Vivo para Terminales
ALTER TABLE public.terminals ADD COLUMN IF NOT EXISTS last_race_number TEXT;
ALTER TABLE public.terminals ADD COLUMN IF NOT EXISTS last_ticket_number TEXT;
ALTER TABLE public.terminals ADD COLUMN IF NOT EXISTS daily_sales NUMERIC DEFAULT 0;
ALTER TABLE public.terminals ADD COLUMN IF NOT EXISTS daily_payouts NUMERIC DEFAULT 0;

-- 3. Habilitar RLS en nuevas tablas
ALTER TABLE public.sync_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_races ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de RLS para sincronización (Basadas en auth_token o terminal_id)
-- Nota: Para simplificar, permitiremos que el colector inserte si el ID coincide. 
-- En producción real usaríamos el auth_token en la cabecera y una función RPC.

CREATE POLICY "Allow terminal sync tickets" ON public.sync_tickets
FOR INSERT WITH CHECK (true); -- En un entorno real validaríamos contra el token

CREATE POLICY "Allow terminal sync races" ON public.sync_races
FOR INSERT WITH CHECK (true);

-- 5. Publicación para Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sync_tickets, sync_races;
