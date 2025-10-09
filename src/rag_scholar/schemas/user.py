"""User models and schemas for RAG Scholar."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field


class AchievementType(str, Enum):
    """Types of achievements users can earn."""

    FIRST_CHAT = "first_chat"
    UPLOAD_DOCUMENT = "upload_document"
    CREATE_CLASS = "create_class"
    TEN_CHATS = "ten_chats"
    FIVE_DOCUMENTS = "five_documents"
    HUNDRED_QUESTIONS = "hundred_questions"
    THREE_CLASSES = "three_classes"
    EARLY_BIRD = "early_bird"
    NIGHT_OWL = "night_owl"
    WEEK_STREAK = "week_streak"


class Achievement(BaseModel):
    """User achievement model."""

    type: AchievementType
    name: str
    description: str
    points: int
    unlocked_at: datetime | None = None
    progress: int = 0
    target: int = 1


class UserStats(BaseModel):
    """User statistics and progress."""

    total_points: int = 0
    total_chats: int = 0
    documents_uploaded: int = 0
    research_days: int = 0
    domains_explored: list[str] = []
    citations_received: int = 0
    streak_days: int = 0
    is_early_adopter: int = 0
    last_activity: datetime | None = None
    joined_date: datetime = Field(default_factory=datetime.utcnow)


class UserProfile(BaseModel):
    """User profile information."""

    bio: str | None = None
    research_interests: list[str] = []
    preferred_domains: list[str] = []
    notification_preferences: dict[str, bool] = {
        "achievement_notifications": True,
        "research_reminders": True,
        "system_updates": True,
    }


class User(BaseModel):
    """Complete user model."""

    id: str
    name: str
    email: EmailStr
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    stats: UserStats = Field(default_factory=UserStats)
    profile: UserProfile = Field(default_factory=UserProfile)
    achievements: list[Achievement] = Field(default_factory=list)


class UserCreate(BaseModel):
    """User creation schema."""

    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    """User login schema."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response schema (without password)."""

    id: str
    name: str
    email: str
    created_at: datetime
    is_active: bool
    stats: UserStats
    profile: UserProfile
    achievements: list[Achievement]


class UserUpdate(BaseModel):
    """User update schema."""

    name: str | None = Field(None, min_length=2, max_length=100)
    bio: str | None = Field(None, max_length=500)
    research_interests: list[str] | None = None
    preferred_domains: list[str] | None = None
    notification_preferences: dict[str, bool] | None = None


class PasswordChange(BaseModel):
    """Password change schema."""

    current_password: str
    new_password: str = Field(..., min_length=8)


class AuthToken(BaseModel):
    """Authentication token response."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


def create_default_achievements() -> list[Achievement]:
    """Create the default set of achievements for a new user."""
    return [
        Achievement(
            type=AchievementType.FIRST_CHAT,
            name="First Steps",
            description="Start your first chat",
            points=10,
            target=1,
        ),
        Achievement(
            type=AchievementType.UPLOAD_DOCUMENT,
            name="Knowledge Seeker",
            description="Upload your first document",
            points=15,
            target=1,
        ),
        Achievement(
            type=AchievementType.CREATE_CLASS,
            name="Organization Master",
            description="Create your first class",
            points=20,
            target=1,
        ),
        Achievement(
            type=AchievementType.TEN_CHATS,
            name="Conversationalist",
            description="Complete 10 chat sessions",
            points=50,
            target=10,
        ),
        Achievement(
            type=AchievementType.FIVE_DOCUMENTS,
            name="Librarian",
            description="Upload 5 documents",
            points=50,
            target=5,
        ),
        Achievement(
            type=AchievementType.HUNDRED_QUESTIONS,
            name="Curious Mind",
            description="Ask 100 questions",
            points=100,
            target=100,
        ),
        Achievement(
            type=AchievementType.THREE_CLASSES,
            name="Multi-tasker",
            description="Create 3 different classes",
            points=75,
            target=3,
        ),
        Achievement(
            type=AchievementType.EARLY_BIRD,
            name="Early Bird",
            description="Use the app before 6 AM",
            points=25,
            target=1,
        ),
        Achievement(
            type=AchievementType.NIGHT_OWL,
            name="Night Owl",
            description="Use the app after 11 PM",
            points=25,
            target=1,
        ),
        Achievement(
            type=AchievementType.WEEK_STREAK,
            name="Dedicated Learner",
            description="Use the app 7 days in a row",
            points=150,
            target=7,
        ),
    ]
