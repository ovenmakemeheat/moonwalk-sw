from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass

import pandas as pd
import plotly.graph_objects as go
import streamlit as st


PRESSURE_PREFIX = "BME680_PRESSURE "
DEFAULT_PORT = "COM6"
DEFAULT_BAUD = 115200
MAX_SAMPLES = 1000


@dataclass
class PressureSample:
    time_s: float
    elapsed_s: float
    pressure_pa: float
    pressure_hpa: float
    raw: str


def init_state() -> None:
    st.session_state.setdefault("serial", None)
    st.session_state.setdefault("connected_port", "")
    st.session_state.setdefault("samples", [])
    st.session_state.setdefault("raw_lines", [])
    st.session_state.setdefault("errors", [])
    st.session_state.setdefault("first_time_s", None)
    st.session_state.setdefault("live", False)


def list_ports() -> list[str]:
    try:
        import serial.tools.list_ports
    except ImportError:
        return []

    return [f"{port.device} - {port.description}" for port in serial.tools.list_ports.comports()]


def close_serial() -> None:
    ser = st.session_state.get("serial")
    if ser is not None:
        try:
            ser.close()
        except Exception:
            pass
    st.session_state.serial = None
    st.session_state.connected_port = ""
    st.session_state.live = False


def open_serial(port: str, baud: int) -> None:
    import serial

    close_serial()
    ser = serial.Serial(port=port, baudrate=baud, timeout=0.02)
    ser.reset_input_buffer()
    st.session_state.serial = ser
    st.session_state.connected_port = port


def decode_line(line: str) -> dict | None:
    clean = line.strip()
    if not clean:
        return None
    if clean.startswith(PRESSURE_PREFIX):
        clean = clean[len(PRESSURE_PREFIX) :]
    if not clean.startswith("{"):
        return None
    return json.loads(clean)


def append_pressure(payload: dict, raw: str) -> None:
    pressure_pa = payload.get("pressure_pa")
    if pressure_pa is None:
        return

    pressure_pa = float(pressure_pa)
    board_time_ms = payload.get("timestamp_ms")
    now_s = time.time() if board_time_ms is None else float(board_time_ms) / 1000.0

    if st.session_state.first_time_s is None:
        st.session_state.first_time_s = now_s

    sample = PressureSample(
        time_s=now_s,
        elapsed_s=now_s - float(st.session_state.first_time_s),
        pressure_pa=pressure_pa,
        pressure_hpa=pressure_pa / 100.0,
        raw=raw.strip(),
    )
    st.session_state.samples = (st.session_state.samples + [sample])[-MAX_SAMPLES:]


def read_serial(max_lines: int) -> int:
    ser = st.session_state.get("serial")
    if ser is None:
        return 0

    received = 0
    for _ in range(max_lines):
        try:
            raw_bytes = ser.readline()
        except Exception as error:
            st.session_state.errors = (st.session_state.errors + [str(error)])[-20:]
            close_serial()
            break

        if not raw_bytes:
            break

        line = raw_bytes.decode("utf-8", errors="replace").strip()
        if not line:
            continue

        received += 1
        st.session_state.raw_lines = (st.session_state.raw_lines + [line])[-20:]

        try:
            payload = decode_line(line)
            if payload is not None:
                append_pressure(payload, line)
        except Exception as error:
            st.session_state.errors = (st.session_state.errors + [f"{line}: {error}"])[-20:]

    return received


def samples_frame() -> pd.DataFrame:
    samples: list[PressureSample] = st.session_state.samples
    if not samples:
        return pd.DataFrame()
    return pd.DataFrame(asdict(sample) for sample in samples)


def tuned_frame(frame: pd.DataFrame, *, smoothing_window: int, area_cm2: float) -> pd.DataFrame:
    if frame.empty:
        return frame

    tuned = frame.copy()
    tuned["pressure_pa_smooth"] = tuned["pressure_pa"].rolling(
        window=max(1, int(smoothing_window)),
        min_periods=1,
    ).mean()
    tuned["pressure_hpa_smooth"] = tuned["pressure_pa_smooth"] / 100.0

    area_m2 = max(0.0, float(area_cm2)) / 10000.0
    tuned["force_n"] = tuned["pressure_pa_smooth"] * area_m2
    return tuned


def reset_data() -> None:
    st.session_state.samples = []
    st.session_state.raw_lines = []
    st.session_state.errors = []
    st.session_state.first_time_s = None
    ser = st.session_state.get("serial")
    if ser is not None:
        try:
            ser.reset_input_buffer()
        except Exception:
            pass


