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

            # Calculate total points from unlocked achievements
            stored_points = stats_data.get("total_points", 0)

            # Also calculate from achievements to ensure accuracy
            calculated_points = sum(
                ach.get("points", 0) for ach in achievements_data
                if ach.get("unlocked_at") is not None
            )

            # Use the higher value (in case of sync issues)
            total_points = max(stored_points, calculated_points)

            # Update stored points if calculated is higher
            if calculated_points > stored_points:
                stats_data["total_points"] = calculated_points
                stats_ref = self.db.collection(f"users/{user_id}/stats").document("main")
                stats_ref.set(stats_data)

            return {
                "profile": profile_data,
                "stats": {**stats_data, "total_points": total_points},
                "achievements": achievements_data,
                "total_points": total_points,
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

            # Check if user is early adopter (first 100 users)
            users_count_ref = self.db.collection("global_stats").document("user_count")
            users_count_doc = users_count_ref.get()

            if users_count_doc.exists:
                current_count = users_count_doc.to_dict().get("count", 0)
                is_early_adopter = 1 if current_count < 100 else 0
                users_count_ref.set({"count": current_count + 1})
            else:
                is_early_adopter = 1  # First user is definitely early adopter
                users_count_ref.set({"count": 1})

            # Create stats data
            stats_data = UserStats().model_dump()
            stats_data.update({
                "is_early_adopter": is_early_adopter,
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

            # Special handling for early adopter status
            if stat_name == "is_early_adopter":
                # Set directly, don't increment
                stats["is_early_adopter"] = increment
            else:
                # Update the specific stat normally
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
            total_points_earned = 0

            for doc in achievements_docs:
                ach = doc.to_dict()
                if not ach:
                    continue

                ach_type = ach.get("type")
                if not ach_type:
                    continue

                target = ach.get("target", 1)

                # Always update progress based on current stats
                current_progress = self._calculate_progress(ach_type, stats)
                ach["progress"] = min(current_progress, target)

                # Check if achievement should be unlocked
                was_unlocked = bool(ach.get("unlocked_at"))
                should_unlock = current_progress >= target

                if not was_unlocked and should_unlock:
                    ach["unlocked_at"] = datetime.utcnow()
                    points = ach.get("points", 0)
                    total_points_earned += points
                    updated_achievements.append(ach.get("name", "Unknown Achievement"))

                    logger.info("Achievement unlocked!",
                               user_id=user_id,
                               achievement=ach.get("name"),
                               points=points,
                               progress=f"{current_progress}/{target}")

                # Always update the achievement document with current progress
                doc.reference.set(ach)

            # Update total points if achievements were unlocked
            if total_points_earned > 0:
                await self._add_points_to_stats(user_id, total_points_earned)

                # Check for any additional achievements that may now qualify (like Power User)
                # Get updated stats after adding points
                stats_ref = self.db.collection(f"users/{user_id}/stats").document("main")
                updated_stats_doc = stats_ref.get()
                if updated_stats_doc.exists:
                    updated_stats = updated_stats_doc.to_dict() or {}
                    await self._check_achievements(user_id, updated_stats)

            # Always log achievement progress updates
            logger.info("Achievement progress updated",
                       user_id=user_id,
                       total_achievements=len(achievements_docs),
                       newly_unlocked=len(updated_achievements),
                       unlocked_names=updated_achievements,
                       points_earned=total_points_earned)

        except Exception as e:
            logger.error("Failed to check achievements", user_id=user_id, error=str(e))

    async def _check_achievement_condition(self, achievement: Dict, stats: Dict) -> bool:
        """Check if achievement condition is met."""
        ach_type = achievement.get("type")
        target = achievement.get("target", 1)

        conditions = {
            "first_chat": stats.get("total_chats", 0) >= 1,
            "upload_document": stats.get("documents_uploaded", 0) >= 1,
            "create_class": stats.get("classes_created", 0) >= 1,
            "ten_chats": stats.get("total_chats", 0) >= 10,
            "five_documents": stats.get("documents_uploaded", 0) >= 5,
            "hundred_questions": stats.get("total_chats", 0) >= 100,
            "three_classes": stats.get("classes_created", 0) >= 3,
            "early_bird": stats.get("early_bird_unlocked", 0) >= 1,
            "night_owl": stats.get("night_owl_unlocked", 0) >= 1,
            "week_streak": stats.get("streak_days", 0) >= 7,
        }

        return conditions.get(ach_type, False)

    def _calculate_progress(self, ach_type: str, stats: Dict) -> int:
        """Calculate current progress for an achievement type."""
        progress_map = {
            "first_chat": stats.get("total_chats", 0),
            "upload_document": stats.get("documents_uploaded", 0),
            "create_class": stats.get("classes_created", 0),
            "ten_chats": stats.get("total_chats", 0),
            "five_documents": stats.get("documents_uploaded", 0),
            "hundred_questions": stats.get("total_chats", 0),
            "three_classes": stats.get("classes_created", 0),
            "early_bird": stats.get("early_bird_unlocked", 0),
            "night_owl": stats.get("night_owl_unlocked", 0),
            "week_streak": stats.get("streak_days", 0),
        }
        return progress_map.get(ach_type or "", 0)

    async def _add_points_to_stats(self, user_id: str, points: int) -> bool:
        """Add points to user's total points without triggering achievement check."""
        try:
            stats_ref = self.db.collection(f"users/{user_id}/stats").document("main")
            doc = stats_ref.get()

            if doc.exists:
                stats = doc.to_dict() or {}
                current_points = stats.get("total_points", 0)
                stats["total_points"] = current_points + points
                stats["updated_at"] = datetime.utcnow()
                stats_ref.set(stats)

                logger.info("Added points to user",
                           user_id=user_id,
                           points_added=points,
                           total_points=stats["total_points"])
                return True
            return False
        except Exception as e:
            logger.error("Failed to add points", user_id=user_id, error=str(e))
            return False

    async def track_domain_exploration(self, user_id: str, domain_id: str) -> bool:
        """Track when user explores a new domain/class."""
        try:
            stats_ref = self.db.collection(f"users/{user_id}/stats").document("main")
            doc = stats_ref.get()

            if doc.exists:
                stats = doc.to_dict() or {}
                domains_explored = stats.get("domains_explored", [])

                # Add domain if not already explored
                if domain_id not in domains_explored:
                    domains_explored.append(domain_id)
                    stats["domains_explored"] = domains_explored
                    stats["updated_at"] = datetime.utcnow()
                    stats_ref.set(stats)

                    # Check for domain explorer achievement
                    await self._check_achievements(user_id, stats)

                    logger.info("Tracked domain exploration",
                               user_id=user_id,
                               domain_id=domain_id,
                               total_domains=len(domains_explored))
                return True
            return False
        except Exception as e:
            logger.error("Failed to track domain exploration", user_id=user_id, error=str(e))
            return False

    async def track_daily_activity(self, user_id: str) -> bool:
        """Track daily activity for streak calculations."""
        try:
            stats_ref = self.db.collection(f"users/{user_id}/stats").document("main")
            doc = stats_ref.get()

            if doc.exists:
                stats = doc.to_dict() or {}
                from datetime import datetime, date

                today = date.today()
                last_activity_date = None

                # Get last activity date
                if stats.get("last_activity_date"):
                    if isinstance(stats["last_activity_date"], str):
                        last_activity_date = datetime.fromisoformat(stats["last_activity_date"]).date()
                    else:
                        last_activity_date = stats["last_activity_date"]

                # Check if this is a new day of activity
                if last_activity_date != today:
                    # Update research_days count
                    research_days = stats.get("research_days", 0) + 1
                    stats["research_days"] = research_days

                    # Calculate streak
                    if last_activity_date and (today - last_activity_date).days == 1:
                        # Consecutive day - increment streak
                        stats["streak_days"] = stats.get("streak_days", 0) + 1
                    else:
                        # First day or gap - reset streak to 1
                        stats["streak_days"] = 1

                    stats["last_activity_date"] = today.isoformat()
                    stats["updated_at"] = datetime.utcnow()
                    stats_ref.set(stats)

                    # Check for streak achievements
                    await self._check_achievements(user_id, stats)

                    logger.info("Tracked daily activity",
                               user_id=user_id,
                               research_days=research_days,
                               streak_days=stats["streak_days"])
                return True
            return False
        except Exception as e:
            logger.error("Failed to track daily activity", user_id=user_id, error=str(e))
            return False

    async def track_time_based_achievements(self, user_id: str) -> bool:
        """Track early bird and night owl achievements based on time of day."""
        try:
            from datetime import datetime

            current_hour = datetime.utcnow().hour

            stats_ref = self.db.collection(f"users/{user_id}/stats").document("main")
            doc = stats_ref.get()

            if doc.exists:
                stats = doc.to_dict() or {}
                updated = False

                # Early Bird: before 6 AM (UTC)
                if current_hour < 6 and not stats.get("early_bird_unlocked"):
                    stats["early_bird_unlocked"] = 1
                    updated = True
                    logger.info("Early bird achievement unlocked!", user_id=user_id)

                # Night Owl: after 11 PM (UTC - 23:00 or later)
                if current_hour >= 23 and not stats.get("night_owl_unlocked"):
                    stats["night_owl_unlocked"] = 1
                    updated = True
                    logger.info("Night owl achievement unlocked!", user_id=user_id)

                if updated:
                    stats["updated_at"] = datetime.utcnow()
                    stats_ref.set(stats)
                    # Check achievements
                    await self._check_achievements(user_id, stats)

                return True
            return False
        except Exception as e:
            logger.error("Failed to track time-based achievements", user_id=user_id, error=str(e))
            return False

    async def add_points(self, user_id: str, points: int) -> bool:
        """Add points to user total."""
        return await self._add_points_to_stats(user_id, points)

    async def get_user_api_settings(self, user_id: str) -> Dict:
        """Get user's API settings from profile."""
        try:
            # Get API settings from profile document
            profile_ref = self.db.collection(f"users/{user_id}/profile").document("main")
            profile_doc = profile_ref.get()

            if profile_doc.exists:
                profile_data = profile_doc.to_dict() or {}
                return profile_data.get("api_settings", {})
            else:
                # Return empty dict if no profile exists
                return {}

        except Exception as e:
            logger.error("Failed to get user API settings", user_id=user_id, error=str(e))
            return {}

    async def update_user_api_settings(self, user_id: str, api_settings: Dict) -> bool:
        """Update user's API settings in profile."""
        try:
            # Update API settings in profile document
            profile_ref = self.db.collection(f"users/{user_id}/profile").document("main")

            # Get existing profile or create new one
            profile_doc = profile_ref.get()
            if profile_doc.exists:
                profile_data = profile_doc.to_dict() or {}
            else:
                profile_data = {
                    "created_at": datetime.utcnow().isoformat(),
                }

            # Update API settings
            profile_data["api_settings"] = api_settings
            profile_data["updated_at"] = datetime.utcnow().isoformat()

            # Save to Firestore
            profile_ref.set(profile_data)

            logger.info("Updated user API settings", user_id=user_id)
            return True

        except Exception as e:
            logger.error("Failed to update user API settings", user_id=user_id, error=str(e))
            return False

    async def update_user_profile_data(self, user_id: str, profile_data: Dict) -> bool:
        """Update user's profile data including bio, interests, domains, and profile image."""
        try:
            # Update profile data in profile document
            profile_ref = self.db.collection(f"users/{user_id}/profile").document("main")

            # Get existing profile or create new one
            profile_doc = profile_ref.get()
            if profile_doc.exists:
                existing_data = profile_doc.to_dict() or {}
            else:
                existing_data = {
                    "created_at": datetime.utcnow().isoformat(),
                }

            # Update with new data
            existing_data.update(profile_data)
            existing_data["updated_at"] = datetime.utcnow().isoformat()

            # Save to Firestore
            profile_ref.set(existing_data)

            logger.info("Updated user profile data", user_id=user_id, updated_fields=list(profile_data.keys()))
            return True

        except Exception as e:
            logger.error("Failed to update user profile data", user_id=user_id, error=str(e))
            return False