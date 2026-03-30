<?php

declare(strict_types=1);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/db.php';
corsHeaders();

$origin      = trim((string)($_GET['origin']      ?? ''));
$destination = trim((string)($_GET['destination'] ?? ''));
$priceMin    = isset($_GET['priceMin']) && $_GET['priceMin'] !== '' ? (float)$_GET['priceMin'] : null;
$priceMax    = isset($_GET['priceMax']) && $_GET['priceMax'] !== '' ? (float)$_GET['priceMax'] : null;

try {
    $pdo = getDB();

    $query = 'SELECT
                id,
                airline_name,
                airline_logo,
                flight_number,
                depart_time,
                arrive_time,
                origin,
                origin_name,
                origin_terminal,
                destination,
                destination_name,
                price,
                duration,
                is_cheapest,
                is_included,
                is_popular,
                is_best_value,
                is_fastest,
                is_recommended,
                is_limited_deal,
                round_trip
              FROM flights
              WHERE 1=1';

    $params = [];

    if ($origin !== '') {
        $query .= ' AND LOWER(origin) = LOWER(:origin)';
        $params[':origin'] = $origin;
    }
    if ($destination !== '') {
        $query .= ' AND LOWER(destination) = LOWER(:destination)';
        $params[':destination'] = $destination;
    }
    if ($priceMin !== null) {
        $query .= ' AND price >= :priceMin';
        $params[':priceMin'] = $priceMin;
    }
    if ($priceMax !== null) {
        $query .= ' AND price <= :priceMax';
        $params[':priceMax'] = $priceMax;
    }

    $query .= ' ORDER BY price ASC, depart_time ASC';

    $statement = $pdo->prepare($query);
    $statement->execute($params);

    $flights = $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];

    /* Cast numeric fields so JS gets proper types */
    foreach ($flights as &$f) {
        $f['price']           = (float) $f['price'];
        $f['is_cheapest']     = (int)   $f['is_cheapest'];
        $f['is_included']     = (int)   $f['is_included'];
        $f['is_popular']      = (int)   $f['is_popular'];
        $f['is_best_value']   = (int)   $f['is_best_value'];
        $f['is_fastest']      = (int)   $f['is_fastest'];
        $f['is_recommended']  = (int)   $f['is_recommended'];
        $f['is_limited_deal'] = (int)   $f['is_limited_deal'];
        $f['round_trip']      = (int)   $f['round_trip'];
    }
    unset($f);

    jsonOk([
        'origin'      => $origin,
        'destination' => $destination,
        'count'       => count($flights),
        'flights'     => array_values($flights),
    ]);

} catch (Throwable $error) {
    jsonError('Database error: ' . $error->getMessage(), 500);
}