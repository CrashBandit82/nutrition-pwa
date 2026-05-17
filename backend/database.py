from sqlalchemy import create_engine, Column, Integer, String, Float, Date, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os

os.makedirs("data", exist_ok=True)
SQLALCHEMY_DATABASE_URL = "sqlite:///data/nutrition.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class FoodItem(Base):
    __tablename__ = "food_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    brand = Column(String, nullable=True)
    calories_per_100g = Column(Float)
    protein_per_100g = Column(Float)
    carbs_per_100g = Column(Float)
    fat_per_100g = Column(Float)

class DailyLog(Base):
    __tablename__ = "daily_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, default=1)
    food_item_id = Column(Integer)
    food_name = Column(String)
    amount_grams = Column(Float)
    calories = Column(Float)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)
    date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_default_foods(db):
    if db.query(FoodItem).count() == 0:
        default_foods = [
            # --- Fleisch & Eier ---
            {"name": "Hähnchenbrust", "brand": "Fleisch & Eier", "calories_per_100g": 110, "protein_per_100g": 23.0, "carbs_per_100g": 0.0, "fat_per_100g": 1.2},
            {"name": "Rinderhack mager", "brand": "Fleisch & Eier", "calories_per_100g": 125, "protein_per_100g": 21.0, "carbs_per_100g": 0.0, "fat_per_100g": 5.0},
            {"name": "Putenschinken", "brand": "Fleisch & Eier", "calories_per_100g": 110, "protein_per_100g": 22.0, "carbs_per_100g": 1.0, "fat_per_100g": 2.0},
            {"name": "Eier", "brand": "Fleisch & Eier", "calories_per_100g": 155, "protein_per_100g": 13.0, "carbs_per_100g": 1.1, "fat_per_100g": 11.0},
            
            # --- Kohlenhydrate ---
            {"name": "Reis (roh)", "brand": "Kohlenhydrate", "calories_per_100g": 350, "protein_per_100g": 7.0, "carbs_per_100g": 78.0, "fat_per_100g": 1.0},
            {"name": "Nudeln (roh)", "brand": "Kohlenhydrate", "calories_per_100g": 360, "protein_per_100g": 12.0, "carbs_per_100g": 73.0, "fat_per_100g": 1.5},
            {"name": "Kartoffeln (roh)", "brand": "Kohlenhydrate", "calories_per_100g": 77, "protein_per_100g": 2.0, "carbs_per_100g": 17.0, "fat_per_100g": 0.1},
            {"name": "Haferflocken", "brand": "Kohlenhydrate", "calories_per_100g": 370, "protein_per_100g": 13.5, "carbs_per_100g": 59.0, "fat_per_100g": 7.0},
            {"name": "Milchreis natur (roh)", "brand": "Kohlenhydrate", "calories_per_100g": 345, "protein_per_100g": 7.0, "carbs_per_100g": 78.0, "fat_per_100g": 1.0},
            
            # --- Milchprodukte & Fette (JETZT MIT DEN 3 MILCHSORTEN!) ---
            {"name": "Milch 3,5% Fett", "brand": "Milchprodukte", "calories_per_100g": 64, "protein_per_100g": 3.4, "carbs_per_100g": 4.8, "fat_per_100g": 3.5},
            {"name": "Milch 1,6% Fett", "brand": "Milchprodukte", "calories_per_100g": 47, "protein_per_100g": 3.4, "carbs_per_100g": 4.9, "fat_per_100g": 1.6},
            {"name": "Milch 0,9% Fett (mager)", "brand": "Milchprodukte", "calories_per_100g": 40, "protein_per_100g": 3.5, "carbs_per_100g": 5.0, "fat_per_100g": 0.9},
            {"name": "Skyr", "brand": "Milchprodukte", "calories_per_100g": 65, "protein_per_100g": 11.0, "carbs_per_100g": 4.0, "fat_per_100g": 0.2},
            {"name": "Topfen (Magerquark)", "brand": "Milchprodukte", "calories_per_100g": 68, "protein_per_100g": 12.0, "carbs_per_100g": 3.9, "fat_per_100g": 0.2},
            {"name": "Joghurt (1,5%)", "brand": "Milchprodukte", "calories_per_100g": 47, "protein_per_100g": 4.3, "carbs_per_100g": 4.3, "fat_per_100g": 1.5},
            {"name": "Gouda Käse", "brand": "Milchprodukte", "calories_per_100g": 356, "protein_per_100g": 23.0, "carbs_per_100g": 0.0, "fat_per_100g": 29.0},
            {"name": "Butter", "brand": "Milchprodukte", "calories_per_100g": 741, "protein_per_100g": 0.6, "carbs_per_100g": 0.6, "fat_per_100g": 82.0},
            
            # --- Obst ---
            {"name": "Banane", "brand": "Obst", "calories_per_100g": 89, "protein_per_100g": 1.1, "carbs_per_100g": 22.8, "fat_per_100g": 0.3},
            {"name": "Apfel", "brand": "Obst", "calories_per_100g": 52, "protein_per_100g": 0.3, "carbs_per_100g": 14.0, "fat_per_100g": 0.2},
            
            # --- Backzutaten ---
            {"name": "Weizenmehl", "brand": "Backzutaten", "calories_per_100g": 348, "protein_per_100g": 10.0, "carbs_per_100g": 72.0, "fat_per_100g": 1.0},
            {"name": "Zucker", "brand": "Backzutaten", "calories_per_100g": 387, "protein_per_100g": 0.0, "carbs_per_100g": 100.0, "fat_per_100g": 0.0}
        ]
        for food in default_foods:
            db.add(FoodItem(**food))
        db.commit()
