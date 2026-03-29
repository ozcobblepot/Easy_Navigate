<?php
declare(strict_types=1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// ── FIXED: use shared db_connect.php (getDB) for consistency ──
require_once __DIR__ . '/db_connect.php';

/* ── Read JSON body ── */
$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON body']);
    exit;
}

/* ── Helpers ── */
function str(array $d, string $key, string $default = ''): string {
    return trim((string)($d[$key] ?? $default));
}
function num(array $d, string $key, float $default = 0): float {
    return (float)($d[$key] ?? $default);
}
function intv(array $d, string $key, int $default = 0): int {
    return (int)($d[$key] ?? $default);
}

/* ── Required field check ── */
$required = ['first_name', 'last_name', 'email', 'phone'];
foreach ($required as $field) {
    if (empty(trim((string)($data[$field] ?? '')))) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
        exit;
    }
}

/* ── Generate booking ref if not provided ── */
$bookingRef = str($data, 'booking_ref');
if (!$bookingRef) {
    $bookingRef = 'TX-' . strtoupper(substr(md5(uniqid((string)rand(), true)), 0, 8));
}

try {
    $pdo = getDB();

    $stmt = $pdo->prepare("
        INSERT INTO taxi_bookings (
            booking_ref,
            first_name, last_name, email, phone, whatsapp,
            airport_iata, airport_city, airport_terminal,
            pickup_location, dropoff_location,
            pickup_date, pickup_time,
            adults, children, infants,
            vehicle_type, vehicle_name, max_seats, max_bags,
            transfer_fee, meet_greet_fee, service_fee, total_amount,
            payment_method, status
        ) VALUES (
            :booking_ref,
            :first_name, :last_name, :email, :phone, :whatsapp,
            :airport_iata, :airport_city, :airport_terminal,
            :pickup_location, :dropoff_location,
            :pickup_date, :pickup_time,
            :adults, :children, :infants,
            :vehicle_type, :vehicle_name, :max_seats, :max_bags,
            :transfer_fee, :meet_greet_fee, :service_fee, :total_amount,
            :payment_method, 'confirmed'
        )
    ");

    $stmt->execute([
        ':booking_ref'      => $bookingRef,
        ':first_name'       => str($data, 'first_name'),
        ':last_name'        => str($data, 'last_name'),
        ':email'            => str($data, 'email'),
        ':phone'            => str($data, 'phone'),
        ':whatsapp'         => str($data, 'whatsapp'),
        ':airport_iata'     => str($data, 'airport_iata'),
        ':airport_city'     => str($data, 'airport_city'),
        ':airport_terminal' => str($data, 'airport_terminal'),
        ':pickup_location'  => str($data, 'pickup_location'),
        ':dropoff_location' => str($data, 'dropoff_location'),
        ':pickup_date'      => str($data, 'pickup_date') ?: null,
        ':pickup_time'      => str($data, 'pickup_time'),
        ':adults'           => intv($data, 'adults', 1),
        ':children'         => intv($data, 'children'),
        ':infants'          => intv($data, 'infants'),
        ':vehicle_type'     => str($data, 'vehicle_type', 'comfort'),
        ':vehicle_name'     => str($data, 'vehicle_name'),
        ':max_seats'        => intv($data, 'max_seats', 4),
        ':max_bags'         => intv($data, 'max_bags', 3),
        ':transfer_fee'     => num($data, 'transfer_fee'),
        ':meet_greet_fee'   => num($data, 'meet_greet_fee'),
        ':service_fee'      => num($data, 'service_fee'),
        ':total_amount'     => num($data, 'total_amount'),
        ':payment_method'   => str($data, 'payment_method', 'card'),
    ]);

    echo json_encode([
        'success'     => true,
        'message'     => 'Taxi booking confirmed',
        'booking_ref' => $bookingRef,
        'id'          => (int) $pdo->lastInsertId(),
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error',
        'error'   => $e->getMessage(),
    ]);
}