<?php
/* ═══════════════════════════════════════════════════════════════
   api/search_hotels.php
   GET params: city (optional), priceMin, priceMax, stars (CSV)
   Returns:    { ok: true, hotels: [...] }
   ═══════════════════════════════════════════════════════════════ */
require_once __DIR__ . '/db.php';
corsHeaders();

$pdo      = getDB();
$city     = trim($_GET['city']     ?? '');
$priceMin = $_GET['priceMin'] !== null && $_GET['priceMin'] !== ''
            ? (float) $_GET['priceMin'] : null;
$priceMax = $_GET['priceMax'] !== null && $_GET['priceMax'] !== ''
            ? (float) $_GET['priceMax'] : null;
$starsRaw = trim($_GET['stars'] ?? '');

/* ── Build query ─────────────────────────────────────────────── */
$conditions = [];
$params     = [];

if ($city !== '') {
    $conditions[] = 'LOWER(h.city) LIKE LOWER(:city)';
    $params[':city'] = '%' . $city . '%';
}
if ($priceMin !== null) {
    $conditions[] = 'h.price_per_night >= :priceMin';
    $params[':priceMin'] = $priceMin;
}
if ($priceMax !== null) {
    $conditions[] = 'h.price_per_night <= :priceMax';
    $params[':priceMax'] = $priceMax;
}
if ($starsRaw !== '') {
    $starList = array_filter(array_map('intval', explode(',', $starsRaw)));
    if ($starList) {
        $placeholders = implode(',', array_fill(0, count($starList), '?'));
        $conditions[] = "h.stars IN ($placeholders)";
        array_push($params, ...$starList);
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
        h.price_per_night,
        h.description
    FROM hotels h
    $where
    ORDER BY h.rating DESC, h.review_count DESC
    LIMIT 60
";

try {
    $stmt = $pdo->prepare($sql);

    /* Bind named params first, then positional (stars) */
    foreach ($params as $key => $val) {
        if (is_string($key)) {
            $stmt->bindValue($key, $val);
        }
    }
    /* Re-bind positional params for the IN clause */
    $posIdx = 1;
    foreach ($params as $key => $val) {
        if (is_int($key)) {
            $stmt->bindValue($posIdx++, $val, PDO::PARAM_INT);
        }
    }

    $stmt->execute();
    $hotels = $stmt->fetchAll();

    jsonOk(['hotels' => $hotels, 'count' => count($hotels)]);

} catch (PDOException $e) {
    jsonError('Query failed: ' . $e->getMessage(), 500);
}