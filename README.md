# platform-technologies-proj-v1

## MySQL (XAMPP) integration

This project now saves Search actions to MySQL for:
- Hotel & Homes
- Car Rental
- Flights
- Attractions & Tours
- Airport Taxis

### 1) Create database and table
1. Open `http://localhost/phpmyadmin`
2. Import [database/schema.sql](database/schema.sql)

This import now creates:
- `service_searches` (existing search tracker table)
- `hotels` (seeded with 6 sample hotel records)

Quick check in phpMyAdmin SQL tab:
```sql
SELECT hotel_name, city, address, price_per_night, rating
FROM hotels
ORDER BY city, hotel_name;
```

### 2) Put project under XAMPP web root
Serve this project through Apache (not `file://`), for example:
- `C:\xampp\htdocs\platform-technologies-proj-v1-main`

Open:
- `http://localhost/platform-technologies-proj-v1-main/index.html`

### 3) Configure DB connection (if needed)
Edit [api/db.php](api/db.php):
- host: `127.0.0.1`
- port: `3306`
- db: `easy_navigate`
- user: `root`
- password: `` (empty by default on local XAMPP)

### 4) API endpoint used by frontend
- [api/save_search.php](api/save_search.php)

Each click on a Search button sends JSON payload and stores one record in `service_searches`.
