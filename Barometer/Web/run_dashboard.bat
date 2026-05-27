@echo off
setlocal
cd /d "%~dp0"
python -m streamlit run app.py --server.port 8503
