<?php
// api/update_profile.php

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

$userId = (int)($data['id'] ?? 0);
if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'User ID is required.']);
    exit;
}

$firstName   = trim($data['first_name']  ?? '');
$lastName    = trim($data['last_name']   ?? '');
$email       = trim($data['email']       ?? '');
$phone       = trim($data['phone']       ?? '') ?: null;
$dob         = trim($data['dob']         ?? '') ?: null;
$address     = trim($data['address']     ?? '') ?: null;
$nationality = trim($data['nationality'] ?? '') ?: null;
$passport    = trim($data['passport']    ?? '') ?: null;

if ($firstName === '' || $lastName === '' || $email === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'First name, last name, and email are required.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid email address.']);
    exit;
}

// Validate date of birth format if provided
if ($dob !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dob)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid date of birth format.']);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $pdo = getDB();

    // Check email not taken by another user
    $chk = $pdo->prepare('SELECT id FROM users WHERE email = :email AND id != :id LIMIT 1');
    $chk->execute([':email' => $email, ':id' => $userId]);
    if ($chk->fetch()) {
        http_response_code(409);
        echo json_encode(['ok' => false, 'message' => 'That email is already in use by another account.']);
        exit;
    }

    $stmt = $pdo->prepare(
        'UPDATE users SET
            first_name   = :first_name,
            last_name    = :last_name,
            email        = :email,
            phone        = :phone,
            dob          = :dob,
            address      = :address,
            nationality  = :nationality,
            passport     = :passport
         WHERE id = :id'
    );
    $stmt->execute([
        ':first_name'  => $firstName,
        ':last_name'   => $lastName,
        ':email'       => $email,
        ':phone'       => $phone,
        ':dob'         => $dob,
        ':address'     => $address,
        ':nationality' => $nationality,
        ':passport'    => $passport,
        ':id'          => $userId,
    ]);

    echo json_encode([
        'ok'      => true,
        'message' => 'Profile updated successfully.',
        'user'    => [
            'id'          => $userId,
            'first_name'  => $firstName,
            'last_name'   => $lastName,
            'email'       => $email,
            'phone'       => $phone,
            'dob'         => $dob,
            'address'     => $address,
            'nationality' => $nationality,
            'passport'    => $passport,
        ],
    ]);

} catch (PDOException $e) {
    error_log('update_profile.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Server error. Please try again.']);
}