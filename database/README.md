# Database (PostgreSQL only)

```
createdb aegiscart
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/seed.sql
```
Then create the admin user inside `backend/`:

```
npm run create-admin
```

`schema.sql` drops and recreates every table, so running it again resets the database.
The seed file contains sample catalogue data only. The garment image URLs are placeholders:
Virtual Try-On needs real, publicly reachable garment photos (see the main README).

ER diagram and normalization notes: `docs/ER_DIAGRAM.md`.
