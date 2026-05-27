/*
  BME680 pressure-only stream

  Board: Arduino MKR WiFi 1010
  Sensor: Adafruit BME680 over I2C

  Wiring:
    BME680 VIN/VCC -> 3V3
    BME680 GND     -> GND
    BME680 SDA     -> SDA
    BME680 SCL     -> SCL

  Output:
    BME680_PRESSURE {"sensor":"BME680","kind":"pressure",...}
*/

#include <Adafruit_BME680.h>
#include <Wire.h>

Adafruit_BME680 bme;

const unsigned long SAMPLE_INTERVAL_MS = 500;
const int PRESSURE_FILTER_SIZE = 10;

float pressureBuffer[PRESSURE_FILTER_SIZE];
int pressureIndex = 0;
int pressureCount = 0;
float pressureSum = 0.0f;
float smoothedPressurePa = 0.0f;

unsigned long lastSampleMs = 0;
uint8_t bmeAddress = 0x00;

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    ;
  }

  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  Wire.begin();
  scanI2CBus();

  if (bme.begin(0x76)) {
    bmeAddress = 0x76;
  } else if (bme.begin(0x77)) {
    bmeAddress = 0x77;
  } else {
    Serial.println("ERROR: BME680 not detected at 0x76 or 0x77");
    while (true) {
      blinkError();
    }
  }

  bme.setTemperatureOversampling(BME680_OS_2X);
  bme.setHumidityOversampling(BME680_OS_NONE);
  bme.setPressureOversampling(BME680_OS_16X);
  bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
  bme.setGasHeater(0, 0);

  initializePressureFilter();

  Serial.print("BME680 pressure stream ready address=0x");
  Serial.println(bmeAddress, HEX);
}

void loop() {
  unsigned long now = millis();
  if (now - lastSampleMs < SAMPLE_INTERVAL_MS) {
    return;
  }
  lastSampleMs = now;

  if (!bme.performReading()) {
    Serial.println("ERROR: BME680 reading failed");
    return;
  }

  addPressureReading(bme.pressure);
  smoothedPressurePa = getSmoothedPressure();
  printPressureLine(now, smoothedPressurePa);
}

void initializePressureFilter() {
  float sum = 0.0f;
  int validSamples = 0;

  for (int i = 0; i < PRESSURE_FILTER_SIZE; i++) {
    if (bme.performReading()) {
      sum += bme.pressure;
      validSamples++;
    }
    delay(50);
  }

  smoothedPressurePa = validSamples > 0 ? sum / validSamples : 101325.0f;

  for (int i = 0; i < PRESSURE_FILTER_SIZE; i++) {
    pressureBuffer[i] = smoothedPressurePa;
  }

  pressureSum = smoothedPressurePa * PRESSURE_FILTER_SIZE;
  pressureCount = PRESSURE_FILTER_SIZE;
}

void addPressureReading(float pressurePa) {
  if (pressureCount < PRESSURE_FILTER_SIZE) {
    pressureBuffer[pressureIndex] = pressurePa;
    pressureSum += pressurePa;
    pressureCount++;
  } else {
    pressureSum -= pressureBuffer[pressureIndex];
    pressureBuffer[pressureIndex] = pressurePa;
    pressureSum += pressurePa;
  }

  pressureIndex = (pressureIndex + 1) % PRESSURE_FILTER_SIZE;
}

float getSmoothedPressure() {
  if (pressureCount == 0) {
    return 0.0f;
  }
  return pressureSum / pressureCount;
}

void printPressureLine(unsigned long timestampMs, float pressurePa) {
  Serial.print("BME680_PRESSURE {");
  Serial.print("\"sensor\":\"BME680\",");
  Serial.print("\"kind\":\"pressure\",");
  Serial.print("\"timestamp_ms\":");
  Serial.print(timestampMs);
  Serial.print(",\"pressure_pa\":");
  Serial.print(pressurePa, 2);
  Serial.print(",\"pressure_hpa\":");
  Serial.print(pressurePa / 100.0f, 2);
  Serial.print(",\"address\":\"0x");
  if (bmeAddress < 16) {
    Serial.print("0");
  }
  Serial.print(bmeAddress, HEX);
  Serial.println("\"}");
}

void scanI2CBus() {
  Serial.println("I2C scan start");

  int found = 0;
  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("I2C device found at 0x");
      if (address < 16) {
        Serial.print("0");
      }
      Serial.println(address, HEX);
      found++;
    }
  }

  if (found == 0) {
    Serial.println("I2C scan found no devices");
  }

  Serial.println("I2C scan done");
}

void blinkError() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(150);
  digitalWrite(LED_BUILTIN, LOW);
  delay(150);
}
