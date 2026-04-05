<?php
// api/get_user_bookings.php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed.']);
    exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid JSON body.']);
    exit;
}

$email = trim($data['email'] ?? '');
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Valid email is required.']);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $pdo = getDB();
    $bookings = [];

    /* ── HOTEL BOOKINGS ── */
    $stmt = $pdo->prepare(
        'SELECT
            id, booking_ref, booking_status,
            hotel_name      AS title,
            hotel_city      AS subtitle,
            checkin_date    AS date_from,
            checkout_date   AS date_to,
            nights, rooms, guests,
            total_amount,
            created_at
         FROM hotel_bookings
         WHERE email = :email
         ORDER BY created_at DESC'
    );
    $stmt->execute([':email' => $email]);
    foreach ($stmt->fetchAll() as $row) {
        $row['type']     = 'hotel';
        $row['icon']     = 'fa-bed';
        $row['meta']     = $row['subtitle'] . ' · '
                         . formatDate($row['date_from']) . ' – ' . formatDate($row['date_to'])
                         . ' · ' . $row['nights'] . ' night' . ($row['nights'] > 1 ? 's' : '');
        $bookings[] = $row;
    }

    /* ── CAR BOOKINGS ── */
    $stmt = $pdo->prepare(
        'SELECT
            id, booking_ref, booking_status,
            car_name        AS title,
            car_brand       AS subtitle,
            pickup_datetime AS date_from,
            dropoff_datetime AS date_to,
            rental_days, pickup_location,
            total_amount,
            created_at
         FROM car_bookings
         WHERE email = :email
         ORDER BY created_at DESC'
    );
    $stmt->execute([':email' => $email]);
    foreach ($stmt->fetchAll() as $row) {
        $row['type']     = 'car';
        $row['icon']     = 'fa-car';
        $row['meta']     = $row['subtitle'] . ' · '
                         . formatDate($row['date_from']) . ' · '
                         . $row['rental_days'] . ' day' . ($row['rental_days'] > 1 ? 's' : '');
        $bookings[] = $row;
    }

    /* ── FLIGHT BOOKINGS ── */
    $stmt = $pdo->prepare(
        'SELECT
            id, booking_ref, booking_status,
            CONCAT(origin_iata, " → ", dest_iata) AS title,
            CONCAT(origin_city, " to ", dest_city) AS subtitle,
            depart_datetime AS date_from,
            arrive_datetime AS date_to,
            airline, flight_number, cabin_class,
            total_passengers,
            total_amount,
            created_at
         FROM flight_bookings
         WHERE contact_email = :email
         ORDER BY created_at DESC'
    );
    $stmt->execute([':email' => $email]);
    foreach ($stmt->fetchAll() as $row) {
        $row['type']     = 'flight';
        $row['icon']     = 'fa-plane';
        $row['meta']     = $row['airline'] . ' ' . $row['flight_number']
                         . ' · ' . formatDate($row['date_from'])
                         . ' · ' . $row['cabin_class'];
        $bookings[] = $row;
    }

    /* ── ATTRACTION BOOKINGS ── */
    $stmt = $pdo->prepare(
        'SELECT
            id, booking_ref, booking_status,
            attraction_name AS title,
            attraction_city AS subtitle,
            visit_date      AS date_from,
            NULL            AS date_to,
            adults, children, total_guests,
            total_amount,
            created_at
         FROM attraction_bookings
         WHERE email = :email
         ORDER BY created_at DESC'
    );
    $stmt->execute([':email' => $email]);
    foreach ($stmt->fetchAll() as $row) {
        $row['type']     = 'attraction';
        $row['icon']     = 'fa-ticket-alt';
        $row['meta']     = $row['subtitle'] . ' · ' . formatDate($row['date_from'])
                         . ' · ' . $row['total_guests'] . ' guest' . ($row['total_guests'] > 1 ? 's' : '');
        $bookings[] = $row;
    }

    /* ── TAXI BOOKINGS ── */
    $stmt = $pdo->prepare(
        'SELECT
            id, booking_ref, status AS booking_status,
            CONCAT(airport_city, " Transfer") AS title,
            airport_iata            AS subtitle,
            pickup_date             AS date_from,
            NULL                    AS date_to,
            vehicle_name, pickup_location,
            total_amount,
            created_at
         FROM taxi_bookings
         WHERE email = :email
         ORDER BY created_at DESC'
    );
    $stmt->execute([':email' => $email]);
    foreach ($stmt->fetchAll() as $row) {
        $row['type']     = 'taxi';
        $row['icon']     = 'fa-taxi';
        $row['meta']     = $row['vehicle_name'] . ' · ' . formatDate($row['date_from'])
                         . ' · ' . $row['pickup_location'];
        $bookings[] = $row;
    }

    /* ── SORT ALL BY created_at DESC ── */
    usort($bookings, function($a, $b) {
        return strtotime($b['created_at']) - strtotime($a['created_at']);
    });

    /* ── STATS ── */
    $totalBookings = count($bookings);
    $totalAmount   = array_sum(array_column($bookings, 'total_amount'));

    // Count hotel nights stayed (completed only)
    $nightsStayed = 0;
    $destinations = [];
    foreach ($bookings as $b) {
        if ($b['type'] === 'hotel' && $b['booking_status'] === 'completed') {
            $nightsStayed += (int)($b['nights'] ?? 0);
        }
        if (!empty($b['subtitle'])) {
            $destinations[] = $b['subtitle'];
        }
    }
    $uniqueDestinations = count(array_unique($destinations));

    echo json_encode([
        'ok'       => true,
        'bookings' => $bookings,
        'stats'    => [
            'total_bookings'      => $totalBookings,
            'nights_stayed'       => $nightsStayed,
            'unique_destinations' => $uniqueDestinations,
            'total_spent'         => number_format((float)$totalAmount, 2),
        ],
    ]);

} catch (PDOException $e) {
    error_log('get_user_bookings.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Server error.']);
}

/* ── DATE FORMATTER ── */
function formatDate(?string $date): string {
    if (!$date) return '—';
    $ts = strtotime($date);
    return $ts ? date('M j, Y', $ts) : $date;
}