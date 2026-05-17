"""
SQLite database setup using SQLAlchemy ORM.
Manages two main tables: food_items (local favorites) and daily_logs (meal tracking).
"""

from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database URL
DATABASE_URL = "sqlite:///./nutrition_app.db"

# Create engine with check_same_thread disabled for SQLite
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False  # Set to True for SQL debugging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class FoodItem(Base):
    """Local favorite foods (custom foods) table."""
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    brand = Column(String(255), nullable=True)
    
    # Macronutrients per 100g
    calories_per_100g = Column(Float, nullable=False)
    protein_per_100g = Column(Float, nullable=False)  # in grams
    carbs_per_100g = Column(Float, nullable=False)    # in grams
    fat_per_100g = Column(Float, nullable=False)      # in grams
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<FoodItem(id={self.id}, name='{self.name}', calories_per_100g={self.calories_per_100g})>"


class DailyLog(Base):
    """Daily meal intake logs."""
    __tablename__ = "daily_logs"

    id = Column(Integer, primary_key=True, index=True)
    food_item_id = Column(Integer, nullable=False, index=True)
    food_name = Column(String(255), nullable=False)
    
    # Amount consumed
    amount_grams = Column(Float, nullable=False)
    
    # Calculated macronutrients for this entry
    calories = Column(Float, nullable=False)
    protein = Column(Float, nullable=False)
    carbs = Column(Float, nullable=False)
    fat = Column(Float, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    date = Column(Date, default=lambda: datetime.utcnow().date(), index=True)
    
    def __repr__(self):
        return f"<DailyLog(id={self.id}, food_name='{self.food_name}', amount_grams={self.amount_grams})>"


def init_db():
    """Initialize the database with tables."""
    Base.metadata.create_all(bind=engine)
    print("✓ Database initialized successfully")


def get_db():
    """Dependency injection for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_default_foods(db):
    """Seed database with common food items."""
    from sqlalchemy import func
    
    # Check if foods already exist
    count = db.query(func.count(FoodItem.id)).scalar()
    if count > 0:
        return
    
    default_foods = [
        # Proteins
        FoodItem(
            name="Chicken Breast (cooked)",
            brand="Generic",
            calories_per_100g=165,
            protein_per_100g=31,
            carbs_per_100g=0,
            fat_per_100g=3.6
        ),
        FoodItem(
            name="Egg (whole, cooked)",
            brand="Generic",
            calories_per_100g=155,
            protein_per_100g=13,
            carbs_per_100g=1.1,
            fat_per_100g=11
        ),
        FoodItem(
            name="Egg White",
            brand="Generic",
            calories_per_100g=52,
            protein_per_100g=11,
            carbs_per_100g=0.7,
            fat_per_100g=0.2
        ),
        FoodItem(
            name="Greek Yogurt (0% fat)",
            brand="Generic",
            calories_per_100g=59,
            protein_per_100g=10,
            carbs_per_100g=3.3,
            fat_per_100g=0.4
        ),
        
        # Carbs
        FoodItem(
            name="Rice (white, cooked)",
            brand="Generic",
            calories_per_100g=130,
            protein_per_100g=2.7,
            carbs_per_100g=28,
            fat_per_100g=0.3
        ),
        FoodItem(
            name="Oats (dry)",
            brand="Generic",
            calories_per_100g=389,
            protein_per_100g=17,
            carbs_per_100g=66,
            fat_per_100g=7
        ),
        FoodItem(
            name="Sweet Potato (cooked)",
            brand="Generic",
            calories_per_100g=86,
            protein_per_100g=1.6,
            carbs_per_100g=20,
            fat_per_100g=0.1
        ),
        FoodItem(
            name="Brown Rice (cooked)",
            brand="Generic",
            calories_per_100g=111,
            protein_per_100g=2.6,
            carbs_per_100g=23,
            fat_per_100g=0.9
        ),
        
        # Fats & Protein Powders
        FoodItem(
            name="Whey Protein Powder",
            brand="Generic",
            calories_per_100g=400,
            protein_per_100g=80,
            carbs_per_100g=10,
            fat_per_100g=2
        ),
        FoodItem(
            name="Peanut Butter (natural)",
            brand="Generic",
            calories_per_100g=588,
            protein_per_100g=25,
            carbs_per_100g=20,
            fat_per_100g=50
        ),
        
        # Vegetables
        FoodItem(
            name="Broccoli (cooked)",
            brand="Generic",
            calories_per_100g=34,
            protein_per_100g=2.8,
            carbs_per_100g=7,
            fat_per_100g=0.4
        ),
        FoodItem(
            name="Asparagus (cooked)",
            brand="Generic",
            calories_per_100g=22,
            protein_per_100g=2.4,
            carbs_per_100g=4,
            fat_per_100g=0.1
        ),
        
        # Dairy
        FoodItem(
            name="Skyr (Icelandic Yogurt)",
            brand="Generic",
            calories_per_100g=60,
            protein_per_100g=11,
            carbs_per_100g=3.5,
            fat_per_100g=0.2
        ),
    ]
    
    db.add_all(default_foods)
    db.commit()
    print(f"✓ Seeded {len(default_foods)} default food items")
