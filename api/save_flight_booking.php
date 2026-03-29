<?php
// api/save_flight_booking.php
// ══════════════════════════════════════════════════════════
//  Saves a flight booking + all passengers to the DB.
//  Called via POST from flight-booking.html
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
if (!$data) { http_response_code(400); echo json_encode(['success'=>false,'message'=>'Invalid JSON']); exit; }

function req($d,$k){ $v=isset($d[$k])?trim($d[$k]):''; if($v==='') throw new InvalidArgumentException("Missing: $k"); return $v; }
function opt($d,$k,$def=''){ return isset($d[$k])?trim($d[$k]):$def; }
function inList($v,$list,$def){ return in_array($v,$list)?$v:$def; }

try {
    // ── Contact ──────────────────────────────────────────
    $email  = req($data,'contact_email');
    $phone  = req($data,'contact_phone');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('Invalid email');

    // ── Flight info ───────────────────────────────────────
    $flightId     = opt($data,'flight_id','');
    $airline      = req($data,'airline');
    $flightNumber = opt($data,'flight_number','');
    $originIata   = opt($data,'origin_iata','');
    $originCity   = opt($data,'origin_city','');
    $destIata     = opt($data,'dest_iata','');
    $destCity     = opt($data,'dest_city','');
    $departDt     = req($data,'depart_datetime');
    $arriveDt     = opt($data,'arrive_datetime','') ?: null;
    $cabinClass   = inList(opt($data,'cabin_class','Economy'),['Economy','Premium Economy','Business','First'],'Economy');
    $tripType     = inList(opt($data,'trip_type','one_way'),['one_way','round_trip'],'one_way');

    // ── Counts ────────────────────────────────────────────
    $adults   = max(1, intval(opt($data,'adults',1)));
    $children = max(0, intval(opt($data,'children',0)));
    $infants  = max(0, intval(opt($data,'infants',0)));
    $total    = $adults + $children + $infants;

    // ── Pricing ───────────────────────────────────────────
    $pricePerAdult = floatval(opt($data,'price_per_adult',0));
    $totalAmount   = floatval(opt($data,'total_amount',0));

    // ── Payment ───────────────────────────────────────────
    $payMethod  = inList(opt($data,'payment_method','card'),['card','other'],'card');
    $bookingRef = opt($data,'booking_ref','FL-'.strtoupper(substr(md5(uniqid()),0,8)));

    // ── Passengers array ──────────────────────────────────
    $passengers = isset($data['passengers']) && is_array($data['passengers']) ? $data['passengers'] : [];
    if (empty($passengers)) throw new InvalidArgumentException('At least one passenger is required');

    // ── BEGIN TRANSACTION ─────────────────────────────────
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        INSERT INTO flight_bookings
            (contact_email, contact_phone,
             flight_id, airline, flight_number,
             origin_iata, origin_city, dest_iata, dest_city,
             depart_datetime, arrive_datetime, cabin_class, trip_type,
             adults, children, infants, total_passengers,
             price_per_adult, total_amount, payment_method, booking_ref, booking_status)
        VALUES
            (:contact_email, :contact_phone,
             :flight_id, :airline, :flight_number,
             :origin_iata, :origin_city, :dest_iata, :dest_city,
             :depart_datetime, :arrive_datetime, :cabin_class, :trip_type,
             :adults, :children, :infants, :total_passengers,
             :price_per_adult, :total_amount, :payment_method, :booking_ref, 'confirmed')
    ");
    $stmt->execute([
        ':contact_email'    => $email,
        ':contact_phone'    => $phone,
        ':flight_id'        => $flightId,
        ':airline'          => $airline,
        ':flight_number'    => $flightNumber,
        ':origin_iata'      => $originIata,
        ':origin_city'      => $originCity,
        ':dest_iata'        => $destIata,
        ':dest_city'        => $destCity,
        ':depart_datetime'  => $departDt,
        ':arrive_datetime'  => $arriveDt,
        ':cabin_class'      => $cabinClass,
        ':trip_type'        => $tripType,
        ':adults'           => $adults,
        ':children'         => $children,
        ':infants'          => $infants,
        ':total_passengers' => $total,
        ':price_per_adult'  => $pricePerAdult,
        ':total_amount'     => $totalAmount,
        ':payment_method'   => $payMethod,
        ':booking_ref'      => $bookingRef,
    ]);
    $bookingId = (int)$pdo->lastInsertId();

    $paxStmt = $pdo->prepare("
        INSERT INTO flight_booking_passengers
            (booking_id, booking_ref, passenger_type,
             first_name, last_name, date_of_birth, passport_number,
             seat_preference, meal_preference, baggage)
        VALUES
            (:booking_id, :booking_ref, :passenger_type,
             :first_name, :last_name, :date_of_birth, :passport_number,
             :seat_preference, :meal_preference, :baggage)
    ");

    foreach ($passengers as $i => $pax) {
        $pType = inList(opt($pax,'type','adult'),['adult','child','infant'],'adult');
        $fName = isset($pax['first_name']) ? trim($pax['first_name']) : '';
        $lName = isset($pax['last_name'])  ? trim($pax['last_name'])  : '';
        if (!$fName || !$lName) throw new InvalidArgumentException("Passenger ".($i+1)." missing name");
        $dob   = isset($pax['dob']) ? trim($pax['dob']) : '';
        if (!$dob) throw new InvalidArgumentException("Passenger ".($i+1)." missing date of birth");
        $pass  = opt($pax,'passport','');
        $seat  = inList(opt($pax,'seat','no_preference'),['window','middle','aisle','no_preference'],'no_preference');
        $meal  = inList(opt($pax,'meal','no_preference'),['standard','vegetarian','vegan','halal','kosher','gluten_free','no_preference'],'no_preference');
        $bag   = inList(opt($pax,'baggage','cabin_only'),['cabin_only','cabin_and_checked','no_preference'],'cabin_only');

        $paxStmt->execute([
            ':booking_id'      => $bookingId,
            ':booking_ref'     => $bookingRef,
            ':passenger_type'  => $pType,
            ':first_name'      => $fName,
            ':last_name'       => $lName,
            ':date_of_birth'   => $dob,
            ':passport_number' => $pass,
            ':seat_preference' => $seat,
            ':meal_preference' => $meal,
            ':baggage'         => $bag,
        ]);
    }

    $pdo->commit();

    echo json_encode([
        'success'     => true,
        'message'     => 'Flight booking saved successfully',
        'booking_id'  => $bookingId,
        'booking_ref' => $bookingRef,
    ]);

} catch (InvalidArgumentException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(422);
    echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>'Database error: '.$e->getMessage()]);
}