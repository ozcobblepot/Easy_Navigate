<?php
/* ═══════════════════════════════════════════════════════════════
   api/get_hotels.php
   Returns all distinct cities from the hotels table.
   Used by the destination dropdown on the hotel search page.
   ═══════════════════════════════════════════════════════════════ */

declare(strict_types=1);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/db.php';
corsHeaders();

try {
    $pdo = getDB();

    $statement = $pdo->query(
        'SELECT DISTINCT city
         FROM hotels
         WHERE city IS NOT NULL AND city <> ""
         ORDER BY city ASC'
    );

    $cities = $statement->fetchAll(PDO::FETCH_COLUMN) ?: [];

    jsonOk(['cities' => array_values($cities)]);

} catch (Throwable $error) {
    jsonError('Database error: ' . $error->getMessage(), 500);
}