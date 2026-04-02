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

    // ── Check which date-related columns actually exist ──────────
    // This lets the query work regardless of your exact schema.
    $colStmt = $pdo->query("DESCRIBE flights");
    $cols     = array_column($colStmt->fetchAll(PDO::FETCH_ASSOC), 'Field');

    // Pick the best available date column (most specific first)
    $dateCol = null;
    foreach (['depart_date', 'departure_date', 'flight_date', 'date', 'depart_datetime', 'departure_datetime'] as $candidate) {
        if (in_array($candidate, $cols, true)) {
            $dateCol = $candidate;
            break;
        }
    }

    // Build the SELECT for the date — fallback to CURDATE() if no column found
    $dateSelect = $dateCol
        ? "{$dateCol} AS depart_date"
        : "CURDATE() AS depart_date";   // fallback: use today so booking page isn't broken

    // Same for return date
    $returnDateCol = null;
    foreach (['return_date', 'return_depart_date', 'ret_date'] as $candidate) {
        if (in_array($candidate, $cols, true)) {
            $returnDateCol = $candidate;
            break;
        }
    }
    $returnDateSelect = $returnDateCol
        ? "{$returnDateCol} AS return_date"
        : "NULL AS return_date";

    $query = "SELECT
                id,
                airline_name,
                airline_logo,
                flight_number,
                depart_time,
                arrive_time,
                {$dateSelect},
                {$returnDateSelect},
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
              WHERE 1=1";

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

        // ── Build full depart_datetime and arrive_datetime strings ──
        // These are what flight-booking.html and save_flight_booking.php need.
        $date       = $f['depart_date'] ?? date('Y-m-d');
        $departTime = $f['depart_time'] ?? '00:00:00';
        $arriveTime = $f['arrive_time'] ?? '00:00:00';

        // Normalise date to YYYY-MM-DD (handles both DATE and DATETIME columns)
        if ($date && strlen($date) > 10) {
            $date = substr($date, 0, 10);
        }

        $f['depart_datetime'] = $date . 'T' . substr($departTime, 0, 8);
        $f['arrive_datetime'] = $date . 'T' . substr($arriveTime, 0, 8);

        // Return leg datetime (only relevant for round trips)
        $retDate = $f['return_date'] ?? null;
        if ($retDate && strlen($retDate) > 10) $retDate = substr($retDate, 0, 10);
        if ($retDate) {
            $f['return_datetime'] = $retDate . 'T' . substr($arriveTime, 0, 8);
        }
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