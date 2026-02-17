# 📖 Guía de Configuración: MBRACES Collector v3.0

Esta guía te ayudará a conectar tus máquinas locales con el panel administrativo en la nube.

---

### 🟢 Paso 1: Preparación del Entorno
Para que el colector funcione, necesitas tener **Python** instalado en la computadora de la máquina (terminal).

1.  **Instalar Python**: Descárgalo desde [python.org](https://www.python.org/downloads/) (marca la casilla "Add Python to PATH" durante la instalación).
2.  **Instalar Librerías**: Abre una terminal o CMD y ejecuta el siguiente comando:
    ```bash
    pip install requests
    ```

---

### 🟡 Paso 2: Obtener tus Credenciales
Necesitas 4 datos clave que debes poner en el archivo `config.ini`:

1.  **Supabase URL**: En la configuración de tu proyecto en Supabase (Project Settings -> API).
2.  **Anon Key**: En la misma sección de API de Supabase.
3.  **Auth Token**: Ve a tu panel de MBRACES -> **Terminales**. Busca la máquina y haz clic en el botón de **Copiar Token** 🔑.
4.  **Terminal ID**: Es el código largo (UUID) que aparece al principio de la fila de la máquina en el panel.

---

### 🟠 Paso 3: Configurar el archivo `config.ini`
Abre el archivo `config.ini` que está en la carpeta del proyecto y rellénalo así:

```ini
[supabase]
url = https://tu-proyecto.supabase.co
key = tu-clave-anon-muy-larga-aqui

[machine]
token = el-token-que-copiaste-del-panel
id = el-id-de-la-maquina

[local]
sqlite_path = C:/Ruta/A/Tu/Base/De/Datos.db
ini_path = C:/Ruta/A/Tu/Configuracion.ini
```
> [!IMPORTANT]
> Asegúrate de usar barras diagonales normales `/` en las rutas de Windows para evitar errores.

---

### 🔴 Paso 4: Ejecutar el Colector
Una vez configurado, simplemente inicia el servicio:

1.  Abre el CMD en la carpeta donde está el archivo.
2.  Ejecuta:
    ```bash
    python collector.py
    ```

---

### ✅ Paso 5: Verificación
Si todo es correcto, verás mensajes en el CMD diciendo `Heartbeat OK`. 
Ahora ve a tu panel administrativo web:
- El indicador de la máquina debería cambiar a **Verde ("En Línea")**.
- Las ventas y el número de carrera se actualizarán automáticamente cada 3 segundos.

---

### 🔄 Sincronización Inversa (Panel -> Máquina)
Si cambias ajustes como el **Jackpot** o el **Mensaje de Pantalla** en el panel web, el colector detectará el cambio y actualizará tu archivo `.INI` local automáticamente en unos segundos. No necesitas reiniciar nada. 🚀🎰
