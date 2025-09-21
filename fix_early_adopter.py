#!/usr/bin/env python3
"""Fix early adopter status for existing users."""

import asyncio
import sys
import os

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from rag_scholar.services.user_profile import UserProfileService
from rag_scholar.config.settings import get_settings

async def fix_early_adopter():
    """Grant early adopter status to first user."""
    settings = get_settings()
    user_service = UserProfileService(settings)

    # You'll need to replace this with your actual user ID
    # You can find it by checking your auth token or Firestore console
    user_id = input("Enter your user ID: ")

    print(f"🔍 Checking user {user_id}...")

    # Get current profile
    profile = await user_service.get_user_profile(user_id)
    stats = profile.get('stats', {})

    print(f"📊 Current early adopter status: {stats.get('is_early_adopter', 'Not set')}")

    # Force early adopter status
    print("🎯 Setting early adopter status...")
    success = await user_service.update_user_stats(user_id, "is_early_adopter", 1)

    if success:
        print("✅ Early adopter status updated!")

        # Check achievements again
        updated_profile = await user_service.get_user_profile(user_id)
        achievements = updated_profile.get('achievements', [])

        early_adopter_ach = next((a for a in achievements if a.get('type') == 'early_adopter'), None)
        if early_adopter_ach:
            unlocked = early_adopter_ach.get('unlocked_at') is not None
            progress = early_adopter_ach.get('progress', 0)
            target = early_adopter_ach.get('target', 1)
            print(f"🏆 Early Adopter Achievement: {progress}/{target} {'✅ UNLOCKED' if unlocked else '🔒 Locked'}")
        else:
            print("❌ Early Adopter achievement not found")
    else:
        print("❌ Failed to update early adopter status")

if __name__ == "__main__":
    asyncio.run(fix_early_adopter())