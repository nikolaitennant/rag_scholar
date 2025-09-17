"""User service for authentication and user management."""

import hashlib
import json
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import structlog

from ..config.settings import Settings
from ..models.user import (
    AchievementType,
    User,
    UserCreate,
    UserLogin,
    UserResponse,
    UserStats,
    UserUpdate,
    create_default_achievements,
)
from .cloud_storage import CloudStorageService

logger = structlog.get_logger()


class UserService:
    """Service for user authentication and management."""

    def __init__(self, settings: Settings | None = None, data_dir: Path | None = None) -> None:
        """Initialize user service with cloud storage support."""
        self.settings = settings
        self.cloud_storage = CloudStorageService(settings) if settings else None

        # Local fallback
        self.data_dir = data_dir or Path("data/users")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.users_file = self.data_dir / "users.json"
        self.tokens_file = self.data_dir / "tokens.json"

        # Load existing data
        self.users: dict[str, User] = self._load_users()
        self.tokens: dict[str, dict[str, Any]] = self._load_tokens()

    def _load_users(self) -> dict[str, User]:
        """Load users from cloud storage or local file."""
        data = None

        # Try cloud storage first
        if self.cloud_storage and self.cloud_storage.is_available():
            try:
                cloud_data = self.cloud_storage.download_json("data/users.json")
                if cloud_data:
                    data = cloud_data
                    logger.info("Loaded users from cloud storage")
            except Exception as e:
                logger.warning("Failed to load users from cloud storage", error=str(e))

        # Fallback to local file
        if not data:
            try:
                if self.users_file.exists():
                    with open(self.users_file) as f:
                        data = json.load(f)
                        logger.info("Loaded users from local file")
            except Exception as e:
                logger.warning("Failed to load users from local file", error=str(e))

        if data:
            try:
                return {uid: User(**user_data) for uid, user_data in data.items()}
            except Exception as e:
                logger.error("Failed to parse user data", error=str(e))

        return {}

    def _load_tokens(self) -> dict[str, dict[str, Any]]:
        """Load tokens from cloud storage or local file."""
        data = None

        # Try cloud storage first
        if self.cloud_storage and self.cloud_storage.is_available():
            try:
                cloud_data = self.cloud_storage.download_json("data/tokens.json")
                if cloud_data:
                    data = cloud_data
                    logger.info("Loaded tokens from cloud storage")
            except Exception as e:
                logger.warning("Failed to load tokens from cloud storage", error=str(e))

        # Fallback to local file
        if not data:
            try:
                if self.tokens_file.exists():
                    with open(self.tokens_file) as f:
                        data = json.load(f)
                        logger.info("Loaded tokens from local file")
            except Exception as e:
                logger.warning("Failed to load tokens from local file", error=str(e))

        return data or {}

    def _save_users(self) -> None:
        """Save users to JSON file."""
        try:
            data = {}
            for uid, user in self.users.items():
                # Convert user to dict, handling datetime serialization
                user_dict = user.model_dump()
                # Convert datetime fields to ISO strings
                for field in ["created_at", "updated_at"]:
                    if field in user_dict and user_dict[field]:
                        user_dict[field] = user_dict[field].isoformat()

                # Convert stats datetime fields
                if "stats" in user_dict and user_dict["stats"]:
                    stats = user_dict["stats"]
                    for field in ["last_activity", "joined_date"]:
                        if field in stats and stats[field]:
                            stats[field] = stats[field].isoformat()

                # Convert achievement datetime fields
                if "achievements" in user_dict:
                    for achievement in user_dict["achievements"]:
                        if "unlocked_at" in achievement and achievement["unlocked_at"]:
                            achievement["unlocked_at"] = achievement[
                                "unlocked_at"
                            ].isoformat()

                data[uid] = user_dict

            # Save to cloud storage if available
            cloud_saved = False
            if self.cloud_storage and self.cloud_storage.is_available():
                try:
                    cloud_saved = self.cloud_storage.upload_json(data, "data/users.json")
                    if cloud_saved:
                        logger.info("Saved users to cloud storage")
                except Exception as e:
                    logger.warning("Failed to save users to cloud storage", error=str(e))

            # Always save locally as backup/fallback
            try:
                with open(self.users_file, "w") as f:
                    json.dump(data, f, indent=2)
                if not cloud_saved:
                    logger.info("Saved users to local file")
            except Exception as e:
                logger.error("Failed to save users to local file", error=str(e))

        except Exception as e:
            logger.error("Failed to process user data for saving", error=str(e))

    def _save_tokens(self) -> None:
        """Save tokens to cloud storage and local file."""
        try:
            # Save to cloud storage if available
            cloud_saved = False
            if self.cloud_storage and self.cloud_storage.is_available():
                try:
                    cloud_saved = self.cloud_storage.upload_json(self.tokens, "data/tokens.json")
                    if cloud_saved:
                        logger.info("Saved tokens to cloud storage")
                except Exception as e:
                    logger.warning("Failed to save tokens to cloud storage", error=str(e))

            # Always save locally as backup/fallback
            try:
                with open(self.tokens_file, "w") as f:
                    json.dump(self.tokens, f, indent=2)
                if not cloud_saved:
                    logger.info("Saved tokens to local file")
            except Exception as e:
                logger.error("Failed to save tokens to local file", error=str(e))

        except Exception as e:
            logger.error("Failed to save tokens", error=str(e))

    def _hash_password(self, password: str) -> str:
        """Hash a password using SHA-256 with salt."""
        salt = secrets.token_hex(16)
        pwd_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return f"{salt}:{pwd_hash}"

    def _verify_password(self, password: str, hashed: str) -> bool:
        """Verify a password against its hash."""
        try:
            salt, pwd_hash = hashed.split(":", 1)
            return hashlib.sha256((password + salt).encode()).hexdigest() == pwd_hash
        except ValueError:
            return False

    def _generate_token(self) -> str:
        """Generate a secure random token."""
        return secrets.token_urlsafe(32)

    def _create_user_id(self, email: str) -> str:
        """Create a unique user ID based on email."""
        return f"user_{hashlib.sha256(email.encode()).hexdigest()[:12]}"

    async def register_user(self, user_data: UserCreate) -> UserResponse:
        """Register a new user."""
        # Check if user already exists
        user_id = self._create_user_id(user_data.email)
        if user_id in self.users:
            raise ValueError("User with this email already exists")

        # Check if email is already taken by another ID
        for existing_user in self.users.values():
            if existing_user.email == user_data.email:
                raise ValueError("User with this email already exists")

        # Create new user
        user = User(
            id=user_id,
            name=user_data.name,
            email=user_data.email,
            password_hash=self._hash_password(user_data.password),
            achievements=create_default_achievements(),
            stats=UserStats(joined_date=datetime.utcnow()),
        )

        # Check for early adopter achievement
        if len(self.users) < 100:
            await self._unlock_achievement(user, AchievementType.EARLY_ADOPTER)

        # Save user
        self.users[user_id] = user
        self._save_users()

        logger.info("User registered", user_id=user_id, email=user_data.email)
        return UserResponse(**user.model_dump())

    async def authenticate_user(self, login_data: UserLogin) -> UserResponse | None:
        """Authenticate a user and return user data."""
        user_id = self._create_user_id(login_data.email)
        user = self.users.get(user_id)

        if not user:
            logger.warning(
                "Authentication failed - user not found", email=login_data.email
            )
            raise ValueError("No account found with this email address")

        if not user.is_active:
            logger.warning(
                "Authentication failed - user inactive", email=login_data.email
            )
            raise ValueError("Account is deactivated")

        if not self._verify_password(login_data.password, user.password_hash):
            logger.warning(
                "Authentication failed - incorrect password", email=login_data.email
            )
            raise ValueError("Incorrect password")

        # Update last activity
        user.stats.last_activity = datetime.utcnow()
        self._save_users()

        logger.info("User authenticated", user_id=user_id, email=login_data.email)
        return UserResponse(**user.model_dump())

    async def create_token(self, user_id: str) -> str:
        """Create an authentication token for a user."""
        token = self._generate_token()
        self.tokens[token] = {
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat(),
        }
        self._save_tokens()
        return token

    async def verify_token(self, token: str) -> UserResponse | None:
        """Verify a token and return the associated user."""
        token_data = self.tokens.get(token)
        if not token_data:
            return None

        # Check if token is expired
        expires_at = datetime.fromisoformat(token_data["expires_at"])
        if datetime.utcnow() > expires_at:
            del self.tokens[token]
            self._save_tokens()
            return None

        # Get user
        user = self.users.get(token_data["user_id"])
        if not user or not user.is_active:
            return None

        return UserResponse(**user.model_dump())

    async def update_user(self, user_id: str, update_data: UserUpdate) -> UserResponse:
        """Update user information."""
        user = self.users.get(user_id)
        if not user:
            raise ValueError("User not found")

        # Update fields
        if update_data.name:
            user.name = update_data.name

        if update_data.bio is not None:
            user.profile.bio = update_data.bio

        if update_data.research_interests:
            user.profile.research_interests = update_data.research_interests

        if update_data.preferred_domains:
            user.profile.preferred_domains = update_data.preferred_domains

        if update_data.notification_preferences:
            user.profile.notification_preferences.update(
                update_data.notification_preferences
            )

        user.updated_at = datetime.utcnow()
        self._save_users()

        logger.info("User updated", user_id=user_id)
        return UserResponse(**user.model_dump())

    async def _unlock_achievement(
        self, user: User, achievement_type: AchievementType
    ) -> bool:
        """Unlock an achievement for a user."""
        for achievement in user.achievements:
            if achievement.type == achievement_type and not achievement.unlocked_at:
                achievement.unlocked_at = datetime.utcnow()
                user.stats.total_points += achievement.points
                logger.info(
                    "Achievement unlocked",
                    user_id=user.id,
                    achievement=achievement_type.value,
                    points=achievement.points,
                )
                return True
        return False

    async def update_user_stats(
        self, user_id: str, stat_type: str, increment: int = 1
    ) -> UserResponse | None:
        """Update user statistics and check for achievements."""
        user = self.users.get(user_id)
        if not user:
            return None

        # Update stats
        if stat_type == "chat":
            user.stats.total_chats += increment
            user.stats.last_activity = datetime.utcnow()

            # Check first chat achievement
            if user.stats.total_chats == 1:
                await self._unlock_achievement(user, AchievementType.FIRST_CHAT)

            # Check knowledge seeker achievement
            if user.stats.total_chats >= 100:
                await self._unlock_achievement(user, AchievementType.KNOWLEDGE_SEEKER)

        elif stat_type == "document_upload":
            user.stats.documents_uploaded += increment

            # Check document upload achievement
            if user.stats.documents_uploaded == 1:
                await self._unlock_achievement(user, AchievementType.DOCUMENT_UPLOAD)

        elif stat_type == "citation":
            user.stats.citations_received += increment

            # Check citation master achievement
            if user.stats.citations_received >= 50:
                await self._unlock_achievement(user, AchievementType.CITATION_MASTER)

        # Check power user achievement
        if user.stats.total_points >= 1000:
            await self._unlock_achievement(user, AchievementType.POWER_USER)

        self._save_users()
        return UserResponse(**user.model_dump())

    async def add_domain_explored(
        self, user_id: str, domain: str
    ) -> UserResponse | None:
        """Add a domain to user's explored domains."""
        user = self.users.get(user_id)
        if not user:
            return None

        if domain not in user.stats.domains_explored:
            user.stats.domains_explored.append(domain)

            # Check domain explorer achievement
            if len(user.stats.domains_explored) >= 3:
                await self._unlock_achievement(user, AchievementType.DOMAIN_EXPLORER)

        self._save_users()
        return UserResponse(**user.model_dump())

    async def get_user_by_id(self, user_id: str) -> UserResponse | None:
        """Get user by ID."""
        user = self.users.get(user_id)
        if not user or not user.is_active:
            return None
        return UserResponse(**user.model_dump())

    async def get_leaderboard(self, limit: int = 10) -> list[UserResponse]:
        """Get top users by points."""
        active_users = [user for user in self.users.values() if user.is_active]
        sorted_users = sorted(
            active_users, key=lambda u: u.stats.total_points, reverse=True
        )
        return [UserResponse(**user.model_dump()) for user in sorted_users[:limit]]

    async def change_password(
        self, user_id: str, current_password: str, new_password: str
    ) -> bool:
        """Change user password."""
        user = self.users.get(user_id)
        if not user:
            raise ValueError("User not found")

        # Verify current password using the same method as login
        if not self._verify_password(current_password, user.password_hash):
            raise ValueError("Current password is incorrect")

        # Generate new hash
        user.password_hash = self._hash_password(new_password)
        user.updated_at = datetime.utcnow()

        self._save_users()
        logger.info("Password changed successfully", user_id=user_id)
        return True


# Global service instance (will be initialized in dependencies)
user_service: UserService | None = None

def get_user_service(settings: Settings | None = None) -> UserService:
    """Get or create the global user service instance."""
    global user_service
    if user_service is None:
        user_service = UserService(settings)
    return user_service
