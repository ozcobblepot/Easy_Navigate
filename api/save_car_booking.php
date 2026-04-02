<?php
// api/save_car_booking.php
// ══════════════════════════════════════════════════════════
//  Saves a car rental booking to the car_bookings table.
//  Called via POST from car-booking.html
// ══════════════════════════════════════════════════════════

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo json_encode(['success'=>false,'message'=>'Method not allowed']); exit; }

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
    $v = isset($data[$key]) ? trim((string)$data[$key]) : '';
    if ($v === '') throw new InvalidArgumentException("Missing required field: $key");
    return $v;
}
function opt($data, $key, $default = '') {
    return isset($data[$key]) ? trim((string)$data[$key]) : $default;
}

try {
    $firstName      = req($data, 'first_name');
    $lastName       = req($data, 'last_name');
    $email          = req($data, 'email');
    $phone          = req($data, 'phone');
    $driverAge      = max(18, min(80, intval(opt($data, 'driver_age', 18))));
    $licenseNumber  = req($data, 'license_number');
    $licenseCountry = opt($data, 'license_country', 'Philippines');
    $carId          = intval(opt($data, 'car_id', 0));
    $carName        = req($data, 'car_name');
    $carBrand       = opt($data, 'car_brand');
    $carCategory    = opt($data, 'car_category');
    $transmission   = opt($data, 'transmission');
    $fuelType       = opt($data, 'fuel_type');
    $seats          = max(1, intval(opt($data, 'seats', 5)));
    $pickupLoc      = req($data, 'pickup_location');
    $dropoffLoc     = req($data, 'dropoff_location');
    $pickupDT       = req($data, 'pickup_datetime');
    $dropoffDT      = req($data, 'dropoff_datetime');
    $rentalDays     = max(1, intval(opt($data, 'rental_days', 1)));
    $pricePerDay    = floatval(opt($data, 'price_per_day', 0));
    $totalAmount    = floatval(opt($data, 'total_amount', 0));
    $paymentMethod  = opt($data, 'payment_method', 'card');
    $bookingStatus  = 'confirmed';
    $bookingRef     = 'CR-'.strtoupper(substr(md5(uniqid()), 0, 8));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Invalid email address');
    }
    if (!in_array($paymentMethod, ['card','other'])) $paymentMethod = 'card';

    $stmt = $pdo->prepare("
        INSERT INTO car_bookings
            (first_name, last_name, email, phone,
             driver_age, license_number, license_country,
             car_id, car_name, car_brand, car_category, transmission, fuel_type, seats,
             pickup_location, dropoff_location, pickup_datetime, dropoff_datetime,
             rental_days, price_per_day, total_amount,
             payment_method, booking_ref, booking_status)
        VALUES
            (:first_name, :last_name, :email, :phone,
             :driver_age, :license_number, :license_country,
             :car_id, :car_name, :car_brand, :car_category, :transmission, :fuel_type, :seats,
             :pickup_location, :dropoff_location, :pickup_datetime, :dropoff_datetime,
             :rental_days, :price_per_day, :total_amount,
             :payment_method, :booking_ref, :booking_status)
    ");

    $stmt->execute([
        ':first_name'       => $firstName,
        ':last_name'        => $lastName,
        ':email'            => $email,
        ':phone'            => $phone,
        ':driver_age'       => $driverAge,
        ':license_number'   => $licenseNumber,
        ':license_country'  => $licenseCountry,
        ':car_id'           => $carId,
        ':car_name'         => $carName,
        ':car_brand'        => $carBrand,
        ':car_category'     => $carCategory,
        ':transmission'     => $transmission,
        ':fuel_type'        => $fuelType,
        ':seats'            => $seats,
        ':pickup_location'  => $pickupLoc,
        ':dropoff_location' => $dropoffLoc,
        ':pickup_datetime'  => $pickupDT,
        ':dropoff_datetime' => $dropoffDT,
        ':rental_days'      => $rentalDays,
        ':price_per_day'    => $pricePerDay,
        ':total_amount'     => $totalAmount,
        ':payment_method'   => $paymentMethod,
        ':booking_ref'      => $bookingRef,
        ':booking_status'   => $bookingStatus,
    ]);

    echo json_encode([
        'success'     => true,
        'message'     => 'Car booking saved successfully',
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