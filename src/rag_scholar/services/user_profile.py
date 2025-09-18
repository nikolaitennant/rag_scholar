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
        """Get user profile with stats and achievements from optimal structure."""
        try:
            # Get profile data
            profile_ref = self.db.collection(f"users/{user_id}/profile").document("main")
            profile_doc = profile_ref.get()

            # Get stats data
            stats_ref = self.db.collection(f"users/{user_id}/stats").document("main")
            stats_doc = stats_ref.get()

            # Get achievements
            achievements_ref = self.db.collection(f"users/{user_id}/achievements")
            achievements_docs = achievements_ref.get()

            if not profile_doc.exists:
                # Create default profile if it doesn't exist
                return await self._create_default_profile(user_id)

            # Combine all data
            profile_data = profile_doc.to_dict() or {}
            stats_data = stats_doc.to_dict() or {}
            achievements_data = [doc.to_dict() for doc in achievements_docs]

            return {
                "profile": profile_data,
                "stats": stats_data,
                "achievements": achievements_data,
                "created_at": profile_data.get("created_at"),
                "updated_at": profile_data.get("updated_at")
            }
        except Exception as e:
            logger.error("Failed to get user profile", user_id=user_id, error=str(e))
            return {}

    async def _create_default_profile(self, user_id: str) -> Dict:
        """Create default user profile using optimal subcollection structure."""
        try:
            now = datetime.utcnow()

            # Create profile data
            profile_data = UserProfile().model_dump()
            profile_data.update({
                "created_at": now,
                "updated_at": now
            })

            # Create stats data
            stats_data = UserStats().model_dump()
            stats_data.update({
                "last_activity": now,
                "updated_at": now
            })

            # Set profile document
            profile_ref = self.db.collection(f"users/{user_id}/profile").document("main")
            profile_ref.set(profile_data)

            # Set stats document
            stats_ref = self.db.collection(f"users/{user_id}/stats").document("main")
            stats_ref.set(stats_data)

            # Create individual achievement documents
            achievements_ref = self.db.collection(f"users/{user_id}/achievements")
            default_achievements = create_default_achievements()

            for ach in default_achievements:
                ach_data = ach.model_dump()
                achievements_ref.document(ach.type.value).set(ach_data)

            logger.info("Created default user profile with optimal structure", user_id=user_id)

            return {
                "profile": profile_data,
                "stats": stats_data,
                "achievements": [ach.model_dump() for ach in default_achievements],
                "created_at": now,
                "updated_at": now
            }

        except Exception as e:
            logger.error("Failed to create default profile", user_id=user_id, error=str(e))
            return {}

    async def update_user_stats(self, user_id: str, stat_name: str, increment: int = 1) -> bool:
        """Update user statistics and check for achievements using optimal structure."""
        try:
            stats_ref = self.db.collection(f"users/{user_id}/stats").document("main")

            # Get current stats
            doc = stats_ref.get()
            if not doc.exists:
                await self._create_default_profile(user_id)
                doc = stats_ref.get()

            stats = doc.to_dict() or {}

            # Update the specific stat
            if stat_name in stats:
                stats[stat_name] += increment
            else:
                stats[stat_name] = increment

            # Update last activity
            stats["last_activity"] = datetime.utcnow()
            stats["updated_at"] = datetime.utcnow()

            # Update stats document
            stats_ref.set(stats)

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
        """Check and unlock achievements based on stats using optimal structure."""
        try:
            achievements_ref = self.db.collection(f"users/{user_id}/achievements")
            achievements_docs = achievements_ref.get()

            if not achievements_docs:
                return

            updated_achievements = []

            for doc in achievements_docs:
                ach = doc.to_dict()
                if ach.get("unlocked_at"):
                    continue  # Already unlocked

                # Check achievement conditions
                if await self._check_achievement_condition(ach, stats):
                    ach["unlocked_at"] = datetime.utcnow()
                    ach["progress"] = ach.get("target", 1)

                    # Update individual achievement document
                    doc.reference.set(ach)
                    updated_achievements.append(ach.get("name"))

                    logger.info("Achievement unlocked!",
                               user_id=user_id,
                               achievement=ach.get("name"))

            if updated_achievements:
                logger.info("Achievements updated",
                           user_id=user_id,
                           unlocked=updated_achievements)

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