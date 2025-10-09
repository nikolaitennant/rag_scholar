"""
Sync class achievements for existing users.

This script counts existing classes and updates the user stats and achievements accordingly.
"""

import asyncio
from google.cloud import firestore
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.rag_scholar.config.settings import get_settings
from src.rag_scholar.services.user_profile import UserProfileService


async def sync_class_achievements(user_id: str):
    """Sync class achievements for a specific user."""
    settings = get_settings()
    db = firestore.Client(project=settings.google_cloud_project)
    user_service = UserProfileService(settings)

    # Count classes for this user
    classes_ref = db.collection(f"users/{user_id}/classes")
    classes_docs = classes_ref.get()
    class_count = len(classes_docs)

    print(f"User {user_id} has {class_count} classes")

    if class_count > 0:
        # Get current stats
        stats_ref = db.collection(f"users/{user_id}/stats").document("main")
        stats_doc = stats_ref.get()

        if stats_doc.exists:
            stats = stats_doc.to_dict() or {}
            current_count = stats.get("classes_created", 0)
            print(f"Current classes_created stat: {current_count}")

            # Update to match actual class count
            stats["classes_created"] = class_count
            stats_ref.set(stats)
            print(f"Updated classes_created to {class_count}")

            # Trigger achievement check
            await user_service._check_achievements(user_id, stats)
            print("Achievement check triggered")
        else:
            print("Stats document doesn't exist!")
    else:
        print("No classes found")


async def main():
    """Main function."""
    if len(sys.argv) < 2:
        print("Usage: python sync_class_achievements.py <user_id>")
        sys.exit(1)

    user_id = sys.argv[1]
    await sync_class_achievements(user_id)


if __name__ == "__main__":
    asyncio.run(main())
