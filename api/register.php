<?php
// api/register.php

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

$firstName = trim($data['first_name'] ?? '');
$lastName  = trim($data['last_name']  ?? '');
$email     = trim($data['email']      ?? '');
$password  =      $data['password']   ?? '';

$errors = [];
if ($firstName === '') $errors[] = 'First name is required.';
if ($lastName  === '') $errors[] = 'Last name is required.';
if ($email === '') {
    $errors[] = 'Email is required.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Email address is not valid.';
}
if ($password === '') {
    $errors[] = 'Password is required.';
} elseif (strlen($password) < 8) {
    $errors[] = 'Password must be at least 8 characters.';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => implode(' ', $errors)]);
    exit;
}

require_once __DIR__ . '/db_connect.php';

try {
    $pdo = getDB();

    // Check if email already exists
    $checkStmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $checkStmt->execute([':email' => $email]);

    if ($checkStmt->fetch()) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'An account with this email already exists. Please sign in.']);
        exit;
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

    $insertStmt = $pdo->prepare(
        'INSERT INTO users (first_name, last_name, email, password_hash)
         VALUES (:first_name, :last_name, :email, :password_hash)'
    );
    $insertStmt->execute([
        ':first_name'    => $firstName,
        ':last_name'     => $lastName,
        ':email'         => $email,
        ':password_hash' => $passwordHash,
    ]);

    $newId = (int) $pdo->lastInsertId();

    http_response_code(201);
    echo json_encode([
        'ok'      => true,
        'message' => 'Account created successfully.',
        'user'    => [
            'id'         => $newId,
            'first_name' => $firstName,
            'last_name'  => $lastName,
            'email'      => $email,
        ],
    ]);

} catch (PDOException $e) {
    // Handle race-condition duplicate email at DB level
    if ($e->getCode() === '23000') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'message' => 'An account with this email already exists.']);
    } else {
        error_log('register.php PDOException: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'A server error occurred. Please try again later.']);
    }
}