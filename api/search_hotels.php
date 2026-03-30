<?php
/* ═══════════════════════════════════════════════════════════════
   api/search_hotels.php
   GET params: city (optional), priceMin, priceMax, stars (CSV)
   Returns:    { ok: true, hotels: [...] }
   ═══════════════════════════════════════════════════════════════ */
require_once __DIR__ . '/db.php';
corsHeaders();

$pdo = getDB();

$city     = trim($_GET['city']     ?? '');
$priceMin = isset($_GET['priceMin']) && $_GET['priceMin'] !== ''
            ? (float) $_GET['priceMin'] : null;
$priceMax = isset($_GET['priceMax']) && $_GET['priceMax'] !== ''
            ? (float) $_GET['priceMax'] : null;
$starsRaw = trim($_GET['stars'] ?? '');

/* ── Build query ─────────────────────────────────────────────── */
$conditions = [];
$namedParams = [];
$starList    = [];

if ($city !== '') {
    $conditions[]         = 'LOWER(h.city) LIKE LOWER(:city)';
    $namedParams[':city'] = '%' . $city . '%';
}
if ($priceMin !== null) {
    $conditions[]             = 'h.price_per_night >= :priceMin';
    $namedParams[':priceMin'] = $priceMin;
}
if ($priceMax !== null) {
    $conditions[]             = 'h.price_per_night <= :priceMax';
    $namedParams[':priceMax'] = $priceMax;
}
if ($starsRaw !== '') {
    $starList = array_values(array_filter(array_map('intval', explode(',', $starsRaw))));
    if ($starList) {
        $placeholders = implode(',', array_fill(0, count($starList), '?'));
        $conditions[] = "h.stars IN ($placeholders)";
    }
}

$where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

$sql = "
    SELECT
        h.id,
        h.hotel_name,
        h.city,
        h.address,
        h.stars,
        h.rating,
        h.review_count,
        h.price_per_night
    FROM hotels h
    $where
    ORDER BY h.rating DESC, h.review_count DESC
    LIMIT 60
";

try {
    $stmt = $pdo->prepare($sql);

    /* Bind named params (city, priceMin, priceMax) */
    foreach ($namedParams as $key => $val) {
        $stmt->bindValue($key, $val);
    }

    /* Bind positional params for IN clause (stars) */
    $posIdx = 1;
    foreach ($starList as $starVal) {
        $stmt->bindValue($posIdx++, $starVal, PDO::PARAM_INT);
    }

    $stmt->execute();
    $hotels = $stmt->fetchAll();

    jsonOk(['hotels' => $hotels, 'count' => count($hotels)]);

} catch (PDOException $e) {
    jsonError('Query failed: ' . $e->getMessage(), 500);
}