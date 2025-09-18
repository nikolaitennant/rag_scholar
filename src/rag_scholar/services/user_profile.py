"""User profile and achievements service using Firestore."""

import structlog
from datetime import datetime
from google.cloud import firestore
from typing import Dict, List, Optional

from ..schemas.user import UserStats, UserProfile, Achievement, create_default_achievements

logger = structlog.get_logger()


class UserProfileService:
    """LangChain-compatible user profile service using Firestore."""

    def __init__(self, settings):
        self.settings = settings
        self.db = firestore.Client(project=settings.google_cloud_project)

    async def get_user_profile(self, user_id: str) -> Dict:
        """Get user profile data from Firestore using users/{user_id} structure."""
        try:
            doc_ref = self.db.collection("users").document(user_id)
            doc = doc_ref.get()

            if doc.exists:
                return doc.to_dict()
            else:
                # Create default profile for new user
                return await self._create_default_profile(user_id)

        except Exception as e:
            logger.error("Failed to get user profile", user_id=user_id, error=str(e))
            return {}

    async def _create_default_profile(self, user_id: str) -> Dict:
        """Create default user profile with achievements in users/{user_id} structure."""
        try:
            default_profile = {
                "stats": UserStats().model_dump(),
                "profile": UserProfile().model_dump(),
                "achievements": [ach.model_dump() for ach in create_default_achievements()],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }

            doc_ref = self.db.collection("users").document(user_id)
            doc_ref.set(default_profile)

            logger.info("Created default user profile", user_id=user_id)
            return default_profile

        except Exception as e:
            logger.error("Failed to create default profile", user_id=user_id, error=str(e))
            return {}

    async def update_user_stats(self, user_id: str, stat_name: str, increment: int = 1) -> bool:
        """Update user statistics and check for achievements."""
        try:
            doc_ref = self.db.collection("users").document(user_id)

            # Get current profile
            doc = doc_ref.get()
            if not doc.exists:
                await self._create_default_profile(user_id)
                doc = doc_ref.get()

            data = doc.to_dict()
            stats = data.get("stats", {})

            # Update the specific stat
            if stat_name in stats:
                stats[stat_name] += increment
            else:
                stats[stat_name] = increment

            # Update last activity
            stats["last_activity"] = datetime.utcnow()

            # Update document
            doc_ref.update({
                "stats": stats,
                "updated_at": datetime.utcnow()
            })

            # Check for achievements
            await self._check_achievements(user_id, stats)

            logger.info("Updated user stats",
                       user_id=user_id,
                       stat=stat_name,
                       new_value=stats.get(stat_name))
            return True

        except Exception as e:
            logger.error("Failed to update user stats",
                        user_id=user_id,
                        stat=stat_name,
                        error=str(e))
            return False

    async def _check_achievements(self, user_id: str, stats: Dict) -> None:
        """Check and unlock achievements based on stats."""
        try:
            doc_ref = self.db.collection("users").document(user_id)
            doc = doc_ref.get()

            if not doc.exists:
                return

            data = doc.to_dict()
            achievements = data.get("achievements", [])
            updated = False

            for ach in achievements:
                if ach.get("unlocked_at"):
                    continue  # Already unlocked

                # Check achievement conditions
                if await self._check_achievement_condition(ach, stats):
                    ach["unlocked_at"] = datetime.utcnow()
                    ach["progress"] = ach.get("target", 1)
                    updated = True

                    logger.info("Achievement unlocked!",
                               user_id=user_id,
                               achievement=ach.get("name"))

            if updated:
                doc_ref.update({
                    "achievements": achievements,
                    "updated_at": datetime.utcnow()
                })

        except Exception as e:
            logger.error("Failed to check achievements", user_id=user_id, error=str(e))

    async def _check_achievement_condition(self, achievement: Dict, stats: Dict) -> bool:
        """Check if achievement condition is met."""
        ach_type = achievement.get("type")
        target = achievement.get("target", 1)

        conditions = {
            "first_chat": stats.get("total_chats", 0) >= 1,
            "document_upload": stats.get("documents_uploaded", 0) >= 1,
            "research_streak": stats.get("streak_days", 0) >= target,
            "domain_explorer": len(stats.get("domains_explored", [])) >= target,
            "citation_master": stats.get("citations_received", 0) >= target,
            "knowledge_seeker": stats.get("total_chats", 0) >= target,
            "power_user": stats.get("total_points", 0) >= target
        }

        return conditions.get(ach_type, False)

    async def add_points(self, user_id: str, points: int) -> bool:
        """Add points to user total."""
        return await self.update_user_stats(user_id, "total_points", points)