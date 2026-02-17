# -*- coding: utf-8 -*-
"""
MB-RACES COLLECTOR v3.0 (Supabase Edition)
Sincronización profesional en tiempo real para sistema de carreras.
"""

import requests
import configparser
import time
import sqlite3
import os
import json
from datetime import datetime, date

# --- CONFIGURACIÓN ---
config = configparser.ConfigParser()
config.read('config.ini', encoding='utf-8')

try:
    SUPABASE_URL = config.get('supabase', 'url').rstrip('/')
    SUPABASE_KEY = config.get('supabase', 'key')
    MACHINE_TOKEN = config.get('machine', 'token')
    MACHINE_ID = config.get('machine', 'id')
    SQLITE_PATH = config.get('local', 'sqlite_path')
    INI_PATH = config.get('local', 'ini_path')
except Exception as e:
    print(f"Error crítico leyendo config.ini: {e}")
    time.sleep(10)
    exit()

# --- ENDPOINTS POSTGREST ---
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def sync_summary_and_heartbeat():
    """Envía estadísticas diarias y latido de vida al servidor"""
    stats = get_stats_from_db()
    if not stats: return

    # Endpoint: PATCH a terminals
    url = f"{SUPABASE_URL}/rest/v1/terminals?id=eq.{MACHINE_ID}&auth_token=eq.{MACHINE_TOKEN}"
    
    payload = {
        "last_sync": datetime.now().isoformat(),
        "status": "En Línea",
        "last_race_number": stats['carrera_actual'],
        "last_ticket_number": stats['ticket_actual'],
        "daily_sales": stats['ventas'],
        "daily_payouts": stats['pagos']
    }

    try:
        res = requests.patch(url, headers=HEADERS, json=payload, timeout=5)
        if res.status_code in [200, 201, 204]:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Heartbeat OK | Ventas: ${stats['ventas']}")
        else:
            print(f"Error Heartbeat: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Error Conexión Heartbeat: {e}")

def get_stats_from_db():
    if not os.path.exists(SQLITE_PATH): return None
    try:
        conn = sqlite3.connect(SQLITE_PATH)
        cursor = conn.cursor()
        today = date.today().strftime('%Y-%m-%d')
        
        # Ventas y Pagos
        cursor.execute("SELECT COALESCE(SUM(CAST(VENTAS AS REAL)),0), COALESCE(SUM(CAST(PAGOS AS REAL)),0) FROM VENTAS_P WHERE FECHA = ?", (today,))
        row = cursor.fetchone()
        ventas, pagos = (float(row[0]), float(row[1])) if row else (0, 0)
        
        # Carrera actual
        cursor.execute("SELECT CARRERA FROM RACE_P ORDER BY ID DESC LIMIT 1")
        row = cursor.fetchone()
        carrera_actual = str(row[0]) if row else ""
        
        # Último ticket
        cursor.execute("SELECT TICKET FROM TIKETS_P ORDER BY ID DESC LIMIT 1")
        row = cursor.fetchone()
        ticket_actual = str(row[0]) if row else ""
        
        conn.close()
        return {
            "ventas": ventas,
            "pagos": pagos,
            "carrera_actual": carrera_actual,
            "ticket_actual": ticket_actual
        }
    except Exception as e:
        print(f"Error DB Stats: {e}")
        return None

def sync_detailed_data():
    """Sincroniza transacciones individuales (Tickets y Carreras)"""
    if not os.path.exists(SQLITE_PATH): return
    try:
        conn = sqlite3.connect(SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        today = date.today().strftime('%Y-%m-%d')
        
        # 1. Sync Tickets
        cursor.execute("SELECT * FROM TIKETS_VENDIDOS_P WHERE FECHA = ? LIMIT 100", (today,))
        tickets = [dict(r) for r in cursor.fetchall()]
        if tickets:
            tickets_payload = [{
                "terminal_id": MACHINE_ID,
                "ticket_number": str(t.get('TICKET') or t.get('TIKET') or t.get('ID')),
                "amount": float(t.get('MONTO') or 0),
                "odds": float(t.get('VALOR') or 0),
                "race_number": str(t.get('CARRERA') or ''),
                "numbers": str(t.get('NUMEROS') or ''),
                "local_date": t.get('FECHA'),
                "local_time": t.get('HORA'),
                "raw_data": json.dumps(t, default=str)
            } for t in tickets]
            
            res = requests.post(f"{SUPABASE_URL}/rest/v1/sync_tickets", headers=HEADERS, json=tickets_payload)
            print(f"Sync Tickets: {res.status_code} ({len(tickets)} registros)")

        # 2. Sync Races
        cursor.execute("SELECT * FROM RACE_P ORDER BY ID DESC LIMIT 20")
        races = [dict(r) for r in cursor.fetchall()]
        if races:
            races_payload = [{
                "terminal_id": MACHINE_ID,
                "race_number": str(r.get('CARRERA') or ''),
                "winner_numbers": str(r.get('NUMEROS') or ''),
                "local_date": r.get('FECHA'),
                "local_time": r.get('HORA')
            } for r in races]
            
            res = requests.post(f"{SUPABASE_URL}/rest/v1/sync_races", headers=HEADERS, json=races_payload)
            print(f"Sync Races: {res.status_code} ({len(races)} registros)")
            
        conn.close()
    except Exception as e:
        print(f"Error Sync Data: {e}")

def sync_config_ini():
    """Sincroniza la configuración .INI desde Supabase al archivo local"""
    url = f"{SUPABASE_URL}/rest/v1/terminals?id=eq.{MACHINE_ID}&select=ini_content"
    try:
        res = requests.get(url, headers=HEADERS)
        if res.status_code == 200 and res.json():
            remote_ini = res.json()[0]['ini_content']
            if not remote_ini: return

            # Leer .INI local para comparar o actualizar
            local_ini = configparser.ConfigParser()
            if os.path.exists(INI_PATH):
                local_ini.read(INI_PATH, encoding='utf-8')
            
            modified = False
            # Mapear JSON de Supabase a secciones/llaves de .INI
            for section, keys in remote_ini.items():
                if not local_ini.has_section(section):
                    local_ini.add_section(section)
                
                for key, value in keys.items():
                    current_val = local_ini.get(section, key, fallback=None)
                    if str(current_val) != str(value):
                        local_ini.set(section, key, str(value))
                        modified = True
            
            if modified:
                with open(INI_PATH, 'w', encoding='utf-8') as f:
                    local_ini.write(f)
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Configuración .INI actualizada localmente.")
    except Exception as e:
        print(f"Error Sync INI: {e}")

# --- LOOP PRINCIPAL ---
print("=== MBRACES COLLECTOR v3.0 INICIADO ===")
last_data_sync = 0
last_ini_sync = 0

while True:
    try:
        # Cada 3 segundos: Latido y Estadísticas rápidas
        sync_summary_and_heartbeat()
        
        now = time.time()
        
        # Cada 15 segundos: Sincronizar configuración .INI
        if now - last_ini_sync > 15:
            sync_config_ini()
            last_ini_sync = now
            
        # Cada 60 segundos: Sincronizar datos detallados
        if now - last_data_sync > 60:
            sync_detailed_data()
            last_data_sync = now
            
    except KeyboardInterrupt:
        print("Servicio detenido por el usuario.")
        break
    except Exception as e:
        print(f"Error en loop: {e}")
    
    time.sleep(3)
