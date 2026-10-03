import os
from database import engine, Base
from models import User, Transaction, Subscription, Budget, Goal, Habit, ChatMessage

def recreate_tables():
    print("Dropping all tables in Neon PostgreSQL...")
    Base.metadata.drop_all(bind=engine)
    print("Recreating tables with new Encrypted types...")
    Base.metadata.create_all(bind=engine)
    print("Done! Database schema is now ready for application-level encryption.")

if __name__ == "__main__":
    recreate_tables()
