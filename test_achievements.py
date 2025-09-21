#!/usr/bin/env python3
"""Simple test script to check achievement updates."""

import asyncio
import sys
import os

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from rag_scholar.services.user_profile import UserProfileService
from rag_scholar.config.settings import get_settings

async def test_achievement_update():
    """Test achievement update for a user."""
    settings = get_settings()
    user_service = UserProfileService(settings)

    # Test user ID (replace with actual user ID from your system)
    test_user_id = "test_user_123"

    print("🔍 Testing achievement updates...")

    # Get current profile
    profile = await user_service.get_user_profile(test_user_id)
    print(f"📊 Current stats: {profile.get('stats', {})}")
    print(f"🏆 Current achievements: {len(profile.get('achievements', []))} total")

    # Test updating stats
    print("\n📈 Updating document upload stat...")
    success = await user_service.update_user_stats(test_user_id, "documents_uploaded", 1)
    print(f"✅ Update successful: {success}")

    # Check updated profile
    updated_profile = await user_service.get_user_profile(test_user_id)
    print(f"📊 Updated stats: {updated_profile.get('stats', {})}")

    # Check achievement progress
    achievements = updated_profile.get('achievements', [])
    for ach in achievements:
        progress = ach.get('progress', 0)
        target = ach.get('target', 1)
        unlocked = ach.get('unlocked_at') is not None
        print(f"🏆 {ach.get('name')}: {progress}/{target} {'✅ UNLOCKED' if unlocked else '🔒 Locked'}")

if __name__ == "__main__":
    asyncio.run(test_achievement_update())