<?php

declare(strict_types=1);

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/db_connect.php';

try {
    $pdo = getDB();

    $statement = $pdo->query(
        'SELECT DISTINCT city
         FROM hotels
         WHERE city IS NOT NULL AND city <> ""
         ORDER BY city ASC'
    );

    $cities = $statement->fetchAll(PDO::FETCH_COLUMN) ?: [];

    echo json_encode([
        'ok'     => true,
        'cities' => array_values($cities),
    ]);

} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'ok'      => false,
        'message' => 'Database error',
        'error'   => $error->getMessage(),
    ]);
}