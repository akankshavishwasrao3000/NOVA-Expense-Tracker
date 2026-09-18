import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SECRET_KEY = os.getenv("SECRET_KEY", "development-only-change-me")
FRONTEND_ORIGINS = [
	origin.strip()
	for origin in os.getenv(
		"FRONTEND_ORIGINS",
		"http://localhost:5173,http://127.0.0.1:5173,https://nova-expense-tracker-six.vercel.app",
	).split(",")
	if origin.strip()
]
if "https://nova-expense-tracker-six.vercel.app" not in FRONTEND_ORIGINS:
	FRONTEND_ORIGINS.append("https://nova-expense-tracker-six.vercel.app")