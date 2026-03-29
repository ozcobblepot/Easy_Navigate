<?php
// api/save_attraction_booking.php
// ══════════════════════════════════════════════════════════
//  Saves an attraction booking to the attraction_bookings table.
//  Called via POST from attraction-booking.html
// ══════════════════════════════════════════════════════════

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo json_encode(['success'=>false,'message'=>'Method not allowed']); exit; }

// ── FIXED: use shared connection instead of hardcoded credentials ──
require_once __DIR__ . '/db_connect.php';

try {
    $pdo = getDB();
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'DB connection failed: '.$e->getMessage()]);
    exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!$data) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'Invalid JSON body']);
    exit;
}

function req($data, $key) {
    $v = isset($data[$key]) ? trim($data[$key]) : '';
    if ($v === '') throw new InvalidArgumentException("Missing required field: $key");
    return $v;
}
function opt($data, $key, $default = '') {
    return isset($data[$key]) ? trim($data[$key]) : $default;
}

try {
    $firstName         = req($data, 'first_name');
    $lastName          = req($data, 'last_name');
    $email             = req($data, 'email');
    $phone             = req($data, 'phone');

    $attractionId      = intval(opt($data, 'attraction_id', 0));
    $attractionName    = req($data, 'attraction_name');
    $attractionCity    = opt($data, 'attraction_city', '');
    $attractionCountry = opt($data, 'attraction_country', 'Philippines');
    $category          = opt($data, 'category', '');

    $visitDate         = req($data, 'visit_date');
    $adults            = max(1, intval(opt($data, 'adults',   1)));
    $children          = max(0, intval(opt($data, 'children', 0)));
    $infants           = max(0, intval(opt($data, 'infants',  0)));
    $totalGuests       = $adults + $children + $infants;

    $pricePerPerson    = floatval(opt($data, 'price_per_person', 0));
    $totalAmount       = floatval(opt($data, 'total_amount', 0));
    $isFree            = $pricePerPerson == 0 ? 1 : 0;

    $specialRequests   = opt($data, 'special_requests', '');
    $paymentMethod     = opt($data, 'payment_method', 'card');
    $bookingRef        = opt($data, 'booking_ref', 'AT-'.strtoupper(substr(md5(uniqid()),0,8)));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('Invalid email address');
    if (!strtotime($visitDate)) throw new InvalidArgumentException('Invalid visit date');
    if (!in_array($paymentMethod, ['card','other'])) $paymentMethod = 'card';

    $stmt = $pdo->prepare("
        INSERT INTO attraction_bookings
            (first_name, last_name, email, phone,
             attraction_id, attraction_name, attraction_city, attraction_country, category,
             visit_date, adults, children, infants, total_guests,
             price_per_person, total_amount, is_free,
             special_requests, payment_method, booking_ref, booking_status)
        VALUES
            (:first_name, :last_name, :email, :phone,
             :attraction_id, :attraction_name, :attraction_city, :attraction_country, :category,
             :visit_date, :adults, :children, :infants, :total_guests,
             :price_per_person, :total_amount, :is_free,
             :special_requests, :payment_method, :booking_ref, 'confirmed')
    ");

    $stmt->execute([
        ':first_name'         => $firstName,
        ':last_name'          => $lastName,
        ':email'              => $email,
        ':phone'              => $phone,
        ':attraction_id'      => $attractionId,
        ':attraction_name'    => $attractionName,
        ':attraction_city'    => $attractionCity,
        ':attraction_country' => $attractionCountry,
        ':category'           => $category,
        ':visit_date'         => $visitDate,
        ':adults'             => $adults,
        ':children'           => $children,
        ':infants'            => $infants,
        ':total_guests'       => $totalGuests,
        ':price_per_person'   => $pricePerPerson,
        ':total_amount'       => $totalAmount,
        ':is_free'            => $isFree,
        ':special_requests'   => $specialRequests ?: null,
        ':payment_method'     => $paymentMethod,
        ':booking_ref'        => $bookingRef,
    ]);

    echo json_encode([
        'success'     => true,
        'message'     => 'Attraction booking saved successfully',
        'booking_id'  => (int)$pdo->lastInsertId(),
        'booking_ref' => $bookingRef,
    ]);

} catch (InvalidArgumentException $e) {
    http_response_code(422);
    echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Database error: '.$e->getMessage()]);
}