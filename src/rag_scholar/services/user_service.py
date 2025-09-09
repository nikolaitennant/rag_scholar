"""User service for authentication and user management."""

import json
import hashlib
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import structlog

from ..models.user import (
    User, UserCreate, UserLogin, UserResponse, UserUpdate, AuthToken,
    Achievement, AchievementType, UserStats, create_default_achievements
)

logger = structlog.get_logger()


class UserService:
    """Service for user authentication and management."""
    
    def __init__(self, data_dir: Path = None):
        """Initialize user service with data directory."""
        self.data_dir = data_dir or Path("data/users")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.users_file = self.data_dir / "users.json"
        self.tokens_file = self.data_dir / "tokens.json"
        
        # Load existing data
        self.users: Dict[str, User] = self._load_users()
        self.tokens: Dict[str, Dict] = self._load_tokens()
        
    def _load_users(self) -> Dict[str, User]:
        """Load users from JSON file."""
        try:
            if self.users_file.exists():
                with open(self.users_file, 'r') as f:
                    data = json.load(f)
                    return {uid: User(**user_data) for uid, user_data in data.items()}
        except Exception as e:
            logger.warning("Failed to load users", error=str(e))
        return {}
    
    def _load_tokens(self) -> Dict[str, Dict]:
        """Load tokens from JSON file."""
        try:
            if self.tokens_file.exists():
                with open(self.tokens_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.warning("Failed to load tokens", error=str(e))
        return {}
    
    def _save_users(self):
        """Save users to JSON file."""
        try:
            data = {}
            for uid, user in self.users.items():
                # Convert user to dict, handling datetime serialization
                user_dict = user.model_dump()
                # Convert datetime fields to ISO strings
                for field in ['created_at', 'updated_at']:
                    if field in user_dict and user_dict[field]:
                        user_dict[field] = user_dict[field].isoformat()
                
                # Convert stats datetime fields
                if 'stats' in user_dict and user_dict['stats']:
                    stats = user_dict['stats']
                    for field in ['last_activity', 'joined_date']:
                        if field in stats and stats[field]:
                            stats[field] = stats[field].isoformat()
                
                # Convert achievement datetime fields
                if 'achievements' in user_dict:
                    for achievement in user_dict['achievements']:
                        if 'unlocked_at' in achievement and achievement['unlocked_at']:
                            achievement['unlocked_at'] = achievement['unlocked_at'].isoformat()
                
                data[uid] = user_dict
            
            with open(self.users_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error("Failed to save users", error=str(e))
    
    def _save_tokens(self):
        """Save tokens to JSON file."""
        try:
            with open(self.tokens_file, 'w') as f:
                json.dump(self.tokens, f, indent=2)
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
            salt, pwd_hash = hashed.split(':', 1)
            return hashlib.sha256((password + salt).encode()).hexdigest() == pwd_hash
        except ValueError:
            return False
    
    def _generate_token(self) -> str:
        """Generate a secure random token."""
        return secrets.token_urlsafe(32)
    
    def _create_user_id(self, email: str) -> str:
        """Create a unique user ID based on email."""
        return f"user_{hashlib.md5(email.encode()).hexdigest()[:12]}"
    
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
            stats=UserStats(joined_date=datetime.utcnow())
        )
        
        # Check for early adopter achievement
        if len(self.users) < 100:
            await self._unlock_achievement(user, AchievementType.EARLY_ADOPTER)
        
        # Save user
        self.users[user_id] = user
        self._save_users()
        
        logger.info("User registered", user_id=user_id, email=user_data.email)
        return UserResponse(**user.model_dump())
    
    async def authenticate_user(self, login_data: UserLogin) -> Optional[UserResponse]:
        """Authenticate a user and return user data."""
        user_id = self._create_user_id(login_data.email)
        user = self.users.get(user_id)
        
        if not user:
            logger.warning("Authentication failed - user not found", email=login_data.email)
            raise ValueError("No account found with this email address")
        
        if not user.is_active:
            logger.warning("Authentication failed - user inactive", email=login_data.email)
            raise ValueError("Account is deactivated")
        
        if not self._verify_password(login_data.password, user.password_hash):
            logger.warning("Authentication failed - incorrect password", email=login_data.email)
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
            "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat()
        }
        self._save_tokens()
        return token
    
    async def verify_token(self, token: str) -> Optional[UserResponse]:
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
            user.profile.notification_preferences.update(update_data.notification_preferences)
        
        user.updated_at = datetime.utcnow()
        self._save_users()
        
        logger.info("User updated", user_id=user_id)
        return UserResponse(**user.model_dump())
    
    async def _unlock_achievement(self, user: User, achievement_type: AchievementType) -> bool:
        """Unlock an achievement for a user."""
        for achievement in user.achievements:
            if achievement.type == achievement_type and not achievement.unlocked_at:
                achievement.unlocked_at = datetime.utcnow()
                user.stats.total_points += achievement.points
                logger.info("Achievement unlocked", 
                          user_id=user.id, 
                          achievement=achievement_type.value,
                          points=achievement.points)
                return True
        return False
    
    async def update_user_stats(self, user_id: str, stat_type: str, increment: int = 1) -> Optional[UserResponse]:
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
    
    async def add_domain_explored(self, user_id: str, domain: str) -> Optional[UserResponse]:
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
    
    async def get_user_by_id(self, user_id: str) -> Optional[UserResponse]:
        """Get user by ID."""
        user = self.users.get(user_id)
        if not user or not user.is_active:
            return None
        return UserResponse(**user.model_dump())
    
    async def get_leaderboard(self, limit: int = 10) -> List[UserResponse]:
        """Get top users by points."""
        active_users = [user for user in self.users.values() if user.is_active]
        sorted_users = sorted(active_users, key=lambda u: u.stats.total_points, reverse=True)
        return [UserResponse(**user.model_dump()) for user in sorted_users[:limit]]
    
    async def change_password(self, user_id: str, current_password: str, new_password: str) -> bool:
        """Change user password."""
        user = self.users.get(user_id)
        if not user:
            raise ValueError("User not found")
        
        # Verify current password
        pwd_hash = hashlib.sha256((current_password + user.password_salt).encode()).hexdigest()
        if pwd_hash != user.password_hash:
            raise ValueError("Current password is incorrect")
        
        # Generate new salt and hash
        new_salt = secrets.token_hex(16)
        new_hash = hashlib.sha256((new_password + new_salt).encode()).hexdigest()
        
        # Update password
        user.password_hash = new_hash
        user.password_salt = new_salt
        user.updated_at = datetime.utcnow()
        
        self._save_users()
        logger.info("Password changed successfully", user_id=user_id)
        return True


# Global service instance
user_service = UserService()