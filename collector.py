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
config.optionxform = str # Preservar mayúsculas/minúsculas en los nombres de las llaves
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

def format_to_iso_time(time_str):
    """Convierte formatos como '9:32:18 p. m.' a '21:32:18'"""
    if not time_str: return None
    t = str(time_str).strip().lower()
    try:
        # Normalizar p. m. / a. m.
        meridiem = ""
        if 'p.' in t and 'm.' in t: meridiem = "PM"
        elif 'a.' in t and 'm.' in t: meridiem = "AM"
        elif 'pm' in t: meridiem = "PM"
        elif 'am' in t: meridiem = "AM"
        
        # Limpiar solo los números y puntos
        only_time = t.replace('p.', '').replace('m.', '').replace('a.', '').replace('am', '').replace('pm', '').strip()
        
        if meridiem:
            # Intentar parsear 12h
            formats = ["%I:%M:%S", "%I:%M"]
            for f in formats:
                try:
                    dt = datetime.strptime(only_time, f)
                    if meridiem == "PM" and dt.hour < 12:
                        dt = dt.replace(hour=dt.hour + 12)
                    elif meridiem == "AM" and dt.hour == 12:
                        dt = dt.replace(hour=0)
                    return dt.strftime("%H:%M:%S")
                except: continue
        else:
            # Intentar parsear 24h directamente
            formats = ["%H:%M:%S", "%H:%M"]
            for f in formats:
                try:
                    return datetime.strptime(only_time, f).strftime("%H:%M:%S")
                except: continue
    except: pass
    return time_str # Retornar original si todo falla (Postgres fallará pero logs dirán por qué)

def sync_summary_and_heartbeat():
    """Envía estadísticas diarias y latido de vida al servidor"""
    stats = get_stats_from_db()
    if not stats: return

    # Endpoint: PATCH a terminals
    url = f"{SUPABASE_URL}/rest/v1/terminals?id=eq.{MACHINE_ID}&auth_token=eq.{MACHINE_TOKEN}"
    
    # Usar UTC con sufijo Z para máxima compatibilidad con el navegador
    now_iso = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    
    payload = {
        "last_sync": now_iso,
        "status": "En Línea",
        "last_race_number": stats['carrera_actual'],
        "last_ticket_number": stats['ticket_actual'],
        "daily_sales": stats['ventas'],
        "daily_payouts": stats['pagos']
    }

    headers = HEADERS.copy()
    headers["Prefer"] = "return=representation" # Pedir que devuelva los datos para confirmar actualización

    try:
        res = requests.patch(url, headers=headers, json=payload, timeout=5)
        if res.status_code in [200, 201]:
            data = res.json()
            if not data:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] ADVERTENCIA: Heartbeat enviado pero NO se encontró ninguna terminal con ese ID/Token en Supabase.")
            else:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Heartbeat OK | Ventas: ${stats['ventas']} | Online")
        elif res.status_code == 204:
             # Si el server no devuelve representación, al menos sabemos que el status fue OK
             print(f"[{datetime.now().strftime('%H:%M:%S')}] Heartbeat OK (204) | Ventas: ${stats['ventas']}")
        else:
            print(f"Error Heartbeat: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Error Conexión Heartbeat: {e}")

