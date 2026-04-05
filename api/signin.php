<?php
// api/signin.php

declare(strict_types=1);

ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed. Use POST.']);
    exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid JSON body.']);
    exit;
}

$email    = trim($data['email']    ?? '');
$password =      $data['password'] ?? '';

if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Email and password are required.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid email address.']);
    exit;
}

require_once __DIR__ . '/db_connect.php';

try {
    $pdo = getDB();

    $stmt = $pdo->prepare(
        'SELECT id, first_name, last_name, email, password_hash, is_active
         FROM users
         WHERE email = :email
         LIMIT 1'
    );
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    // Timing-safe: always run password_verify even if user not found
    $hashToCheck = $user
        ? $user['password_hash']
        : '$2y$12$invalidhashfortimingprotection000000000000000000000';

    $passwordOk = password_verify($password, $hashToCheck);

    if (!$user || !$passwordOk) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'message' => 'Incorrect email or password.']);
        exit;
    }

    if (!(int)$user['is_active']) {
        http_response_code(401);
        echo json_encode(['ok' => false, 'message' => 'This account has been deactivated. Please contact support.']);
        exit;
    }

    http_response_code(200);
    echo json_encode([
        'ok'      => true,
        'message' => 'Signed in successfully.',
        'user'    => [
            'id'         => (int)$user['id'],
            'first_name' => $user['first_name'],
            'last_name'  => $user['last_name'],
            'email'      => $user['email'],
        ],
    ]);

} catch (PDOException $e) {
    error_log('signin.php PDOException: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'A server error occurred. Please try again later.']);
}