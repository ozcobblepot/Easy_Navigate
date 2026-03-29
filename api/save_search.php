<?php

declare(strict_types=1);

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/db_connect.php';

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput ?: '{}', true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid JSON payload']);
    exit;
}

$serviceType = trim((string)($payload['serviceType'] ?? ''));
$pagePath = trim((string)($payload['pagePath'] ?? ''));
$searchData = $payload['searchData'] ?? [];
$userState = $payload['userState'] ?? [];

$allowedServices = ['hotel', 'car', 'flights', 'attractions', 'taxi'];

if ($serviceType === '' || !in_array($serviceType, $allowedServices, true)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Invalid serviceType']);
    exit;
}

if (!is_array($searchData)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'searchData must be an object']);
    exit;
}

if (!is_array($userState)) {
    $userState = [];
}

try {
    $pdo = getDB();

    $statement = $pdo->prepare(
        'INSERT INTO service_searches (
            service_type,
            page_path,
            search_data,
            user_uid,
            user_name,
            user_email,
            user_provider,
            created_at
        ) VALUES (
            :service_type,
            :page_path,
            :search_data,
            :user_uid,
            :user_name,
            :user_email,
            :user_provider,
            NOW()
        )'
    );

    $statement->execute([
        ':service_type' => $serviceType,
        ':page_path' => $pagePath,
        ':search_data' => json_encode($searchData, JSON_UNESCAPED_UNICODE),
        ':user_uid' => trim((string)($userState['uid'] ?? '')) ?: null,
        ':user_name' => trim((string)($userState['name'] ?? '')) ?: null,
        ':user_email' => trim((string)($userState['email'] ?? '')) ?: null,
        ':user_provider' => trim((string)($userState['provider'] ?? '')) ?: null,
    ]);

    echo json_encode([
        'ok' => true,
        'id' => (int)$pdo->lastInsertId(),
    ]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'message' => 'Database error',
        'error' => $error->getMessage(),
    ]);
}
