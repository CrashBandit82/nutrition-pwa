from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, date, timedelta
from pydantic import BaseModel
from typing import List, Optional
import httpx
import logging

from database import (
    engine, SessionLocal, get_db, init_db, seed_default_foods,
    FoodItem, DailyLog
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

init_db()

app = FastAPI(title="Nutrition PWA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class UserProfileUpdate(BaseModel):
    name: str
    kcal: int
    protein: int
    carbs: int
    fat: int

class FoodItemCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float

class DailyLogRequest(BaseModel):
    food_item_id: int
    amount_grams: float

# --- Startup: User-Datenbank erstellen ---
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_default_foods(db)
        db.execute(text("ALTER TABLE daily_logs ADD COLUMN user_id INTEGER DEFAULT 1;"))
        db.commit()
    except Exception:
        db.rollback()
        
    try:
        # Erstelle eine echte serverseitige User-Tabelle
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS app_users_v2 (
                id INTEGER PRIMARY KEY, 
                name TEXT,
                kcal INTEGER DEFAULT 2800,
                protein INTEGER DEFAULT 200,
                carbs INTEGER DEFAULT 320,
                fat INTEGER DEFAULT 80
            )
        """))
        db.commit()
        # 10 Slots vorbefüllen, falls leer
        count = db.execute(text("SELECT COUNT(*) FROM app_users_v2")).scalar()
        if count == 0:
            for i in range(1, 11):
                db.execute(text("INSERT INTO app_users_v2 (id, name) VALUES (:id, :name)"), {"id": i, "name": f"User {i}"})
            db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"User DB Init Error: {e}")
    finally:
        db.close()

# --- User Profile API (FÜR DIE ECHTE SYNCHRONISATION) ---
@app.get("/api/users")
def get_users(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT id, name, kcal, protein, carbs, fat FROM app_users_v2 ORDER BY id")).fetchall()
    return [{"id": r[0], "name": r[1], "kcal": r[2], "protein": r[3], "carbs": r[4], "fat": r[5]} for r in result]

@app.post("/api/users/{user_id}")
def update_user(user_id: int, payload: UserProfileUpdate, db: Session = Depends(get_db)):
    db.execute(text("""
        UPDATE app_users_v2 
        SET name = :name, kcal = :kcal, protein = :protein, carbs = :carbs, fat = :fat 
        WHERE id = :id
    """), {
        "name": payload.name, "kcal": payload.kcal, "protein": payload.protein, 
        "carbs": payload.carbs, "fat": payload.fat, "id": user_id
    })
    db.commit()
    return {"status": "success"}

# --- Restliche API (Scanner, Mahlzeiten etc.) ---
@app.get("/api/barcode/{barcode}")
async def get_barcode_product(barcode: str):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
            response = await client.get(url)
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Not found")
            data = response.json().get("product", {})
            nutriments = data.get("nutriments", {})
            return {
                "name": data.get("product_name", "Unbekannt"),
                "brand": data.get("brands", ""),
                "calories_per_100g": nutriments.get("energy-kcal_100g", 0),
                "protein_per_100g": nutriments.get("proteins_100g", 0),
                "carbs_per_100g": nutriments.get("carbohydrates_100g", 0),
                "fat_per_100g": nutriments.get("fat_100g", 0),
            }
    except Exception:
        raise HTTPException(status_code=404, detail="Fehler")

@app.get("/api/foods")
def list_foods(db: Session = Depends(get_db)):
    return db.query(FoodItem).all()

@app.post("/api/foods")
def create_food(food: FoodItemCreate, db: Session = Depends(get_db)):
    db_food = FoodItem(**food.dict())
    db.add(db_food)
    db.commit()
    db.refresh(db_food)
    return db_food

@app.post("/api/logs")
def add_meal(log: DailyLogRequest, db: Session = Depends(get_db), user_id: int = Query(1)):
    food = db.query(FoodItem).filter(FoodItem.id == log.food_item_id).first()
    multiplier = log.amount_grams / 100.0
    db_log = DailyLog(
        food_item_id=food.id, food_name=food.name, amount_grams=log.amount_grams,
        calories=food.calories_per_100g * multiplier, protein=food.protein_per_100g * multiplier,
        carbs=food.carbs_per_100g * multiplier, fat=food.fat_per_100g * multiplier,
        date=datetime.utcnow().date()
    )
    db.add(db_log)
    db.commit()
    db.execute(text("UPDATE daily_logs SET user_id = :u WHERE id = :i"), {"u": user_id, "i": db_log.id})
    db.commit()
    return db_log

@app.get("/api/logs/today")
def get_today_logs(db: Session = Depends(get_db), user_id: int = Query(1)):
    today = datetime.utcnow().date()
    return db.query(DailyLog).filter(DailyLog.date == today).filter(text("user_id = :u")).params(u=user_id).order_by(DailyLog.created_at).all()

@app.delete("/api/logs/{log_id}")
def delete_log(log_id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM daily_logs WHERE id = :id"), {"id": log_id})
    db.commit()
    return {"status": "ok"}

@app.get("/api/totals/today")
def get_today_totals(db: Session = Depends(get_db), user_id: int = Query(1)):
    today = datetime.utcnow().date()
    result = db.query(
        func.sum(DailyLog.calories).label("c"), func.sum(DailyLog.protein).label("p"),
        func.sum(DailyLog.carbs).label("cb"), func.sum(DailyLog.fat).label("f"),
        func.count(DailyLog.id).label("cnt")
    ).filter(DailyLog.date == today).filter(text("user_id = :u")).params(u=user_id).first()
    
    return {
        "total_calories": result.c or 0, "total_protein": result.p or 0,
        "total_carbs": result.cb or 0, "total_fat": result.f or 0, "entries_count": result.cnt or 0
    }