def get_stats_from_db():
    if not os.path.exists(SQLITE_PATH): return None
    try:
        conn = sqlite3.connect(SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        today = date.today().strftime('%Y-%m-%d')
        
        # Ventas y Pagos
        cursor.execute("SELECT COALESCE(SUM(CAST(VENTAS AS REAL)),0) as v, COALESCE(SUM(CAST(PAGOS AS REAL)),0) as p FROM VENTAS_P WHERE FECHA = ?", (today,))
        row = cursor.fetchone()
        ventas, pagos = (float(row['v']), float(row['p'])) if row else (0, 0)
        
        # Carrera actual
        cursor.execute("SELECT * FROM RACE_P ORDER BY ID DESC LIMIT 1")
        row = cursor.fetchone()
        carrera_actual = str(row['CARRERA'] if row and 'CARRERA' in row.keys() else "")
        
        # Último ticket (Intentar NUMERO_TIKET, TIKET, TICKET o ID)
        ticket_actual = ""
        try:
            # Primero intentamos la tabla TIKETS_P con NUMERO_TIKET (visto en GALDOS.db)
            cursor.execute("SELECT * FROM TIKETS_P ORDER BY ID DESC LIMIT 1")
            row = cursor.fetchone()
            if row:
                ticket_actual = str(row['NUMERO_TIKET'] if 'NUMERO_TIKET' in row.keys() else row['TIKET'] if 'TIKET' in row.keys() else row['TICKET'] if 'TICKET' in row.keys() else row['ID'])
        except:
            try:
                # Si falla, probamos con la tabla de vendidos
                cursor.execute("SELECT * FROM TIKETS_VENDIDOS_P ORDER BY ID DESC LIMIT 1")
                row = cursor.fetchone()
                if row:
                    ticket_actual = str(row['TIKET'] if 'TIKET' in row.keys() else row['TICKET'] if 'TICKET' in row.keys() else row['ID'])
            except: pass
        
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
            tickets_payload = []
            for t in tickets:
                # Usar TIKET o ID (visto en GALDOS.db)
                t_num = str(t.get('TIKET') or t.get('TICKET') or t.get('ID') or '')
                if not t_num: continue
                
                # Usar RACE o CARRERA (visto en GALDOS.db: TIKETS_VENDIDOS_P usa RACE)
                race_num = str(t.get('RACE') or t.get('CARRERA') or '')
                
                tickets_payload.append({
                    "terminal_id": MACHINE_ID,
                    "ticket_number": t_num,
                    "amount": float(t.get('MONTO') or 0),
                    "odds": float(t.get('VALOR') or 0),
                    "race_number": race_num,
                    "numbers": str(t.get('NUMEROS') or ''),
                    "local_date": t.get('FECHA') if t.get('FECHA') else None,
                    "local_time": format_to_iso_time(t.get('HORA')),
                    "raw_data": json.dumps(t, default=str)
                })
            
            if tickets_payload:
                try:
                    res = requests.post(f"{SUPABASE_URL}/rest/v1/sync_tickets", headers=HEADERS, json=tickets_payload, timeout=10)
                    if res.status_code not in [200, 201, 204]:
                        print(f"Error Sync Tickets: {res.status_code} - {res.text}")
                    else:
                        print(f"Sync Tickets OK ({len(tickets_payload)} registros)")
                except Exception as e:
                    print(f"Error Conexión Sync Tickets: {e}")

        # 2. Sync Races
        cursor.execute("SELECT * FROM RACE_P ORDER BY ID DESC LIMIT 20")
        races = [dict(r) for r in cursor.fetchall()]
        if races:
            races_payload = []
            for r in races:
                r_num = str(r.get('CARRERA') or '')
                if not r_num: continue
                
                races_payload.append({
                    "terminal_id": MACHINE_ID,
                    "race_number": r_num,
                    "winner_numbers": str(r.get('NUMEROS') or ''),
                    "local_date": r.get('FECHA') if r.get('FECHA') else None,
                    "local_time": format_to_iso_time(r.get('HORA'))
                })
            
            if races_payload:
                try:
                    res = requests.post(f"{SUPABASE_URL}/rest/v1/sync_races", headers=HEADERS, json=races_payload, timeout=10)
                    if res.status_code not in [200, 201, 204]:
                        print(f"Error Sync Races: {res.status_code} - {res.text}")
                    else:
                        print(f"Sync Races OK ({len(races_payload)} registros)")
                except Exception as e:
                    print(f"Error Conexión Sync Races: {e}")
            
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
            local_ini.optionxform = str
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
