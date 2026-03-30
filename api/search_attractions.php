<?php
// api/search_attractions.php
// ══════════════════════════════════════════════════════════
//  Searches attractions by keyword (name, city, category).
//  GET  api/search_attractions.php?q=bohol
//  GET  api/search_attractions.php?q=nature&city=Bohol
// ══════════════════════════════════════════════════════════

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/db_connect.php';

try {
    $pdo = getDB();
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'DB connection failed: ' . $e->getMessage()]);
    exit;
}

// ── IMAGE MAP ─────────────────────────────────────────────
$imageMap = [
    1 => ['attractions/bohol_1.png', 'attractions/bohol_2.png', 'attractions/bohol_3.png'],
    2 => ['attractions/coron_1.png', 'attractions/coron_2.png', 'attractions/coron_3.png'],
    3 => ['attractions/elnido_1.png', 'attractions/elnido_2.png', 'attractions/elnido_3.png', 'attractions/elnido_4.png', 'attractions/elnido_5.png'],
    4 => ['attractions/manila_bay_1.png'],
    5 => ['attractions/pandin_lake_laguna_1.png'],
    6 => ['attractions/puerto_princesa_1.png', 'attractions/puerto_princesa_2.png', 'attractions/puerto_princesa_3.png'],
    7 => ['attractions/sto_nino_cold_springs_1.png'],
    8 => ['attractions/taal_volcano_1.png'],
    9 => ['attractions/white_water_kayaking_cagayan_1.png'],
];

$snippetMap = [
    1 => 'Marvel at over 1,700 perfectly cone-shaped hills blanketed in chocolate-brown grass during the dry season.',
    2 => "Explore crystal-clear lagoons, WWII wrecks, and pristine beaches in one of the world's top dive destinations.",
    3 => 'Navigate towering limestone karsts, secret lagoons, and hidden beaches across the Bacuit Archipelago.',
    4 => "Stroll along the iconic Roxas Boulevard boardwalk and witness Manila's legendary golden sunsets over the bay.",
    5 => 'Drift across the serene twin crater lakes on a bamboo raft while local boatmen share stories of the area.',
    6 => "Paddle through a UNESCO World Heritage cave system, one of the world's longest navigable underground rivers.",
    7 => 'Soak in naturally cold freshwater springs surrounded by lush volcanic island greenery at an unbeatable price.',
    8 => "Hike or ride to the crater of one of the world's smallest active volcanoes set within a lake inside a lake.",
    9 => "Paddle through thrilling rapids on the legendary Cagayan River — the Philippines' most exciting whitewater run.",
];

$tripbestMap = [
    1 => 'No. 1 of Best Things to Do in Bohol',
    2 => 'No. 1 of Best Things to Do in Coron',
    3 => 'No. 1 of Best Things to Do in El Nido',
    4 => 'No. 3 of Best Things to Do in Manila',
    5 => null,
    6 => 'No. 1 of Best Things to Do in Puerto Princesa',
    7 => null,
    8 => 'No. 2 of Best Things to Do in Tagaytay',
    9 => 'No. 1 of Best Things to Do in CDO',
];

$instantMap = [
    1 => true, 2 => true, 3 => true, 4 => false,
    5 => true, 6 => true, 7 => false, 8 => true, 9 => true,
];

try {
    $where  = [];
    $params = [];

    // Keyword search across name, city, location, category
    $q = isset($_GET['q']) ? trim($_GET['q']) : '';
    if ($q !== '') {
        $where[] = '(name LIKE :q OR city LIKE :q2 OR location LIKE :q3 OR category LIKE :q4)';
        $params[':q']  = '%' . $q . '%';
        $params[':q2'] = '%' . $q . '%';
        $params[':q3'] = '%' . $q . '%';
        $params[':q4'] = '%' . $q . '%';
    }

    $city = isset($_GET['city']) ? trim($_GET['city']) : '';
    if ($city !== '') {
        $where[]         = 'city LIKE :city';
        $params[':city'] = '%' . $city . '%';
    }

    $category = isset($_GET['category']) ? trim($_GET['category']) : '';
    if ($category !== '') {
        $where[]             = 'category = :category';
        $params[':category'] = $category;
    }

    $sql = 'SELECT id, name, location, city, country, image,
                   price, rating, reviews, duration, category,
                   is_popular, is_recommended, is_best_value, is_free_cancellation
            FROM attractions';

    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $sql .= ' ORDER BY is_popular DESC, rating DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $attractions = array_map(function ($row) use ($imageMap, $snippetMap, $tripbestMap, $instantMap) {
        $id = (int) $row['id'];
        $row['id']                   = $id;
        $row['price']                = (int)   $row['price'];
        $row['rating']               = (float) $row['rating'];
        $row['reviews']              = (int)   $row['reviews'];
        $row['is_popular']           = (bool)  $row['is_popular'];
        $row['is_recommended']       = (bool)  $row['is_recommended'];
        $row['is_best_value']        = (bool)  $row['is_best_value'];
        $row['is_free_cancellation'] = (bool)  $row['is_free_cancellation'];
        $row['images']               = $imageMap[$id]   ?? ['attractions/' . ($row['image'] ?? '')];
        $row['snippet']              = $snippetMap[$id]  ?? '';
        $row['tripbest']             = $tripbestMap[$id] ?? null;
        $row['instant']              = $instantMap[$id]  ?? false;
        unset($row['image']);
        return $row;
    }, $rows);

    echo json_encode([
        'ok'          => true,
        'count'       => count($attractions),
        'attractions' => $attractions,
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Query error: ' . $e->getMessage()]);
}