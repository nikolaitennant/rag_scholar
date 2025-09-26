"""User models and schemas for RAG Scholar."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field


class AchievementType(str, Enum):
    """Types of achievements users can earn."""

    FIRST_CHAT = "first_chat"
    DOCUMENT_UPLOAD = "document_upload"
    RESEARCH_STREAK = "research_streak"
    DOMAIN_EXPLORER = "domain_explorer"
    CITATION_MASTER = "citation_master"
    EARLY_ADOPTER = "early_adopter"
    KNOWLEDGE_SEEKER = "knowledge_seeker"
    POWER_USER = "power_user"


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
            description="Send your first message to RAG Scholar",
            points=20,
            target=1,
        ),
        Achievement(
            type=AchievementType.DOCUMENT_UPLOAD,
            name="Knowledge Sharer",
            description="Upload your first document",
            points=40,
            target=1,
        ),
        Achievement(
            type=AchievementType.RESEARCH_STREAK,
            name="Consistent Researcher",
            description="Use RAG Scholar for 7 consecutive days",
            points=100,
            target=7,
        ),
        Achievement(
            type=AchievementType.DOMAIN_EXPLORER,
            name="Domain Explorer",
            description="Try research in 3 different domains",
            points=60,
            target=3,
        ),
        Achievement(
            type=AchievementType.CITATION_MASTER,
            name="Citation Master",
            description="Receive 50 citation references in your research",
            points=75,
            target=50,
        ),
        Achievement(
            type=AchievementType.EARLY_ADOPTER,
            name="Early Adopter",
            description="One of the first 100 users of RAG Scholar",
            points=200,
            target=1,
        ),
        Achievement(
            type=AchievementType.KNOWLEDGE_SEEKER,
            name="Knowledge Seeker",
            description="Ask 25 research questions",
            points=80,
            target=25,
        ),
        Achievement(
            type=AchievementType.POWER_USER,
            name="Power User",
            description="Accumulate 300 total points",
            points=100,
            target=300,
        ),
    ]