def render_sidebar() -> tuple[int, float, int, float]:
    st.sidebar.header("Connection")

    port_options = list_ports()
    default_label = next((label for label in port_options if label.startswith(DEFAULT_PORT)), DEFAULT_PORT)
    selected = st.sidebar.selectbox(
        "Serial or Bluetooth COM port",
        port_options or [DEFAULT_PORT],
        index=port_options.index(default_label) if default_label in port_options else 0,
    )
    port = selected.split(" - ", 1)[0]

    manual = st.sidebar.text_input("Manual port", value="")
    if manual.strip():
        port = manual.strip()

    baud = st.sidebar.number_input("Baud", min_value=1200, max_value=921600, value=DEFAULT_BAUD, step=9600)
    max_lines = st.sidebar.slider("Read lines per tick", 1, 200, 60)
    refresh_s = st.sidebar.slider("Refresh seconds", 0.1, 2.0, 0.25, 0.05)

    st.sidebar.header("Tuning")
    smoothing_window = st.sidebar.slider("Smoothing samples", 1, 50, 10)
    area_cm2 = st.sidebar.number_input("Force area (cm^2)", min_value=0.1, max_value=1000.0, value=1.0, step=0.1)

    col_a, col_b = st.sidebar.columns(2)
    with col_a:
        if st.button("Connect", use_container_width=True):
            try:
                open_serial(port, int(baud))
                st.toast(f"Connected {port}")
            except Exception as error:
                st.session_state.errors = (st.session_state.errors + [str(error)])[-20:]
    with col_b:
        if st.button("Disconnect", use_container_width=True):
            close_serial()

    connected = st.session_state.serial is not None
    st.sidebar.write(f"Status: {'connected to ' + st.session_state.connected_port if connected else 'disconnected'}")
    st.session_state.live = st.sidebar.toggle("Live update", value=st.session_state.live and connected, disabled=not connected)

    col_c, col_d = st.sidebar.columns(2)
    with col_c:
        if st.button("Read once", use_container_width=True, disabled=not connected):
            read_serial(max_lines)
    with col_d:
        if st.button("Reset data", use_container_width=True):
            reset_data()

    return max_lines, refresh_s, smoothing_window, float(area_cm2)


def render_metrics(frame: pd.DataFrame) -> None:
    if frame.empty:
        sample_count = 0
        pressure_pa = 0.0
        pressure_hpa = 0.0
        pressure_hpa_smooth = 0.0
        force_n = 0.0
        min_hpa = 0.0
        max_hpa = 0.0
    else:
        sample_count = len(frame)
        pressure_pa = float(frame["pressure_pa"].iloc[-1])
        pressure_hpa = float(frame["pressure_hpa"].iloc[-1])
        pressure_hpa_smooth = float(frame["pressure_hpa_smooth"].iloc[-1])
        force_n = float(frame["force_n"].iloc[-1])
        min_hpa = float(frame["pressure_hpa_smooth"].min())
        max_hpa = float(frame["pressure_hpa_smooth"].max())

    cols = st.columns(6)
    cols[0].metric("Samples", f"{sample_count}")
    cols[1].metric("Pressure", f"{pressure_pa:,.1f} Pa")
    cols[2].metric("Pressure", f"{pressure_hpa:,.2f} hPa")
    cols[3].metric("Smoothed", f"{pressure_hpa_smooth:,.2f} hPa")
    cols[4].metric("Force", f"{force_n:,.3f} N")
    cols[5].metric("Range", f"{min_hpa:,.2f}-{max_hpa:,.2f} hPa")


def render_chart(frame: pd.DataFrame) -> None:
    if frame.empty:
        st.info("Connect COM6, then click Read once or enable Live update.")
        return

    chart_frame = frame.tail(300)
    fig = go.Figure()
    fig.add_trace(
        go.Scatter(
            x=chart_frame["elapsed_s"],
            y=chart_frame["pressure_hpa"],
            mode="lines",
            name="Raw pressure (hPa)",
            line=dict(width=1),
            opacity=0.35,
        )
    )
    fig.add_trace(
        go.Scatter(
            x=chart_frame["elapsed_s"],
            y=chart_frame["pressure_hpa_smooth"],
            mode="lines",
            name="Smoothed pressure (hPa)",
            line=dict(width=3),
        )
    )
    fig.add_trace(
        go.Scatter(
            x=chart_frame["elapsed_s"],
            y=chart_frame["force_n"],
            mode="lines",
            name="Force (N)",
            yaxis="y2",
            line=dict(width=2, dash="dot"),
        )
    )
    fig.update_layout(
        height=520,
        margin=dict(l=10, r=10, t=30, b=10),
        xaxis_title="Time (s)",
        yaxis=dict(title="Pressure (hPa)"),
        yaxis2=dict(title="Force (N)", overlaying="y", side="right"),
        legend=dict(orientation="h", y=1.08),
    )
    st.plotly_chart(fig, use_container_width=True)


def render_raw(frame: pd.DataFrame) -> None:
    with st.expander("Raw serial lines", expanded=True):
        if st.session_state.raw_lines:
            st.code("\n".join(st.session_state.raw_lines[-10:]), language="text")
        else:
            st.write("No serial lines yet.")

    with st.expander("Data table", expanded=False):
        if not frame.empty:
            visible = [
                "elapsed_s",
                "pressure_pa",
                "pressure_hpa",
                "pressure_hpa_smooth",
                "force_n",
            ]
            st.dataframe(frame[visible].tail(100), use_container_width=True, hide_index=True)

    if st.session_state.errors:
        with st.expander("Errors", expanded=True):
            for error in st.session_state.errors[-10:]:
                st.warning(error)


def main() -> None:
    st.set_page_config(page_title="BME680 Pressure Dashboard", layout="wide")
    init_state()

    st.title("BME680 Pressure Dashboard")
    st.caption("Pressure-only dashboard for BME680 readings from Arduino serial.")

    max_lines, refresh_s, smoothing_window, area_cm2 = render_sidebar()

    if st.session_state.live and st.session_state.serial is not None:
        read_serial(max_lines)

    frame = tuned_frame(samples_frame(), smoothing_window=smoothing_window, area_cm2=area_cm2)
    render_metrics(frame)
    render_chart(frame)
    render_raw(frame)

    st.markdown("Sensor value used here: `pressure_pa` from BME680. Conversion: `hPa = Pa / 100`; `N = Pa * area_m2`.")

    if st.session_state.live and st.session_state.serial is not None:
        time.sleep(refresh_s)
        st.rerun()


if __name__ == "__main__":
    main()
