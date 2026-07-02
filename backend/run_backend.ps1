.\venv\Scripts\activate
python scripts\seed.py
uvicorn main:app --reload --port 8000
