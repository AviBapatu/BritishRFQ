import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from main import app
from core.database import get_session

# Use an in-memory SQLite database for fast testing, 
# or a separate test Postgres DB if you want to test specific Postgres locks.
TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/gocomet_test_db"
engine = create_engine(TEST_DATABASE_URL)

@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)

@pytest.fixture(name="client")
def client_fixture(session: Session):
    # Dependency override so FastAPI uses the test database
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
