"""
Migration script to update achievements in Firebase Firestore.

This script updates all existing users to have the new achievement structure
that matches the iOS frontend.
"""

import sys
from pathlib import Path

# Add src to path
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from google.cloud import firestore
from rag_scholar.schemas.user import create_default_achievements
import structlog

logger = structlog.get_logger()


def migrate_achievements():
    """Migrate all users to new achievement structure."""

    # Initialize Firestore client
    db = firestore.Client(project="ragscholarai")

    # Get all users from Firebase Authentication
    from firebase_admin import auth, initialize_app

    try:
        initialize_app()
    except:
        pass

    # List all users
    page = auth.list_users()
    all_users = list(page.users)

    user_count = 0
    updated_count = 0

    for user in all_users:
        user_id = user.uid
        user_count += 1

        logger.info(f"Processing user {user_id}")

        try:
            # Get current achievements
            achievements_ref = db.collection(f"users/{user_id}/achievements")
            old_achievements = {doc.id: doc.to_dict() for doc in achievements_ref.stream()}

            # Get new default achievements
            new_achievements = create_default_achievements()

            # Map old achievement types to new ones where possible
            type_mapping = {
                "document_upload": "upload_document"
            }

            # Update achievements
            for new_ach in new_achievements:
                ach_type = new_ach.type.value
                old_type = type_mapping.get(ach_type, ach_type)

                # Check if old achievement exists
                if old_type in old_achievements:
                    old_ach = old_achievements[old_type]

                    # Preserve progress and unlock status
                    new_ach_data = new_ach.model_dump()
                    new_ach_data["progress"] = old_ach.get("progress", 0)
                    new_ach_data["unlocked_at"] = old_ach.get("unlocked_at")

                    # Set the achievement
                    achievements_ref.document(ach_type).set(new_ach_data)

                    # Delete old achievement if type changed
                    if old_type != ach_type:
                        achievements_ref.document(old_type).delete()
                else:
                    # New achievement - just create it
                    achievements_ref.document(ach_type).set(new_ach.model_dump())

            # Delete any obsolete achievements
            obsolete_types = set(old_achievements.keys()) - {ach.type.value for ach in new_achievements} - {"document_upload"}
            for obsolete_type in obsolete_types:
                achievements_ref.document(obsolete_type).delete()
                logger.info(f"Deleted obsolete achievement: {obsolete_type}")

            updated_count += 1
            logger.info(f"Updated achievements for user {user_id}")

        except Exception as e:
            logger.error(f"Failed to update user {user_id}: {str(e)}")
            continue

    logger.info(f"Migration complete! Processed {user_count} users, updated {updated_count} users")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Migrate achievements in Firebase")
    parser.add_argument("--confirm", action="store_true", help="Skip confirmation prompt")
    args = parser.parse_args()

    print("Starting achievement migration...")
    print("This will update all users in Firebase to have the new achievement structure.")

    if args.confirm:
        migrate_achievements()
        print("Migration complete!")
    else:
        try:
            response = input("Are you sure you want to continue? (yes/no): ")
            if response.lower() == "yes":
                migrate_achievements()
                print("Migration complete!")
            else:
                print("Migration cancelled.")
        except EOFError:
            print("\nMigration cancelled (no input provided).")
            print("Run with --confirm flag to skip prompt.")
