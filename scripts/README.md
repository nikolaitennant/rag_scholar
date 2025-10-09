# Database Migration Scripts

## Achievement Migration

To update all existing users to the new achievement structure:

```bash
# Make sure you're authenticated with Google Cloud
gcloud auth application-default login

# Set the project
export GOOGLE_CLOUD_PROJECT=ragscholarai

# Run the migration
python scripts/migrate_achievements.py
```

This script will:
- Update all users' achievements to match the new iOS frontend structure
- Preserve existing progress and unlock status where possible
- Map old achievement types to new ones (e.g., `document_upload` → `upload_document`)
- Add any new achievements that didn't exist before
- Remove obsolete achievements

**Note:** Always test in a development environment first before running in production!

## For New Users

New users will automatically get the updated achievement structure when they sign up. No migration needed.
