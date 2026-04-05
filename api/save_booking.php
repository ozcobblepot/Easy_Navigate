<?php
// api/save_booking.php
// ══════════════════════════════════════════════════════════
//  Saves a hotel booking to the hotel_bookings table.
//  Called via POST from hotel-booking.html
// ══════════════════════════════════════════════════════════

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo json_encode(['success'=>false,'message'=>'Method not allowed']); exit; }

// ── FIXED: use shared connection instead of hardcoded credentials ──
require_once __DIR__ . '/db.php';

try {
    $pdo = getDB();
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'DB connection failed: '.$e->getMessage()]);
    exit;
}

// ── READ JSON BODY ────────────────────────────────────────
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
    $firstName     = req($data, 'first_name');
    $lastName      = req($data, 'last_name');
    $email         = req($data, 'email');
    $phone         = req($data, 'phone');
    $hotelName     = req($data, 'hotel_name');
    $hotelCity     = opt($data, 'hotel_city');
    $hotelAddress  = opt($data, 'hotel_address');
    $checkin       = req($data, 'checkin_date');
    $checkout      = req($data, 'checkout_date');
    $nights        = max(1, intval(opt($data, 'nights', 1)));
    $rooms         = max(1, intval(opt($data, 'rooms',  1)));
    $guests        = max(1, intval(opt($data, 'guests', 2)));
    $pricePerNight = floatval(opt($data, 'price_per_night', 0));
    $discountAmt   = floatval(opt($data, 'discount_amount', 0));
    $promoDiscount = floatval(opt($data, 'promo_discount',  0));
    $taxesFees     = floatval(opt($data, 'taxes_fees',      0));
    $totalAmount   = floatval(opt($data, 'total_amount',    0));
    $elevatorPref  = opt($data, 'elevator_pref', 'none');
    $otherReq      = opt($data, 'other_requests', '');
    $paymentMethod = opt($data, 'payment_method', 'card');
    $bookingRef    = opt($data, 'booking_ref', 'EN-'.strtoupper(substr(md5(uniqid()),0,8)));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Invalid email address');
    }
    if (!strtotime($checkin) || !strtotime($checkout)) {
        throw new InvalidArgumentException('Invalid dates');
    }
    if (!in_array($elevatorPref, ['none','away','near'])) $elevatorPref = 'none';
    if (!in_array($paymentMethod, ['card','other']))      $paymentMethod = 'card';

    $stmt = $pdo->prepare("
        INSERT INTO hotel_bookings
            (first_name, last_name, email, phone,
             hotel_name, hotel_city, hotel_address,
             checkin_date, checkout_date, nights, rooms, guests,
             price_per_night, discount_amount, promo_discount, taxes_fees, total_amount,
             elevator_pref, other_requests,
             payment_method, booking_ref, booking_status)
        VALUES
            (:first_name, :last_name, :email, :phone,
             :hotel_name, :hotel_city, :hotel_address,
             :checkin_date, :checkout_date, :nights, :rooms, :guests,
             :price_per_night, :discount_amount, :promo_discount, :taxes_fees, :total_amount,
             :elevator_pref, :other_requests,
             :payment_method, :booking_ref, 'confirmed')
    ");

    $stmt->execute([
        ':first_name'      => $firstName,
        ':last_name'       => $lastName,
        ':email'           => $email,
        ':phone'           => $phone,
        ':hotel_name'      => $hotelName,
        ':hotel_city'      => $hotelCity,
        ':hotel_address'   => $hotelAddress,
        ':checkin_date'    => $checkin,
        ':checkout_date'   => $checkout,
        ':nights'          => $nights,
        ':rooms'           => $rooms,
        ':guests'          => $guests,
        ':price_per_night' => $pricePerNight,
        ':discount_amount' => $discountAmt,
        ':promo_discount'  => $promoDiscount,
        ':taxes_fees'      => $taxesFees,
        ':total_amount'    => $totalAmount,
        ':elevator_pref'   => $elevatorPref,
        ':other_requests'  => $otherReq ?: null,
        ':payment_method'  => $paymentMethod,
        ':booking_ref'     => $bookingRef,
    ]);

    echo json_encode([
        'success'     => true,
        'message'     => 'Booking saved successfully',
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