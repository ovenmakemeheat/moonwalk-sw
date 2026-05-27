# Barometer

Pressure-only BME680 module for Arduino MKR WiFi 1010 plus a Streamlit web dashboard.

## Arduino

Open this sketch in Arduino IDE:

```text
Barometer/Arduino/Barometer/Barometer.ino
```

Board:

```text
Arduino MKR WiFi 1010
```

Port:

```text
COM6
```

Baud:

```text
115200
```

Wiring:

```text
BME680 VIN/VCC -> 3V3
BME680 GND     -> GND
BME680 SDA     -> SDA
BME680 SCL     -> SCL
```

Serial output:

```text
BME680_PRESSURE {"sensor":"BME680","kind":"pressure","timestamp_ms":1234,"pressure_pa":100490.73,"pressure_hpa":1004.91,"address":"0x76"}
```

## Web Dashboard

Run:

```powershell
cd Barometer/Web
python -m streamlit run app.py --server.port 8503
```

Or double-click:

```text
Barometer/Web/run_dashboard.bat
```

Open:

```text
http://localhost:8503
```

Use:

```text
Port: COM6
Baud: 115200
```

Pressure conversion:

```text
hPa = Pa / 100
Force(N) = Pressure(Pa) * Area(m^2)
```
